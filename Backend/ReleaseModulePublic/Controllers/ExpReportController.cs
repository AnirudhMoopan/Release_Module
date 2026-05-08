using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ReleaseModule.Models.Request;
using System.Text.Json;

namespace ReleaseModulePublic.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExpReportController : ControllerBase
    {
        private readonly IConfiguration _config;

        public ExpReportController(IConfiguration config)
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
        [HttpGet("GetReport")]
        public async Task<IActionResult> GetReport(
     [FromQuery] int status,
     [FromQuery] int userId,
     [FromQuery] string? fromDate,
     [FromQuery] string? toDate)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/GetReport?status={status}&userId={userId}";

            if (!string.IsNullOrWhiteSpace(fromDate))
                url += $"&fromDate={fromDate}";

            if (!string.IsNullOrWhiteSpace(toDate))
                url += $"&toDate={toDate}";

            var response = await client.GetAsync(url);

            return await HandleResponse(response);
        }

        [HttpGet("GetCabReport")]
        public async Task<IActionResult> GetCabReport(
    [FromQuery] int status,
    [FromQuery] int userId,
    [FromQuery] string? fromDate,
    [FromQuery] string? toDate)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/GetCabReport?status={status}&userId={userId}";

            if (!string.IsNullOrWhiteSpace(fromDate))
                url += $"&fromDate={fromDate}";

            if (!string.IsNullOrWhiteSpace(toDate))
                url += $"&toDate={toDate}";

            var response = await client.GetAsync(url);

            return await HandleResponse(response);
        }
        [HttpGet("GetTicketReport")]
        public async Task<IActionResult> GetTicketReport(
    [FromQuery] int status,
    [FromQuery] int userId,
    [FromQuery] string? fromDate,
    [FromQuery] string? toDate)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/GetTicketReport?status={status}&userId={userId}";

            if (!string.IsNullOrWhiteSpace(fromDate))
                url += $"&fromDate={fromDate}";

            if (!string.IsNullOrWhiteSpace(toDate))
                url += $"&toDate={toDate}";

            var response = await client.GetAsync(url);

            return await HandleResponse(response);
        }

        [HttpGet("GetAllReport")]
        public async Task<IActionResult> GetAllReport(
  
   [FromQuery] string? fromDate,
   [FromQuery] string? toDate)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/GetAllReport";

            var queryParams = new List<string>();

            if (!string.IsNullOrWhiteSpace(fromDate))
                queryParams.Add($"fromDate={fromDate}");

            if (!string.IsNullOrWhiteSpace(toDate))
                queryParams.Add($"toDate={toDate}");

            if (queryParams.Any())
                url += "?" + string.Join("&", queryParams);  

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpGet("GetAllTicketReport")]
        public async Task<IActionResult> GetAllTicketReport(

   [FromQuery] string? fromDate,
   [FromQuery] string? toDate)
        {
            var client = GetHttpClient();

            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/GetAllTicketReport";

            var queryParams = new List<string>();

            if (!string.IsNullOrWhiteSpace(fromDate))
                queryParams.Add($"fromDate={fromDate}");

            if (!string.IsNullOrWhiteSpace(toDate))
                queryParams.Add($"toDate={toDate}");

            if (queryParams.Any())
                url += "?" + string.Join("&", queryParams);  

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }


        [HttpGet("Release-summary")]
        public async Task<IActionResult> ReleaseSummary()
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/Release-summary";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
        [HttpGet("Release-total")]
        public async Task<IActionResult> ReleaseTotal([FromQuery] int userId)
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/Release-total?userId={userId}";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpGet("GetCombinedReport")]
        public async Task<IActionResult> GetCombinedReport()
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/GetCombinedReport";

            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }

        [HttpGet("search-by-id")]
        public async Task<IActionResult> SearchById([FromQuery] SearchRequestDto request)
        {
            try
            {
                var queryParams = new List<string>();

                if (!string.IsNullOrWhiteSpace(request.ReqId))
                    queryParams.Add($"reqId={request.ReqId}");

                if (request.CrfId != null)
                    queryParams.Add($"crfId={request.CrfId}");

                if (request.TicketId != null)
                    queryParams.Add($"ticketId={request.TicketId}");

                if (!string.IsNullOrWhiteSpace(request.UserId))
                    queryParams.Add($"userId={request.UserId}");

                if (!queryParams.Any(q => q.StartsWith("reqId") || q.StartsWith("crfId") || q.StartsWith("ticketId")))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Provide at least one of: reqId, crfId, ticketId"
                    });
                }

                var client = GetHttpClient();

                var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/search-by-id?{string.Join("&", queryParams)}";

                var response = await client.GetAsync(url);

                return await HandleResponse(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
        [HttpGet("GetUpcomingReleased")]
        public async Task<IActionResult> GetUpcomingReleased()
        {
            var client = GetHttpClient();
            var url = $"{_config["ApiSettings:BaseUrl"]}/api/ExpReport/GetUpcomingReleased";
            var response = await client.GetAsync(url);
            return await HandleResponse(response);
        }
    }
}
