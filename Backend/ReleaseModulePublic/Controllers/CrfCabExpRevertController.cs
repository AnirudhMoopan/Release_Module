using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ReleaseModule.Models.Request;
using ReleaseModule.Models.Response;
using System.Text.Json;

namespace ReleaseModulePublic.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CrfCabExpRevertController : ControllerBase
    {
        private readonly IConfiguration _config;

        public CrfCabExpRevertController(IConfiguration config)
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
        //EXP
        // ================================
        // REVERT RECOMMENDATION
        // ================================
        [HttpGet("ExpRevertRecommendation")]
        public async Task<IActionResult> ExpRevertRecommendation(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/ExpRevertRecommendation?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertRecommendation")]
        public async Task<IActionResult> ExpRevertRecommendation([FromBody] RecommendationDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/RevertRecommendation";
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
        // VERIFY
        // ================================
        [HttpGet("RevertVerify")]
        public async Task<IActionResult> GetRevertVerify(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/RevertVerify?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("SaveRevertVerify")]
        public async Task<IActionResult> SaveRevertVerify([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/SaveRevertVerify";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // APPROVE
        // ================================
        [HttpGet("GetRevertApprove")]
        public async Task<IActionResult> GetRevertApprove(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/GetRevertApprove?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertApprove")]
        public async Task<IActionResult> RevertApprove([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/RevertApprove";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // RELEASE
        // ================================
        [HttpGet("RevertReleased")]
        public async Task<IActionResult> GetRevertReleased(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/RevertReleased?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertRelease")]
        public async Task<IActionResult> SaveRevertRelease([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/RevertRelease";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        [HttpGet("GetRevertDetails")]
        public async Task<IActionResult> GetRevertDetails(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/GetRevertDetails?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        [HttpPost("SubmitRevert")]
        public async Task<IActionResult> SubmitRevert([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/SubmitRevert";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }


        //CAB
        // ================================
        // REVERT RECOMMENDATION
        // ================================
        [HttpGet("CabRevertRecommendation")]
        public async Task<IActionResult> CabRevertRecommendation(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/CabRevertRecommendation?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("CabRevertRecommendation")]
        public async Task<IActionResult> CabRevertRecommendation([FromBody] RecommendationDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/CabRevertRecommendation";
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
        // VERIFY
        // ================================
        [HttpGet("CabRevertVerify")]
        public async Task<IActionResult> GetCabRevertVerify(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/CabRevertVerify?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("CabRevertVerify")]
        public async Task<IActionResult> SaveCabRevertVerify([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/CabRevertVerify";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // APPROVE
        // ================================
        [HttpGet("GetCabRevertApprove")]
        public async Task<IActionResult> GetCabRevertApprove(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/GetCabRevertApprove?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertCabApprove")]
        public async Task<IActionResult> SaveRevertCabApprove([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/RevertCabApprove";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // RELEASE
        // ================================
        [HttpGet("RevertCabReleased")]
        public async Task<IActionResult> GetRevertCabReleased(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/RevertCabReleased?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertCabRelease")]
        public async Task<IActionResult> SaveRevertCabRelease([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/RevertCabRelease";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        [HttpGet("GetCabRevertDetails")]
        public async Task<IActionResult> GetCabRevertDetails(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/GetCabRevertDetails?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        [HttpPost("CabRevert")]
        public async Task<IActionResult> CabRevert([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CrfCabExpRevert/CabRevert";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

    }
}
