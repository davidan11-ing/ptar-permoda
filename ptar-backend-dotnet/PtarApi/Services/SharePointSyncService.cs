using Dapper;
using PtarApi.Data;

namespace PtarApi.Services;

/// <summary>
/// BackgroundService que sincroniza SharePoint → MySQL cada N horas.
/// Equivale al APScheduler de Python.
/// </summary>
public class SharePointSyncService(
    IServiceProvider services,
    IConfiguration config,
    ILogger<SharePointSyncService> logger) : BackgroundService
{
    private readonly int _syncHours =
        int.TryParse(config["SharePoint:SyncHours"], out var h) ? h : 1;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // Esperar 5 segundos para que la app arranque completamente
        await Task.Delay(TimeSpan.FromSeconds(5), ct);

        logger.LogInformation("SharePointSyncService iniciado (cada {H}h)", _syncHours);

        // Primera sincronización al arrancar
        await RunSyncAsync(ct);

        using var timer = new PeriodicTimer(TimeSpan.FromHours(_syncHours));
        while (await timer.WaitForNextTickAsync(ct))
            await RunSyncAsync(ct);
    }

    private async Task RunSyncAsync(CancellationToken ct)
    {
        using var scope = services.CreateScope();
        var spService   = scope.ServiceProvider.GetRequiredService<SharePointService>();
        var dbFactory   = scope.ServiceProvider.GetRequiredService<IDbConnectionFactory>();

        try
        {
            logger.LogInformation("Iniciando sincronización SharePoint...");
            var items    = await spService.FetchItemsAsync();
            var upserted = await UpsertItemsAsync(dbFactory, items);
            logger.LogInformation("Sync completado: {N} registros", upserted);
        }
        catch (Exception ex)
        {
            logger.LogWarning("Sync SharePoint falló: {Msg}", ex.Message);
        }
    }

    private static async Task<int> UpsertItemsAsync(
        IDbConnectionFactory factory, List<MantenimientoRaw> items)
    {
        if (items.Count == 0) return 0;

        const string sql = """
            INSERT INTO mantenimientos_preventivos
              (sharepoint_id, semana, area, gft, objeto, af, descripcion,
               frecuencia, responsable, pedido_de_trabajo, criticidad,
               estado, dia_programado, asignado_a, observaciones)
            VALUES
              (@SpId, @Semana, @Area, @Gft, @Objeto, @Af, @Descripcion,
               @Frecuencia, @Responsable, @Pedido, @Criticidad,
               @Estado, @Dia, @Asignado, @Observaciones)
            ON DUPLICATE KEY UPDATE
              semana            = @Semana,
              area              = @Area,
              gft               = @Gft,
              objeto            = @Objeto,
              af                = @Af,
              descripcion       = @Descripcion,
              frecuencia        = @Frecuencia,
              responsable       = @Responsable,
              pedido_de_trabajo = @Pedido,
              criticidad        = @Criticidad,
              estado            = @Estado,
              dia_programado    = @Dia,
              asignado_a        = @Asignado,
              observaciones     = @Observaciones
            """;

        await using var conn = factory.Create();
        await conn.OpenAsync();
        await conn.ExecuteAsync(sql, items);
        return items.Count;
    }
}
