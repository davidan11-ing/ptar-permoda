using System.Text.Json;
using Microsoft.Identity.Client;
using Microsoft.Identity.Client.Extensions.Msal;

namespace PtarApi.Services;

/// <summary>
/// Servicio SharePoint con Device Code Flow (MSAL.NET) — compatible con MFA.
/// El token cache es compatible con el generado por el script Python auth_sharepoint.py.
///
/// Primera vez: correr auth_sharepoint.py desde ptar-backend/ (Python)
/// O correr el método InitiateDeviceCodeFlowAsync() desde aquí.
/// </summary>
public class SharePointService(string siteUrl, string tokenCacheFile, ILogger<SharePointService> logger)
{
    // Cliente público Microsoft Office — mismo que el script Python
    private const string ClientId  = "d3590ed6-52b3-4102-aeff-aad2292ab01c";
    private const string Tenant    = "permodaco.onmicrosoft.com";
    private const string ListGuid  = "9f6714c3-6a81-4773-90f3-0600085416af";
    private static readonly string[] Scopes = ["https://permodaco.sharepoint.com/.default"];

    private readonly string _cacheFilePath = Path.GetFullPath(tokenCacheFile);

    // ── Mapas de normalización (igual que Python) ────────────────────────────
    private static readonly Dictionary<string, string> EstadoMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["PROGRAMADO"]    = "PENDIENTE",
        ["NO CONCERTADO"] = "PENDIENTE",
        ["TERMINADO"]     = "COMPLETADO",
    };

    private static readonly Dictionary<string, string> AreaMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["CORTE FAMILIAS FUNZA"]        = "CORTE",
        ["CORTE JEAN FUNZA"]            = "CORTE",
        ["CORTE TEJIDO DE PUNTO FUNZA"] = "CORTE",
    };

    // ── Token MSAL ───────────────────────────────────────────────────────────
    private async Task<string> GetAccessTokenAsync()
    {
        var cacheHelper = await CreateCacheHelperAsync();
        var app = PublicClientApplicationBuilder
            .Create(ClientId)
            .WithAuthority(AzureCloudInstance.AzurePublic, Tenant)
            .Build();
        cacheHelper.RegisterCache(app.UserTokenCache);

        var accounts = await app.GetAccountsAsync();
        if (!accounts.Any())
            throw new InvalidOperationException(
                "No hay sesión SharePoint guardada. " +
                "Corre auth_sharepoint.py en ptar-backend/ para autenticarte una vez.");

        try
        {
            var result = await app.AcquireTokenSilent(Scopes, accounts.First()).ExecuteAsync();
            return result.AccessToken;
        }
        catch (MsalUiRequiredException)
        {
            throw new InvalidOperationException(
                "El token SharePoint expiró. Corre nuevamente auth_sharepoint.py.");
        }
    }

    private async Task<MsalCacheHelper> CreateCacheHelperAsync()
    {
        var cacheDir  = Path.GetDirectoryName(_cacheFilePath) ?? ".";
        var cacheFile = Path.GetFileName(_cacheFilePath);
        var props = new StorageCreationPropertiesBuilder(cacheFile, cacheDir)
            .WithUnprotectedFile()   // compatible con el cache de Python (sin cifrado OS)
            .Build();
        return await MsalCacheHelper.CreateAsync(props);
    }

    // ── Fetch items desde SharePoint REST API ────────────────────────────────
    public async Task<List<MantenimientoRaw>> FetchItemsAsync()
    {
        var token    = await GetAccessTokenAsync();
        var client   = new HttpClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        client.DefaultRequestHeaders.Add("Accept", "application/json");

        const int MaxPages = 10;
        var resultados = new List<MantenimientoRaw>();

        var url = $"{siteUrl.TrimEnd('/')}/_api/web/lists(guid'{ListGuid}')/items" +
                  "?$select=ID,field_1,field_3,field_4,field_5,field_6,field_7," +
                  "field_9,field_10,field_11,field_12,field_13,field_14,CRITICIDAD,field_21" +
                  "&$orderby=ID%20desc&$top=500";

        for (int page = 1; page <= MaxPages && url != null; page++)
        {
            logger.LogInformation("SharePoint: página {Page} → {Url}...", page, url[..Math.Min(80, url.Length)]);
            var resp = await client.GetAsync(url);
            resp.EnsureSuccessStatusCode();

            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Soporta ambos formatos: {d:{results:[]}} y {value:[]}
            JsonElement items;
            if (root.TryGetProperty("d", out var d) && d.TryGetProperty("results", out items))
            {
                // formato OData v3
            }
            else if (root.TryGetProperty("value", out items))
            {
                // formato OData v4
            }
            else break;

            foreach (var item in items.EnumerateArray())
                resultados.Add(MapItem(item));

            // Next page
            string? nextLink = null;
            if (root.TryGetProperty("d", out var d2) && d2.TryGetProperty("__next", out var n1))
                nextLink = n1.GetString();
            else if (root.TryGetProperty("@odata.nextLink", out var n2))
                nextLink = n2.GetString();
            else if (root.TryGetProperty("odata.nextLink", out var n3))
                nextLink = n3.GetString();

            url = nextLink;
        }

        logger.LogInformation("SharePoint: {Count} ítems descargados", resultados.Count);
        return resultados;
    }

    private MantenimientoRaw MapItem(JsonElement item)
    {
        string? GetStr(string key) =>
            item.TryGetProperty(key, out var v) && v.ValueKind != JsonValueKind.Null
                ? v.GetString() : null;

        int GetId() =>
            item.TryGetProperty("ID", out var v) ? v.GetInt32() : 0;

        int? GetSemana() =>
            item.TryGetProperty("field_1", out var v) && v.ValueKind != JsonValueKind.Null
                ? (int?)v.GetDouble() : null;

        string? ParseDate(string? val)
        {
            if (val is null) return null;
            // field_13 es texto en formato 'D/MM/YYYY' o 'YYYY-MM-DD'
            if (DateOnly.TryParse(val, out var d)) return d.ToString("yyyy-MM-dd");
            return null;
        }

        var estado = GetStr("field_12");
        if (estado != null && EstadoMap.TryGetValue(estado.Trim().ToUpper(), out var normEstado))
            estado = normEstado;
        else if (estado != null)
            estado = estado.Trim().ToUpper();

        var area = GetStr("field_3");
        if (area != null && AreaMap.TryGetValue(area.Trim().ToUpper(), out var normArea))
            area = normArea;
        else
            area = area?.Trim();

        return new MantenimientoRaw
        {
            SpId        = GetId(),
            Semana      = GetSemana(),
            Area        = area,
            Gft         = GetStr("field_4"),
            Objeto      = GetStr("field_5"),
            Af          = GetStr("field_6"),
            Descripcion = GetStr("field_7"),
            Frecuencia  = GetStr("field_9"),
            Responsable = GetStr("field_10"),
            Pedido      = GetStr("field_11"),
            Estado      = estado,
            Dia         = ParseDate(GetStr("field_13")),
            Asignado    = GetStr("field_14"),
            Criticidad  = GetStr("CRITICIDAD"),
            Observaciones = GetStr("field_21"),
        };
    }
}

public record MantenimientoRaw(
    int     SpId        = 0,
    int?    Semana      = null,
    string? Area        = null,
    string? Gft         = null,
    string? Objeto      = null,
    string? Af          = null,
    string? Descripcion = null,
    string? Frecuencia  = null,
    string? Responsable = null,
    string? Pedido      = null,
    string? Estado      = null,
    string?   Dia       = null,
    string? Asignado    = null,
    string? Criticidad  = null,
    string? Observaciones = null
);
