using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ReleaseModule.Models.Request;
using ReleaseModule.Models.Response;
using System.Text.Json;

namespace ReleaseModulePublic.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CabTicketRequestController : ControllerBase
    {
        private readonly IConfiguration _config;

        public CabTicketRequestController(IConfiguration config)
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
        

        // ================================
        // RECOMMENDATION
        // ================================
        [HttpGet("Recommendation")]
        public async Task<IActionResult> GetRecommendation(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/TicketRecommendation?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

       
        // ================================
        // VERIFY
        // ================================
        [HttpGet("TicketVerify")]
        public async Task<IActionResult> GetTicketVerify(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/TicketVerify?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        

        // ================================
        // APPROVE
        // ================================
        [HttpGet("TicketApprove")]
        public async Task<IActionResult> GetTicketApprove(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/TicketApprove?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        

        // ================================
        // RELEASE
        // ================================
        [HttpGet("TicketReleased")]
        public async Task<IActionResult> GetTicketReleased(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/TicketReleased?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        [HttpGet("GetRevertDetails")]
        public async Task<IActionResult> GetRevertDetails(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/GetRevertDetails?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        [HttpPost("SubmitRevert")]
        public async Task<IActionResult> SaveTicketReturn([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/SubmitRevert";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        [HttpGet("flow-details")]
        public async Task<IActionResult> GetFlowDetails(int empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/flow-details?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        // ================================
        // REVERT RECOMMENDATION
        // ================================
        [HttpGet("GetRevertRecommendation")]
        public async Task<IActionResult> GetRevertRecommendation(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/GetRevertRecommendation?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertRecommendation")]
        public async Task<IActionResult> RevertRecommendation([FromBody] TicketRecommendationDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/RevertRecommendation";
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
        // ================================
        // REVERT VERIFY
        // ================================
        [HttpGet("RevertVerify")]
        public async Task<IActionResult> RevertVerify(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/RevertVerify?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("SaveRevertVerify")]
        public async Task<IActionResult> SaveRevertVerify([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/SaveRevertVerify";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // REVERT APPROVE
        // ================================
        [HttpGet("RevertApproved")]
        public async Task<IActionResult> RevertApproved(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/RevertApproved?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertApprove")]
        public async Task<IActionResult> RevertApprove([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/RevertApprove";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // RVERT RELEASE
        // ================================
        [HttpGet("RevertReleased")]
        public async Task<IActionResult> RevertReleased(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/RevertReleased?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertRelease")]
        public async Task<IActionResult> RevertRelease([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/RevertRelease";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }


        [HttpGet("GetNewReleases")]
        public async Task<IActionResult> GetNewReleases(int empCode)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/GetNewReleases?empCode={empCode}";

            var response = await client.GetAsync(url);

            return await HandleResponse(response);
        }
        [HttpPost("MarkCelebrationSeen")]
        public async Task<IActionResult> MarkCelebrationSeen([FromBody] CelebrationSeenDto request)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabTicketRequest/MarkCelebrationSeen";

            var response = await client.PostAsJsonAsync(url, request);

            return await HandleResponse(response);
        }
    }
}
