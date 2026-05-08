using Microsoft.EntityFrameworkCore;
using ReleaseModule.Data;

public class WarmupService : IHostedService
{
    private readonly IServiceProvider _provider;

    public WarmupService(IServiceProvider provider)
    {
        _provider = provider;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(2000, cancellationToken);

                using var scope = _provider.CreateScope();
                var db = scope.ServiceProvider
                    .GetRequiredService<ApplicationDbContext>();

                await db.Database.ExecuteSqlRawAsync("SELECT 1 FROM DUAL", cancellationToken);
                await db.Employee_Master.AsNoTracking().AnyAsync(cancellationToken);
                await db.TblTeamDtls.AsNoTracking().AnyAsync(cancellationToken);
                await db.ApprovalFlows.AsNoTracking().AnyAsync(cancellationToken);

                Console.WriteLine("[WarmupService] Oracle warmed up successfully.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WarmupService] Warmup failed: {ex.Message}");
            }
        }, cancellationToken);

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}