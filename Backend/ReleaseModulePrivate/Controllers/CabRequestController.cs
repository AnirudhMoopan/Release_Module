//----------- CAB TICKET AND CRF , CAB EXP FLOW -------------//

using Azure.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Release_Module.Models;
using ReleaseModule.Data;
using ReleaseModule.Models.Request;
using ReleaseModule.Models.Response;
using System.Linq;

namespace ReleaseModule.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CabRequestController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CabRequestController(ApplicationDbContext context)
        {
            _context = context;
        }
        private string GetStatusLabel(int? status)
        {
            return status switch
            {
                0 => "Return",
                1 => "Requested",
                2 => "Recommended",
                3 => "Verified",
                4 => "Approved",
                5 => "Released",
                6 => "Revert",
                7 => "Revert Recommendation",
                8 => "Revert Verified",
                9 => "Revert Approved",
                10 => "Revert Released"

            };
        }
        // CREATE CAB REQUEST
        [HttpPost("create-cab-request")]
        public async Task<IActionResult> CreateCabRequest([FromForm] CabRequestDto request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Subject) ||
                     string.IsNullOrEmpty(request.ChangesToBeMade) ||
                    !Enum.IsDefined(typeof(ReqType), request.RequirementType))
                {
                    return BadRequest(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "Required fields are missing"
                    });
                }

                if (request.UatSignoffDocument == null || request.ProdReleaseDoc == null)
                {
                    return BadRequest(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "Files are required"
                    });
                }

                var uatFile = await ConvertToBytes(request.UatSignoffDocument);
                var prodFile = await ConvertToBytes(request.ProdReleaseDoc);
                var nextReleaseDate = GetCabReleaseDate(DateTime.Now);
                var entity = new CabRequest
                {
                    CrfId = request.CrfId,
                    UserId = request.UserId,
                    Subject = request.Subject,
                    ChangesToBeMade = request.ChangesToBeMade,
                    PublishPath = request.PublishPath,
                    CommitId = request.CommitId,
                    RequirementType = request.RequirementType,

                    UatSignoffDocumentData = uatFile.data,
                    UatFileName = uatFile.fileName,
                    UatContentType = uatFile.contentType,

                    ProductionReleaseDocumentData = prodFile.data,
                    ProdFileName = prodFile.fileName,
                    ProdContentType = prodFile.contentType,

                    DbType = request.DbType,
                    CreatedDate = DateTime.Now,
                    CabReleaseDate = nextReleaseDate,
                    MobileNumber = request.MobileNumber,
                    ReleaseCelebrationSeen = 0,
                    Status = 1
                };

                _context.CabRequests.Add(entity);
                await _context.SaveChangesAsync();

                return Ok(new ExpResponse<object>
                {
                    Success = true,
                    Message = "Success",
                    Data = entity.Id
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return StatusCode(500, new ExpResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = ex.InnerException?.Message
                });
            }
        }

        // ================================
        // FILE UPLOAD METHOD
        // ================================
        private async Task<(byte[] data, string fileName, string contentType)> ConvertToBytes(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return (null, null, null);

            using (var ms = new MemoryStream())
            {
                await file.CopyToAsync(ms);
                return (ms.ToArray(), file.FileName, file.ContentType);
            }
        }
        [HttpGet("GetCabCrfDetails")]
        public async Task<IActionResult> GetCabCrfDetails(int crfId)
        {
            var blockedStatuses = new int?[] { 1, 2, 3, 4, 6, 7, 8, 9 };

            var expRequest = await _context.ExpRequests
                .AsNoTracking()
                .Where(x => x.CrfId == crfId && blockedStatuses.Contains(x.Status))
                .Select(x => x.Status)
                .FirstOrDefaultAsync();

            var cabRequest = await _context.CabRequests
                .AsNoTracking()
                .Where(x => x.CrfId == crfId && blockedStatuses.Contains(x.Status))
                .Select(x => x.Status)
                .FirstOrDefaultAsync();

            if (expRequest != null || cabRequest != null)
            {
                string statusText = "";

                if (expRequest != null && cabRequest != null)
                    statusText = $"EXP - {GetStatusLabel(expRequest)} , CAB - {GetStatusLabel(cabRequest)}";
                else if (expRequest != null)
                    statusText = $"EXP - {GetStatusLabel(expRequest)}";
                else
                    statusText = $"CAB - {GetStatusLabel(cabRequest)}";

                return Ok(new ExpResponse<object>
                {
                    Success = false,
                    Message = $"Release is currently in progress. Status: {statusText}"
                });
            }

            var raw = (from t in _context.CrfMasters
                       join s in _context.CrfStatusMasters
                       on t.StatusId equals s.StatusId
                       where t.CrfId == crfId && t.StatusId >= 15   
                       && t.StatusId <= 19
                       select new
                       {
                           ProjectName = t.Subject,
                           Description = t.Description,
                           Status = s.StatusName,
                           TargetDate = t.UserTargetDate,
                           QaStatus = t.StatusId >= 14 ? "QA COMPLETED" : "NO QA"
                       }).FirstOrDefault();

            if (raw == null)
            {
                return NotFound(new ExpResponse<object>
                {
                    Success = false,
                    Message = "CRF NOT FOUND"
                });
            }

            var baseDate = raw.TargetDate ?? DateTime.Now;

            var targetYear = baseDate.Year;
            var nextReleaseDate = GetCabReleaseDate(DateTime.Now);

            return Ok(new ExpResponse<object>
            {
                Success = true,
                Message = "Success",
                Data = new
                {
                    raw.ProjectName,
                    raw.Description,
                    raw.Status,
                    TargetDate = raw.TargetDate?.ToString("dd-MM-yyyy"),
                    raw.QaStatus,

                    NextReleaseDay = nextReleaseDate.DayOfWeek.ToString(),
                    NextReleaseDate = nextReleaseDate.ToString("dd-MM-yyyy"),

                   
                }
            });
        }

        // ================================
        // GET CAB CRF DETAILS
        // ================================
        [HttpGet("GetCabTicketDetails")]
        public async Task<IActionResult> GetCabTicketDetails(int ticketId)
        {
            try
            {
                var blockedStatuses = new int?[] { 1, 2, 3, 4, 6, 7, 8, 9 };
                var inProgressRequest = await _context.TicketRequests
                    .AsNoTracking()
                    .Where(x => x.TicketId == ticketId && blockedStatuses.Contains(x.Status))
                    .Select(x => new { x.Status, x.CabExp })
                    .FirstOrDefaultAsync();

                if (inProgressRequest != null)
                {
                    var type = inProgressRequest.CabExp?.ToUpper() == "EXP" ? "EXP" : "CAB";
                    return Ok(new ExpResponse<object>
                    {
                        Success = false,
                        Message = $"Release is currently in progress. Status: {type} - {GetStatusLabel(inProgressRequest.Status)}"
                    });
                }

                var validRoles = new[] { "DEV", "TL" };

                var validIds = _context.TblTeamDtls
                    .Where(x => validRoles.Contains(x.Role))
                    .Select(x => x.EmpCode)
                    .ToList()
                    .Where(x => int.TryParse(x, out _))
                    .Select(int.Parse)
                    .ToList();

                var rawData = (from t in _context.HelpdeskIssueSrs
                               join s in _context.ReleaseTicketStatuses
                                   on t.StatusId equals s.StatusId
                               where t.IssueSrId == ticketId
                                     && t.StatusId == 1
                                     && t.IssueCategory == 1
                               select new
                               {
                                   CreatedDate = t.CreatedDate,
                                   DescIssue = t.DescIssue,
                                   ProblemDesc = t.ProblemDesc,
                                   StatusDescr = s.Descr,
                                   TechAssigned = t.TechAssigned
                               }).FirstOrDefault();

                if (rawData == null || !rawData.TechAssigned.HasValue)
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NO DATA FOUND"
                    });
                }

                int techAssigned = rawData.TechAssigned.Value;
                bool isValidDev = false;

                if (validIds.Contains(techAssigned))
                {
                    isValidDev = true;
                }
                else
                {
                    var techStr = techAssigned.ToString();

                    if (techStr.StartsWith("1"))
                    {
                        var mapped = int.Parse("8" + techStr.Substring(1));
                        if (validIds.Contains(mapped))
                        {
                            isValidDev = true;
                        }
                    }

                    if (techStr.StartsWith("3"))
                    {
                        isValidDev = true;
                    }
                }

                if (!isValidDev)
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NOT A VALID DEVELOPER/TL"
                    });
                }

                var nextReleaseDate = GetCabReleaseDate(DateTime.Now);
                return Ok(new ExpResponse<object>
                {
                    Success = true,
                    Message = "Success",
                    Data = new
                    {
                        CreatedDate = rawData.CreatedDate?.ToString("dd-MM-yyyy"),
                        rawData.DescIssue,
                        rawData.ProblemDesc,
                        Status = rawData.StatusDescr,
                        NextReleaseDay = nextReleaseDate.DayOfWeek.ToString(),
                        NextReleaseDate = nextReleaseDate.ToString("dd-MM-yyyy")
                    }
                });
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
        private DateTime GetCabReleaseDate(DateTime now)
        {
            var today = now.Date;
            var day = today.DayOfWeek;

            if (day == DayOfWeek.Saturday ||
                day == DayOfWeek.Sunday ||
                day == DayOfWeek.Monday ||
                day == DayOfWeek.Tuesday)
            {
                // Sat - Tue = Thursday
                return GetNextDay(today, DayOfWeek.Thursday);
            }
            else
            {
                // Wed - Fri = Monday
                return GetNextDay(today, DayOfWeek.Monday);
            }
        }
        //---------------- TICKET CAB EXP --------------//
        [HttpPost("create-cabexpticket-request")]
        public async Task<IActionResult> CreateCabExpTicketRequest([FromForm] CabExpTicketRequestDto request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Subject) ||
                     string.IsNullOrEmpty(request.ChangesToBeMade) ||
                    !Enum.IsDefined(typeof(ReqType), request.RequirementType))
                {
                    return BadRequest(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "Required fields are missing"
                    });
                }

                if (request.UatSignoffDocument == null || request.ProdReleaseDoc == null)
                {
                    return BadRequest(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "Files are required"
                    });
                }

                var uatFile = await ConvertToBytes(request.UatSignoffDocument);
                var prodFile = await ConvertToBytes(request.ProdReleaseDoc);
                var nextReleaseDate = GetCabReleaseDate(DateTime.Now);

                var entity = new TicketRequest
                {
                    TicketId = request.TicketId,
                    UserId = request.UserId,
                    Subject = request.Subject,
                    ChangesToBeMade = request.ChangesToBeMade,
                    PublishPath = request.PublishPath,
                    CommitId = request.CommitId,
                    RequirementType = request.RequirementType,
                    CabExp = request.CabExp,

                    UatSignoffDocumentData = uatFile.data,
                    UatFileName = uatFile.fileName,
                    UatContentType = uatFile.contentType,

                    ProductionReleaseDocumentData = prodFile.data,
                    ProdFileName = prodFile.fileName,
                    ProdContentType = prodFile.contentType,

                    DbType = request.DbType,
                    CreatedDate = DateTime.Now,
                    CabReleaseDate = nextReleaseDate,
                    MobileNumber = request.MobileNumber,
                    ReleaseCelebrationSeen = 0,
                    Status = 1
                };

                _context.TicketRequests.Add(entity);
                await _context.SaveChangesAsync();

                return Ok(new ExpResponse<object>
                {
                    Success = true,
                    Message = "Success",
                    Data = entity.Id
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return StatusCode(500, new ExpResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = ex.InnerException?.Message
                });
            }
        }
        private DateTime GetNextDay(DateTime start, DayOfWeek targetDay)
        {
            int daysToAdd = ((int)targetDay - (int)start.DayOfWeek + 7) % 7;

            if (daysToAdd == 0)
                daysToAdd = 7; 

            return start.AddDays(daysToAdd);
        }

        [HttpGet("GetTicketDetails")]
        public async Task<IActionResult> GetTicketDetails(int ticketId)
        {
            try
            {
                var blockedStatuses = new int?[] { 1, 2, 3, 4, 6, 7, 8, 9 };
                var inProgressRequest = await _context.TicketRequests
                    .AsNoTracking()
                    .Where(x => x.TicketId == ticketId && blockedStatuses.Contains(x.Status))
                    .Select(x => new { x.Status, x.CabExp })
                    .FirstOrDefaultAsync();

                if (inProgressRequest != null)
                {
                    var type = string.Equals(inProgressRequest.CabExp, "EXP", StringComparison.OrdinalIgnoreCase)
                        ? "EXP"
                        : "CAB";
                    return Ok(new ExpResponse<object>
                    {
                        Success = false,
                        Message = $"Release is currently in progress. Status: {type} - {GetStatusLabel(inProgressRequest.Status)}"
                    });
                }

                var validRoles = new[] { "DEV", "TL" };

                var validIds = _context.TblTeamDtls
                    .Where(x => validRoles.Contains(x.Role))
                    .Select(x => x.EmpCode)
                    .ToList()
                    .Where(x => int.TryParse(x, out _))
                    .Select(int.Parse)
                    .ToList();

                var rawData = await (from t in _context.HelpdeskIssueSrs
                                     join s in _context.ReleaseTicketStatuses
                                         on t.StatusId equals s.StatusId
                                     where t.IssueSrId == ticketId
                                           && t.StatusId == 1
                                           && t.IssueCategory == 1
                                     select new
                                     {
                                         CreatedDate = t.CreatedDate,
                                         DescIssue = t.DescIssue,
                                         ProblemDesc = t.ProblemDesc,
                                         StatusDescr = s.Descr,
                                         TechAssigned = t.TechAssigned
                                     }).FirstOrDefaultAsync();

                if (rawData == null || !rawData.TechAssigned.HasValue)
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NO DATA FOUND"
                    });
                }

                int techAssigned = rawData.TechAssigned.Value;
                bool isValidDev = false;

                if (validIds.Contains(techAssigned))
                {
                    isValidDev = true;
                }
                else
                {
                    var techStr = techAssigned.ToString();

                    if (techStr.StartsWith("1"))
                    {
                        var mapped = int.Parse("8" + techStr.Substring(1));
                        if (validIds.Contains(mapped))
                        {
                            isValidDev = true;
                        }
                    }

                    if (techStr.StartsWith("3"))
                    {
                        isValidDev = true;
                    }
                }

                if (!isValidDev)
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NOT A VALID DEVELOPER/TL"
                    });
                }

                return Ok(new ExpResponse<object>
                {
                    Success = true,
                    Message = "Success",
                    Data = new
                    {
                        CreatedDate = rawData.CreatedDate?.ToString("dd-MM-yyyy"),
                        rawData.DescIssue,
                        rawData.ProblemDesc,
                        Status = rawData.StatusDescr
                    }
                });
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

        // ─────────────────────────────────────────────
        // STEP 1: GET RECOMMENDATION
        // ─────────────────────────────────────────────
        [HttpGet("TicketRecommendation")]
        public async Task<IActionResult> TicketRecommendation([FromQuery] string empCode)
        {
            try
            {

                var tl = await _context.TblTeamDtls
     .FirstOrDefaultAsync(x => x.EmpCode == empCode && x.Role == "TL" && x.Status == 1);

                if (tl == null)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "NOT A TL",
                        data = new List<object>()
                    });
                }


                var devEmpCodes = await _context.TblTeamDtls
                    .Where(x => x.ParentId == tl.Id && x.Role == "DEV" && x.Status == 1)
                    .Select(x => x.EmpCode)
                    .ToListAsync();


                var devIds = devEmpCodes.Select(int.Parse).ToList();


                var data = await (from r in _context.TicketRequests
                                  join t in _context.HelpdeskIssueSrs
                                      on r.TicketId equals t.IssueSrId
                                  join s in _context.ReleaseTicketStatuses
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
                                  on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 1 && devIds.Contains(r.UserId.Value)
                                        && r.CabExp == "EXP"       
                                  orderby r.CreatedDate descending
                                  select new
                                  {
                                      r.TicketId,
                                      r.ReqId,
                                      r.UserId,
                                      UserName = e.EmpName,
                                      ProjectName = t.DescIssue,
                                      Description = t.ProblemDesc,
                                      StatusName = s.Descr,
                                      TargetDate = t.CreatedDate,
                                      t.StatusId,

                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.ReasonForExpedite,
                                      r.RequirementType,
                                      r.UatSignoffDocumentData,
                                      r.ProductionReleaseDocumentData,
                                      r.CabReleaseDate
                                  }).ToListAsync();

                if (data == null || data.Count == 0)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "No request found"
                    });
                }

                var result = data.Select(x => new
                {
                    ticketId = x.TicketId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",

                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    reasonForExpedite = x.ReasonForExpedite,
                    requirementType = x.RequirementType,
                    uatSignoffDocument = x.UatSignoffDocumentData,
                    productionReleaseDocument = x.ProductionReleaseDocumentData,
                    CabReleaseDate = x.CabReleaseDate
                });

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }


        [HttpPost("SaveTicketRecommendation")]
        public async Task<IActionResult> SaveTicketRecommendation([FromBody] TicketRecommendationDto model)
        {
            try
            {

                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 1);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                request.RecommendedBy = model.RecommendedBy;
                request.RecommendedDate = DateTime.Now;
                request.RecommenderComment = model.RecommenderComment;
                request.Status = 2; // RECOMMENDED)

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Success"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        // ─────────────────────────────────────────────
        // STEP 2: GET VERIFY
        // ─────────────────────────────────────────────
        [HttpGet("TicketVerify")]
        public async Task<IActionResult> GetTicketVerify([FromQuery] string empCode)
        {
            try
            {

                var spm = await _context.TblTeamDtls
       .FirstOrDefaultAsync(x => x.EmpCode == empCode && x.Role == "SPM" && x.Status == 1);

                if (spm == null)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "NOT AN SPM",
                        data = new List<object>()
                    });
                }

                var tlIds = await _context.TblTeamDtls
                    .Where(x => x.ParentId == spm.Id && x.Role == "TL" && x.Status == 1)
                    .Select(x => x.Id)
                    .ToListAsync();

                var devEmpCodes = await _context.TblTeamDtls
                .Where(x => x.ParentId.HasValue
              && tlIds.Contains(x.ParentId.Value)
              && x.Role == "DEV"
              && x.Status == 1)
              .Select(x => x.EmpCode)
             .ToListAsync();

                var devIds = devEmpCodes.Select(int.Parse).ToList();



                var data = await (from r in _context.TicketRequests
                                  join t in _context.HelpdeskIssueSrs
                                      on r.TicketId equals t.IssueSrId
                                  join s in _context.ReleaseTicketStatuses
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 2 && devIds.Contains(r.UserId.Value)
                                        && r.CabExp == "EXP"
                                  orderby r.CreatedDate descending
                                  select new
                                  {
                                      r.TicketId,
                                      r.ReqId,
                                      r.UserId,
                                      UserName = e.EmpName,
                                      ProjectName = t.DescIssue,
                                      Description = t.ProblemDesc,
                                      StatusName = s.Descr,
                                      TargetDate = t.CreatedDate,
                                      t.StatusId,
                                      r.RecommenderComment,
                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.ReasonForExpedite,
                                      r.RequirementType,
                                      r.UatSignoffDocumentData,
                                      r.ProductionReleaseDocumentData,
                                      r.CabReleaseDate
                                  }).ToListAsync();

                if (data == null || data.Count == 0)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "No request found"
                    });
                }

                var result = data.Select(x => new
                {
                    ticketId = x.TicketId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",
                    recommenderComment = x.RecommenderComment,
                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    reasonForExpedite = x.ReasonForExpedite,
                    requirementType = x.RequirementType,
                    uatSignoffDocument = x.UatSignoffDocumentData,
                    productionReleaseDocument = x.ProductionReleaseDocumentData,
                    CabReleaseDate = x.CabReleaseDate

                });

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        [HttpPost("TicketVerify")]
        public async Task<IActionResult> SaveTicketVerify([FromBody] TicketVerifyDto model)
        {
            try
            {

                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 2);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                request.Approver1By = model.Approver1By;
                request.Approver1Date = DateTime.Now;
                request.Approver1Comment = model.Approver1Comment;
                request.Status = 3; // VERIFIED)

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Success"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }


        // ─────────────────────────────────────────────
        // STEP 3: GET APPROVER
        // ─────────────────────────────────────────────
        [HttpGet("TicketApprove")]
        public async Task<IActionResult> GetTicketApprove([FromQuery] string empCode)
        {
            try
            {

                var isApprover = await _context.ApprovalFlows
                    .AnyAsync(a => a.StepOrder == 3 && a.EmpCode == empCode);

                if (!isApprover)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "NO DATA FOUND FOR APPROVER",
                        data = new List<object>()
                    });
                }

                var data = await (from r in _context.TicketRequests
                                  join t in _context.HelpdeskIssueSrs
                                      on r.TicketId equals t.IssueSrId
                                  join s in _context.ReleaseTicketStatuses
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 3
                                        && r.CabExp == "EXP"
                                  orderby r.CreatedDate descending
                                  select new
                                  {
                                      r.TicketId,
                                      r.ReqId,
                                      r.UserId,
                                      UserName = e.EmpName,
                                      ProjectName = t.DescIssue,
                                      Description = t.ProblemDesc,
                                      StatusName = s.Descr,
                                      TargetDate = t.CreatedDate,
                                      t.StatusId,
                                      r.Approver1Comment,
                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.ReasonForExpedite,
                                      r.RequirementType,
                                      r.UatSignoffDocumentData,
                                      r.ProductionReleaseDocumentData,
                                      r.CabReleaseDate
                                  }).ToListAsync();

                if (data == null || data.Count == 0)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "No request found"
                    });
                }

                var result = data.Select(x => new
                {
                    ticketId = x.TicketId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",
                    verifierComment = x.Approver1Comment,
                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    reasonForExpedite = x.ReasonForExpedite,
                    requirementType = x.RequirementType,
                    uatSignoffDocument = x.UatSignoffDocumentData,
                    productionReleaseDocument = x.ProductionReleaseDocumentData,
                    CabReleaseDate = x.CabReleaseDate
                });

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        [HttpPost("TicketApprove")]
        public async Task<IActionResult> SaveTicketApprove([FromBody] TicketVerifyDto model)
        {
            try
            {

                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 3);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                
                request.Approver2By = model.Approver1By;
                request.Approver2Date = DateTime.Now;
                request.Approver2Comment = model.Approver1Comment;
                request.Status = 4; // APPROVED)

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Success"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }


        // ─────────────────────────────────────────────
        //  GET RELEASED
        // ─────────────────────────────────────────────
        [HttpGet("TicketReleased")]
        public async Task<IActionResult> GetTicketReleased([FromQuery] string empCode)
        {
            try
            {

                var isReleaser = await _context.ApprovalFlows
                    .AnyAsync(a => a.StepOrder == 4 && a.EmpCode == empCode);

                if (!isReleaser)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "NO DATA FOUND FOR APPROVER",
                        data = new List<object>()
                    });
                }

                var data = await (from r in _context.TicketRequests
                                  join t in _context.HelpdeskIssueSrs
                                      on r.TicketId equals t.IssueSrId
                                  join s in _context.ReleaseTicketStatuses
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 4
                                        && r.CabExp == "EXP"
                                  orderby r.CreatedDate descending
                                  select new
                                  {
                                      r.TicketId,
                                      r.ReqId,
                                      r.UserId,
                                      UserName = e.EmpName,
                                      ProjectName = t.DescIssue,
                                      Description = t.ProblemDesc,
                                      StatusName = s.Descr,
                                      TargetDate = t.CreatedDate,
                                      t.StatusId,

                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.ReasonForExpedite,
                                      r.RequirementType,
                                      r.UatSignoffDocumentData,
                                      r.ProductionReleaseDocumentData,
                                      r.CabReleaseDate,
                                      r.MobileNumber,
                                      r.DbAssignedTo,
                                      r.AppAssignedTo,
                                      r.AppReleasedBy,
                                      r.DbReleasedBy
                                  }).ToListAsync();

                if (data == null || data.Count == 0)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "No request found"
                    });
                }

                var result = data.Select(x => new
                {
                    ticketId = x.TicketId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",

                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    reasonForExpedite = x.ReasonForExpedite,
                    requirementType = x.RequirementType,
                    uatSignoffDocument = x.UatSignoffDocumentData,
                    productionReleaseDocument = x.ProductionReleaseDocumentData,
                    cabReleaseDate = x.CabReleaseDate,
                    mobileNumber = x.MobileNumber,
                    dbAssignedTo = x.DbAssignedTo,
                    appAssignedTo = x.AppAssignedTo,
                    appReleasedBy = x.AppReleasedBy ?? "N/A",
                    dbReleasedBy = x.DbReleasedBy ?? "N/A"
                });

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        [HttpPost("TicketRelease")]
        public async Task<IActionResult> SaveTicketRelease([FromBody] TicketVerifyDto model)
        {
            try
            {
                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId
                                           && r.UserId == model.UserId
                                           && r.Status == 4);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                if (!Enum.IsDefined(typeof(ReqType), request.RequirementType))
                {
                    return Ok(new { success = false, message = "Invalid RequirementType" });
                }

                var type = (ReqType)request.RequirementType;

                var approval = await _context.ApprovalFlows
                    .FirstOrDefaultAsync(a => a.StepOrder == 4
                                          && a.EmpCode == model.Approver1By);

                if (approval == null)
                {
                    return Ok(new { success = false, message = "Not authorized" });
                }

                string role = approval.RoleStatus?.ToUpper();

                //  DB ONLY
                if (type == ReqType.DB)
                {
                    if (!string.IsNullOrEmpty(request.DbReleasedBy))
                        return Ok(new { success = false, message = "DB already released" });

                    request.DbReleasedBy = model.Approver1By;
                    request.DbReleasedDate = DateTime.Now;
                    request.DbReleasedComment = model.Approver1Comment;

                    request.Status = 5;
                }

                //  APP ONLY
                else if (type == ReqType.APP)
                {
                    if (!string.IsNullOrEmpty(request.AppReleasedBy))
                        return Ok(new { success = false, message = "APP already released" });

                    request.AppReleasedBy = model.Approver1By;
                    request.AppReleasedDate = DateTime.Now;
                    request.AppReleasedComment = model.Approver1Comment;

                    request.Status = 5;
                }

                //  DUAL (DB + APP)
                
                else if (type == ReqType.DUAL)
                {
                    if (role == "DB_RELEASE")
                    {
                        if (!string.IsNullOrEmpty(request.DbReleasedBy))
                            return Ok(new { success = false, message = "DB already released" });

                        request.DbReleasedBy = model.Approver1By;
                        request.DbReleasedDate = DateTime.Now;
                        request.DbReleasedComment = model.Approver1Comment;
                    }
                    else if (role == "APP_RELEASE")
                    {
                        if (!string.IsNullOrEmpty(request.AppReleasedBy))
                            return Ok(new { success = false, message = "APP already released" });

                        request.AppReleasedBy = model.Approver1By;
                        request.AppReleasedDate = DateTime.Now;
                        request.AppReleasedComment = model.Approver1Comment;
                    }
                    else
                    {
                        return Ok(new { success = false, message = "Invalid role" });
                    }

                    if (request.Status != 5 &&
                        !string.IsNullOrEmpty(request.DbReleasedBy) &&
                        !string.IsNullOrEmpty(request.AppReleasedBy))
                    {
                        request.Status = 5;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = request.Status == 5
                        ? "Fully Released"
                        : "Partially Released"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }
        //---------- RETURN ------------//
        [HttpPost("TicketReturn")]
        public async Task<IActionResult> SaveTicketReturn([FromBody] TicketVerifyDto model)
        {
            try
            {

                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId && r.UserId == model.UserId);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                request.ReturnBy = model.Approver1By;
                request.ReturnDate = DateTime.Now;
                request.ReturnComment = model.Approver1Comment;
                request.Status = 0; // RETURN)

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Success"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }


        //------------------------------------------------------------------------------------------------------------------

        // ─────────────────────────────────────────────
        // STEP 1: GET RECOMMENDATION 
        // ─────────────────────────────────────────────
        [HttpGet("CabCrfRecommendation")]
        public async Task<IActionResult> CabCrfRecommendation([FromQuery] string empCode)
        {
            try
            {

                var tl = await _context.TblTeamDtls
     .FirstOrDefaultAsync(x => x.EmpCode == empCode && x.Role == "TL" && x.Status == 1);

                if (tl == null)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "NOT A TL",
                        data = new List<object>()
                    });
                }


                var devEmpCodes = await _context.TblTeamDtls
                    .Where(x => x.ParentId == tl.Id && x.Role == "DEV" && x.Status == 1)
                    .Select(x => x.EmpCode)
                    .ToListAsync();


                var devIds = devEmpCodes.Select(int.Parse).ToList();


                var data = await (from r in _context.CabRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 1 && devIds.Contains(r.UserId.Value)
                                  orderby r.CreatedDate descending
                                  select new
                                  {
                                      r.CrfId,
                                      r.ReqId,
                                      r.UserId,
                                      UserName = e.EmpName,
                                      ProjectName = t.Subject,
                                      Description = t.Description,
                                      StatusName = s.StatusName,
                                      TargetDate = t.UserTargetDate,
                                      t.StatusId,

                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.RequirementType,
                                      r.UatSignoffDocumentData,
                                      r.ProductionReleaseDocumentData
                                  }).ToListAsync();

                if (data == null || data.Count == 0)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "No request found"
                    });
                }

                var result = data.Select(x => new
                {
                    crfId = x.CrfId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",

                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    requirementType = x.RequirementType,
                    uatSignoffDocument = x.UatSignoffDocumentData,
                    productionReleaseDocument = x.ProductionReleaseDocumentData
                });

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }


        [HttpPost("CabCrfRecommendation")]
        public async Task<IActionResult> CabCrfRecommendation([FromBody] RecommendationDto model)
        {
            try
            {

                var request = await _context.CabRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 1);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                request.RecommendedBy = model.RecommendedBy;
                request.RecommendedDate = DateTime.Now;
                request.RecommenderComment = model.RecommenderComment;
                request.Status = 2; // RECOMMENDED)

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Success"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        // ─────────────────────────────────────────────
        // STEP 2: GET VERIFY 
        // ─────────────────────────────────────────────
        [HttpGet("CabCrfVerify")]
        public async Task<IActionResult> CabCrfVerify([FromQuery] string empCode)
        {
            try
            {

                var spm = await _context.TblTeamDtls
       .FirstOrDefaultAsync(x => x.EmpCode == empCode && x.Role == "SPM" && x.Status == 1);

                if (spm == null)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "NOT AN SPM",
                        data = new List<object>()
                    });
                }

                var tlIds = await _context.TblTeamDtls
                    .Where(x => x.ParentId == spm.Id && x.Role == "TL" && x.Status == 1)
                    .Select(x => x.Id)
                    .ToListAsync();

                var devEmpCodes = await _context.TblTeamDtls
                .Where(x => x.ParentId.HasValue
              && tlIds.Contains(x.ParentId.Value)
              && x.Role == "DEV"
              && x.Status == 1)
              .Select(x => x.EmpCode)
             .ToListAsync();

                var devIds = devEmpCodes.Select(int.Parse).ToList();


                var data = await (from r in _context.CabRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 2 && devIds.Contains(r.UserId.Value)
                                  orderby r.CreatedDate descending
                                  select new
                                  {
                                      r.CrfId,
                                      r.ReqId,
                                      r.UserId,
                                      UserName = e.EmpName,
                                      ProjectName = t.Subject,
                                      Description = t.Description,
                                      StatusName = s.StatusName,
                                      TargetDate = t.UserTargetDate,
                                      t.StatusId,
                                      r.RecommenderComment,
                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.RequirementType,
                                      r.UatSignoffDocumentData,
                                      r.ProductionReleaseDocumentData
                                  }).ToListAsync();

                if (data == null || data.Count == 0)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "No request found"
                    });
                }

                var result = data.Select(x => new
                {
                    crfId = x.CrfId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",
                    recommenderComment = x.RecommenderComment,
                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    requirementType = x.RequirementType,
                    uatSignoffDocument = x.UatSignoffDocumentData,
                    productionReleaseDocument = x.ProductionReleaseDocumentData
                });

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        [HttpPost("CabCrfVerify")]
        public async Task<IActionResult> CabCrfVerify([FromBody] VerifyDto model)
        {
            try
            {

                var request = await _context.CabRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 2);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                request.Approver1By = model.Approver1By;
                request.Approver1Date = DateTime.Now;
                request.Approver1Comment = model.Approver1Comment;
                request.Status = 3; // VERIFIED)

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Success"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        // ─────────────────────────────────────────────
        //  GET APPROVER
        // ─────────────────────────────────────────────
        [HttpGet("CabCrfApprove")]
        public async Task<IActionResult> CabCrfApprove([FromQuery] string empCode)
        {
            try
            {
               

                var isApprover = await _context.ApprovalFlows
                    .AnyAsync(a => a.StepOrder == 3 && a.EmpCode == empCode);

                if (!isApprover)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "NO DATA FOUND FOR APPROVER",
                        data = new List<object>()
                    });
                }

                var data = await (from r in _context.CabRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 3
                                  orderby r.CreatedDate descending
                                  select new
                                  {
                                      r.CrfId,
                                      r.ReqId,
                                      r.UserId,
                                      UserName = e.EmpName,
                                      ProjectName = t.Subject,
                                      Description = t.Description,
                                      StatusName = s.StatusName,
                                      TargetDate = t.UserTargetDate,
                                      t.StatusId,
                                      r.Approver1Comment,
                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.RequirementType,
                                      r.UatSignoffDocumentData,
                                      r.ProductionReleaseDocumentData
                                  }).ToListAsync();

                if (data == null || data.Count == 0)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "No request found"
                    });
                }

                var result = data.Select(x => new
                {
                    crfId = x.CrfId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",
                    verifierComment = x.Approver1Comment,
                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    requirementType = x.RequirementType,
                    uatSignoffDocument = x.UatSignoffDocumentData,
                    productionReleaseDocument = x.ProductionReleaseDocumentData
                });

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        [HttpPost("CabCrfApprove")]
        public async Task<IActionResult> CabCrfApprove([FromBody] VerifyDto model)
        {
            try
            {

                var request = await _context.CabRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 3);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }
                
                request.Approver2By = model.Approver1By;
                request.Approver2Date = DateTime.Now;
                request.Approver2Comment = model.Approver1Comment;
                request.Status = 4; // APPROVED)

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Success"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }


        // ─────────────────────────────────────────────
        // GET RELEASED
        // ─────────────────────────────────────────────
        [HttpGet("CabCrfReleased")]
        public async Task<IActionResult> CabCrfReleased([FromQuery] string empCode)
        {
            try
            {

                var isReleaser = await _context.ApprovalFlows
                    .AnyAsync(a => a.StepOrder == 4 && a.EmpCode == empCode);

                if (!isReleaser)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "NO DATA FOUND FOR RELEASER",
                        data = new List<object>()
                    });
                }
                var empDict = await _context.ApprovalFlows
     .AsNoTracking()
     .ToDictionaryAsync(
         x => x.EmpCode,          
         x => x.EmpName ?? "N/A"
     );

                string GetName(string code)
                {
                    if (string.IsNullOrWhiteSpace(code))
                        return "N/A";

                    return empDict.TryGetValue(code, out var name)
                        ? name
                        : code;
                }
                var data = await (from r in _context.CabRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
                                  on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 4
                                  orderby r.CreatedDate descending
                                  select new
                                  {
                                      r.CrfId,
                                      r.ReqId,
                                      r.UserId,
                                      UserName = e.EmpName,
                                      ProjectName = t.Subject,
                                      Description = t.Description,
                                      StatusName = s.StatusName,
                                      TargetDate = t.UserTargetDate,
                                      t.StatusId,

                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.RequirementType,
                                      r.UatSignoffDocumentData,
                                      r.ProductionReleaseDocumentData,
                                      r.MobileNumber,
                                      r.DbAssignedTo,
                                      r.AppAssignedTo,
                                      r.AppReleasedBy,
                                      r.DbReleasedBy
                                  }).ToListAsync();

                if (data == null || data.Count == 0)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "No request found"
                    });
                }

                var result = data.Select(x => new
                {
                    crfId = x.CrfId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",

                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    requirementType = x.RequirementType,
                    uatSignoffDocument = x.UatSignoffDocumentData,
                    productionReleaseDocument = x.ProductionReleaseDocumentData,
                    mobileNumber = x.MobileNumber,
                    dbAssignedTo = x.DbAssignedTo,
                    dbAssignedName = GetName(x.DbAssignedTo),
                    appAssignedTo = x.AppAssignedTo,
                    appAssignedName = GetName(x.AppAssignedTo),
                    appReleasedBy = x.AppReleasedBy ?? "N/A",
                    dbReleasedBy = x.DbReleasedBy ?? "N/A"
                });

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        [HttpPost("CabCrfRelease")]
        public async Task<IActionResult> CabCrfRelease([FromBody] VerifyDto model)
        {
            try
            {
                var request = await _context.CabRequests
                   .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 4);


                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                var type = (ReqType)request.RequirementType;

                var approval = await _context.ApprovalFlows
                    .FirstOrDefaultAsync(a => a.StepOrder == 4
                                          && a.EmpCode == model.Approver1By);

                if (approval == null)
                {
                    return Ok(new { success = false, message = "Not authorized" });
                }

                string role = approval.RoleStatus?.ToUpper();

                //  DB ONLY
                if (type == ReqType.DB)
                {
                    //if (request.DbAssignedTo != model.Approver1By)
                    //    return Ok(new { success = false, message = "You cannot release DB" });

                    if (!string.IsNullOrEmpty(request.DbReleasedBy))
                        return Ok(new { success = false, message = "DB already released" });

                    request.DbReleasedBy = model.Approver1By;
                    request.DbReleasedDate = DateTime.Now;
                    request.DbReleasedComment = model.Approver1Comment;

                    request.DbAssignedTo = null;
                    request.DbAssignedDate = null;

                    request.Status = 5;
                }

                //  APP ONLY
                else if (type == ReqType.APP)
                {
                    if (request.AppAssignedTo != model.Approver1By)
                        return Ok(new { success = false, message = "You cannot release APP" });

                    if (!string.IsNullOrEmpty(request.AppReleasedBy))
                        return Ok(new { success = false, message = "APP already released" });

                    request.AppReleasedBy = model.Approver1By;
                    request.AppReleasedDate = DateTime.Now;
                    request.AppReleasedComment = model.Approver1Comment;

                    request.AppAssignedTo = null;
                    request.AppAssignedDate = null;

                    request.Status = 5;
                }

                //  DB + APP (DUAL)
                else if (type == ReqType.DUAL)
                {
                    if (role == "DB_RELEASE")
                    {
                        if (request.DbAssignedTo != model.Approver1By)
                            return Ok(new { success = false, message = "You cannot release DB" });

                        if (!string.IsNullOrEmpty(request.DbReleasedBy))
                            return Ok(new { success = false, message = "DB already released" });

                        // DB release
                        request.DbReleasedBy = model.Approver1By;
                        request.DbReleasedDate = DateTime.Now;
                        request.DbReleasedComment = model.Approver1Comment;


                    }
                    else if (role == "APP_RELEASE")
                    {
                        if (request.AppAssignedTo != model.Approver1By)
                            return Ok(new { success = false, message = "You cannot release APP" });

                        if (!string.IsNullOrEmpty(request.AppReleasedBy))
                            return Ok(new { success = false, message = "APP already released" });

                        //  APP release
                        request.AppReleasedBy = model.Approver1By;
                        request.AppReleasedDate = DateTime.Now;
                        request.AppReleasedComment = model.Approver1Comment;


                    }
                    else
                    {
                        return Ok(new { success = false, message = "Invalid role" });
                    }

                    if (request.Status != 5 &&
                        !string.IsNullOrEmpty(request.DbReleasedBy) &&
                        !string.IsNullOrEmpty(request.AppReleasedBy))
                    {
                        request.Status = 5;
                    }
                }
                else
                {
                    return Ok(new { success = false, message = "Invalid RequirementType" });
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = request.Status == 5
                        ? "Fully Released"
                        : "Partially Released"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }
        //---------- RETURN ------------//
        [HttpPost("CabCrfReturn")]
        public async Task<IActionResult> CabCrfReturn([FromBody] VerifyDto model)
        {
            try
            {

                var request = await _context.CabRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                request.ReturnBy = model.Approver1By;
                request.ReturnDate = DateTime.Now;
                request.ReturnComment = model.Approver1Comment;
                request.Status = 0; // RETURN)

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Success"
                });
            }
            catch (Exception ex)
            {
                var errors = new List<string>();
                var current = ex;

                while (current != null)
                {
                    errors.Add(current.Message);
                    current = current.InnerException;
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = string.Join(" --> ", errors)
                });
            }
        }

        // ----------- FETCH DETAILS ------------//

        [HttpGet("flow-details")]
        public async Task<IActionResult> GetAllFlowDetails([FromQuery] int empCode)
        {
            try
            {
                var now = DateTime.Now;

                var user = await _context.TblTeamDtls
                    .FirstOrDefaultAsync(x => x.EmpCode == empCode.ToString() && x.Status == 1);

                if (user == null)
                {
                    return Ok(new
                    {
                        success = false,
                        message = "User not found",
                        data = new List<object>()
                    });
                }

                List<int> devIds = new List<int>();

                if (user.Role == "DEV")
                {
                    devIds.Add(empCode);
                }
                else if (user.Role == "TL")
                {
                    var devCodes = await _context.TblTeamDtls
                        .Where(x => x.ParentId == user.Id && x.Role == "DEV" && x.Status == 1)
                        .Select(x => x.EmpCode)
                        .ToListAsync();

                    devIds = devCodes
                        .Where(x => !string.IsNullOrWhiteSpace(x) && int.TryParse(x, out _))
                        .Select(x => int.Parse(x))
                        .ToList();
                }
                else if (user.Role == "SPM")
                {
                    var tlIds = await _context.TblTeamDtls
                        .Where(x => x.ParentId == user.Id && x.Role == "TL" && x.Status == 1)
                        .Select(x => x.Id)
                        .ToListAsync();

                    var devCodes = await _context.TblTeamDtls
                        .Where(x => x.ParentId.HasValue &&
                                    tlIds.Contains(x.ParentId.Value) &&
                                    x.Role == "DEV" &&
                                    x.Status == 1)
                        .Select(x => x.EmpCode)
                        .ToListAsync();

                    devIds = devCodes
                        .Where(x => !string.IsNullOrWhiteSpace(x) && int.TryParse(x, out _))
                        .Select(x => int.Parse(x))
                        .ToList();
                }


                if (!devIds.Any())
                {
                    return Ok(new
                    {
                        success = false,
                        message = "No data access",
                        data = new List<object>()
                    });
                }


                var query = _context.CabRequests
                    .Where(r => r.UserId.HasValue && devIds.Contains(r.UserId.Value))
                    .AsQueryable();

                if (user.Role == "TL")
                {
                    query = query.Where(r => r.Status == 1 && r.RecommendedBy == null);
                }
                else if (user.Role == "SPM")
                {
                    query = query.Where(r => r.Status == 2 && r.Approver1By == null);
                }

                var rawData = await query.AsNoTracking().ToListAsync();

                var empList = await _context.Employee_Master
                    .AsNoTracking()
                    .Select(e => new { e.EmpCode, e.EmpName })
                    .ToListAsync();

                var empDict = empList
                    .GroupBy(e => e.EmpCode.ToString())
                    .ToDictionary(g => g.Key, g => g.First().EmpName ?? "");

                var data = rawData
                    .Select(r =>
                    {
                        empDict.TryGetValue(r.RecommendedBy ?? "", out var empRec);
                        empDict.TryGetValue(r.Approver1By ?? "", out var empApp1);
                        empDict.TryGetValue(r.Approver2By ?? "", out var empApp2);
                        empDict.TryGetValue(r.ReturnBy ?? "", out var empReturn);

                        empDict.TryGetValue(r.RevertRecommendedBy ?? "", out var empRevRec);
                        empDict.TryGetValue(r.RevertApprover1By ?? "", out var empRevApp1);
                        empDict.TryGetValue(r.RevertApprover2By ?? "", out var empRevApp2);
                        empDict.TryGetValue(r.DbReleasedBy ?? "", out var empDbRelease);
                        empDict.TryGetValue(r.AppReleasedBy ?? "", out var empAppRelease);

                        int status = r.Status ?? 0;
                        int type = r.RequirementType;

                        bool isNormal = status >= 1 && status <= 5;
                        bool isRevert = status >= 6 && status <= 10;
                        bool isReturned = status == 0;

                        DateTime? normalDate =
                            type == 1 ? r.DbReleasedDate :
                            type == 2 ? r.AppReleasedDate :
                            r.AppReleasedDate ?? r.DbReleasedDate;

                        DateTime? revertDate =
                            type == 1 ? r.RevertDbReleasedDate :
                            type == 2 ? r.RevertAppReleasedDate :
                            r.RevertAppReleasedDate ?? r.RevertDbReleasedDate;

                        DateTime? finalDate = isRevert ? revertDate : normalDate;

                        return new
                        {
                            r.CrfId,
                            ReqId = r.ReqId,
                            UserId = r.UserId ?? 0,
                            r.Subject,
                            Status = status,
                            RequestedDate = r.CreatedDate,
                            isNormal,
                            isRevert,
                            isReturned,
                            FinalDate = finalDate,
                            NormalReleasedDate = normalDate,
                            RevertReleasedDate = revertDate,
                            ReturnDate = r.ReturnDate,

                            //  NORMAL FLOW
                            NormalFlow = isNormal ? new
                            {
                                Recommended = new
                                {
                                    Name = empRec ?? "N/A",
                                    Date = r.RecommendedDate?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                                    Comment = r.RecommenderComment ?? "N/A"
                                },
                                Approver1 = new
                                {
                                    Name = empApp1 ?? "N/A",
                                    Date = r.Approver1Date?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                                    Comment = r.Approver1Comment ?? "N/A"
                                },
                                Approver2 = new
                                {
                                    Name = empApp2 ?? "N/A",
                                    Date = r.Approver2Date?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                                    Comment = r.Approver2Comment ?? "N/A"
                                },
                                DbRelease = new
                                {
                                    Name = empDbRelease ?? r.DbReleasedBy ?? "N/A",
                                    Date = r.DbReleasedDate?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                                    Comment = r.DbReleasedComment ?? "N/A"
                                },
                                AppRelease = new
                                {
                                    Name = empAppRelease ?? r.AppReleasedBy ?? "N/A",
                                    Date = r.AppReleasedDate?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                                    Comment = r.AppReleasedComment ?? "N/A"
                                }
                            } : null,

                            //  REVERT FLOW
                            RevertFlow = isRevert ? new
                            {
                                RevertComment = r.RevertComment ?? "N/A",
                                RevertDate = r.RevertDate?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",

                                RevertRecommended = new
                                {
                                    Name = empRevRec ?? "N/A",
                                    Date = r.RevertRecommendedDate?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                                    Comment = r.RevertRecommenderComment ?? "N/A"
                                },
                                RevertApprover1 = new
                                {
                                    Name = empRevApp1 ?? "N/A",
                                    Date = r.RevertApprover1Date?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                                    Comment = r.RevertApprover1Comment ?? "N/A"
                                },
                                RevertApprover2 = new
                                {
                                    Name = empRevApp2 ?? "N/A",
                                    Date = r.RevertApprover2Date?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                                    Comment = r.RevertApprover2Comment ?? "N/A"
                                }
                            } : null,

                            //  RETURN FLOW
                            ReturnFlow = isReturned ? new
                            {
                                ReturnBy = empReturn ?? "N/A",
                                ReturnDate = r.ReturnDate?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                                ReturnComment = r.ReturnComment ?? "N/A"
                            } : null,

                            UatSignoffDoc = r.UatSignoffDocumentData != null
                                ? Convert.ToBase64String(r.UatSignoffDocumentData)
                                : null,

                            ProdReleaseDoc = r.ProductionReleaseDocumentData != null
                                ? Convert.ToBase64String(r.ProductionReleaseDocumentData)
                                : null,

                            r.UatFileName,
                            r.UatContentType,
                            r.ProdFileName,
                            r.ProdContentType
                        };
                    })

                   .Where(x =>
                   {
                       if (x.isReturned)
                       {
                           if (!x.ReturnDate.HasValue) return true;
                           return (now - x.ReturnDate.Value).TotalHours <= 24;
                       }

                       if (x.isRevert)
                       {
                           if (!x.RevertReleasedDate.HasValue) return true;
                           return (now - x.RevertReleasedDate.Value).TotalHours <= 24;
                       }

                       if (!x.NormalReleasedDate.HasValue) return true;
                       return (now - x.NormalReleasedDate.Value).TotalHours <= 48;
                   })

                    .Select(x => new
                    {
                        x.CrfId,
                        reqId = x.ReqId,
                        x.UserId,
                        x.Subject,
                        x.Status,
                        requestedDate = x.RequestedDate?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",
                        ReleasedDate = x.FinalDate?.ToString("dd-MM-yyyy HH:mm") ?? "N/A",

                        x.isNormal,
                        x.isRevert,
                        x.isReturned,

                        x.NormalFlow,
                        x.RevertFlow,
                        x.ReturnFlow,

                        x.UatFileName,
                        x.UatContentType,
                        x.ProdFileName,
                        x.ProdContentType,

                        x.UatSignoffDoc,
                        x.ProdReleaseDoc
                    })
                    .OrderByDescending(x => x.CrfId)
                    .ToList();

                return Ok(new
                {
                    success = true,
                    message = data.Count > 0 ? "Success" : "No data",
                    data
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    error = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }
        //---------------- CAB RELEASE CELEBRATION (WHEN RELEASED) -------------------//
        [HttpGet("GetNewReleases")]
        public async Task<IActionResult> GetNewReleases([FromQuery] string empCode)
        {
            var items = await (from r in _context.CabRequests
                               where r.UserId.ToString() == empCode
                                     && r.Status == 5
                                     && (r.ReleaseCelebrationSeen == 0)
                               select new
                               {
                                   r.CrfId,
                                   r.Subject
                               }).ToListAsync();

            return Ok(new
            {
                success = true,
                message = items.Count > 0 ? "New releases found" : "No new releases",
                data = items
            });
        }
        
        [HttpPost("MarkCelebrationSeen")]
        public async Task<IActionResult> MarkCelebrationSeen([FromBody] CelebrationSeenDto model)
        {
            if (model.CrfIds == null || model.CrfIds.Count == 0)
                return Ok(new { success = false, message = "No CRF IDs provided" });

            var requests = await _context.CabRequests
                .Where(r => model.CrfIds.Contains(r.CrfId) && r.Status == 5)
                .ToListAsync();

            foreach (var req in requests)
            {
                req.ReleaseCelebrationSeen = 1;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Success"
            });
        }

    }
}
