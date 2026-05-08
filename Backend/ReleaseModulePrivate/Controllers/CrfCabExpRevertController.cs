using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReleaseModule.Data;
using ReleaseModule.Models.Request;

namespace ReleaseModule.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CrfCabExpRevertController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CrfCabExpRevertController(ApplicationDbContext context)
        {
            _context = context;
        }
        //EXP//

        // ─────────────────────────────────────────────
        // GET REVERT RECOMMENDATION 
        // ─────────────────────────────────────────────
        [HttpGet("ExpRevertRecommendation")]
        public async Task<IActionResult> ExpRevertRecommendation([FromQuery] string empCode)
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

                var data = await (from r in _context.ExpRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 6 && devIds.Contains(r.UserId.Value)
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
                    crfId = x.CrfId,
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
        public async Task<IActionResult> ExpRevertRecommendation([FromBody] RecommendationDto model)
        {
            try
            {

                var request = await _context.ExpRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 6);

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
        public async Task<IActionResult> GetRevertVerify([FromQuery] string empCode)
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


                var data = await (from r in _context.ExpRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 7 && devIds.Contains(r.UserId.Value)
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
                    crfId = x.CrfId,
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
        public async Task<IActionResult> SaveRevertVerify([FromBody] VerifyDto model)
        {
            try
            {

                var request = await _context.ExpRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 7);

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
                request.Status = 8; //REVERT VERIFIED)

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
        [HttpGet("GetRevertApprove")]
        public async Task<IActionResult> GetRevertApprove([FromQuery] string empCode)
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

                var data = await (from r in _context.ExpRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 8
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
                    crfId = x.CrfId,
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
        public async Task<IActionResult> SaveRevertApprove([FromBody] VerifyDto model)
        {
            try
            {

                var request = await _context.ExpRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 8);

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
        // GET REVERT RELEASED 
        // ─────────────────────────────────────────────
        [HttpGet("RevertReleased")]
        public async Task<IActionResult> GetRevertReleased([FromQuery] string empCode)
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

                var data = await (from r in _context.ExpRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 9
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
        public async Task<IActionResult> SaveRevertRelease([FromBody] VerifyDto model)
        {
            try
            {
                var request = await _context.ExpRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId
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

                //  DB ONLY
                if (type == ReqType.DB)
                {
                    if (!string.IsNullOrEmpty(request.RevertDbReleasedBy))
                        return Ok(new { success = false, message = "DB already reverted" });

                    request.RevertDbReleasedBy = model.Approver1By;
                    request.RevertDbReleasedDate = DateTime.Now;
                    request.RevertDbReleasedComment = model.Approver1Comment;

                    request.Status = 10;
                }

                //  APP ONLY
                else if (type == ReqType.APP)
                {
                    if (!string.IsNullOrEmpty(request.RevertAppReleasedBy))
                        return Ok(new { success = false, message = "APP already reverted" });

                    request.RevertAppReleasedBy = model.Approver1By;
                    request.RevertAppReleasedDate = DateTime.Now;
                    request.RevertAppReleasedComment = model.Approver1Comment;

                    request.Status = 10;
                }

                //  DUAL (DB + APP)
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

        [HttpGet("GetRevertDetails")]
        public async Task<IActionResult> GetRevertDetails([FromQuery] int userId)
        {
            try
            {
                var data = await (from r in _context.ExpRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 5
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
        [HttpPost("SubmitRevert")]
        public async Task<IActionResult> SubmitRevert([FromBody] VerifyDto model)
        {
            try
            {
                var request = await _context.ExpRequests
                     .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId
                                           && r.Status == 5);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "REQUEST NOT FOUND"
                    });
                }

                request.RevertComment = model.Approver1Comment;
                request.RevertDate = DateTime.Now;
                request.Status = 6 ;// REVERTED

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

        //CAB//

        // ─────────────────────────────────────────────
        //  GET REVERT RECOMMENDATION 
        // ─────────────────────────────────────────────
        [HttpGet("CabRevertRecommendation")]
        public async Task<IActionResult> CabRevertRecommendation([FromQuery] string empCode)
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
                                  where r.Status == 6 && devIds.Contains(r.UserId.Value)
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
                                      r.RevertComment,
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
                    revertComment = x.RevertComment,
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


        [HttpPost("CabRevertRecommendation")]
        public async Task<IActionResult> CabRevertRecommendation([FromBody] RecommendationDto model)
        {
            try
            {

                var request = await _context.CabRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 6);

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
        [HttpGet("CabRevertVerify")]
        public async Task<IActionResult> GetCabRevertVerify([FromQuery] string empCode)
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
                                  where r.Status == 7 && devIds.Contains(r.UserId.Value)
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
                                      r.RevertComment,
                                      r.RevertRecommenderComment,
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
                    revertComment = x.RevertComment,
                    revertRecommenderComment = x.RevertRecommenderComment,
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

        [HttpPost("CabRevertVerify")]
        public async Task<IActionResult> SaveCabRevertVerify([FromBody] VerifyDto model)
        {
            try
            {

                var request = await _context.CabRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 7);

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
                request.Status = 8; //REVERT VERIFIED)

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
        [HttpGet("GetCabRevertApprove")]
        public async Task<IActionResult> GetCabRevertApprove([FromQuery] string empCode)
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
                                  where r.Status == 8
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
                                      r.RevertComment,
                                      r.RevertApprover1Comment,
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
                    revertComment = x.RevertComment,
                    revertVerifierComment = x.RevertApprover1Comment,
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

        [HttpPost("RevertCabApprove")]
        public async Task<IActionResult> SaveCabRevertApprove([FromBody] VerifyDto model)
        {
            try
            {

                var request = await _context.CabRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId && r.Status == 8);

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
        //  GET REVERT RELEASED
        // ─────────────────────────────────────────────
        [HttpGet("RevertCabReleased")]
        public async Task<IActionResult> GetRevertCabReleased([FromQuery] string empCode)
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

                var data = await (from r in _context.CabRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 9
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

        [HttpPost("RevertCabRelease")]
        public async Task<IActionResult> SaveCabRevertRelease([FromBody] VerifyDto model)
        {
            try
            {
                var request = await _context.CabRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId
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

                //  DB ONLY
                if (type == ReqType.DB)
                {
                    if (!string.IsNullOrEmpty(request.RevertDbReleasedBy))
                        return Ok(new { success = false, message = "DB already reverted" });

                    request.RevertDbReleasedBy = model.Approver1By;
                    request.RevertDbReleasedDate = DateTime.Now;
                    request.RevertDbReleasedComment = model.Approver1Comment;

                    request.Status = 10;
                }

                //  APP ONLY
                else if (type == ReqType.APP)
                {
                    if (!string.IsNullOrEmpty(request.RevertAppReleasedBy))
                        return Ok(new { success = false, message = "APP already reverted" });

                    request.RevertAppReleasedBy = model.Approver1By;
                    request.RevertAppReleasedDate = DateTime.Now;
                    request.RevertAppReleasedComment = model.Approver1Comment;

                    request.Status = 10;
                }

                //  DUAL (DB + APP)
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

        [HttpGet("GetCabRevertDetails")]
        public async Task<IActionResult> GetCabRevertDetails([FromQuery] int userId)
        {
            try
            {
                var data = await (from r in _context.CabRequests
                                  join t in _context.CrfMasters
                                      on r.CrfId equals t.CrfId
                                  join s in _context.CrfStatusMasters
                                      on t.StatusId equals s.StatusId into statusGroup
                                  from s in statusGroup.DefaultIfEmpty()
                                  join e in _context.Employee_Master
on r.UserId equals e.EmpCode into empGroup
                                  from e in empGroup.DefaultIfEmpty()
                                  where r.Status == 5
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
        [HttpPost("CabRevert")]
        public async Task<IActionResult> CabRevert([FromBody] VerifyDto model)
        {
            try
            {
                var request = await _context.CabRequests
                     .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId && r.UserId == model.UserId
                                           && r.Status == 5);

                if (request == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "REQUEST NOT FOUND"
                    });
                }

                request.RevertComment = model.Approver1Comment;
                request.RevertDate = DateTime.Now;
                request.Status = 6;// REVERTED

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
    }
}
