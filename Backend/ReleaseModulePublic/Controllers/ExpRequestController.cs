using Microsoft.AspNetCore.Mvc;
using ReleaseModule.Models.Request;
using ReleaseModule.Models.Response;
using System.Text.Json;

namespace ReleaseModulePublic.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExpRequestController : ControllerBase
    {
        private readonly IConfiguration _config;

        public ExpRequestController(IConfiguration config)
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
        // GET CRF DETAILS
        // ================================
        [HttpGet("GetCrfDetails")]
        public async Task<IActionResult> GetCrfDetails(int crfId)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/GetCrfDetails?crfId={crfId}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        // ================================
        // CREATE REQUEST
        // ================================
        [HttpPost("create-exp-request")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateExpRequest([FromForm] ExpRequestDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/create-exp-request";

            var content = new MultipartFormDataContent();

            content.Add(new StringContent(request.CrfId.ToString()), "CrfId");
            content.Add(new StringContent(request.UserId.ToString()), "UserId");
            content.Add(new StringContent(request.Subject ?? ""), "Subject");
            content.Add(new StringContent(request.ChangesToBeMade ?? ""), "ChangesToBeMade");
            content.Add(new StringContent(request.PublishPath ?? ""), "PublishPath");
            content.Add(new StringContent(request.CommitId ?? ""), "CommitId");
            content.Add(new StringContent(request.ReasonForExpedite ?? ""), "ReasonForExpedite");
            content.Add(new StringContent(request.RequirementType.ToString()), "RequirementType");
            content.Add(new StringContent(request.DbType ?? ""), "DbType");
            content.Add(new StringContent(request.MobileNumber ?? ""), "MobileNumber");


            if (request.UatSignoffDocument != null)
            {
                var stream = request.UatSignoffDocument.OpenReadStream();

                var fileContent = new StreamContent(stream);
                fileContent.Headers.ContentType =
                    new System.Net.Http.Headers.MediaTypeHeaderValue(request.UatSignoffDocument.ContentType);

                content.Add(fileContent, "UatSignoffDocument", request.UatSignoffDocument.FileName);
            }

            if (request.ProdReleaseDoc != null)
            {
                var stream = request.ProdReleaseDoc.OpenReadStream();

                var fileContent = new StreamContent(stream);
                fileContent.Headers.ContentType =
                    new System.Net.Http.Headers.MediaTypeHeaderValue(request.ProdReleaseDoc.ContentType);

                content.Add(fileContent, "ProdReleaseDoc", request.ProdReleaseDoc.FileName);
            }

            var response = await client.PostAsync(url, content);

            return await HandleResponse(response);
        }
        // ================================
        // LOGIN
        // ================================
        [HttpPost("Login")]
        public async Task<IActionResult> Login([FromBody] Login request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Login";
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
        // RECOMMENDATION
        // ================================
        [HttpGet("Recommendation")]
        public async Task<IActionResult> GetRecommendation(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Recommendation?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("Recommendation")]
        public async Task<IActionResult> SaveRecommendation([FromBody] RecommendationDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Recommendation";
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
        [HttpGet("Verify")]
        public async Task<IActionResult> GetVerify(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Verify?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("Verify")]
        public async Task<IActionResult> SaveVerify([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Verify";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // APPROVE
        // ================================
        [HttpGet("Approve")]
        public async Task<IActionResult> GetApprove(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Approve?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("Approve")]
        public async Task<IActionResult> SaveApprove([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Approve";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // RELEASE
        // ================================
        [HttpGet("Released")]
        public async Task<IActionResult> GetReleased(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Released?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("Release")]
        public async Task<IActionResult> SaveRelease([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Release";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // RETURN
        // ================================
        [HttpPost("Return")]
        public async Task<IActionResult> SaveReturn([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/Return";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // FLOW DETAILS
        // ================================
        [HttpGet("flow-details")]
        public async Task<IActionResult> GetFlowDetails(int empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/flow-details?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
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
        // REVERT RECOMMENDATION
        // ================================
        [HttpGet("GetRevertRecommendation")]
        public async Task<IActionResult> GetRevertRecommendation(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/GetRevertRecommendation?empCode={empCode}";

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
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/RevertRecommendation";
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
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/RevertVerify?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("SaveRevertVerify")]
        public async Task<IActionResult> SaveRevertVerify([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/SaveRevertVerify";

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
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/RevertApproved?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertApprove")]
        public async Task<IActionResult> RevertApprove([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/RevertApprove";

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
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/RevertReleased?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("RevertRelease")]
        public async Task<IActionResult> RevertRelease([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/RevertRelease";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        [HttpGet("GetRevertDetails")]
        public async Task<IActionResult> GetRevertDetails(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/GetRevertDetails?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        [HttpPost("SubmitRevert")]
        public async Task<IActionResult> SaveTicketReturn([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/SubmitRevert";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        [HttpGet("GetNewReleases")]
        public async Task<IActionResult> GetNewReleases(int empCode)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/GetNewReleases?empCode={empCode}";

            var response = await client.GetAsync(url);

            return await HandleResponse(response);
        }
        [HttpPost("MarkCelebrationSeen")]
        public async Task<IActionResult> MarkCelebrationSeen([FromBody] CelebrationSeenDto request)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/MarkCelebrationSeen";

            var response = await client.PostAsJsonAsync(url, request);

            return await HandleResponse(response);
        }
        [HttpGet("schema-details")]
        public async Task<IActionResult> GetSchemaDetails()
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpRequest/schema-details";

            var response = await client.GetAsync(url);

            return await HandleResponse(response);
        }
    }

}
 