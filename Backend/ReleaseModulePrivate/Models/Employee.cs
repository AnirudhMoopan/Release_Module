using System.ComponentModel.DataAnnotations.Schema;

namespace Release_Module.Models
{
    [Table("EMPLOYEE_MASTER" ,Schema = "AML_HRM")]
    public class Employee
    {
        [Column("EMP_CODE")]
        public int EmpCode { get; set; }   

        [Column("EMP_NAME")]
        public string? EmpName { get; set; }   

        [Column("PASSWORD")]
        public byte[]? Password { get; set; }

        [Column("DEPARTMENT_ID")]
        public int DepartmentId { get; set; }
        [Column("STATUS_ID")]
        public int? StatusId { get; set; }
    }
}
