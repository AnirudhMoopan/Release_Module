using System.ComponentModel.DataAnnotations;

namespace ReleaseModule.Models.Request
{
    public class ExpRequestDto
    {
        public int CrfId { get; set; }
        public int UserId { get; set; }

        [Required(ErrorMessage = "Subject is required")]
        public string Subject { get; set; }

        [Required(ErrorMessage = "Changes To Be Made is required")]
        public string ChangesToBeMade { get; set; }

        public string? PublishPath { get; set; }
        public string? CommitId { get; set; }

        [Required(ErrorMessage = "Reason For Expedite is required")]
        public string ReasonForExpedite { get; set; }

        [Required(ErrorMessage = "Requirement Type is required")]
        public int RequirementType { get; set; }

        [Required(ErrorMessage = "UAT Signoff Document is required")]
        public IFormFile UatSignoffDocument { get; set; }

        [Required(ErrorMessage = "Production Release Document is required")]
        public IFormFile ProdReleaseDoc { get; set; }

        public string? DbType { get; set; }
       
        public string? MobileNumber { get; set; }
    }

    public class CabRequestDto
    {
        public int CrfId { get; set; }
        public int UserId { get; set; }

        [Required(ErrorMessage = "Subject is required")]
        public string Subject { get; set; }
        [Required(ErrorMessage = "Changes To Be Made is required")]
        public string ChangesToBeMade { get; set; }
        public string? PublishPath { get; set; }
        public string? CommitId { get; set; }
        public string? ReasonForExpedite { get; set; }

        [Required(ErrorMessage = "Requirement Type is required")]
        public int RequirementType { get; set; }

        [Required(ErrorMessage = "UAT Signoff Document is required")]
        public IFormFile UatSignoffDocument { get; set; }

        [Required(ErrorMessage = "Production Release Document is required")]
        public IFormFile ProdReleaseDoc { get; set; }

        public string? DbType { get; set; }
        
        public string? MobileNumber { get; set; }
    }
    public class TicketLockDto
    {
        public int TicketId { get; set; }
        public string ReqId { get; set; }

        public int UserId { get; set; }

        public string Approver1By { get; set; }


    }
    public class CabExpTicketRequestDto
    {
        public int TicketId { get; set; }
        public int UserId { get; set; }

        [Required(ErrorMessage = "Subject is required")]
        public string Subject { get; set; }

        [Required(ErrorMessage = "Changes To Be Made is required")]
        public string ChangesToBeMade { get; set; }

        public string? PublishPath { get; set; }
        public string? CommitId { get; set; }

      //  [Required(ErrorMessage = "Reason For Expedite is required")]
        public string? ReasonForExpedite { get; set; }

        [Required(ErrorMessage = "Requirement Type is required")]
        public int RequirementType { get; set; }

        [Required(ErrorMessage = "UAT Signoff Document is required")]
        public IFormFile UatSignoffDocument { get; set; }

        [Required(ErrorMessage = "Production Release Document is required")]
        public IFormFile ProdReleaseDoc { get; set; }

        public string? DbType { get; set; }
        public string CabExp { get; set; }
        
        public string? MobileNumber { get; set; }

    }

    public class RecommendationDto
    {
        public int CrfId { get; set; }
        public string ReqId { get; set; }

        public int UserId { get; set; }
        public string RecommendedBy { get; set; }
        public string RecommenderComment { get; set; }

    }

    public class TicketRecommendationDto
    {
        public int TicketId { get; set; }
        public string ReqId { get; set; }

        public int UserId { get; set; }
        public string RecommendedBy { get; set; }
        public string RecommenderComment { get; set; }

    }

    public class VerifyDto
    {
        public int CrfId { get; set; }
        public string ReqId { get; set; }

        public int UserId { get; set; }

        public string Approver1By { get; set; }
        public string Approver1Comment { get; set; }

    }
    public enum ReqType
    {
        DB = 1,
        APP = 2,
        DUAL = 3
    }
    public class LockDto
    {
        public int CrfId { get; set; }
        public int UserId { get; set; }
        public string ReqId { get; set; }

        public string Approver1By { get; set; }


    }
    public class CelebrationSeenDto
    {
        public List<int> CrfIds { get; set; }
    }
    public class TicketVerifyDto
    {
        public int TicketId { get; set; }
        public string ReqId { get; set; }

        public int UserId { get; set; }

        public string Approver1By { get; set; }
        public string Approver1Comment { get; set; }

    }

    public class Login
    {

        public string EmpCode { get; set; }
        public string Password { get; set; }
    }

    public class SubscribeRequest
    {
        public int EmpCode { get; set; }
        public string Endpoint { get; set; } = string.Empty;
        public string P256dh { get; set; } = string.Empty;
        public string Auth { get; set; } = string.Empty;
        public string? DeviceInfo { get; set; }
    }

    public class UnsubscribeRequest
    {
        public int EmpCode { get; set; }
        public string Endpoint { get; set; } = string.Empty;
    }

    public class SendNotificationRequest
    {
        public int EmpCode { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? Url { get; set; }
    }

    public class SendToRoleRequest
    {
        public string RoleStatus { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? Url { get; set; }
    }
    public class CombinedReleaseDto
    {
        public int? CrfId { get; set; }
        public int? TicketId { get; set; }
        public string Source { get; set; }

        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string ReqId { get; set; }

        public string Subject { get; set; }
        public string Description { get; set; }
        public string PublishPath { get; set; }
        public string CommitId { get; set; }
        public string ReasonForExpedite { get; set; }

        public int? RequirementType { get; set; }
        public int? Status { get; set; }

        //   public byte[] UatSignoffDocument { get; set; }
        //  public byte[] ProductionReleaseDocument { get; set; }
    }
    public class SearchRequestDto
    {
        public string? ReqId { get; set; }
        public int? CrfId { get; set; }
        public int? TicketId { get; set; }
        public string? UserId { get; set; }
    }
}