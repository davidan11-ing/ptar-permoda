# PTAR PERMODA — App de Gestión

Sistema de monitoreo y gestión de la Planta de Tratamiento de Agua de Permoda.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript |
| Backend | .NET 10 / ASP.NET Core + Dapper |
| Base de datos | MySQL 8.0 |
| Auth / Realtime | Supabase |

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js | 22 |
| pnpm | 9 (`npm install -g pnpm`) |
| .NET SDK | 10 |
| MySQL | 8.0 |

---

## 1. Base de datos

```bash
# Crear la BD
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ptar_permoda CHARACTER SET utf8mb4;"

# Importar el backup (incluye schema + datos operativos)
# PowerShell:
Get-Content ptar_permoda_backup.sql | mysql -u root -p ptar_permoda
```

> **Nota:** La tabla `mantenimientos_preventivos` (OTs de SharePoint) viene vacía en el backup.
> Se llena automáticamente cuando el backend arranca con el token de SharePoint configurado.

---

## 2. Backend (.NET 10)

### 2.1 Credenciales MySQL

Crea el archivo `ptar-backend-dotnet/PtarApi/appsettings.Development.json` con tus credenciales locales
(este archivo **no se sube al repositorio**):

```json
{
  "ConnectionStrings": {
    "Default": "Server=127.0.0.1;Port=3306;Database=ptar_permoda;User=root;Password=TU_PASSWORD;CharSet=utf8mb4;AllowPublicKeyRetrieval=true;"
  },
  "Jwt": {
    "Secret": "clave_local_minimo_32_caracteres_cualquiera"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "PtarApi": "Debug"
    }
  }
}
```

> **Tip:** Si tu root de MySQL no tiene contraseña, deja `Password=;`.
> Si usas `caching_sha2_password` (default MySQL 8), agrega `AllowPublicKeyRetrieval=true;` ya incluido.

### 2.2 Arrancar el backend

```bash
cd ptar-backend-dotnet/PtarApi
dotnet restore
dotnet run --environment Development
# API disponible en http://localhost:8001
```

### 2.3 SharePoint (OTs de mantenimiento)

La sincronización con SharePoint requiere autenticación inicial (Device Code Flow, compatible con MFA).
Solo se hace **una vez cada ~90 días**:

```bash
cd ptar-backend
# Instalar dependencias del entorno Python
.venv\Scripts\pip.exe install msal

# Autenticar
.venv\Scripts\python.exe auth_sharepoint.py
# → Te da una URL y un código. Ábrela en el navegador y loguéate con tu cuenta Permoda.
```

Después reinicia el backend — sincronizará automáticamente al arrancar y cada hora.

---

## 3. Frontend (React + Vite)

```bash
cd ptar-app

# Copiar variables de entorno
copy .env.example .env.local
# Editar .env.local con las keys de Supabase y la URL del backend (http://localhost:8001)

# Instalar dependencias
pnpm install

# Correr en desarrollo
pnpm run dev
# App disponible en http://localhost:5174
```

### Build de producción

```bash
pnpm run build
# Artefactos en ptar-app/dist/
```

---

## Estructura del repositorio

```
App PTAR 2/
├── ptar-app/                  # Frontend React
├── ptar-backend-dotnet/       # Backend .NET 10
│   └── PtarApi/
│       ├── appsettings.json              # Config base (placeholder de credenciales)
│       └── appsettings.Development.json  # Config local — NO commitear
├── ptar-backend/              # Scripts Python (SharePoint auth, ETL)
└── ptar_permoda_backup.sql    # Backup BD — actualizar con cada release
```

---

## Credenciales y secretos

| Archivo | Estado | Qué contiene |
|---------|--------|-------------|
| `appsettings.Development.json` | ❌ No en repo | Contraseña MySQL local, JWT secret |
| `ptar-app/.env.local` | ❌ No en repo | Keys Supabase, URL backend |
| `appsettings.json` | ✅ En repo | Solo placeholders (`CAMBIAR_EN_SECRETS`) |

---

*Última actualización del backup: 2026-08-21*
