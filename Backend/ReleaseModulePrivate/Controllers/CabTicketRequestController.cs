
// ----- CAB TICKET FLOW (GET) AND REVERT FLOW (GET + POST) --------//

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReleaseModule.Data;
using ReleaseModule.Models.Request;
using ReleaseModule.Models.Response;

namespace ReleaseModule.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CabTicketRequestController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CabTicketRequestController(ApplicationDbContext context)
        {
            _context = context;
        }
       

        // ─────────────────────────────────────────────
        //  GET RECOMMENDATION
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
                                        && r.CabExp == "CAB"
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
                                        && r.CabExp == "CAB"
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
                                        && r.CabExp == "CAB"
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

       
        // ─────────────────────────────────────────────
        // GET RELEASED
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
                                        && r.CabExp == "CAB"
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
                    CabReleaseDate = x.CabReleaseDate,
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

        [HttpPost("SubmitRevert")]
        public async Task<IActionResult> SubmitRevert([FromBody] TicketVerifyDto model)
        {
            try
            {
                var request = await _context.TicketRequests
                     .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId && r.UserId == model.UserId
                                           && r.Status == 5);   

                if (request == null)
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NO RELEASED TICKET FOUND FOR REVERT"
                    });
                }

                request.RevertComment = model.Approver1Comment;
                request.RevertDate = DateTime.Now;
                request.Status = 6;   

                await _context.SaveChangesAsync();

                return Ok(new ExpResponse<object>
                {
                    Success = true,
                    Message = "Success"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ExpResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = ex.InnerException?.Message
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


                var query = _context.TicketRequests
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
                            r.TicketId,
                            ReqId = r.ReqId,
                            UserId = r.UserId ?? 0,
                            r.Subject,
                            Status = status,
                            r.CabExp,
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
                        x.TicketId,
                        reqId = x.ReqId,
                        x.UserId,
                        x.Subject,
                        x.Status,
                        cabExp = x.CabExp,
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
                    .OrderByDescending(x => x.TicketId)
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

        [HttpGet("GetRevertDetails")]
        public async Task<IActionResult> GetRevertDetails([FromQuery] int userId)
        {
            try
            {
                var data = await (from r in _context.TicketRequests
                                  join t in _context.HelpdeskIssueSrs
                                      on r.TicketId equals t.IssueSrId
                                  join s in _context.ReleaseTicketStatuses
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 5
                                        && r.CabExp == "CAB"
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
                                      r.ProductionReleaseDocumentData

                                  }).ToListAsync();

                if (data == null || data.Count == 0)
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NO RELEASED TICKETS FOUND FOR REVERT"
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
                    productionReleaseDocument = x.ProductionReleaseDocumentData
                });

                return Ok(new ExpResponse<object>
                {
                    Success = true,
                    Message = "Success",
                    Data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ExpResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = ex.InnerException?.Message
                });
            }
        }


        // ─────────────────────────────────────────────
        //  GET REVERT RECOMMENDATION
        // ─────────────────────────────────────────────
        [HttpGet("GetRevertRecommendation")]
        public async Task<IActionResult> GetRevertRecommendation([FromQuery] string empCode)
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
                                  where r.Status == 6 && devIds.Contains(r.UserId.Value)
                                        && r.CabExp == "CAB"
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
                                      r.RevertComment,
                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.ReasonForExpedite,
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
                    ticketId = x.TicketId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",
                    revertComment = x.RevertComment,
                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    reasonForExpedite = x.ReasonForExpedite,
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


        [HttpPost("RevertRecommendation")]
        public async Task<IActionResult> RevertRecommendation([FromBody] TicketRecommendationDto model)
        {
            try
            {

                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 6);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                request.RevertRecommendedBy = model.RecommendedBy;
                request.RevertRecommendedDate = DateTime.Now;
                request.RevertRecommenderComment = model.RecommenderComment;
                request.Status = 7; // REVERT RECOMMENDED)

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
        //  GET REVERT VERIFY 
        // ─────────────────────────────────────────────
        [HttpGet("RevertVerify")]
        public async Task<IActionResult> RevertVerify([FromQuery] string empCode)
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
                                  where r.Status == 7 && devIds.Contains(r.UserId.Value)
                                        && r.CabExp == "CAB"
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
                                      r.RevertComment,
                                      r.RevertRecommenderComment,
                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.ReasonForExpedite,
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
                    ticketId = x.TicketId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",
                    revertComment = x.RevertComment,
                    revertRecommenderComment = x.RevertRecommenderComment,
                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    reasonForExpedite = x.ReasonForExpedite,
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

        [HttpPost("SaveRevertVerify")]
        public async Task<IActionResult> SaveRevertVerify([FromBody] TicketVerifyDto model)
        {
            try
            {

                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 7);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                request.RevertApprover1By = model.Approver1By;
                request.RevertApprover1Date = DateTime.Now;
                request.RevertApprover1Comment = model.Approver1Comment;
                request.Status = 8; // REVERT VERIFIED)

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
        [HttpGet("RevertApproved")]
        public async Task<IActionResult> RevertApproved([FromQuery] string empCode)
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
                                  where r.Status == 8
                                        && r.CabExp == "CAB"
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
                                      r.RevertComment,
                                      r.RevertApprover1Comment,
                                      r.Subject,
                                      r.ChangesToBeMade,
                                      r.PublishPath,
                                      r.CommitId,
                                      r.ReasonForExpedite,
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
                    ticketId = x.TicketId,
                    reqId = x.ReqId,
                    userId = x.UserId,
                    userName = x.UserName,
                    projectName = x.ProjectName,
                    description = x.Description,
                    crfStatus = x.StatusName ?? "N/A",
                    targetDate = x.TargetDate?.ToString("dd-MM-yyyy"),
                    qaStatus = x.StatusId >= 14 ? "QA COMPLETED" : "NO QA",
                    revertComment = x.RevertComment,
                    revertVerifierComment = x.RevertApprover1Comment,
                    subject = x.Subject,
                    changesToBeMade = x.ChangesToBeMade,
                    publishPath = x.PublishPath,
                    commitId = x.CommitId,
                    reasonForExpedite = x.ReasonForExpedite,
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

        [HttpPost("RevertApprove")]
        public async Task<IActionResult> RevertApprove([FromBody] TicketVerifyDto model)
        {
            try
            {

                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 8);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Request not found"
                    });
                }

                request.RevertApprover2By = model.Approver1By;
                request.RevertApprover2Date = DateTime.Now;
                request.RevertApprover2Comment = model.Approver1Comment;
                request.Status = 9; // REVERT APPROVED)

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
        [HttpGet("RevertReleased")]
        public async Task<IActionResult> RevertReleased([FromQuery] string empCode)
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
                                  where r.Status == 9
                                        && r.CabExp == "CAB"
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

        [HttpPost("RevertRelease")]
        public async Task<IActionResult> RevertRelease([FromBody] TicketVerifyDto model)
        {
            try
            {
                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId
                                           && r.UserId == model.UserId
                                           && r.Status == 9);

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

                // DB ONLY
                if (type == ReqType.DB)
                {
                    if (!string.IsNullOrEmpty(request.RevertDbReleasedBy))
                        return Ok(new { success = false, message = "DB already reverted" });

                    request.RevertDbReleasedBy = model.Approver1By;
                    request.RevertDbReleasedDate = DateTime.Now;
                    request.RevertDbReleasedComment = model.Approver1Comment;

                    request.Status = 10;
                }

                
                // APP ONLY
                
                else if (type == ReqType.APP)
                {
                    if (!string.IsNullOrEmpty(request.RevertAppReleasedBy))
                        return Ok(new { success = false, message = "APP already reverted" });

                    request.RevertAppReleasedBy = model.Approver1By;
                    request.RevertAppReleasedDate = DateTime.Now;
                    request.RevertAppReleasedComment = model.Approver1Comment;

                    request.Status = 10;
                }

                
                // DB + APP (DUAL)
                else if (type == ReqType.DUAL)
                {
                    if (role == "DB_RELEASE")
                    {
                        if (!string.IsNullOrEmpty(request.RevertDbReleasedBy))
                            return Ok(new { success = false, message = "DB already reverted" });

                        request.RevertDbReleasedBy = model.Approver1By;
                        request.RevertDbReleasedDate = DateTime.Now;
                        request.RevertDbReleasedComment = model.Approver1Comment;
                    }
                    else if (role == "APP_RELEASE")
                    {
                        if (!string.IsNullOrEmpty(request.RevertAppReleasedBy))
                            return Ok(new { success = false, message = "APP already reverted" });

                        request.RevertAppReleasedBy = model.Approver1By;
                        request.RevertAppReleasedDate = DateTime.Now;
                        request.RevertAppReleasedComment = model.Approver1Comment;
                    }
                    else
                    {
                        return Ok(new { success = false, message = "Invalid role" });
                    }

                    if (request.Status != 10 &&
                        !string.IsNullOrEmpty(request.RevertDbReleasedBy) &&
                        !string.IsNullOrEmpty(request.RevertAppReleasedBy))
                    {
                        request.Status = 10;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = request.Status == 10
                        ? "Fully Reverted"
                        : "Partially Reverted"
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
        //---------------- TICKET RELEASE CELEBRATION (WHEN RELEASED) -------------------//

        [HttpGet("GetNewReleases")]
        public async Task<IActionResult> GetNewReleases([FromQuery] string empCode)
        {
            var items = await (from r in _context.TicketRequests
                               where r.UserId.ToString() == empCode
                                     && r.Status == 5
                                     && (r.ReleaseCelebrationSeen == 0)
                               select new
                               {
                                   r.TicketId,
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
                return Ok(new { success = false, message = "No Ticket IDs provided" });

            var requests = await _context.TicketRequests
                .Where(r => model.CrfIds.Contains(r.TicketId) && r.Status == 5)
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
