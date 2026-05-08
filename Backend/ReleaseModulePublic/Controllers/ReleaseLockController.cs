using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ReleaseModule.Models.Request;
using ReleaseModule.Models.Response;
using System.Text.Json;

namespace ReleaseModulePublic.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReleaseLockController : ControllerBase
    {
        private readonly IConfiguration _config;

        public ReleaseLockController(IConfiguration config)
        {
            _config = config;
        }

        private HttpClient GetHttpClient()
        {
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback =
                    HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
            };

            return new HttpClient(handler);
        }
        // ================================
        // COMMON RESPONSE HANDLER
        // ================================
        private async Task<IActionResult> HandleResponse(HttpResponseMessage response)
        {
            var content = await response.Content.ReadAsStringAsync();

            return response.IsSuccessStatusCode
                ? Ok(JsonSerializer.Deserialize<object>(content))
                : StatusCode((int)response.StatusCode, JsonSerializer.Deserialize<object>(content));
        }

        [HttpPost("Lock")]
        public async Task<IActionResult> Lock([FromBody] LockDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/ReleaseLock/Lock";
                var response = await client.PostAsJsonAsync(url, request);
                return await HandleResponse(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ExpResponse<object>
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPost("CabLock")]
        public async Task<IActionResult> CabLock([FromBody] LockDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/ReleaseLock/CabLock";
                var response = await client.PostAsJsonAsync(url, request);
                return await HandleResponse(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ExpResponse<object>
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPost("TicketLock")]
        public async Task<IActionResult> TicketLock([FromBody] TicketLockDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/ReleaseLock/TicketLock";
                var response = await client.PostAsJsonAsync(url, request);
                return await HandleResponse(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ExpResponse<object>
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }
    }
}
