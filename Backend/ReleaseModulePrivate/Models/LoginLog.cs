using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Release_Module.Models
{
    [Table("LOGINLOGS")]
    public class LoginLog
    {
        [Key]
        [Column("LOGID")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int LogId { get; set; }

        [Column("EMPCODE")]
        public string EmpCode { get; set; }

        [Column("USERNAME")]
        public string Username { get; set; }

        [Column("LOGINTIME")]
        public DateTime LoginTime { get; set; }

        [Column("SUCCESS")]
        public string Success { get; set; }   //  'Y' or 'N'
    }

[Table("EXP_REQUEST")]
    public class ExpRequest
    {

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("ID")]
        public int Id { get; set; }
        [Column("CRF_ID")]
        public int CrfId { get; set; }

        [Column("USER_ID")]
        public int? UserId { get; set; }

        [Required(ErrorMessage = "Subject is required")]
        [Column("SUBJECT")]
        public string Subject { get; set; }

        [Required(ErrorMessage = "Changes to be made is required")]
        [Column("CHANGES_TO_MADE")]
        public string ChangesToBeMade { get; set; }

        [ValidateNever]
        [Column("PUBLISH_PATH")]
        public string? PublishPath { get; set; }

        [ValidateNever]
        [Column("COMMIT_ID")]
        public string? CommitId { get; set; }

        [Required(ErrorMessage = "Reason for expedite is required")]
        [Column("REASON_EXPEDITE")]
        public string ReasonForExpedite { get; set; }

        [Column("REQUIREMENT_TYPE")]
        public int RequirementType { get; set; }
        // ---------------- UAT ----------------
        [MaxLength]
        [Column("UAT_SIGNOFF_DOC", TypeName = "BLOB")]
        public byte[]? UatSignoffDocumentData { get; set; }

        

        [Column("UAT_FILE_NAME")]
        public string UatFileName { get; set; }

        [Column("UAT_CONTENT_TYPE")]
        public string UatContentType { get; set; }


        // ---------------- PRODUCTION ----------------
        [MaxLength]
        [Column("PROD_RELEASE_DOC", TypeName = "BLOB")]
        public byte[]? ProductionReleaseDocumentData { get; set; }

        [Column("PROD_FILE_NAME")]
        public string ProdFileName { get; set; }

        [Column("PROD_CONTENT_TYPE")]
        public string ProdContentType { get; set; }

        [Column("DBTYPE")]
        public string? DbType { get; set; }

        [Column("CREATED_DATE")]
        public DateTime? CreatedDate { get; set; } = DateTime.Now;

        [Column("STATUS")]
        public int? Status { get; set; }

        
        [Column("RECOMMENDED_BY")]
        public string? RecommendedBy { get; set; }
        [Column("RECOMMENDED_DATE")]
        public DateTime? RecommendedDate { get; set; }

        [Column("APPROVER1_BY")]
        public string? Approver1By { get; set; }
        [Column("APPROVER1_DATE")]
        public DateTime? Approver1Date { get; set; }

        [Column("APPROVER2_BY")]
        public string? Approver2By { get; set; }
        [Column("APPROVER2_DATE")]

        public DateTime? Approver2Date { get; set; }


        [Column("RECOMMENDER_COMMENT")]
        public string? RecommenderComment { get; set; }

        [Column("APPROVER1_COMMENT")]
        public string? Approver1Comment { get; set; }

        [Column("APPROVER2_COMMENT")]
        public string? Approver2Comment { get; set; }
        
        [Column("REVERT_COMMENT")]
        public string? RevertComment { get; set; }

        [Column("REVERT_DATE")]
        public DateTime? RevertDate { get; set; }
        [Column("REVERT_RECOMMENDED_BY")]
        public string? RevertRecommendedBy { get; set; }
        [Column("REVERT_RECOMMENDED_DATE")]
        public DateTime? RevertRecommendedDate { get; set; }
        [Column("REVERT_RECOMMENDER_COMMENT")]
        public string? RevertRecommenderComment { get; set; }

        [Column("REVERT_APPROVER1_BY")]
        public string? RevertApprover1By { get; set; }
        [Column("REVERT_APPROVER1_DATE")]
        public DateTime? RevertApprover1Date { get; set; }
        [Column("REVERT_APPROVER1_COMMENT")]
        public string? RevertApprover1Comment { get; set; }

        [Column("REVERT_APPROVER2_BY")]
        public string? RevertApprover2By { get; set; }
        [Column("REVERT_APPROVER2_DATE")]
        public DateTime? RevertApprover2Date { get; set; }
        [Column("REVERT_APPROVER2_COMMENT")]
        public string? RevertApprover2Comment { get; set; }

        [Column("RETURN_BY")]
        public string? ReturnBy { get; set; }

        [Column("RETURN_DATE")]
        public DateTime? ReturnDate { get; set; }
        [Column("RETURN_COMMENT")]
        public string? ReturnComment { get; set; }

        [Column("DB_ASSIGNED_TO")]
        public string? DbAssignedTo { get; set; }

        [Column("DB_ASSIGNED_DATE")]
        public DateTime? DbAssignedDate { get; set; }

        [Column("APP_ASSIGNED_TO")]
        public string? AppAssignedTo { get; set; }

        [Column("APP_ASSIGNED_DATE")]
        public DateTime? AppAssignedDate { get; set; }
        [Column("DB_RELEASED_BY")]
        public string? DbReleasedBy { get; set; }

        [Column("DB_RELEASED_DATE")]
        public DateTime? DbReleasedDate { get; set; }

        [Column("DB_RELEASED_COMMENT")]
        public string? DbReleasedComment { get; set; }

        [Column("APP_RELEASED_BY")]
        public string? AppReleasedBy { get; set; }

        [Column("APP_RELEASED_DATE")]
        public DateTime? AppReleasedDate { get; set; }

        [Column("APP_RELEASED_COMMENT")]
        public string? AppReleasedComment { get; set; }
        // ================= REVERT DB =================
        [Column("REVERT_DB_RELEASED_BY")]
        public string? RevertDbReleasedBy { get; set; }

        [Column("REVERT_DB_RELEASED_DATE")]
        public DateTime? RevertDbReleasedDate { get; set; }

        [Column("REVERT_DB_RELEASED_COMMENT")]
        public string? RevertDbReleasedComment { get; set; }

        // ================= REVERT APP =================
        [Column("REVERT_APP_RELEASED_BY")]
        public string? RevertAppReleasedBy { get; set; }

        [Column("REVERT_APP_RELEASED_DATE")]
        public DateTime? RevertAppReleasedDate { get; set; }

        [Column("REVERT_APP_RELEASED_COMMENT")]
        public string? RevertAppReleasedComment { get; set; }

        [Column("RELEASE_CELEBRATION_SEEN")]
        public int? ReleaseCelebrationSeen { get; set; }

        [Column("MOBILE_NUMBER")]
        public string? MobileNumber { get; set; }
        [Column("REQ_ID")]
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public string? ReqId { get; set; }
        [Column("REVERT_DB_ASSIGNED_TO")]
        public string? RevertDbAssignedTo { get; set; }

        [Column("REVERT_DB_ASSIGNED_DATE")]
        public DateTime? RevertDbAssignedDate { get; set; }
        [Column("REVERT_APP_ASSIGNED_TO")]
        public string? RevertAppAssignedTo { get; set; }

        [Column("REVERT_APP_ASSIGNED_DATE")]
        public DateTime? RevertAppAssignedDate { get; set; }
    }


    [Table("CAB_REQUEST")]   
    public class CabRequest
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("ID")]
        public int Id { get; set; }
        [Column("CRF_ID")]
        public int CrfId { get; set; }

        [Column("USER_ID")]
        public int? UserId { get; set; }

        [Required(ErrorMessage = "Subject is required")]
        [Column("SUBJECT")]
        public string Subject { get; set; }

        [Required(ErrorMessage = "Changes to be made is required")]
        [Column("CHANGES_TO_MADE")]
        public string ChangesToBeMade { get; set; }

        [ValidateNever]
        [Column("PUBLISH_PATH")]
        public string? PublishPath { get; set; }

        [ValidateNever]
        [Column("COMMIT_ID")]
        public string? CommitId { get; set; }

        [Column("REQUIREMENT_TYPE")]
        public int RequirementType { get; set; }
        // ---------------- UAT ----------------
        [MaxLength]
        [Column("UAT_SIGNOFF_DOC", TypeName = "BLOB")]
        public byte[] UatSignoffDocumentData { get; set; }



        [Column("UAT_FILE_NAME")]
        public string UatFileName { get; set; }

        [Column("UAT_CONTENT_TYPE")]
        public string UatContentType { get; set; }


        // ---------------- PRODUCTION ----------------
        [MaxLength]
        [Column("PROD_RELEASE_DOC", TypeName = "BLOB")]
        public byte[] ProductionReleaseDocumentData { get; set; }

        [Column("PROD_FILE_NAME")]
        public string ProdFileName { get; set; }

        [Column("PROD_CONTENT_TYPE")]
        public string ProdContentType { get; set; }

        [Column("DBTYPE")]
        public string? DbType { get; set; }

        [Column("CREATED_DATE")]
        public DateTime? CreatedDate { get; set; } = DateTime.Now;

        [Column("STATUS")]
        public int? Status { get; set; }


        [Column("RECOMMENDED_BY")]
        public string? RecommendedBy { get; set; }
        [Column("RECOMMENDED_DATE")]
        public DateTime? RecommendedDate { get; set; }

        [Column("APPROVER1_BY")]
        public string? Approver1By { get; set; }
        [Column("APPROVER1_DATE")]
        public DateTime? Approver1Date { get; set; }

        [Column("APPROVER2_BY")]
        public string? Approver2By { get; set; }
        [Column("APPROVER2_DATE")]
        public DateTime? Approver2Date { get; set; }

        [Column("RECOMMENDER_COMMENT")]
        public string? RecommenderComment { get; set; }

        [Column("APPROVER1_COMMENT")]
        public string? Approver1Comment { get; set; }

        [Column("APPROVER2_COMMENT")]
        public string? Approver2Comment { get; set; }
 
        [Column("REVERT_COMMENT")]
        public string? RevertComment { get; set; }

        [Column("REVERT_DATE")]
        public DateTime? RevertDate { get; set; }
        [Column("REVERT_RECOMMENDED_BY")]
        public string? RevertRecommendedBy { get; set; }
        [Column("REVERT_RECOMMENDED_DATE")]
        public DateTime? RevertRecommendedDate { get; set; }
        [Column("REVERT_RECOMMENDER_COMMENT")]
        public string? RevertRecommenderComment { get; set; }

        [Column("REVERT_APPROVER1_BY")]
        public string? RevertApprover1By { get; set; }
        [Column("REVERT_APPROVER1_DATE")]
        public DateTime? RevertApprover1Date { get; set; }
        [Column("REVERT_APPROVER1_COMMENT")]
        public string? RevertApprover1Comment { get; set; }

        [Column("REVERT_APPROVER2_BY")]
        public string? RevertApprover2By { get; set; }
        [Column("REVERT_APPROVER2_DATE")]
        public DateTime? RevertApprover2Date { get; set; }
        [Column("REVERT_APPROVER2_COMMENT")]
        public string? RevertApprover2Comment { get; set; }

        [Column("RETURN_BY")]
        public string? ReturnBy { get; set; }

        [Column("RETURN_DATE")]
        public DateTime? ReturnDate { get; set; }
        [Column("RETURN_COMMENT")]
        public string? ReturnComment { get; set; }
        [Column("CAB_RELEASE_DATE")]
        public DateTime? CabReleaseDate { get; set; }
        [Column("DB_ASSIGNED_TO")]
        public string? DbAssignedTo { get; set; }

        [Column("DB_ASSIGNED_DATE")]
        public DateTime? DbAssignedDate { get; set; }

        [Column("APP_ASSIGNED_TO")]
        public string? AppAssignedTo { get; set; }

        [Column("APP_ASSIGNED_DATE")]
        public DateTime? AppAssignedDate { get; set; }
        [Column("DB_RELEASED_BY")]
        public string? DbReleasedBy { get; set; }

        [Column("DB_RELEASED_DATE")]
        public DateTime? DbReleasedDate { get; set; }

        [Column("DB_RELEASED_COMMENT")]
        public string? DbReleasedComment { get; set; }

        [Column("APP_RELEASED_BY")]
        public string? AppReleasedBy { get; set; }

        [Column("APP_RELEASED_DATE")]
        public DateTime? AppReleasedDate { get; set; }

        [Column("APP_RELEASED_COMMENT")]
        public string? AppReleasedComment { get; set; }
        // ================= REVERT DB =================
        [Column("REVERT_DB_RELEASED_BY")]
        public string? RevertDbReleasedBy { get; set; }

        [Column("REVERT_DB_RELEASED_DATE")]
        public DateTime? RevertDbReleasedDate { get; set; }

        [Column("REVERT_DB_RELEASED_COMMENT")]
        public string? RevertDbReleasedComment { get; set; }

        // ================= REVERT APP =================
        [Column("REVERT_APP_RELEASED_BY")]
        public string? RevertAppReleasedBy { get; set; }

        [Column("REVERT_APP_RELEASED_DATE")]
        public DateTime? RevertAppReleasedDate { get; set; }

        [Column("REVERT_APP_RELEASED_COMMENT")]
        public string? RevertAppReleasedComment { get; set; }
        [Column("RELEASE_CELEBRATION_SEEN")]
        public int? ReleaseCelebrationSeen { get; set; }
        [Column("MOBILE_NUMBER")]
        public string? MobileNumber { get; set; }
        [Column("REQ_ID")]
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public string? ReqId { get; set; }
        [Column("REVERT_APP_ASSIGNED_TO")]
        public string? RevertAppAssignedTo { get; set; }

        [Column("REVERT_APP_ASSIGNED_DATE")]
        public DateTime? RevertAppAssignedDate { get; set; }
        [Column("REVERT_DB_ASSIGNED_TO")]
        public string? RevertDbAssignedTo { get; set; }

        [Column("REVERT_DB_ASSIGNED_DATE")]
        public DateTime? RevertDbAssignedDate { get; set; }
    }

    [Table("TICKET_REQUEST")]
    public class TicketRequest
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("ID")]
        public int Id { get; set; }
        [Column("TICKET_ID")]
        public int TicketId { get; set; }

        [Column("USER_ID")]
        public int? UserId { get; set; }

        [Required(ErrorMessage = "Subject is required")]
        [Column("SUBJECT")]
        public string Subject { get; set; }

        [Required(ErrorMessage = "Changes to be made is required")]
        [Column("CHANGES_TO_MADE")]
        public string ChangesToBeMade { get; set; }

        [ValidateNever]
        [Column("PUBLISH_PATH")]
        public string? PublishPath { get; set; }

        [ValidateNever]
        [Column("COMMIT_ID")]
        public string? CommitId { get; set; }

       // [Required(ErrorMessage = "Reason for expedite is required")]
        [Column("REASON_EXPEDITE")]
        public string? ReasonForExpedite { get; set; }

        [Column("REQUIREMENT_TYPE")]
        public int RequirementType { get; set; }
        // ---------------- UAT ----------------
        [MaxLength]
        [Column("UAT_SIGNOFF_DOC", TypeName = "BLOB")]
        public byte[] UatSignoffDocumentData { get; set; }



        [Column("UAT_FILE_NAME")]
        public string UatFileName { get; set; }

        [Column("UAT_CONTENT_TYPE")]
        public string UatContentType { get; set; }


        // ---------------- PRODUCTION ----------------
        [MaxLength]
        [Column("PROD_RELEASE_DOC", TypeName = "BLOB")]
        public byte[] ProductionReleaseDocumentData { get; set; }

        [Column("PROD_FILE_NAME")]
        public string ProdFileName { get; set; }

        [Column("PROD_CONTENT_TYPE")]
        public string ProdContentType { get; set; }

        [Column("DBTYPE")]
        public string? DbType { get; set; }

        [Column("CREATED_DATE")]
        public DateTime? CreatedDate { get; set; } = DateTime.Now;

        [Column("STATUS")]
        public int? Status { get; set; }


        [Column("RECOMMENDED_BY")]
        public string? RecommendedBy { get; set; }
        [Column("RECOMMENDED_DATE")]
        public DateTime? RecommendedDate { get; set; }

        [Column("APPROVER1_BY")]
        public string? Approver1By { get; set; }
        [Column("APPROVER1_DATE")]
        public DateTime? Approver1Date { get; set; }

        [Column("APPROVER2_BY")]
        public string? Approver2By { get; set; }
        [Column("APPROVER2_DATE")]
        public DateTime? Approver2Date { get; set; }

        [Column("RECOMMENDER_COMMENT")]
        public string? RecommenderComment { get; set; }

        [Column("APPROVER1_COMMENT")]
        public string? Approver1Comment { get; set; }

        [Column("APPROVER2_COMMENT")]
        public string? Approver2Comment { get; set; }
       
        [Column("REVERT_COMMENT")]
        public string? RevertComment { get; set; }

        [Column("REVERT_DATE")]
        public DateTime? RevertDate { get; set; }
        [Column("REVERT_RECOMMENDED_BY")]
        public string? RevertRecommendedBy { get; set; }
        [Column("REVERT_RECOMMENDED_DATE")]
        public DateTime? RevertRecommendedDate { get; set; }
        [Column("REVERT_RECOMMENDER_COMMENT")]
        public string? RevertRecommenderComment { get; set; }

        [Column("REVERT_APPROVER1_BY")]
        public string? RevertApprover1By { get; set; }
        [Column("REVERT_APPROVER1_DATE")]
        public DateTime? RevertApprover1Date { get; set; }
        [Column("REVERT_APPROVER1_COMMENT")]
        public string? RevertApprover1Comment { get; set; }

        [Column("REVERT_APPROVER2_BY")]
        public string? RevertApprover2By { get; set; }
        [Column("REVERT_APPROVER2_DATE")]
        public DateTime? RevertApprover2Date { get; set; }
        [Column("REVERT_APPROVER2_COMMENT")]
        public string? RevertApprover2Comment { get; set; }

        [Column("RETURN_BY")]
        public string? ReturnBy { get; set; }

        [Column("RETURN_DATE")]
        public DateTime? ReturnDate { get; set; }
        [Column("RETURN_COMMENT")]
        public string? ReturnComment { get; set; }
        [Column("CAB_EXP")]
        public string? CabExp { get; set; }
        [Column("CAB_RELEASE_DATE")]
        public DateTime? CabReleaseDate { get; set; }
        [Column("DB_ASSIGNED_TO")]
        public string? DbAssignedTo { get; set; }

        [Column("DB_ASSIGNED_DATE")]
        public DateTime? DbAssignedDate { get; set; }

        [Column("APP_ASSIGNED_TO")]
        public string? AppAssignedTo { get; set; }

        [Column("APP_ASSIGNED_DATE")]
        public DateTime? AppAssignedDate { get; set; }
        [Column("DB_RELEASED_BY")]
        public string? DbReleasedBy { get; set; }

        [Column("DB_RELEASED_DATE")]
        public DateTime? DbReleasedDate { get; set; }

        [Column("DB_RELEASED_COMMENT")]
        public string? DbReleasedComment { get; set; }

        [Column("APP_RELEASED_BY")]
        public string? AppReleasedBy { get; set; }

        [Column("APP_RELEASED_DATE")]
        public DateTime? AppReleasedDate { get; set; }

        [Column("APP_RELEASED_COMMENT")]
        public string? AppReleasedComment { get; set; }
        // ================= REVERT DB =================
        [Column("REVERT_DB_ASSIGNED_TO")]
        public string? RevertDbAssignedTo { get; set; }

        [Column("REVERT_DB_ASSIGNED_DATE")]
        public DateTime? RevertDbAssignedDate { get; set; }

        
        [Column("REVERT_DB_RELEASED_BY")]
        public string? RevertDbReleasedBy { get; set; }

        [Column("REVERT_DB_RELEASED_DATE")]
        public DateTime? RevertDbReleasedDate { get; set; }

        [Column("REVERT_DB_RELEASED_COMMENT")]
        public string? RevertDbReleasedComment { get; set; }

        // ================= REVERT APP =================
        [Column("REVERT_APP_ASSIGNED_TO")]
        public string? RevertAppAssignedTo { get; set; }

        [Column("REVERT_APP_ASSIGNED_DATE")]
        public DateTime? RevertAppAssignedDate { get; set; }
        [Column("REVERT_APP_RELEASED_BY")]
        public string? RevertAppReleasedBy { get; set; }

        [Column("REVERT_APP_RELEASED_DATE")]
        public DateTime? RevertAppReleasedDate { get; set; }

        [Column("REVERT_APP_RELEASED_COMMENT")]
        public string? RevertAppReleasedComment { get; set; }
        [Column("RELEASE_CELEBRATION_SEEN")]
        public int? ReleaseCelebrationSeen { get; set; }
        [Column("MOBILE_NUMBER")]
        public string? MobileNumber { get; set; }
        [Column("REQ_ID")]
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public string? ReqId { get; set; }
    }




    [Table("RELEASE_SCHEMA")]
    public class ReleaseSchema
    {
        [Column("SCHEMA_NAME")]
        public string SchemaName { get; set; }
    }

    [Table("TBL_CRFT_MST")]
    public class CrfMaster
    {
        [Column("CRF_ID")]
        public int CrfId { get; set; }

        [Column("SUBJECT")]
        public string Subject { get; set; }

        [Column("DESCRIPTION")]
        public string Description { get; set; }

        [Column("STATUS_ID")]
        public int StatusId { get; set; }

        [Column("USER_TARGET_DT")]
        public DateTime? UserTargetDate { get; set; }
    }

    [Table("TBL_CRFT_STATUS_MST")]
    public class CrfStatusMaster
    {
        [Column("STATUS_ID")]
        public int StatusId { get; set; }

        [Column("STATUS_NAME")]
        public string StatusName { get; set; }
    }
    [Table("TBL_REQUEST_APPROVALS")]
    public class RequestApprovals
    {
        [Column("EMP_CODE")]
        public string EmpCode { get; set; }

        [Column("EMP_NAME")]
        public string EmpName { get; set; }

        [Column("ROLE_STATUS")]
        public string RoleStatus { get; set; }

        [Column("STEP_ORDER")]   
        public int StepOrder { get; set; }
    }
    [Table("RELEASESTATUS")]
    public class ReleaseStatus
    {
        [Column("STATUSNAME")]
        public string StatusName { get; set; }
    }

[Table("TBL_TEAM_DTLS")]
    public class TblTeamDtls
    {
        [Key]
        [Column("ID")]
        public int Id { get; set; }

        [Required]
        [Column("EMP_CODE")]
        
        public string EmpCode { get; set; }

        [Column("EMP_NAME")]
   
        public string EmpName { get; set; }

        [Column("ROLE")]
      
        public string Role { get; set; }   // SPM / TL / DEV

        [Column("PARENT_ID")]
        public int? ParentId { get; set; }

        [Column("STATUS")]
        public int Status { get; set; }    // 1 = Active, 0 = Inactive
        
        [Column("CREATED_DATE")]
        public DateTime CreatedDate { get; set; }

      
        [ForeignKey("ParentId")]
        public TblTeamDtls Parent { get; set; }

        public List<TblTeamDtls> Children { get; set; }
    }

    [Table("RELEASETICKET_STATUS")]
    public class ReleaseTicketStatus
    {
        [Key]
        [Column("STATUS_ID")]
        public int StatusId { get; set; }
        [Column("DESCR")]
        public string? Descr { get; set; }
    }
    [Table("HELPDESK_ISSUE_SR", Schema = "AML_NOTES")]
    public class HelpdeskIssueSr
    {
        [Key]
        [Column("ISSUE_SR_ID")]
        public int IssueSrId { get; set; }

        [Column("CREATED_DATE")]
        public DateTime? CreatedDate { get; set; }

        [Column("DESC_ISSUE")]
        public string? DescIssue { get; set; }

        [Column("PROBLEM_DESC")]
        public string? ProblemDesc { get; set; }

        [Column("STATUS")]        
        public int? StatusId { get; set; }

        [Column("TECH_ASSIGNED")]
        public int? TechAssigned { get; set; }
        [Column("ISSUE_CATEGORY")]
        public int IssueCategory { get; set; }
    }
    
}
