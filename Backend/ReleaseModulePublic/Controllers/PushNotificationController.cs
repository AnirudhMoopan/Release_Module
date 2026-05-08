using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace ReleaseModulePublic.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PushNotificationController : ControllerBase
    {
        private readonly IConfiguration _config;

        public PushNotificationController(IConfiguration config)
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

        
        [HttpGet("vapid-public-key")]
        public async Task<IActionResult> GetVapidPublicKey()
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/PushNotification/vapid-public-key";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        
        [HttpPost("subscribe")]
        public async Task<IActionResult> Subscribe([FromBody] object request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/PushNotification/subscribe";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        
        [HttpPost("unsubscribe")]
        public async Task<IActionResult> Unsubscribe([FromBody] object request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/PushNotification/unsubscribe";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        
        [HttpPost("test-push")]
        public async Task<IActionResult> TestPush([FromQuery] int empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/PushNotification/test-push?empCode={empCode}";

            var response = await client.PostAsync(url, null);
            return await HandleResponse(response);
        }

     
        [HttpPost("send")]
        public async Task<IActionResult> SendNotification([FromBody] object request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/PushNotification/send";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

     
        [HttpPost("send-to-role")]
        public async Task<IActionResult> SendToRole([FromBody] object request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/PushNotification/send-to-role";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

 
        private async Task<IActionResult> HandleResponse(HttpResponseMessage response)
        {
            var content = await response.Content.ReadAsStringAsync();

            return response.IsSuccessStatusCode
                ? Ok(JsonSerializer.Deserialize<object>(content))
                : StatusCode((int)response.StatusCode, JsonSerializer.Deserialize<object>(content));
        }
    }
}
