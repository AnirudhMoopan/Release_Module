using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Release_Module.Models
{
    public class LoginViewModel
    {
        [Required(ErrorMessage = "Username is required")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        
    }
    [Table("PUSH_SUBSCRIPTIONS")]
    public class PushSubscriptionEntity
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("ID")]
        public int Id { get; set; }

        [Required]
        [Column("EMP_CODE")]
        public int EmpCode { get; set; }

        [Required]
        [Column("ENDPOINT")]
        public string Endpoint { get; set; } = string.Empty;

        [Required]
        [Column("P256DH")]
        public string P256dh { get; set; } = string.Empty;

        [Required]
        [Column("AUTH")]
        public string Auth { get; set; } = string.Empty;

        [Column("CREATED_DATE")]
        public DateTime CreatedDate { get; set; } = DateTime.Now;

        [Column("DEVICE_INFO")]
        public string? DeviceInfo { get; set; }
    }


    public class ReleaseNote
    {
        public string RequestType { get; set; }
    }

   
   
}


