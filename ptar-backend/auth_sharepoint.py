"""
auth_sharepoint.py
─────────────────────────────────────────────────────────────────
Autenticación inicial con SharePoint usando Device Code Flow.
Compatible con MFA — NO requiere contraseña en .env.

CÓMO USAR (solo una vez cada ~90 días):
  cd ptar-backend
  .venv\Scripts\python.exe auth_sharepoint.py

1. El script imprime una URL y un código corto.
2. Abre la URL en cualquier navegador (puedes hacerlo en el celular).
3. Ingresa el código y completa el login con tu cuenta davidan@permoda.com.co
4. Acepta los permisos → el script guarda el token.
5. Reinicia el backend → ya sincroniza automáticamente con SharePoint.

El token se renueva en silencio mientras el backend esté corriendo.
Si el refresh token expira (~90 días) → corre este script de nuevo.
─────────────────────────────────────────────────────────────────
"""
import sys, json
sys.path.insert(0, ".")

from app.services.sharepoint import (
    MSAL_CLIENT_ID, MSAL_TENANT, MSAL_SCOPES, TOKEN_CACHE_FILE
)

try:
    import msal
except ImportError:
    print("ERROR: msal no instalado. Corre: pip install msal")
    sys.exit(1)

print("=" * 60)
print("  Autenticación SharePoint — PTAR Permoda")
print("=" * 60)
print()

# Cargar caché existente si la hay
cache = msal.SerializableTokenCache()
if TOKEN_CACHE_FILE.exists():
    cache.deserialize(TOKEN_CACHE_FILE.read_text(encoding="utf-8"))
    print(f"Caché existente encontrada en: {TOKEN_CACHE_FILE}")

msal_app = msal.PublicClientApplication(
    MSAL_CLIENT_ID,
    authority=f"https://login.microsoftonline.com/{MSAL_TENANT}",
    token_cache=cache,
)

# Intentar renovar silenciosamente si ya hay cuenta
accounts = msal_app.get_accounts()
result = None
if accounts:
    print(f"Cuenta en caché: {accounts[0].get('username', '?')}")
    print("Intentando renovar token silenciosamente...")
    result = msal_app.acquire_token_silent(MSAL_SCOPES, account=accounts[0])
    if result and "access_token" in result:
        print("✓ Token renovado silenciosamente — no necesitas hacer nada más.")

if not result or "access_token" not in result:
    # Device Code Flow
    print()
    print("Iniciando Device Code Flow...")
    print()
    flow = msal_app.initiate_device_flow(scopes=MSAL_SCOPES)

    if "user_code" not in flow:
        print("ERROR al iniciar flow:", flow.get("error_description", flow))
        sys.exit(1)

    print("─" * 60)
    print(flow["message"])   # Imprime: "To sign in, use a web browser..."
    print("─" * 60)
    print()
    print("Esperando que completes el login en el navegador...")
    print("(tienes ~15 minutos — puedes hacerlo en el celular si quieres)")
    print()

    result = msal_app.acquire_token_by_device_flow(flow)

    if "access_token" not in result:
        print()
        print("ERROR al obtener token:")
        print(result.get("error_description", result))
        sys.exit(1)

    print()
    print("✓ Autenticación exitosa!")

# Guardar caché
TOKEN_CACHE_FILE.write_text(cache.serialize(), encoding="utf-8")
print(f"✓ Token guardado en: {TOKEN_CACHE_FILE.name}")
print()

# Verificación rápida
account_name = msal_app.get_accounts()[0].get("username", "?") if msal_app.get_accounts() else "?"
print(f"Cuenta autenticada: {account_name}")
print()
print("=" * 60)
print("  LISTO — Reinicia el backend para activar la sincronización")
print("  El backend sincronizará con SharePoint al arrancar y cada hora.")
print("=" * 60)
