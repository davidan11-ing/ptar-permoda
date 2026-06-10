using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace PtarApi.Data;

/// <summary>
/// DbContext principal. Usado principalmente para gestión de conexiones.
/// Las queries complejas usan Dapper directamente via IDbConnectionFactory.
/// </summary>
public class PtarDbContext(DbContextOptions<PtarDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Las entidades se mapean directamente a tablas via fluent API mínima
        // La mayoría de queries son raw SQL contra vistas MySQL — no necesitan mapeo de entidades
    }
}

// ── Fábrica de conexiones para Dapper ─────────────────────────────────────────
public interface IDbConnectionFactory
{
    MySqlConnection Create();
}

public class MySqlConnectionFactory(string connectionString) : IDbConnectionFactory
{
    public MySqlConnection Create() => new(connectionString);
}
