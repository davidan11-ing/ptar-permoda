using Dapper;
using PtarApi.Data;

namespace PtarApi.Services;

public class TokenCleanupService(IServiceProvider services, ILogger<TokenCleanupService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromMinutes(5), ct);
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IDbConnectionFactory>();
                await using var conn = db.Create();
                var deleted = await conn.ExecuteAsync(
                    "DELETE FROM ptar_refresh_tokens WHERE expires_at < @Cutoff",
                    new { Cutoff = DateTime.UtcNow });
                if (deleted > 0)
                    logger.LogInformation("[CLEANUP] Deleted {N} expired refresh tokens", deleted);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[CLEANUP] Error cleaning expired refresh tokens");
            }
            await Task.Delay(TimeSpan.FromHours(24), ct);
        }
    }
}
