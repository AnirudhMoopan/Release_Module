using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ReleaseModule.Models.Request;
using ReleaseModule.Models.Response;
using System.Text.Json;

namespace ReleaseModulePublic.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CabRequestController : ControllerBase
    {
        private readonly IConfiguration _config;

        public CabRequestController(IConfiguration config)
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
        // GET CRF DETAILS
        // ================================
        [HttpGet("GetCabCrfDetails")]
        public async Task<IActionResult> GetCrfDetails(int crfId)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/GetCabCrfDetails?crfId={crfId}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        [HttpGet("GetCabTicketDetails")]
        public async Task<IActionResult> GetCabTicketDetails(int ticketId)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/GetCabTicketDetails?ticketId={ticketId}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        [HttpGet("TicketDetails")]
        public async Task<IActionResult> GetTicketDetails(int ticketId)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/GetTicketDetails?ticketId={ticketId}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        // ================================
        // CREATE REQUEST
        // ================================
        [HttpPost("create-cab-request")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateCabRequest([FromForm] CabRequestDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/create-cab-request";
           
            var content = new MultipartFormDataContent();

            content.Add(new StringContent(request.CrfId.ToString()), "CrfId");
            content.Add(new StringContent(request.UserId.ToString()), "UserId");
            content.Add(new StringContent(request.Subject ?? ""), "Subject");
            content.Add(new StringContent(request.ChangesToBeMade ?? ""), "ChangesToBeMade");
            content.Add(new StringContent(request.ReasonForExpedite ?? ""), "ReasonForExpedite");
            content.Add(new StringContent(request.PublishPath ?? ""), "PublishPath");
            content.Add(new StringContent(request.CommitId ?? ""), "CommitId");
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
        // CREATE REQUEST
        // ================================
        [HttpPost("create-cabexpticket-request")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateCabExpTicketRequest([FromForm] CabExpTicketRequestDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/create-cabexpticket-request";

            var content = new MultipartFormDataContent();

            content.Add(new StringContent(request.TicketId.ToString()), "TicketId");
            content.Add(new StringContent(request.UserId.ToString()), "UserId");
            content.Add(new StringContent(request.Subject ?? ""), "Subject");
            content.Add(new StringContent(request.ChangesToBeMade ?? ""), "ChangesToBeMade");
            content.Add(new StringContent(request.PublishPath ?? ""), "PublishPath");
            content.Add(new StringContent(request.CommitId ?? ""), "CommitId");
            content.Add(new StringContent(request.ReasonForExpedite ?? ""), "ReasonForExpedite");
            content.Add(new StringContent(request.RequirementType.ToString()), "RequirementType");
            content.Add(new StringContent(request.DbType ?? ""), "DbType");
            content.Add(new StringContent(request.CabExp ?? ""), "CabExp");
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
        // RECOMMENDATION
        // ================================
        [HttpGet("Recommendation")]
        public async Task<IActionResult> GetRecommendation(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/TicketRecommendation?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("Recommendation")]
        public async Task<IActionResult> SaveRecommendation([FromBody] TicketRecommendationDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/SaveTicketRecommendation";
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
        [HttpGet("TicketVerify")]
        public async Task<IActionResult> GetTicketVerify(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/TicketVerify?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("TicketVerify")]
        public async Task<IActionResult> SaveTicketVerify([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/TicketVerify";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // APPROVE
        // ================================
        [HttpGet("TicketApprove")]
        public async Task<IActionResult> GetTicketApprove(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/TicketApprove?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("TicketApprove")]
        public async Task<IActionResult> SaveTicketApprove([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/TicketApprove";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // RELEASE
        // ================================
        [HttpGet("TicketReleased")]
        public async Task<IActionResult> GetTicketReleased(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/TicketReleased?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("TicketRelease")]
        public async Task<IActionResult> SaveTicketRelease([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/TicketRelease";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // RETURN
        // ================================
        [HttpPost("TicketReturn")]
        public async Task<IActionResult> SaveTicketReturn([FromBody] TicketVerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/TicketReturn";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }
        //--------------------------------------------------------------------------

        // ================================
        // RECOMMENDATION
        // ================================
        [HttpGet("CabCrfRecommendation")]
        public async Task<IActionResult> CabCrfRecommendation(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/CabCrfRecommendation?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("CabCrfRecommendation")]
        public async Task<IActionResult> CabCrfRecommendation([FromBody] RecommendationDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var client = GetHttpClient();
                var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/CabCrfRecommendation";
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
        [HttpGet("CabCrfVerify")]
        public async Task<IActionResult> CabCrfVerify(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/CabCrfVerify?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("CabCrfVerify")]
        public async Task<IActionResult> CabCrfVerify([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/CabCrfVerify";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // APPROVE
        // ================================
        [HttpGet("CabCrfApprove")]
        public async Task<IActionResult> CabCrfApprove(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/CabCrfApprove?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("CabCrfApprove")]
        public async Task<IActionResult> SaveApprove([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/CabCrfApprove";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // RELEASE
        // ================================
        [HttpGet("CabCrfReleased")]
        public async Task<IActionResult> CabCrfReleased(string empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/CabCrfReleased?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpPost("CabCrfRelease")]
        public async Task<IActionResult> CabCrfRelease([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/CabCrfRelease";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        // ================================
        // RETURN
        // ================================
        [HttpPost("CabCrfReturn")]
        public async Task<IActionResult> CabCrfReturn([FromBody] VerifyDto request)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/CabCrfReturn";

            var response = await client.PostAsJsonAsync(url, request);
            return await HandleResponse(response);
        }

        [HttpGet("flow-details")]
        public async Task<IActionResult> GetFlowDetails(int empCode)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/flow-details?empCode={empCode}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpGet("GetNewReleases")]
        public async Task<IActionResult> GetNewReleases(int empCode)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/GetNewReleases?empCode={empCode}";

            var response = await client.GetAsync(url);

            return await HandleResponse(response);
        }
        [HttpPost("MarkCelebrationSeen")]
        public async Task<IActionResult> MarkCelebrationSeen([FromBody] CelebrationSeenDto request)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/CabRequest/MarkCelebrationSeen";

            var response = await client.PostAsJsonAsync(url, request);

            return await HandleResponse(response);
        }
    }
}
