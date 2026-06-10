# Notas pendientes — App PTAR

---

## 🔐 Acceso usuario Luna Sofía Osorio Parra

**Correo:** `lunaop@permoda.com.co`  
**Estado:** usuario NO existe en la base de datos → no puede iniciar sesión.

### Qué hay que hacer

Ejecutar el siguiente SQL **una sola vez** en MySQL Workbench (base `ptar_permoda`):

```sql
INSERT INTO ptar_permoda.ptar_users (email, nombre, role, password_hash)
VALUES (
  'lunaop@permoda.com.co',
  'Luna Sofía Osorio Parra',
  'operario',
  '$2b$12$yOWAU3SIKAoPGKH4SSWQ/uxFTVyeoI/rl.QDB1iTq4K1Fk18akkZa'
);
```

**Contraseña resultante:** (consultar con David Arévalo)

### Roles que tendrá en la app

El archivo `ptar-app/src/features/auth/AuthContext.tsx` tiene una lista
`USERS_BY_EMAIL` que sobreescribe los roles del backend. Luna debe estar ahí
con todos los roles que necesite. Verificar que exista esta entrada (o agregarla):

```typescript
'lunaop@permoda.com.co': { roles: ['operario', 'encargado', 'calidad', 'admin'] },
```

Si no está en `USERS_BY_EMAIL`, solo tendrá el rol `operario` (el que se
inserta en la DB).

### Verificación post-INSERT

```sql
SELECT id, email, nombre, role FROM ptar_permoda.ptar_users
WHERE email = 'lunaop@permoda.com.co';
```

Debe devolver 1 fila. Luego probar login en la app con `lunaop@permoda.com.co`
/ `Permoda2026!`.

---

## 🚀 Nuevo backend — ptar-backend-dotnet (.NET 10)

El backend Python (`ptar-backend/`) fue **reemplazado** por un nuevo backend en
C# / ASP.NET Core 10 ubicado en `ptar-backend-dotnet/`. El frontend ya apunta
al puerto 8001 que usa este nuevo backend.

### Requisitos previos (instalar una sola vez)

1. **.NET 10 SDK** — descargar desde https://dotnet.microsoft.com/download/dotnet/10.0
   - Verificar instalación: `dotnet --version` (debe mostrar `10.x.x`)

### Configurar credenciales (primera vez)

El archivo `appsettings.Development.json` **no está en el repositorio** (está en
`.gitignore` por seguridad). Hay que crearlo manualmente:

**Ruta:** `ptar-backend-dotnet/PtarApi/appsettings.Development.json`

**Contenido:**
```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Port=3306;Database=ptar_permoda;User=root;Password=TU_PASSWORD_MYSQL;CharSet=utf8mb4;AllowPublicKeyRetrieval=true;"
  },
  "Jwt": {
    "Secret": "cadena-secreta-minimo-32-caracteres-cambiar"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "PtarApi": "Debug"
    }
  }
}
```

> Las credenciales reales las provee David Arévalo — no se documentan aquí por seguridad.

### Copiar token de SharePoint

El token de autenticación SharePoint tampoco está en el repositorio. Copiarlo
desde el backend Python:

```powershell
Copy-Item "ptar-backend\.sharepoint_token_cache.json" "ptar-backend-dotnet\.sharepoint_token_cache.json"
```

> Si no existe el token, ejecutar primero `python auth_sharepoint.py` en
> `ptar-backend/` para generarlo.

### Comando para iniciar el backend

Abrir PowerShell y ejecutar:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"; cd "ptar-backend-dotnet\PtarApi"; dotnet run
```

El backend arranca en `http://localhost:5000` → `http://localhost:8001`.
Swagger disponible en: `http://localhost:8001/swagger`

Al arrancar, sincroniza automáticamente con SharePoint y repite cada 1 hora.

### El backend Python ya no es necesario

`ptar-backend/` puede ignorarse. El nuevo backend .NET cubre el 100% de los
endpoints que usa el frontend.

---

*Nota backend .NET creada: 2026-06-10*

---

*Nota usuario Luna creada: 2026-06-09*
