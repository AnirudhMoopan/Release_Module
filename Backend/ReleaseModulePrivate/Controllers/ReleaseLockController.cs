using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReleaseModule.Data;
using ReleaseModule.Models.Request;

namespace ReleaseModule.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReleaseLockController : ControllerBase
    {

        private readonly ApplicationDbContext _context;

        public ReleaseLockController(ApplicationDbContext context)
        {
            _context = context;
        }
        [HttpPost("Lock")]
        public async Task<IActionResult> LockForRelease([FromBody] LockDto model)
        {
            try
            {
                var request = await _context.ExpRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId
                                           && r.UserId == model.UserId
                                           && (r.Status == 4 || r.Status == 9));

                if (request == null)
                    return NotFound(new { success = false, message = "Request not found" });

                if (!Enum.IsDefined(typeof(ReqType), request.RequirementType))
                    return Ok(new { success = false, message = "Invalid RequirementType" });

                var type = (ReqType)request.RequirementType;
                bool isDB = type == ReqType.DB;
                bool isAPP = type == ReqType.APP;
                bool isDual = type == ReqType.DUAL;

                bool isRevert = request.Status == 9;

                var approval = await _context.ApprovalFlows
                    .FirstOrDefaultAsync(a => a.StepOrder == 4 && a.EmpCode == model.Approver1By);
                if (approval == null)
                    return Ok(new { success = false, message = "Not authorized" });

                string role = approval.RoleStatus?.ToUpper();

                // ================= DB ONLY =================
                if (isDB)
                {
                    if (isRevert)
                    {
                        if (!string.IsNullOrEmpty(request.RevertDbAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.RevertDbAssignedTo = model.Approver1By;
                        request.RevertDbAssignedDate = DateTime.Now;
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(request.DbAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.DbAssignedTo = model.Approver1By;
                        request.DbAssignedDate = DateTime.Now;
                    }
                }
                // ================= APP ONLY =================
                else if (isAPP)
                {
                    if (isRevert)
                    {
                        if (!string.IsNullOrEmpty(request.RevertAppAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.RevertAppAssignedTo = model.Approver1By;
                        request.RevertAppAssignedDate = DateTime.Now;
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(request.AppAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.AppAssignedTo = model.Approver1By;
                        request.AppAssignedDate = DateTime.Now;
                    }
                }
                // ================= DUAL =================
                else if (isDual)
                {
                    if (role == "DB_RELEASE")
                    {
                        if (isRevert)
                        {
                            if (!string.IsNullOrEmpty(request.RevertDbAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.RevertDbAssignedTo = model.Approver1By;
                            request.RevertDbAssignedDate = DateTime.Now;
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(request.DbAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.DbAssignedTo = model.Approver1By;
                            request.DbAssignedDate = DateTime.Now;
                        }
                    }
                    else if (role == "APP_RELEASE")
                    {
                        if (isRevert)
                        {
                            if (!string.IsNullOrEmpty(request.RevertAppAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.RevertAppAssignedTo = model.Approver1By;
                            request.RevertAppAssignedDate = DateTime.Now;
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(request.AppAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.AppAssignedTo = model.Approver1By;
                            request.AppAssignedDate = DateTime.Now;
                        }
                    }
                    else
                    {
                        return Ok(new { success = false, message = "Invalid role" });
                    }
                }
                else
                {
                    return Ok(new { success = false, message = "Invalid RequirementType" });
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Locked successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("CabLock")]
        public async Task<IActionResult> CabLock([FromBody] LockDto model)
        {
            try
            {
                var request = await _context.CabRequests
                    .FirstOrDefaultAsync(r => r.CrfId == model.CrfId && r.ReqId == model.ReqId
                                           && r.UserId == model.UserId
                                           && (r.Status == 4 || r.Status == 9));

                if (request == null)
                    return NotFound(new { success = false, message = "Request not found" });

                if (!Enum.IsDefined(typeof(ReqType), request.RequirementType))
                    return Ok(new { success = false, message = "Invalid RequirementType" });

                var type = (ReqType)request.RequirementType;
                bool isDB = type == ReqType.DB;
                bool isAPP = type == ReqType.APP;
                bool isDual = type == ReqType.DUAL;

                bool isRevert = request.Status == 9;

                var approval = await _context.ApprovalFlows
                    .FirstOrDefaultAsync(a => a.StepOrder == 4 && a.EmpCode == model.Approver1By);
                if (approval == null)
                    return Ok(new { success = false, message = "Not authorized" });

                string role = approval.RoleStatus?.ToUpper();

                // ================= DB ONLY =================
                if (isDB)
                {
                    if (isRevert)
                    {
                        if (!string.IsNullOrEmpty(request.RevertDbAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.RevertDbAssignedTo = model.Approver1By;
                        request.RevertDbAssignedDate = DateTime.Now;
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(request.DbAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.DbAssignedTo = model.Approver1By;
                        request.DbAssignedDate = DateTime.Now;
                    }
                }
                // ================= APP ONLY =================
                else if (isAPP)
                {
                    if (isRevert)
                    {
                        if (!string.IsNullOrEmpty(request.RevertAppAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.RevertAppAssignedTo = model.Approver1By;
                        request.RevertAppAssignedDate = DateTime.Now;
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(request.AppAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.AppAssignedTo = model.Approver1By;
                        request.AppAssignedDate = DateTime.Now;
                    }
                }
                // ================= DUAL =================
                else if (isDual)
                {
                    if (role == "DB_RELEASE")
                    {
                        if (isRevert)
                        {
                            if (!string.IsNullOrEmpty(request.RevertDbAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.RevertDbAssignedTo = model.Approver1By;
                            request.RevertDbAssignedDate = DateTime.Now;
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(request.DbAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.DbAssignedTo = model.Approver1By;
                            request.DbAssignedDate = DateTime.Now;
                        }
                    }
                    else if (role == "APP_RELEASE")
                    {
                        if (isRevert)
                        {
                            if (!string.IsNullOrEmpty(request.RevertAppAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.RevertAppAssignedTo = model.Approver1By;
                            request.RevertAppAssignedDate = DateTime.Now;
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(request.AppAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.AppAssignedTo = model.Approver1By;
                            request.AppAssignedDate = DateTime.Now;
                        }
                    }
                    else
                    {
                        return Ok(new { success = false, message = "Invalid role" });
                    }
                }
                else
                {
                    return Ok(new { success = false, message = "Invalid RequirementType" });
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Locked successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("TicketLock")]
        public async Task<IActionResult> TicketLock([FromBody] TicketLockDto model)
        {
            try
            {
                var request = await _context.TicketRequests
                    .FirstOrDefaultAsync(r => r.TicketId == model.TicketId && r.ReqId == model.ReqId
                                           && r.UserId == model.UserId
                                           && (r.Status == 4 || r.Status == 9));

                if (request == null)
                    return NotFound(new { success = false, message = "Request not found" });

                if (!Enum.IsDefined(typeof(ReqType), request.RequirementType))
                    return Ok(new { success = false, message = "Invalid RequirementType" });

                var type = (ReqType)request.RequirementType;
                bool isDB = type == ReqType.DB;
                bool isAPP = type == ReqType.APP;
                bool isDual = type == ReqType.DUAL;

                bool isRevert = request.Status == 9;

                var approval = await _context.ApprovalFlows
                    .FirstOrDefaultAsync(a => a.StepOrder == 4 && a.EmpCode == model.Approver1By);

                if (approval == null)
                    return Ok(new { success = false, message = "Not authorized" });

                string role = approval.RoleStatus?.ToUpper();

                // ================= DB ONLY =================
                if (isDB)
                {
                    if (isRevert)
                    {
                        if (!string.IsNullOrEmpty(request.RevertDbAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.RevertDbAssignedTo = model.Approver1By;
                        request.RevertDbAssignedDate = DateTime.Now;
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(request.DbAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.DbAssignedTo = model.Approver1By;
                        request.DbAssignedDate = DateTime.Now;
                    }
                }
                // ================= APP ONLY =================
                else if (isAPP)
                {
                    if (isRevert)
                    {
                        if (!string.IsNullOrEmpty(request.RevertAppAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.RevertAppAssignedTo = model.Approver1By;
                        request.RevertAppAssignedDate = DateTime.Now;
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(request.AppAssignedTo))
                            return Ok(new { success = true, message = "Already locked, proceed" });
                        request.AppAssignedTo = model.Approver1By;
                        request.AppAssignedDate = DateTime.Now;
                    }
                }
                // ================= DUAL =================
                else if (isDual)
                {
                    if (role == "DB_RELEASE")
                    {
                        if (isRevert)
                        {
                            if (!string.IsNullOrEmpty(request.RevertDbAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.RevertDbAssignedTo = model.Approver1By;
                            request.RevertDbAssignedDate = DateTime.Now;
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(request.DbAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.DbAssignedTo = model.Approver1By;
                            request.DbAssignedDate = DateTime.Now;
                        }
                    }
                    else if (role == "APP_RELEASE")
                    {
                        if (isRevert)
                        {
                            if (!string.IsNullOrEmpty(request.RevertAppAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.RevertAppAssignedTo = model.Approver1By;
                            request.RevertAppAssignedDate = DateTime.Now;
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(request.AppAssignedTo))
                                return Ok(new { success = true, message = "Already locked, proceed" });
                            request.AppAssignedTo = model.Approver1By;
                            request.AppAssignedDate = DateTime.Now;
                        }
                    }
                    else
                    {
                        return Ok(new { success = false, message = "Invalid role" });
                    }
                }
                else
                {
                    return Ok(new { success = false, message = "Invalid RequirementType" });
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Locked successfully" });
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
    }
}
