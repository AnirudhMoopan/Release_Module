using Microsoft.EntityFrameworkCore;
using Release_Module.Models;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace ReleaseModule.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        public DbSet<Employee> Employee_Master { get; set; }
        public DbSet<LoginLog> LoginLogs { get; set; }
        public DbSet<ExpRequest> ExpRequests { get; set; }
        public DbSet<ReleaseSchema> ReleaseSchemas { get; set; }
        public DbSet<CrfMaster> CrfMasters { get; set; }
        public DbSet<CrfStatusMaster> CrfStatusMasters { get; set; }
        public DbSet<RequestApprovals> ApprovalFlows { get; set; }
        public DbSet<CabRequest> CabRequests { get; set; }
        public DbSet<TicketRequest> TicketRequests { get; set; }

        public DbSet<ReleaseStatus> ReleaseStatus { get; set; }
        public DbSet<HelpdeskIssueSr> HelpdeskIssueSrs { get; set; }
        public DbSet<ReleaseTicketStatus> ReleaseTicketStatuses { get; set; }
        public DbSet<TblTeamDtls> TblTeamDtls { get; set; }
        public DbSet<PushSubscriptionEntity> PushSubscriptions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Employee mapping
            modelBuilder.Entity<Employee>(entity =>
            {
                entity.ToTable("EMPLOYEE_MASTER", schema: "AML_HRM");
                entity.HasKey(e => e.EmpCode);

                entity.Property(e => e.EmpCode).HasColumnName("EMP_CODE");
                entity.Property(e => e.EmpName).HasColumnName("EMP_NAME");
                entity.Property(e => e.Password).HasColumnName("PASSWORD");
                entity.Property(e => e.DepartmentId).HasColumnName("DEPARTMENT_ID");
                entity.Property(e => e.StatusId).HasColumnName("STATUS_ID");

            });

            // LoginLog mapping
            modelBuilder.Entity<LoginLog>(entity =>
            {
                entity.ToTable("LOGINLOGS");
                entity.HasKey(l => l.LogId);

                entity.Property(l => l.LogId).HasColumnName("LOGID");
                entity.Property(l => l.EmpCode).HasColumnName("EMPCODE");
                entity.Property(l => l.Username).HasColumnName("USERNAME");
                entity.Property(l => l.LoginTime).HasColumnName("LOGINTIME");
                entity.Property(l => l.Success).HasColumnName("SUCCESS");
            });

            // ExpRequest mapping
            modelBuilder.Entity<ExpRequest>(entity =>
            {
                entity.ToTable("EXP_REQUEST");
                entity.HasKey(e => e.Id);

                modelBuilder.Entity<ExpRequest>()
                       .Property(e => e.Id)
                       .ValueGeneratedOnAdd();
                entity.Property(e => e.CrfId).HasColumnName("CRF_ID");
                entity.Property(e => e.UserId).HasColumnName("USER_ID");
                entity.Property(e => e.Subject).HasColumnName("SUBJECT");
                entity.Property(e => e.ChangesToBeMade).HasColumnName("CHANGES_TO_MADE");
                entity.Property(e => e.PublishPath).HasColumnName("PUBLISH_PATH");
                entity.Property(e => e.CommitId).HasColumnName("COMMIT_ID");
                entity.Property(e => e.ReasonForExpedite).HasColumnName("REASON_EXPEDITE");
                entity.Property(e => e.RequirementType).HasColumnName("REQUIREMENT_TYPE");
                modelBuilder.Entity<ExpRequest>()
     .Property(e => e.UatSignoffDocumentData)
     .HasColumnType("BLOB");

                modelBuilder.Entity<ExpRequest>()
                    .Property(e => e.ProductionReleaseDocumentData)
                    .HasColumnType("BLOB");
                entity.Property(e => e.DbType).HasColumnName("DBTYPE");
                entity.Property(e => e.CreatedDate).HasColumnName("CREATED_DATE");
                entity.Property(e => e.Status).HasColumnName("STATUS");

                entity.Property(e => e.RecommendedBy).HasColumnName("RECOMMENDED_BY");
                entity.Property(e => e.RecommendedDate).HasColumnName("RECOMMENDED_DATE");
                entity.Property(e => e.RecommenderComment).HasColumnName("RECOMMENDER_COMMENT");

                entity.Property(e => e.Approver1By).HasColumnName("APPROVER1_BY");
                entity.Property(e => e.Approver1Date).HasColumnName("APPROVER1_DATE");
                entity.Property(e => e.Approver1Comment).HasColumnName("APPROVER1_COMMENT");

                entity.Property(e => e.Approver2By).HasColumnName("APPROVER2_BY");
                entity.Property(e => e.Approver2Date).HasColumnName("APPROVER2_DATE");
                entity.Property(e => e.Approver2Comment).HasColumnName("APPROVER2_COMMENT");

                entity.Property(e => e.ReqId)
         .HasColumnName("REQ_ID")
         .HasComputedColumnSql();

            });


            modelBuilder.Entity<PushSubscriptionEntity>(entity =>
            {
                entity.ToTable("PUSH_SUBSCRIPTIONS");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id)
                       .HasColumnName("ID")
                       .ValueGeneratedOnAdd();
                entity.Property(e => e.EmpCode).HasColumnName("EMP_CODE");
                entity.Property(e => e.Endpoint).HasColumnName("ENDPOINT");
                entity.Property(e => e.P256dh).HasColumnName("P256DH");
                entity.Property(e => e.Auth).HasColumnName("AUTH");
                entity.Property(e => e.CreatedDate).HasColumnName("CREATED_DATE");
                entity.Property(e => e.DeviceInfo).HasColumnName("DEVICE_INFO");
            });

            // CabRequest
            modelBuilder.Entity<CabRequest>(entity =>
            {
                entity.ToTable("CAB_REQUEST");
                entity.HasKey(e => e.Id);

                modelBuilder.Entity<CabRequest>()
                       .Property(e => e.Id)
                       .ValueGeneratedOnAdd();
                entity.Property(e => e.CrfId).HasColumnName("CRF_ID");
                entity.Property(e => e.UserId).HasColumnName("USER_ID");
                entity.Property(e => e.Subject).HasColumnName("SUBJECT");
                entity.Property(e => e.ChangesToBeMade).HasColumnName("CHANGES_TO_MADE");
                entity.Property(e => e.PublishPath).HasColumnName("PUBLISH_PATH");
                entity.Property(e => e.CommitId).HasColumnName("COMMIT_ID");
                entity.Property(e => e.RequirementType).HasColumnName("REQUIREMENT_TYPE");
                modelBuilder.Entity<CabRequest>()
     .Property(e => e.UatSignoffDocumentData)
     .HasColumnType("BLOB");

                modelBuilder.Entity<CabRequest>()
                    .Property(e => e.ProductionReleaseDocumentData)
                    .HasColumnType("BLOB");
                entity.Property(e => e.DbType).HasColumnName("DBTYPE");
                entity.Property(e => e.CreatedDate).HasColumnName("CREATED_DATE");
                entity.Property(e => e.Status).HasColumnName("STATUS");

                entity.Property(e => e.RecommendedBy).HasColumnName("RECOMMENDED_BY");
                entity.Property(e => e.RecommendedDate).HasColumnName("RECOMMENDED_DATE");
                entity.Property(e => e.RecommenderComment).HasColumnName("RECOMMENDER_COMMENT");

                entity.Property(e => e.Approver1By).HasColumnName("APPROVER1_BY");
                entity.Property(e => e.Approver1Date).HasColumnName("APPROVER1_DATE");
                entity.Property(e => e.Approver1Comment).HasColumnName("APPROVER1_COMMENT");

                entity.Property(e => e.Approver2By).HasColumnName("APPROVER2_BY");
                entity.Property(e => e.Approver2Date).HasColumnName("APPROVER2_DATE");
                entity.Property(e => e.Approver2Comment).HasColumnName("APPROVER2_COMMENT");
                entity.Property(e => e.ReqId)
         .HasColumnName("REQ_ID")
         .HasComputedColumnSql();



            });

            // ReleaseSchema
            modelBuilder.Entity<ReleaseSchema>(entity =>
            {
                entity.ToTable("RELEASE_SCHEMA");
                entity.HasNoKey();
                entity.Property(e => e.SchemaName).HasColumnName("SCHEMA_NAME");
            });

            // CRF Master
            modelBuilder.Entity<CrfMaster>(entity =>
            {
                entity.ToTable("TBL_CRFT_MST");
                entity.HasKey(e => e.CrfId);
            });

            modelBuilder.Entity<CrfStatusMaster>(entity =>
            {
                entity.ToTable("TBL_CRFT_STATUS_MST");
                entity.HasKey(e => e.StatusId);
            });

            modelBuilder.Entity<RequestApprovals>(entity =>
            {
                entity.ToTable("TBL_REQUEST_APPROVALS");

                entity.HasKey(e => new { e.EmpCode, e.StepOrder });

                entity.Property(e => e.EmpCode).HasColumnName("EMP_CODE");
                entity.Property(e => e.EmpName).HasColumnName("EMP_NAME");
                entity.Property(e => e.RoleStatus).HasColumnName("ROLE_STATUS");
                entity.Property(e => e.StepOrder).HasColumnName("STEP_ORDER");
            });
            modelBuilder.Entity<ReleaseStatus>(entity =>
            {
                entity.ToTable("RELEASESTATUS");
                entity.HasNoKey();
            });
            modelBuilder.Entity<TblTeamDtls>(entity =>
            {
                entity.ToTable("TBL_TEAM_DTLS");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("ID");
                entity.Property(e => e.EmpCode).HasColumnName("EMP_CODE");
                entity.Property(e => e.EmpName).HasColumnName("EMP_NAME");
                entity.Property(e => e.Role).HasColumnName("ROLE");
                entity.Property(e => e.ParentId).HasColumnName("PARENT_ID");
                entity.Property(e => e.Status).HasColumnName("STATUS");
                entity.Property(e => e.CreatedDate).HasColumnName("CREATED_DATE");
            });
        }
    }
}