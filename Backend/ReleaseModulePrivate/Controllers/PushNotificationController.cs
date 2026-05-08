using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Release_Module.Models;
using ReleaseModule.Data;
using ReleaseModule.Models.Request;
using WebPush;

namespace ReleaseModule.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PushNotificationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;

        public PushNotificationController(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        private VapidDetails GetVapidDetails()
        {
            var vapid = _config.GetSection("Vapid");
            return new VapidDetails(
                vapid["subject"] ?? "mailto:apprelease@asirvad.in",
                vapid["publicKey"] ?? "",
                vapid["privateKey"] ?? ""
            );
        }


        [HttpGet("vapid-public-key")]
        public IActionResult GetVapidPublicKey()
        {
            var publicKey = _config["Vapid:publicKey"];
            return Ok(new { success = true, publicKey });
        }


        [HttpPost("subscribe")]
        public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
        {
            try
            {
                var staleByEndpoint = await _context.PushSubscriptions
                    .Where(s => s.Endpoint == request.Endpoint)
                    .ToListAsync();

                if (staleByEndpoint.Count > 0)
                {
                    _context.PushSubscriptions.RemoveRange(staleByEndpoint);
                }

                
                var existingForDevice = await _context.PushSubscriptions
                    .FirstOrDefaultAsync(s => s.EmpCode == request.EmpCode
                        && s.DeviceInfo == request.DeviceInfo);

                if (existingForDevice != null)
                {
                    existingForDevice.Endpoint = request.Endpoint;
                    existingForDevice.P256dh = request.P256dh;
                    existingForDevice.Auth = request.Auth;
                    existingForDevice.CreatedDate = DateTime.Now;
                }
                else
                {
                    var subscription = new PushSubscriptionEntity
                    {
                        EmpCode = request.EmpCode,
                        Endpoint = request.Endpoint,
                        P256dh = request.P256dh,
                        Auth = request.Auth,
                        DeviceInfo = request.DeviceInfo,
                        CreatedDate = DateTime.Now
                    };
                    _context.PushSubscriptions.Add(subscription);
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Subscription saved" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }


        [HttpPost("unsubscribe")]
        public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequest request)
        {
            try
            {
                var subscription = await _context.PushSubscriptions
                    .FirstOrDefaultAsync(s => s.Endpoint == request.Endpoint && s.EmpCode == request.EmpCode);

                if (subscription != null)
                {
                    _context.PushSubscriptions.Remove(subscription);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, message = "Unsubscribed" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("test-push")]
        public async Task<IActionResult> TestPush([FromQuery] int empCode)
        {
            try
            {
                await SendToUserAsync(empCode, "Release Module", "Test notification — push is working!", "/");
                return Ok(new { success = true, message = "Test push sent" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }


        [HttpPost("send")]
        public async Task<IActionResult> SendNotification([FromBody] SendNotificationRequest request)
        {
            try
            {
                await SendToUserAsync(request.EmpCode, request.Title, request.Body, request.Url);
                return Ok(new { success = true, message = "Notification sent" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }


        [HttpPost("send-to-role")]
        public async Task<IActionResult> SendToRole([FromBody] SendToRoleRequest request)
        {
            try
            {
                var empCodes = await _context.ApprovalFlows
                    .Where(a => a.RoleStatus == request.RoleStatus)
                    .Select(a => a.EmpCode)
                    .Distinct()
                    .ToListAsync();

                var empCodeInts = empCodes
                    .Where(e => int.TryParse(e, out _))
                    .Select(e => int.Parse(e))
                    .ToList();

                if (empCodeInts.Count > 0)
                {
                    await SendToUsersAsync(empCodeInts, request.Title, request.Body, request.Url);
                }

                return Ok(new { success = true, message = $"Notification sent to {empCodeInts.Count} users with role {request.RoleStatus}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }



        private async Task SendToUserAsync(int empCode, string title, string body, string? url = null)
        {
            var subscriptions = await _context.PushSubscriptions
                .Where(s => s.EmpCode == empCode)
                .AsNoTracking()
                .ToListAsync();

            foreach (var sub in subscriptions)
            {
                await SendPushAsync(sub, title, body, url);
            }
        }

        private async Task SendToUsersAsync(IEnumerable<int> empCodes, string title, string body, string? url = null)
        {
            var subscriptions = await _context.PushSubscriptions
                .Where(s => empCodes.Contains(s.EmpCode))
                .AsNoTracking()
                .ToListAsync();

            var tasks = subscriptions.Select(sub => SendPushAsync(sub, title, body, url));
            await Task.WhenAll(tasks);
        }

        private async Task SendPushAsync(PushSubscriptionEntity sub, string title, string body, string? url)
        {
            try
            {
                var pushSubscription = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                var vapidDetails = GetVapidDetails();

                var payload = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title,
                    body,
                    icon = "/logo192.png",
                    badge = "/logo192.png",
                    url = url ?? "/",
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                });

                await new WebPushClient().SendNotificationAsync(pushSubscription, payload, vapidDetails);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone ||
                                                ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {

                var toRemove = await _context.PushSubscriptions.FirstOrDefaultAsync(s => s.Id == sub.Id);
                if (toRemove != null)
                {
                    _context.PushSubscriptions.Remove(toRemove);
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception)
            {
            }
        }
    }
}
