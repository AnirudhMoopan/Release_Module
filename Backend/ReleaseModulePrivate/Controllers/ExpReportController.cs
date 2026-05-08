using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Release_Module.Models;
using ReleaseModule.Data;
using ReleaseModule.Models.Request;
using ReleaseModule.Models.Response;
using System.Globalization;
using System.Linq;

namespace ReleaseModule.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExpReportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ExpReportController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("GetReport")]
        public async Task<IActionResult> GetReport(
       [FromQuery] List<int> status,
       [FromQuery] int userId,
       [FromQuery] string? fromDate,
       [FromQuery] string? toDate)
        {
            try
            {
                DateTime? parsedFromDate = null;
                DateTime? parsedToDate = null;

                if (!string.IsNullOrWhiteSpace(fromDate))
                {
                    if (!DateTime.TryParseExact(fromDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempFrom))
                    {
                        return BadRequest(new ExpResponse<object>
                        {
                            Success = false,
                            Message = "Invalid fromDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedFromDate = tempFrom;
                }

              
                if (!string.IsNullOrWhiteSpace(toDate))
                {
                    if (!DateTime.TryParseExact(toDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempTo))
                    {
                        return BadRequest(new ExpResponse<object>
                        {
                            Success = false,
                            Message = "Invalid toDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedToDate = tempTo;
                }

                var data = await (from r in _context.ExpRequests

                                  let isReturn = r.Status == 0
                                  let isReleased = r.Status == 5
                                  let isRevert = r.Status == 10
                                  let type = r.RequirementType
                                  let dbReleasedBy =
                                isReturn ? null :
                                (isRevert ? r.RevertDbReleasedBy : r.DbReleasedBy)

                                  let appReleasedBy =
                                        isReturn ? null :
                                        (isRevert ? r.RevertAppReleasedBy : r.AppReleasedBy)
                                  //let releasedId =
                                  //      isReturn ? null :
                                  //      isRevert
                                  //      ? (
                                  //          type == 1 ? r.RevertDbReleasedBy :
                                  //          type == 2 ? r.RevertAppReleasedBy :
                                  //          (r.RevertAppReleasedDate > r.RevertDbReleasedDate
                                  //              ? r.RevertAppReleasedBy
                                  //              : r.RevertDbReleasedBy)
                                  //        )
                                  //      : (
                                  //          type == 1 ? r.DbReleasedBy :
                                  //          type == 2 ? r.AppReleasedBy :
                                  //          (r.AppReleasedDate > r.DbReleasedDate
                                  //              ? r.AppReleasedBy
                                  //              : r.DbReleasedBy)
                                  //        )


                                  let actionDate =
                                        isReturn ? r.ReturnDate :
                                        isRevert
                                        ? (
                                            type == 1 ? r.RevertDbReleasedDate :
                                            type == 2 ? r.RevertAppReleasedDate :
                                            (r.RevertAppReleasedDate > r.RevertDbReleasedDate
                                                ? r.RevertAppReleasedDate
                                                : r.RevertDbReleasedDate)
                                          )
                                        : (
                                            type == 1 ? r.DbReleasedDate :
                                            type == 2 ? r.AppReleasedDate :
                                            (r.AppReleasedDate > r.DbReleasedDate
                                                ? r.AppReleasedDate
                                                : r.DbReleasedDate)
                                          )

                                  join e in _context.Employee_Master
                                      on r.UserId equals e.EmpCode into userGroup
                                  from e in userGroup.DefaultIfEmpty()

                                  join rec in _context.Employee_Master
                                      on r.RecommendedBy equals rec.EmpCode.ToString() into recGroup
                                  from rec in recGroup.DefaultIfEmpty()

                                  join app1 in _context.Employee_Master
                                      on r.Approver1By equals app1.EmpCode.ToString() into app1Group
                                  from app1 in app1Group.DefaultIfEmpty()

                                  join app2 in _context.Employee_Master
                                      on r.Approver2By equals app2.EmpCode.ToString() into app2Group
                                  from app2 in app2Group.DefaultIfEmpty()

                                  join dbRel in _context.Employee_Master
                                  on dbReleasedBy equals dbRel.EmpCode.ToString() into dbRelGroup
                                  from dbRel in dbRelGroup.DefaultIfEmpty()

                                  join appRel in _context.Employee_Master
                                      on appReleasedBy equals appRel.EmpCode.ToString() into appRelGroup
                                  from appRel in appRelGroup.DefaultIfEmpty()

                                      //join rel in _context.Employee_Master
                                      //    on releasedId equals rel.EmpCode.ToString() into relGroup
                                      //from rel in relGroup.DefaultIfEmpty()
                                      join ret in _context.Employee_Master
                                      on r.ReturnBy equals ret.EmpCode.ToString() into retGroup
                                      from ret in retGroup.DefaultIfEmpty()
                                       where r.Status.HasValue
                                        && status.Contains(r.Status.Value)
                                        && r.UserId == userId

                                  orderby r.CreatedDate descending

                                  select new
                                  {
                                      r,
                                      actionDate,
                                      dbReleasedBy,
                                      appReleasedBy,
                                      isReturn,
                                      isReleased,
                                      isRevert,
                                      UserName = e.EmpName,
                                      RecommendedByName = rec.EmpName,
                                      Approver1ByName = app1.EmpName,
                                      Approver2ByName = app2.EmpName,
                                      DbReleasedByName = dbRel.EmpName,
                                      AppReleasedByName = appRel.EmpName,
                                      ReturnByName =  ret.EmpName
                                  }).ToListAsync();

                var filtered = data.Where(x =>
                {
                    if (x.actionDate == null) return false;

                    return (parsedFromDate == null || x.actionDate >= parsedFromDate)
                        && (parsedToDate == null || x.actionDate < parsedToDate.Value.AddDays(1));
                }).ToList();

                if (!filtered.Any())
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NO DATA FOUND"
                    });
                }

                var result = filtered.Select(x => new
                {
                    crfId = x.r.CrfId,
                    userId = x.r.UserId,
                    userName = x.UserName,
                    subject = x.r.Subject,
                    changesToBeMade = x.r.ChangesToBeMade,
                    publishPath = x.r.PublishPath,
                    commitId = x.r.CommitId,
                    reasonForExpedite = x.r.ReasonForExpedite,
                    requirementType = x.r.RequirementType,
                    dbType = x.r.DbType,
                    req_id = x.r.ReqId,
                     UatSignoffDocument = x.r.UatSignoffDocumentData,
                     ProductionReleaseDocument = x.r.ProductionReleaseDocumentData,
                     createdDate = x.r.CreatedDate?.ToString("dd-MM-yyyy HH:mm"),

                    recommendedBy = x.r.RecommendedBy,
                    recommendedByName = x.RecommendedByName,

                    approver1By = x.r.Approver1By,
                    approver1ByName = x.Approver1ByName,

                    approver2By = x.r.Approver2By,
                    approver2ByName = x.Approver2ByName,
                    dbReleasedBy = x.isReturn ? null : x.dbReleasedBy,
                    dbReleasedByName = x.isReturn ? "N/A" : (x.DbReleasedByName ?? "N/A"),

                    appReleasedBy = x.isReturn ? null : x.appReleasedBy,
                    appReleasedByName = x.isReturn ? "N/A" : (x.AppReleasedByName ?? "N/A"),
                    releasedByName = x.isReturn ? "N/A" :
                string.Join(", ",
                    new[]
                    {
                        x.DbReleasedByName,
                        x.AppReleasedByName
                    }.Where(n => !string.IsNullOrEmpty(n))
                ),
                    releasedDate = x.actionDate?.ToString("dd-MM-yyyy HH:mm"),

                    returnBy = x.r.ReturnBy,
                    returnByName = x.ReturnByName,
                    returnComment = x.r.ReturnComment,
                    returnDate = x.r.ReturnDate?.ToString("dd-MM-yyyy HH:mm"),

                    status = x.isReturn ? "RETURNED"
                            : x.isRevert ? "REVERT RELEASED"
                            : "RELEASED"
                            
                }).ToList();

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
                    Message = ex.Message
                });
            }
        }

        [HttpGet("GetCabReport")]
        public async Task<IActionResult> GetCabReport(
      [FromQuery] int status,
      [FromQuery] int userId,
      [FromQuery] string? fromDate,
      [FromQuery] string? toDate)
        {
            try
            {
                DateTime? parsedFromDate = null;
                DateTime? parsedToDate = null;

                if (!string.IsNullOrWhiteSpace(fromDate))
                {
                    if (!DateTime.TryParseExact(fromDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempFrom))
                    {
                        return BadRequest(new ExpResponse<object>
                        {
                            Success = false,
                            Message = "Invalid fromDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedFromDate = tempFrom;
                }

                if (!string.IsNullOrWhiteSpace(toDate))
                {
                    if (!DateTime.TryParseExact(toDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempTo))
                    {
                        return BadRequest(new ExpResponse<object>
                        {
                            Success = false,
                            Message = "Invalid toDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedToDate = tempTo;
                }

                var data = await (from r in _context.CabRequests

                                  let isReturn = r.Status == 0
                                  let isReleased = r.Status == 5
                                  let isRevert = r.Status == 10
                                  let type = r.RequirementType

                                  let dbReleasedBy =
                                isReturn ? null :
                                (isRevert ? r.RevertDbReleasedBy : r.DbReleasedBy)

                                  let appReleasedBy =
                                        isReturn ? null :
                                        (isRevert ? r.RevertAppReleasedBy : r.AppReleasedBy)

                                  let actionDate =
                                        isRevert
                                        ? (
                                            type == 1 ? r.RevertDbReleasedDate :
                                            type == 2 ? r.RevertAppReleasedDate :
                                            (r.RevertAppReleasedDate > r.RevertDbReleasedDate
                                                ? r.RevertAppReleasedDate
                                                : r.RevertDbReleasedDate)
                                          )
                                        : (
                                            type == 1 ? r.DbReleasedDate :
                                            type == 2 ? r.AppReleasedDate :
                                            (r.AppReleasedDate > r.DbReleasedDate
                                                ? r.AppReleasedDate
                                                : r.DbReleasedDate)
                                          )

                                  join e in _context.Employee_Master
                                      on r.UserId equals e.EmpCode into userGroup
                                  from e in userGroup.DefaultIfEmpty()

                                  join rec in _context.Employee_Master
                                      on r.RecommendedBy equals rec.EmpCode.ToString() into recGroup
                                  from rec in recGroup.DefaultIfEmpty()

                                  join app1 in _context.Employee_Master
                                      on r.Approver1By equals app1.EmpCode.ToString() into app1Group
                                  from app1 in app1Group.DefaultIfEmpty()

                                  join app2 in _context.Employee_Master
                                      on r.Approver2By equals app2.EmpCode.ToString() into app2Group
                                  from app2 in app2Group.DefaultIfEmpty()

                                  join dbRel in _context.Employee_Master
                              on dbReleasedBy equals dbRel.EmpCode.ToString() into dbRelGroup
                                  from dbRel in dbRelGroup.DefaultIfEmpty()

                                  join appRel in _context.Employee_Master
                                      on appReleasedBy equals appRel.EmpCode.ToString() into appRelGroup
                                  from appRel in appRelGroup.DefaultIfEmpty()

                                  join ret in _context.Employee_Master
                                  on r.ReturnBy equals ret.EmpCode.ToString() into retGroup
                                  from ret in retGroup.DefaultIfEmpty()

                                  where r.Status == status && r.UserId == userId

                                  orderby r.CreatedDate descending

                                  select new
                                  {
                                      r,
                                      dbReleasedBy,
                                      appReleasedBy,
                                      isReturn,
                                      isReleased,
                                      isRevert,
                                      UserName = e.EmpName,
                                      RecommendedByName = rec.EmpName,
                                      Approver1ByName = app1.EmpName,
                                      Approver2ByName = app2.EmpName,
                                      DbReleasedByName = dbRel.EmpName,
                                      AppReleasedByName = appRel.EmpName,
                                      ReturnByName = ret.EmpName,
                                      ActionDate = actionDate
                                  }).ToListAsync();

                var filtered = data.Where(x =>
                {
                    if (x.ActionDate == null) return false;

                    return (parsedFromDate == null || x.ActionDate >= parsedFromDate)
                        && (parsedToDate == null || x.ActionDate < parsedToDate.Value.AddDays(1));
                }).ToList();

                if (!filtered.Any())
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NO DATA FOUND"
                    });
                }

                var result = filtered.Select(x => new
                {
                    crfId = x.r.CrfId,
                    userId = x.r.UserId,
                    userName = x.UserName,
                    subject = x.r.Subject,
                    changesToBeMade = x.r.ChangesToBeMade,
                    publishPath = x.r.PublishPath,
                    commitId = x.r.CommitId,
                    requirementType = x.r.RequirementType,
                    dbType = x.r.DbType,
                    req_id = x.r.ReqId,
                    UatSignoffDocument = x.r.UatSignoffDocumentData,
                    ProductionReleaseDocument = x.r.ProductionReleaseDocumentData,
                    createdDate = x.r.CreatedDate?.ToString("dd-MM-yyyy HH:mm"),

                    recommendedBy = x.r.RecommendedBy,
                    recommendedByName = x.RecommendedByName,
                    recommendedDate = x.r.RecommendedDate?.ToString("dd-MM-yyyy HH:mm"),

                    approver1By = x.r.Approver1By,
                    approver1ByName = x.Approver1ByName,
                    approver1Date = x.r.Approver1Date?.ToString("dd-MM-yyyy HH:mm"),

                    approver2By = x.r.Approver2By,
                    approver2ByName = x.Approver2ByName,
                    approver2Date = x.r.Approver2Date?.ToString("dd-MM-yyyy HH:mm"),
                    dbReleasedBy = x.isReturn ? null : x.dbReleasedBy,
                    dbReleasedByName = x.isReturn ? "N/A" : (x.DbReleasedByName ?? "N/A"),

                    appReleasedBy = x.isReturn ? null : x.appReleasedBy,
                    appReleasedByName = x.isReturn ? "N/A" : (x.AppReleasedByName ?? "N/A"),
                    releasedByName = x.isReturn ? "N/A" :
                string.Join(", ",
                    new[]
                    {
                        x.DbReleasedByName,
                        x.AppReleasedByName
                    }.Where(n => !string.IsNullOrEmpty(n))
                ),
                    releasedDate = x.ActionDate?.ToString("dd-MM-yyyy HH:mm"),

                    returnBy = x.r.ReturnBy,
                    returnByName = x.ReturnByName,
                    returnComment = x.r.ReturnComment,
                    returnDate = x.r.ReturnDate?.ToString("dd-MM-yyyy HH:mm"),

                    status = x.isReturn ? "RETURNED"
                            : x.isRevert ? "REVERT RELEASED"
                            : "RELEASED"
                }).ToList();

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
                    Message = ex.Message
                });
            }
        }

        // TICKET REPORT//

        [HttpGet("GetTicketReport")]
        public async Task<IActionResult> GetTicketReport(
     [FromQuery] int status,
     [FromQuery] int userId,
     [FromQuery] string? fromDate,
     [FromQuery] string? toDate)
        {
            try
            {
                DateTime? parsedFromDate = null;
                DateTime? parsedToDate = null;

                if (!string.IsNullOrWhiteSpace(fromDate))
                {
                    if (!DateTime.TryParseExact(fromDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempFrom))
                    {
                        return BadRequest(new ExpResponse<object>
                        {
                            Success = false,
                            Message = "Invalid fromDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedFromDate = tempFrom;
                }

                if (!string.IsNullOrWhiteSpace(toDate))
                {
                    if (!DateTime.TryParseExact(toDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempTo))
                    {
                        return BadRequest(new ExpResponse<object>
                        {
                            Success = false,
                            Message = "Invalid toDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedToDate = tempTo;
                }

                var data = await (from r in _context.TicketRequests

                                  let isReturn = r.Status == 0
                                  let isReleased = r.Status == 5
                                  let isRevert = r.Status == 10
                                  let type = r.RequirementType

                                  //let releasedId =
                                  //      isRevert
                                  //      ? (
                                  //          type == 1 ? r.RevertDbReleasedBy :
                                  //          type == 2 ? r.RevertAppReleasedBy :
                                  //          (r.RevertAppReleasedDate > r.RevertDbReleasedDate
                                  //              ? r.RevertAppReleasedBy
                                  //              : r.RevertDbReleasedBy)
                                  //        )
                                  //      : (
                                  //          type == 1 ? r.DbReleasedBy :
                                  //          type == 2 ? r.AppReleasedBy :
                                  //          (r.AppReleasedDate > r.DbReleasedDate
                                  //              ? r.AppReleasedBy
                                  //              : r.DbReleasedBy)
                                  //        )
                                  let dbReleasedBy =
                                isReturn ? null :
                                (isRevert ? r.RevertDbReleasedBy : r.DbReleasedBy)

                                  let appReleasedBy =
                                        isReturn ? null :
                                        (isRevert ? r.RevertAppReleasedBy : r.AppReleasedBy)

                                  let actionDate =
                                        status == 0 ? r.ReturnDate :
                                        isRevert
                                        ? (
                                            type == 1 ? r.RevertDbReleasedDate :
                                            type == 2 ? r.RevertAppReleasedDate :
                                            (r.RevertAppReleasedDate > r.RevertDbReleasedDate
                                                ? r.RevertAppReleasedDate
                                                : r.RevertDbReleasedDate)
                                          )
                                        : (
                                            type == 1 ? r.DbReleasedDate :
                                            type == 2 ? r.AppReleasedDate :
                                            (r.AppReleasedDate > r.DbReleasedDate
                                                ? r.AppReleasedDate
                                                : r.DbReleasedDate)
                                          )

                                  join e in _context.Employee_Master
                                      on r.UserId equals e.EmpCode into userGroup
                                  from e in userGroup.DefaultIfEmpty()

                                  join rec in _context.Employee_Master
                                      on r.RecommendedBy equals rec.EmpCode.ToString() into recGroup
                                  from rec in recGroup.DefaultIfEmpty()

                                  join app1 in _context.Employee_Master
                                      on r.Approver1By equals app1.EmpCode.ToString() into app1Group
                                  from app1 in app1Group.DefaultIfEmpty()

                                  join app2 in _context.Employee_Master
                                      on r.Approver2By equals app2.EmpCode.ToString() into app2Group
                                  from app2 in app2Group.DefaultIfEmpty()

                                  join dbRel in _context.Employee_Master
                              on dbReleasedBy equals dbRel.EmpCode.ToString() into dbRelGroup
                                  from dbRel in dbRelGroup.DefaultIfEmpty()

                                  join appRel in _context.Employee_Master
                                      on appReleasedBy equals appRel.EmpCode.ToString() into appRelGroup
                                  from appRel in appRelGroup.DefaultIfEmpty()
                                  join ret in _context.Employee_Master
                                  on r.ReturnBy equals ret.EmpCode.ToString() into retGroup
                                  from ret in retGroup.DefaultIfEmpty()
                                  where r.Status == status && r.UserId == userId

                                  orderby r.CreatedDate descending

                                  select new
                                  {
                                      r,
                                      dbReleasedBy,
                                      appReleasedBy,
                                      isReturn,
                                      isReleased,
                                      isRevert,
                                      actionDate,
                                      UserName = e.EmpName,
                                      RecommendedByName = rec.EmpName,
                                      Approver1ByName = app1.EmpName,
                                      Approver2ByName = app2.EmpName,
                                      DbReleasedByName = dbRel.EmpName,
                                      AppReleasedByName = appRel.EmpName,
                                      ReturnByName = ret.EmpName
                                  }).ToListAsync();

                var filtered = data.Where(x =>
                {
                    if (x.actionDate == null) return false;

                    return (parsedFromDate == null || x.actionDate >= parsedFromDate)
                        && (parsedToDate == null || x.actionDate < parsedToDate.Value.AddDays(1));
                }).ToList();

                if (!filtered.Any())
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NO DATA FOUND"
                    });
                }

                var result = filtered.Select(x => new
                {
                    ticketId = x.r.TicketId,
                    userId = x.r.UserId,
                    userName = x.UserName,
                    subject = x.r.Subject,
                    changesToBeMade = x.r.ChangesToBeMade,
                    publishPath = x.r.PublishPath,
                    commitId = x.r.CommitId,
                    reasonForExpedite = x.r.ReasonForExpedite,
                    requirementType = x.r.RequirementType,
                    dbType = x.r.DbType,
                    req_id = x.r.ReqId,
                    UatSignoffDocument = x.r.UatSignoffDocumentData,
                    ProductionReleaseDocument = x.r.ProductionReleaseDocumentData,
                    createdDate = x.r.CreatedDate?.ToString("dd-MM-yyyy HH:mm"),

                    recommendedBy = x.r.RecommendedBy,
                    recommendedByName = x.RecommendedByName,

                    approver1By = x.r.Approver1By,
                    approver1ByName = x.Approver1ByName,

                    approver2By = x.r.Approver2By,
                    approver2ByName = x.Approver2ByName,

                    dbReleasedBy = x.isReturn ? null : x.dbReleasedBy,
                    dbReleasedByName = x.isReturn ? "N/A" : (x.DbReleasedByName ?? "N/A"),

                    appReleasedBy = x.isReturn ? null : x.appReleasedBy,
                    appReleasedByName = x.isReturn ? "N/A" : (x.AppReleasedByName ?? "N/A"),

                    releasedByName = x.isReturn ? "N/A" :
                string.Join(", ",
                    new[]
                    {
                        x.DbReleasedByName,
                        x.AppReleasedByName
                    }.Where(n => !string.IsNullOrEmpty(n))
                ),
                    releasedDate = x.actionDate?.ToString("dd-MM-yyyy HH:mm"),

                    returnBy = x.r.ReturnBy,
                    returnByName = x.ReturnByName,
                    returnComment = x.r.ReturnComment,
                    returnDate = x.r.ReturnDate?.ToString("dd-MM-yyyy HH:mm"),

                    statusText = x.r.Status == 10 ? "REVERT RELEASED" :
                                 x.r.Status == 5 ? "RELEASED" :
                                 x.r.Status == 0 ? "RETURNED" : "UNKNOWN"
                }).ToList();

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
                    Message = ex.Message
                });
            }
        }

        [HttpGet("GetAllTicketReport")]
        public async Task<IActionResult> GetAllTicketReport(
     [FromQuery] string? fromDate,
     [FromQuery] string? toDate)
        {
            try
            {
                DateTime? parsedFromDate = null;
                DateTime? parsedToDate = null;

                if (!string.IsNullOrWhiteSpace(fromDate))
                {
                    if (!DateTime.TryParseExact(fromDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempFrom))
                    {
                        return BadRequest(new ExpResponse<object>
                        {
                            Success = false,
                            Message = "Invalid fromDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedFromDate = tempFrom;
                }

                if (!string.IsNullOrWhiteSpace(toDate))
                {
                    if (!DateTime.TryParseExact(toDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempTo))
                    {
                        return BadRequest(new ExpResponse<object>
                        {
                            Success = false,
                            Message = "Invalid toDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedToDate = tempTo;
                }

                var data = await (from r in _context.TicketRequests

                                  where r.Status == 5 || r.Status == 10 || r.Status == 0

                                  let isReturn = r.Status == 0
                                  let isReleased = r.Status == 5
                                  let isRevert = r.Status == 10
                                  let type = r.RequirementType

                                  let recommendedId = isRevert ? r.RevertRecommendedBy : r.RecommendedBy
                                  let approver1Id = isRevert ? r.RevertApprover1By : r.Approver1By
                                  let approver2Id = isRevert ? r.RevertApprover2By : r.Approver2By

                                  let dbReleasedBy =
                                isReturn ? null :
                                (isRevert ? r.RevertDbReleasedBy : r.DbReleasedBy)

                                  let appReleasedBy =
                                        isReturn ? null :
                                        (isRevert ? r.RevertAppReleasedBy : r.AppReleasedBy)


                                  let actionDate =
                                        isRevert
                                        ? (
                                            type == 1 ? r.RevertDbReleasedDate :
                                            type == 2 ? r.RevertAppReleasedDate :
                                            (r.RevertAppReleasedDate > r.RevertDbReleasedDate
                                                ? r.RevertAppReleasedDate
                                                : r.RevertDbReleasedDate)
                                          )
                                        : (
                                            type == 1 ? r.DbReleasedDate :
                                            type == 2 ? r.AppReleasedDate :
                                            (r.AppReleasedDate > r.DbReleasedDate
                                                ? r.AppReleasedDate
                                                : r.DbReleasedDate)
                                          )

                                  join rec in _context.Employee_Master
                                      on recommendedId equals rec.EmpCode.ToString() into recGroup
                                  from rec in recGroup.DefaultIfEmpty()

                                  join app1 in _context.Employee_Master
                                      on approver1Id equals app1.EmpCode.ToString() into app1Group
                                  from app1 in app1Group.DefaultIfEmpty()

                                  join app2 in _context.Employee_Master
                                      on approver2Id equals app2.EmpCode.ToString() into app2Group
                                  from app2 in app2Group.DefaultIfEmpty()

                                  join dbRel in _context.Employee_Master
                              on dbReleasedBy equals dbRel.EmpCode.ToString() into dbRelGroup
                                  from dbRel in dbRelGroup.DefaultIfEmpty()

                                  join appRel in _context.Employee_Master
                                      on appReleasedBy equals appRel.EmpCode.ToString() into appRelGroup
                                  from appRel in appRelGroup.DefaultIfEmpty()
                                  join ret in _context.Employee_Master
                                  on r.ReturnBy equals ret.EmpCode.ToString() into retGroup
                                  from ret in retGroup.DefaultIfEmpty()

                                  orderby r.CreatedDate descending

                                  select new
                                  {
                                      r,
                                      r.TicketId,
                                      isReturn,
                                      isReleased,
                                      isRevert,
                                      r.Status,
                                      r.CabExp,
                                      ActionDate = actionDate,

                                      RecommendedByName = rec.EmpName,
                                      Approver1ByName = app1.EmpName,
                                      Approver2ByName = app2.EmpName,
                                      dbReleasedBy,
                                      appReleasedBy,
                                      DbReleasedByName = dbRel.EmpName,
                                      AppReleasedByName = appRel.EmpName,
                                      ReturnByName = ret.EmpName
                                  }).ToListAsync();

                var filtered = data.Where(x =>
                {
                    if (x.ActionDate == null) return false;

                    return (parsedFromDate == null || x.ActionDate >= parsedFromDate)
                        && (parsedToDate == null || x.ActionDate < parsedToDate.Value.AddDays(1));
                }).ToList();

                if (!filtered.Any())
                {
                    return NotFound(new ExpResponse<object>
                    {
                        Success = false,
                        Message = "NO DATA FOUND"
                    });
                }

                var result = filtered.Select(x => new
                {
                    TicketId = x.TicketId,
                    cabExp = x.CabExp,
                    req_id = x.r.ReqId,
                    recommendedName = x.RecommendedByName ?? "N/A",
                    verifiedName = x.Approver1ByName ?? "N/A",
                    approvedName = x.Approver2ByName ?? "N/A",
                    dbReleasedBy = x.isReturn ? null : x.dbReleasedBy,
                    dbReleasedByName = x.isReturn ? "N/A" : (x.DbReleasedByName ?? "N/A"),
                    appReleasedBy = x.isReturn ? null : x.appReleasedBy,
                    appReleasedByName = x.isReturn ? "N/A" : (x.AppReleasedByName ?? "N/A"),
                    releasedName = x.isReturn ? "N/A" :
                string.Join(", ",
                    new[]
                    {
                        x.DbReleasedByName,
                        x.AppReleasedByName
                    }.Where(n => !string.IsNullOrEmpty(n))
                ),
                    releasedDate = x.ActionDate?.ToString("dd-MM-yyyy HH:mm"),
                    returnBy = x.r.ReturnBy,
                    returnByName = x.ReturnByName,
                    returnComment = x.r.ReturnComment,
                    returnDate = x.r.ReturnDate?.ToString("dd-MM-yyyy HH:mm"),

                    status = x.isReturn ? "RETURNED"
        : x.isRevert ? "REVERT RELEASED"
        : "RELEASED"
                }).ToList();

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
                    Message = ex.Message
                });
            }
        }

        //REPORT FOR ALL //

        [HttpGet("GetAllReport")]
        public async Task<IActionResult> GetAllReport(
     [FromQuery] string? fromDate,
     [FromQuery] string? toDate)
        {
            try
            {
                DateTime? parsedFromDate = null;
                DateTime? parsedToDate = null;

                if (!string.IsNullOrWhiteSpace(fromDate))
                {
                    if (!DateTime.TryParseExact(fromDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempFrom))
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = "Invalid fromDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedFromDate = tempFrom;
                }

                if (!string.IsNullOrWhiteSpace(toDate))
                {
                    if (!DateTime.TryParseExact(toDate, "dd-MM-yyyy",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime tempTo))
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = "Invalid toDate format. Use dd-MM-yyyy"
                        });
                    }
                    parsedToDate = tempTo;
                }

                var employeeList = await _context.Employee_Master
                    .AsNoTracking()
                    .Select(x => new
                    {
                        EmpCode = (int?)x.EmpCode,
                        EmpName = x.EmpName ?? null
                    })
                    .ToListAsync();

                var employees = employeeList
                    .Where(x => x.EmpCode != null)
                    .GroupBy(x => x.EmpCode.Value)
                    .ToDictionary(g => g.Key, g => g.First().EmpName);

                int? ToInt(string? val)
                {
                    return int.TryParse(val, out int id) ? id : null;
                }

                string GetName(string? code)
                {
                    var id = ToInt(code);
                    if (id != null && employees.ContainsKey(id.Value))
                        return employees[id.Value] ?? code ?? "N/A";

                    return code ?? "N/A";
                }

                //  EXP 
                var expData = await (from r in _context.ExpRequests
                                     where r.Status == 5 || r.Status == 10

                                     let isRevert = r.Status == 10
                                     let type = r.RequirementType

                                     //let releasedBy =
                                     //    isRevert
                                     //    ? (type == 1 ? r.RevertDbReleasedBy :
                                     //       type == 2 ? r.RevertAppReleasedBy :
                                     //       (r.RevertAppReleasedDate ?? DateTime.MinValue) >
                                     //       (r.RevertDbReleasedDate ?? DateTime.MinValue)
                                     //           ? r.RevertAppReleasedBy
                                     //           : r.RevertDbReleasedBy)
                                     //    : (type == 1 ? r.DbReleasedBy :
                                     //       type == 2 ? r.AppReleasedBy :
                                     //       (r.AppReleasedDate ?? DateTime.MinValue) >
                                     //       (r.DbReleasedDate ?? DateTime.MinValue)
                                     //           ? r.AppReleasedBy
                                     //           : r.DbReleasedBy)
                                     let dbReleasedBy =
                                 isRevert ? r.RevertDbReleasedBy : r.DbReleasedBy

                                     let appReleasedBy =
                                         isRevert ? r.RevertAppReleasedBy : r.AppReleasedBy

                                     let actionDate =
                                         isRevert
                                         ? (type == 1 ? r.RevertDbReleasedDate :
                                            type == 2 ? r.RevertAppReleasedDate :
                                            (r.RevertAppReleasedDate ?? DateTime.MinValue) >
                                            (r.RevertDbReleasedDate ?? DateTime.MinValue)
                                                ? r.RevertAppReleasedDate
                                                : r.RevertDbReleasedDate)
                                         : (type == 1 ? r.DbReleasedDate :
                                            type == 2 ? r.AppReleasedDate :
                                            (r.AppReleasedDate ?? DateTime.MinValue) >
                                            (r.DbReleasedDate ?? DateTime.MinValue)
                                                ? r.AppReleasedDate
                                                : r.DbReleasedDate)

                                     select new
                                     {
                                         CrfId = r.CrfId,
                                         ReqId = r.ReqId,
                                         CabExp = "EXP",
                                         Status = r.Status,
                                         CreatedDate = r.CreatedDate,
                                         ActionDate = actionDate,
                                         DbReleasedBy = dbReleasedBy,
                                         AppReleasedBy = appReleasedBy,
                                         UserId = r.UserId,
                                         RecommendedBy = r.RecommendedBy,
                                         Approver1By = r.Approver1By,
                                         Approver2By = r.Approver2By
                                     }).ToListAsync();

                //  CAB 
                var cabData = await (from r in _context.CabRequests
                                     where r.Status == 5 || r.Status == 10

                                     let isRevert = r.Status == 10
                                     let type = r.RequirementType

                                     let actionDate =
                                         isRevert
                                         ? (type == 1 ? r.RevertDbReleasedDate :
                                            type == 2 ? r.RevertAppReleasedDate :
                                            (r.RevertAppReleasedDate ?? DateTime.MinValue) >
                                            (r.RevertDbReleasedDate ?? DateTime.MinValue)
                                                ? r.RevertAppReleasedDate
                                                : r.RevertDbReleasedDate)
                                         : (type == 1 ? r.DbReleasedDate :
                                            type == 2 ? r.AppReleasedDate :
                                            (r.AppReleasedDate ?? DateTime.MinValue) >
                                            (r.DbReleasedDate ?? DateTime.MinValue)
                                                ? r.AppReleasedDate
                                                : r.DbReleasedDate)

                                     select new
                                     {
                                         CrfId = r.CrfId,
                                         ReqId = r.ReqId,
                                         CabExp = "CAB",
                                         Status = r.Status,
                                         CreatedDate = r.CreatedDate,
                                         ActionDate = actionDate,
                                         DbReleasedBy = isRevert ? r.RevertDbReleasedBy : r.DbReleasedBy,
                                         AppReleasedBy = isRevert ? r.RevertAppReleasedBy : r.AppReleasedBy,
                                         UserId = r.UserId,
                                         RecommendedBy = r.RecommendedBy,
                                         Approver1By = r.Approver1By,
                                         Approver2By = r.Approver2By
                                     }).ToListAsync();

                var combined = expData.Concat(cabData)
                                      .OrderByDescending(x => x.CreatedDate)
                                      .ToList();

                var filtered = combined.Where(x =>
                {
                    if (x.ActionDate == null) return false;

                    return (parsedFromDate == null || x.ActionDate >= parsedFromDate)
                        && (parsedToDate == null || x.ActionDate < parsedToDate.Value.AddDays(1));
                }).ToList();

                if (!filtered.Any())
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "NO DATA FOUND"
                    });
                }

                var result = filtered.Select(x => new
                {
                    crfId = x.CrfId,
                    reqId = x.ReqId,
                    cabExp = x.CabExp,

                    user = new
                    {
                        id = x.UserId,
                        name = x.UserId != null && employees.ContainsKey(x.UserId.Value)
             ? employees[x.UserId.Value] ?? "N/A"
             : "N/A"
                    },

                    recommended = new
                    {
                        id = ToInt(x.RecommendedBy),
                        name = GetName(x.RecommendedBy)
                    },

                    verified = new
                    {
                        id = ToInt(x.Approver1By),
                        name = GetName(x.Approver1By)
                    },

                    approved = new
                    {
                        id = ToInt(x.Approver2By),
                        name = GetName(x.Approver2By)
                    },

                    dbReleased = new
                    {
                        id = ToInt(x.DbReleasedBy),
                        name = GetName(x.DbReleasedBy)
                    },

                    appReleased = new
                    {
                        id = ToInt(x.AppReleasedBy),
                        name = GetName(x.AppReleasedBy)
                    },

                    releasedDate = x.ActionDate?.ToString("dd-MM-yyyy HH:mm"),
                    status = x.Status == 10 ? "REVERT RELEASED" : "RELEASED"
                }).ToList();

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = ex.Message
                });
            }
        }
        [HttpGet("GetUpcomingReleased")]
        public async Task<IActionResult> GetUpcomingReleased()
        {
            try
            {
                var allowedStatuses = new int?[] { 1, 2, 3, 6, 7, 8 };

                // ================= EXP =================
                var expMapped = await (from r in _context.ExpRequests
                                       join e in _context.Employee_Master
                                           on r.UserId equals e.EmpCode into empGroup
                                       from e in empGroup.DefaultIfEmpty()
                                       where allowedStatuses.Contains(r.Status)
                     select new CombinedReleaseDto
                      {
                        CrfId = r.CrfId,
                        TicketId = null,
                        Source = "EXP",
                        UserId = r.UserId,
                         UserName = e.EmpName,
                         ReqId = r.ReqId,
                        Subject = r.Subject,
                        Description = r.ChangesToBeMade,
                        PublishPath = r.PublishPath,
                        CommitId = r.CommitId,
                        ReasonForExpedite = r.ReasonForExpedite,
                        RequirementType = r.RequirementType,
                        Status = r.Status
                        // UatSignoffDocument = r.UatSignoffDocumentData,
                        // ProductionReleaseDocument = r.ProductionReleaseDocumentData
                    })
                    .ToListAsync();

                // ================= CAB =================
                var cabMapped = await (from r in _context.CabRequests
                                       join e in _context.Employee_Master
                                           on r.UserId equals e.EmpCode into empGroup
                                       from e in empGroup.DefaultIfEmpty()
                                       where allowedStatuses.Contains(r.Status)
                                       select new CombinedReleaseDto
                                       {
                        CrfId = r.CrfId,
                        TicketId = null,
                        Source = "CAB",
                        UserId = r.UserId,
                                           UserName = e.EmpName,
                                           ReqId = r.ReqId,
                        Subject = r.Subject,
                        Description = r.ChangesToBeMade,
                        PublishPath = r.PublishPath,
                        CommitId = r.CommitId,
                        ReasonForExpedite = null,
                        RequirementType = r.RequirementType,
                        Status = r.Status
                        //UatSignoffDocument = r.UatSignoffDocumentData,
                        //ProductionReleaseDocument = r.ProductionReleaseDocumentData
                    })
                    .ToListAsync();

                // ================= TICKET =================
                var ticketMapped = await (from r in _context.TicketRequests
                                          join e in _context.Employee_Master
                                              on r.UserId equals e.EmpCode into empGroup
                                          from e in empGroup.DefaultIfEmpty()
                                          where allowedStatuses.Contains(r.Status)
                                          select new CombinedReleaseDto
                                          {
                        CrfId = null,
                        TicketId = r.TicketId,
                        Source = r.CabExp,
                        UserId = r.UserId,
                                              UserName = e.EmpName,
                                              ReqId = r.ReqId,
                        Subject = r.Subject,
                        Description = r.ChangesToBeMade,
                        PublishPath = r.PublishPath,
                        CommitId = r.CommitId,
                        ReasonForExpedite = r.ReasonForExpedite,
                        RequirementType = r.RequirementType,
                        Status = r.Status
                        //UatSignoffDocument = r.UatSignoffDocumentData,
                        //ProductionReleaseDocument = r.ProductionReleaseDocumentData
                    })
                    .ToListAsync();

                ticketMapped.ForEach(r => r.Source ??= "TICKET");

                var combined = expMapped
                    .Concat(cabMapped)
                    .Concat(ticketMapped)
                    .OrderByDescending(x => x.CrfId)
                    .ToList();

                return Ok(new
                {
                    success = true,
                    message = combined.Any() ? "Success" : "No data found",
                    totalCount = combined.Count,
                    data = combined
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
        [HttpGet("Release-total")]
        public async Task<IActionResult> ReleaseTotal([FromQuery] int userId)
        {
            try
            {
                var expRequests = await _context.ExpRequests
                    .Where(r => r.UserId == userId)
                    .AsNoTracking()
                    .ToListAsync();

                var cabRequests = await _context.CabRequests
                    .Where(r => r.UserId == userId)
                    .AsNoTracking()
                    .ToListAsync();

                var ticketRequests = await _context.TicketRequests
                    .Where(r => r.UserId == userId)
                    .AsNoTracking()
                    .ToListAsync();

                var allStatuses = expRequests.Select(r => r.Status.GetValueOrDefault(0))
                    .Concat(cabRequests.Select(r => r.Status.GetValueOrDefault(0)))
                    .Concat(ticketRequests.Select(r => r.Status.GetValueOrDefault(0)))
                    .ToList();

                var summary = new
                {
                    exp = new
                    {
                        totalReleased = expRequests.Count(r => r.Status.GetValueOrDefault(0) == 5),
                        totalRevertReleased = expRequests.Count(r => r.Status.GetValueOrDefault(0) == 10),
                        totalReturned = expRequests.Count(r => r.Status.GetValueOrDefault(0) == 0),
                    },
                    cab = new
                    {
                        totalReleased = cabRequests.Count(r => r.Status.GetValueOrDefault(0) == 5),
                        totalRevertReleased = cabRequests.Count(r => r.Status.GetValueOrDefault(0) == 10),
                        totalReturned = cabRequests.Count(r => r.Status.GetValueOrDefault(0) == 0),
                    },
                    ticket = new
                    {
                        totalReleased = ticketRequests.Count(r => r.Status.GetValueOrDefault(0) == 5),
                        totalRevertReleased = ticketRequests.Count(r => r.Status.GetValueOrDefault(0) == 10),
                        totalReturned = ticketRequests.Count(r => r.Status.GetValueOrDefault(0) == 0),
                    },
                    overall = new
                    {
                        totalReleased = allStatuses.Count(s => s == 5),
                        totalRevertReleased = allStatuses.Count(s => s == 10),
                        totalReturned = allStatuses.Count(s => s == 0),
                    }
                };

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    userId = userId,
                    data = summary
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

        [HttpGet("Release-summary")]
        public async Task<IActionResult> ReleaseSummary()
        {
            try
            {
                var expRequests = await _context.ExpRequests
            .AsNoTracking()
            .ToListAsync();

                var cabRequests = await _context.CabRequests
                    .AsNoTracking()
                    .ToListAsync();

                var ticketRequests = await _context.TicketRequests
                    .AsNoTracking()
                    .ToListAsync();

                var allStatuses = expRequests.Select(r => r.Status.GetValueOrDefault(0))
                    .Concat(cabRequests.Select(r => r.Status.GetValueOrDefault(0)))
                    .Concat(ticketRequests.Select(r => r.Status.GetValueOrDefault(0)))
                    .ToList();

                var summary = new
                {

                    exp = new
                    {
                        totalReleased = expRequests.Count(r => r.Status.GetValueOrDefault(0) == 5),
                        totalRevertReleased = expRequests.Count(r => r.Status.GetValueOrDefault(0) == 10),
                        totalReturned = expRequests.Count(r => r.Status.GetValueOrDefault(0) == 0),
                    },

                    cab = new
                    {
                        totalReleased = cabRequests.Count(r => r.Status.GetValueOrDefault(0) == 5),
                        totalRevertReleased = cabRequests.Count(r => r.Status.GetValueOrDefault(0) == 10),
                        totalReturned = cabRequests.Count(r => r.Status.GetValueOrDefault(0) == 0),
                    },

                    ticket = new
                    {
                        totalReleased = ticketRequests.Count(r => r.Status.GetValueOrDefault(0) == 5),
                        totalRevertReleased = ticketRequests.Count(r => r.Status.GetValueOrDefault(0) == 10),
                        totalReturned = ticketRequests.Count(r => r.Status.GetValueOrDefault(0) == 0),
                    },

                    overall = new
                    {
                        totalReleased = allStatuses.Count(s => s == 5),
                        totalRevertReleased = allStatuses.Count(s => s == 10),
                        totalReturned = allStatuses.Count(s => s == 0),
                    }
                };

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    data = summary
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

        // REPORT FOR ALL THE USERS //
        [HttpGet("GetCombinedReport")]
        public async Task<IActionResult> GetAllReleased()
        {
            try
            {
                var teamDict = await _context.TblTeamDtls
              .Where(x => x.Status == 1)
              .AsNoTracking()
              .ToDictionaryAsync(
                  x => x.EmpCode,
                  x => x.EmpName ?? "N/A"
              );

                var approvalDict = await _context.ApprovalFlows
                    .AsNoTracking()
                    .ToDictionaryAsync(
                        x => x.EmpCode,
                        x => x.EmpName ?? "N/A"
                    );


                string GetUserName(int? userId)
                {
                    if (userId == null) return "N/A";

                    var key = userId.Value.ToString();
                    return teamDict.TryGetValue(key, out var name)
                        ? name
                        : key;
                }

                string GetApprovalName(string code)
                {
                    if (string.IsNullOrWhiteSpace(code))
                        return "N/A";

                    return approvalDict.TryGetValue(code, out var name)
                        ? name
                        : code;
                }
                var expRequests = await _context.ExpRequests
                    .Where(r => r.Status == 5 || r.Status == 10)
                    .AsNoTracking()
                    .ToListAsync();

                var cabRequests = await _context.CabRequests
                    .Where(r => r.Status == 5 || r.Status == 10)
                    .AsNoTracking()
                    .ToListAsync();

                var ticketRequests = await _context.TicketRequests
                    .Where(r => r.Status == 5 || r.Status == 10)
                    .AsNoTracking()
                    .ToListAsync();

                
                var expMapped = expRequests.Select(x =>
                {
                    int status = x.Status ?? 0;
                    bool isNormal = status == 5;
                    bool isRevert = status == 10;

                    string dbBy = isRevert ? x.RevertDbReleasedBy : x.DbReleasedBy;
                    string appBy = isRevert ? x.RevertAppReleasedBy : x.AppReleasedBy;

                    DateTime? dbDate = isRevert ? x.RevertDbReleasedDate : x.DbReleasedDate;
                    DateTime? appDate = isRevert ? x.RevertAppReleasedDate : x.AppReleasedDate;

                    DateTime? finalDate =
    (dbDate == null && appDate == null) ? null :
    (dbDate == null) ? appDate :
    (appDate == null) ? dbDate :
    (dbDate > appDate ? dbDate : appDate);

                    return new
                    {
                        crfId = (int?)x.CrfId,
                        ticketId = (int?)null,
                        source = "CRF",
                        userId = (int?)x.UserId,
                        userName = GetUserName(x.UserId),
                        req_id = x.ReqId,
                        subject = (x.Subject ?? "").ToString(),
                        description = (x.ChangesToBeMade ?? "").ToString(),
                        publishPath = (x.PublishPath ?? "").ToString(),
                        commitId = (x.CommitId ?? "").ToString(),
                        reasonForExpedite = (x.ReasonForExpedite ?? "").ToString(),
                        requirementType = (int?)x.RequirementType,
                        uatSignoffDocument = x.UatSignoffDocumentData,
                        productionReleaseDocument = x.ProductionReleaseDocumentData,
                        recommender = x.RecommendedBy,
                        recommenderDate = x.RecommendedDate,
                        verified = x.Approver1By,
                        verifiedDate = x.Approver1Date,
                        approved = x.Approver2By,
                        approvedDate = x.Approver2Date,
                        revertRecommender = x.RevertRecommendedBy,
                        revertRecommenderDate = x.RevertRecommendedDate,
                        revertVerified = x.RevertApprover1By,
                        revertVerifiedDate = x.RevertApprover1Date,
                        revertApproved = x.RevertApprover2By,
                        revertApprovedDate = x.RevertApprover2Date,
                        released = new
                        {
                            db = new { id = dbBy, name = GetApprovalName(dbBy) },
                            app = new { id = appBy, name = GetApprovalName(appBy) }
                        },
                        releasedDate = finalDate,
                        status = (int?)x.Status,
                        isNormal,
                        isRevert
                    };
                });

               
                var cabMapped = cabRequests.Select(x =>
                {
                    int status = x.Status ?? 0;
                    bool isNormal = status == 5;
                    bool isRevert = status == 10;

                    string dbBy = isRevert ? x.RevertDbReleasedBy : x.DbReleasedBy;
                    string appBy = isRevert ? x.RevertAppReleasedBy : x.AppReleasedBy;

                    DateTime? dbDate = isRevert ? x.RevertDbReleasedDate : x.DbReleasedDate;
                    DateTime? appDate = isRevert ? x.RevertAppReleasedDate : x.AppReleasedDate;

                    DateTime? finalDate =
     (dbDate == null && appDate == null) ? null :
     (dbDate == null) ? appDate :
     (appDate == null) ? dbDate :
     (dbDate > appDate ? dbDate : appDate);

                    return new
                    {
                        crfId = (int?)x.CrfId,
                        ticketId = (int?)null,
                        source = "CAB",
                        userId = (int?)x.UserId,
                        userName = GetUserName(x.UserId),
                        req_id = x.ReqId,
                        subject = (x.Subject ?? "").ToString(),
                        description = (x.ChangesToBeMade ?? "").ToString(),
                        publishPath = (x.PublishPath ?? "").ToString(),
                        commitId = (x.CommitId ?? "").ToString(),
                        reasonForExpedite = "",
                        requirementType = (int?)x.RequirementType,
                        uatSignoffDocument = x.UatSignoffDocumentData,
                        productionReleaseDocument = x.ProductionReleaseDocumentData,
                        recommender = x.RecommendedBy,
                        recommenderDate = x.RecommendedDate,
                        verified = x.Approver1By,
                        verifiedDate = x.Approver1Date,
                        approved = x.Approver2By,
                        approvedDate = x.Approver2Date,
                        revertRecommender = x.RevertRecommendedBy,
                        revertRecommenderDate = x.RevertRecommendedDate,
                        revertVerified = x.RevertApprover1By,
                        revertVerifiedDate = x.RevertApprover1Date,
                        revertApproved = x.RevertApprover2By,
                        revertApprovedDate = x.RevertApprover2Date,
                        released = new
                        {
                            db = new { id = dbBy, name = GetApprovalName(dbBy) },
                            app = new { id = appBy, name = GetApprovalName(appBy) }
                        },
                        releasedDate = finalDate,
                        status = (int?)x.Status,
                        isNormal,
                        isRevert
                    };
                });

                
                var ticketMapped = ticketRequests.Select(x =>
                {
                    int status = x.Status ?? 0;
                    bool isNormal = status == 5;
                    bool isRevert = status == 10;

                    string dbBy = isRevert ? x.RevertDbReleasedBy : x.DbReleasedBy;
                    string appBy = isRevert ? x.RevertAppReleasedBy : x.AppReleasedBy;

                    DateTime? dbDate = isRevert ? x.RevertDbReleasedDate : x.DbReleasedDate;
                    DateTime? appDate = isRevert ? x.RevertAppReleasedDate : x.AppReleasedDate;
                    DateTime? finalDate =
     (dbDate == null && appDate == null) ? null :
     (dbDate == null) ? appDate :
     (appDate == null) ? dbDate :
     (dbDate > appDate ? dbDate : appDate);

                    return new
                    {
                        crfId = (int?)null,
                        ticketId = (int?)x.TicketId,
                        source = "TICKET",
                        userId = (int?)x.UserId,
                        userName = GetUserName(x.UserId),
                        req_id = x.ReqId,
                        subject = (x.Subject ?? "").ToString(),
                        description = (x.ChangesToBeMade ?? "").ToString(),
                        publishPath = (x.PublishPath ?? "").ToString(),
                        commitId = (x.CommitId ?? "").ToString(),
                        reasonForExpedite = (x.ReasonForExpedite ?? "").ToString(),
                        requirementType = (int?)x.RequirementType,
                        uatSignoffDocument = x.UatSignoffDocumentData,
                        productionReleaseDocument = x.ProductionReleaseDocumentData,
                        recommender = x.RecommendedBy,
                        recommenderDate = x.RecommendedDate,
                        verified = x.Approver1By,
                        verifiedDate = x.Approver1Date,
                        approved = x.Approver2By,
                        approvedDate = x.Approver2Date,
                        revertRecommender = x.RevertRecommendedBy,
                        revertRecommenderDate = x.RevertRecommendedDate,
                        revertVerified = x.RevertApprover1By,
                        revertVerifiedDate = x.RevertApprover1Date,
                        revertApproved = x.RevertApprover2By,
                        revertApprovedDate = x.RevertApprover2Date,
                        released = new
                        {
                            db = new { id = dbBy, name = GetApprovalName(dbBy) },
                            app = new { id = appBy, name = GetApprovalName(appBy) }
                        },
                        releasedDate = finalDate,
                        status = (int?)x.Status,
                        isNormal,
                        isRevert
                    };
                });

                var combined = expMapped
                    .Concat(cabMapped)
                    .Concat(ticketMapped)
                    .OrderByDescending(x => x.releasedDate)
                    .ToList();

                return Ok(new
                {
                    success = true,
                    message = combined.Count > 0 ? "Success" : "No data found",
                    totalCount = combined.Count,
                    data = combined
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

        [HttpGet("search-by-id")]
        public async Task<IActionResult> SearchById([FromQuery] SearchRequestDto request)
        {
            try
            {
                var reqId = request.ReqId;
                var crfId = request.CrfId;
                var ticketId = request.TicketId;
                var userId = request.UserId;

                var empList = await _context.Employee_Master
     .AsNoTracking()
     .Select(e => new { e.EmpCode, e.EmpName })
     .ToListAsync();

                var empDict = empList
                    .GroupBy(e => e.EmpCode.ToString().Trim())
                    .ToDictionary(g => g.Key, g => g.First().EmpName ?? "N/A");


                string GetEmpName(string code)
                {
                    if (string.IsNullOrWhiteSpace(code))
                        return "N/A";

                    var key = code.Trim();

                    return empDict.TryGetValue(key, out var name)
                        ? name
                        : key;
                }

                if (string.IsNullOrWhiteSpace(reqId) && crfId == null && ticketId == null)
                    return BadRequest(new { success = false, message = "Provide reqId or crfId or ticketId" });

                if (string.IsNullOrWhiteSpace(userId))
                    return BadRequest(new { success = false, message = "Provide userId" });

                if (!int.TryParse(userId, out int userIdInt))
                    return BadRequest(new { success = false, message = "Invalid userId" });

                bool isApprover = await _context.ApprovalFlows
                    .AnyAsync(x => (x.StepOrder == 3 || x.StepOrder == 4) && x.EmpCode == userId);

                bool isDev = false;
                bool isTL = false;
                bool isSPM = false;

                List<int> allowedUserIds = new List<int>();

                if (!isApprover)
                {
                    var user = await _context.TblTeamDtls
                        .Where(x => x.EmpCode == userId)
                        .AsNoTracking()
                        .FirstOrDefaultAsync();

                    if (user == null)
                        return BadRequest(new { success = false, message = "User not found" });

                    isDev = user.Role == "DEV";
                    isTL = user.Role == "TL";
                    isSPM = user.Role == "SPM";

                    if (isDev)
                    {
                        allowedUserIds.Add(userIdInt);
                    }
                    else if (isTL)
                    {
                        var devs = await _context.TblTeamDtls
                            .Where(x => x.ParentId == user.Id)
                            .Select(x => int.Parse(x.EmpCode))
                            .ToListAsync();

                        allowedUserIds.AddRange(devs);
                    }
                    else if (isSPM)
                    {
                        var tls = await _context.TblTeamDtls
                            .Where(x => x.ParentId == user.Id)
                            .ToListAsync();

                        foreach (var tl in tls)
                        {
                            var devs = await _context.TblTeamDtls
                                .Where(x => x.ParentId == tl.Id)
                                .Select(x => int.Parse(x.EmpCode))
                                .ToListAsync();

                            allowedUserIds.AddRange(devs);
                        }
                    }
                }

                var results = new List<object>();

                if (!string.IsNullOrWhiteSpace(reqId))
                {
                    var expList = await _context.ExpRequests
                        .Where(x => x.ReqId == reqId &&
                            (isApprover || !allowedUserIds.Any() || allowedUserIds.Contains(x.UserId ?? 0)))
                        .AsNoTracking()
                        .ToListAsync();

                    foreach (var exp in expList)
                    {
                        results.Add(new
                        {
                            reqId = exp.ReqId,
                            source = "EXP",
                            crfId = exp.CrfId,
                            ticketId = (int?)null,
                            userId = exp.UserId,
                            subject = exp.Subject,
                            description = exp.ChangesToBeMade,
                            status = GetStatusLabel(exp.Status),
                            uatSignoffDocument = exp.UatSignoffDocumentData,
                            productionReleaseDocument = exp.ProductionReleaseDocumentData,
                            dbReleased = new
                            {
                                id = exp.DbReleasedBy,
                                name = GetEmpName(exp.DbReleasedBy)
                            },
                            appReleased = new
                            {
                                id = exp.AppReleasedBy,
                                name = GetEmpName(exp.AppReleasedBy)
                            }
                        });
                    }

                    var cabList = await _context.CabRequests
                        .Where(x => x.ReqId == reqId &&
                            (isApprover || !allowedUserIds.Any() || allowedUserIds.Contains(x.UserId ?? 0)))
                        .AsNoTracking()
                        .ToListAsync();

                    foreach (var cab in cabList)
                    {
                        results.Add(new
                        {
                            reqId = cab.ReqId,
                            source = "CAB",
                            crfId = cab.CrfId,
                            ticketId = (int?)null,
                            userId = cab.UserId,
                            subject = cab.Subject,
                            description = cab.ChangesToBeMade,
                            status = GetStatusLabel(cab.Status),
                            uatSignoffDocument = cab.UatSignoffDocumentData,
                            productionReleaseDocument = cab.ProductionReleaseDocumentData,
                            dbReleased = new
                            {
                                id = cab.DbReleasedBy,
                                name = GetEmpName(cab.DbReleasedBy)
                            },
                            appReleased = new
                            {
                                id = cab.AppReleasedBy,
                                name = GetEmpName(cab.AppReleasedBy)
                            }
                        });
                    }

                    var ticketList = await _context.TicketRequests
                        .Where(x => x.ReqId == reqId &&
                            (isApprover || !allowedUserIds.Any() || allowedUserIds.Contains(x.UserId ?? 0)))
                        .AsNoTracking()
                        .ToListAsync();

                    foreach (var ticket in ticketList)
                    {
                        results.Add(new
                        {
                            reqId = ticket.ReqId,
                            source = ticket.CabExp ?? "TICKET",
                            crfId = (int?)null,
                            ticketId = ticket.TicketId,
                            userId = ticket.UserId,
                            subject = ticket.Subject,
                            description = ticket.ChangesToBeMade,
                            status = GetStatusLabel(ticket.Status),
                            uatSignoffDocument = ticket.UatSignoffDocumentData,
                            productionReleaseDocument = ticket.ProductionReleaseDocumentData,
                            dbReleased = new
                            {
                                id = ticket.DbReleasedBy,
                                name = GetEmpName(ticket.DbReleasedBy)
                            },
                            appReleased = new
                            {
                                id = ticket.AppReleasedBy,
                                name = GetEmpName(ticket.AppReleasedBy)
                            }
                        });
                    }
                }

              
                else if (crfId != null)
                {
                    var expList = await _context.ExpRequests
                        .Where(x => x.CrfId == crfId &&
                            (isApprover || !allowedUserIds.Any() || allowedUserIds.Contains(x.UserId ?? 0)))
                        .AsNoTracking()
                        .ToListAsync();

                    foreach (var exp in expList)
                    {
                        results.Add(new
                        {
                            reqId = exp.ReqId,
                            source = "EXP",
                            crfId = exp.CrfId,
                            ticketId = (int?)null,
                            userId = exp.UserId,
                            subject = exp.Subject,
                            description = exp.ChangesToBeMade,
                            status = GetStatusLabel(exp.Status),
                            uatSignoffDocument = exp.UatSignoffDocumentData,
                            productionReleaseDocument = exp.ProductionReleaseDocumentData,
                            dbReleased = new
                            {
                                id = exp.DbReleasedBy,
                                name = GetEmpName(exp.DbReleasedBy)
                            },
                            appReleased = new
                            {
                                id = exp.AppReleasedBy,
                                name = GetEmpName(exp.AppReleasedBy)
                            }
                        });
                    }

                    var cabList = await _context.CabRequests
                        .Where(x => x.CrfId == crfId &&
                            (isApprover || !allowedUserIds.Any() || allowedUserIds.Contains(x.UserId ?? 0)))
                        .AsNoTracking()
                        .ToListAsync();

                    foreach (var cab in cabList)
                    {
                        results.Add(new
                        {
                            reqId = cab.ReqId,
                            source = "CAB",
                            crfId = cab.CrfId,
                            ticketId = (int?)null,
                            userId = cab.UserId,
                            subject = cab.Subject,
                            description = cab.ChangesToBeMade,
                            status = GetStatusLabel(cab.Status),
                            uatSignoffDocument = cab.UatSignoffDocumentData,
                            productionReleaseDocument = cab.ProductionReleaseDocumentData,
                            dbReleased = new
                            {
                                id = cab.DbReleasedBy,
                                name = GetEmpName(cab.DbReleasedBy)
                            },
                            appReleased = new
                            {
                                id = cab.AppReleasedBy,
                                name = GetEmpName(cab.AppReleasedBy)
                            }
                        });
                    }
                }

                
                else if (ticketId != null)
                {
                    var ticketList = await _context.TicketRequests
                        .Where(x => x.TicketId == ticketId &&
                            (isApprover || !allowedUserIds.Any() || allowedUserIds.Contains(x.UserId ?? 0)))
                        .AsNoTracking()
                        .ToListAsync();

                    foreach (var ticket in ticketList)
                    {
                        results.Add(new
                        {
                            reqId = ticket.ReqId,
                            source = ticket.CabExp ?? "TICKET",
                            crfId = (int?)null,
                            ticketId = ticket.TicketId,
                            userId = ticket.UserId,
                            subject = ticket.Subject,
                            description = ticket.ChangesToBeMade,
                            status = GetStatusLabel(ticket.Status),
                            uatSignoffDocument = ticket.UatSignoffDocumentData,
                            productionReleaseDocument = ticket.ProductionReleaseDocumentData,
                            dbReleased = new
                            {
                                id = ticket.DbReleasedBy,
                                name = GetEmpName(ticket.DbReleasedBy)
                            },
                            appReleased = new
                            {
                                id = ticket.AppReleasedBy,
                                name = GetEmpName(ticket.AppReleasedBy)
                            }
                        });
                    }
                }

                if (!results.Any())
                    return NotFound(new { success = false, message = "No record found" });

                return Ok(new
                {
                    success = true,
                    message = "Success",
                    totalCount = results.Count,
                    data = results
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error occurred",
                    fullError = ex.Message
                });
            }
        }
    }
}
