# Cloudflare Tunnel — Guía de Uso PTAR

Permite exponer la app local a internet sin necesidad de servidor ni dominio.

---

## Instalación (una sola vez)

```powershell
winget install --id Cloudflare.cloudflared
```

Cierra y abre una nueva terminal para que tome el PATH.

---

## Uso rápido (Quick Tunnel)

Con el **backend** y **frontend** corriendo, ejecuta en una nueva terminal:

```powershell
cloudflared tunnel --url http://localhost:5174
```

Espera ~5 segundos. Verás:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:                                          |
|  https://palabras-aleatorias.trycloudflare.com                                             |
+--------------------------------------------------------------------------------------------+
```

Comparte esa URL. Cualquier persona con internet puede acceder.

---

## Requisitos previos

Antes de ejecutar el tunnel, asegúrate de tener corriendo:

### Terminal 1 — Backend
```powershell
cd "C:\Users\santi\OneDrive\Imágenes\Documentos\Claude\Ptar-Permoda\ptar-backend"
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8001
```

### Terminal 2 — Frontend
```powershell
cd "C:\Users\santi\OneDrive\Imágenes\Documentos\Claude\Ptar-Permoda\ptar-app"
npm run dev
```

### Terminal 3 — Tunnel
```powershell
cloudflared tunnel --url http://localhost:5174
```

---

## Configuración requerida en vite.config.ts

Para que Vite acepte el dominio externo de Cloudflare, el archivo `ptar-app/vite.config.ts` debe tener `allowedHosts: true`:

```typescript
server: {
  port: 5174,
  strictPort: true,
  allowedHosts: true,   // ← requerido para Cloudflare Tunnel
  proxy: {
    '/api': {
      target: 'http://localhost:8001',
      changeOrigin: true,
    },
  },
},
```

Sin esto, Vite devuelve "Blocked request" al acceder desde la URL del tunnel.

---

## Limitaciones del Quick Tunnel

| Aspecto | Detalle |
|---|---|
| URL | Aleatoria, cambia cada vez que reinicias |
| Disponibilidad | Sin garantía de uptime (uso dev/demo) |
| Conexiones simultáneas | Máximo 200 |
| Server-Sent Events | No soportado |
| Uso | Solo desarrollo y demos — no producción |

---

## Para producción (URL fija con dominio)

Si tienes un dominio en Cloudflare, configura un tunnel permanente:

```powershell
# 1. Autenticarse
cloudflared tunnel login

# 2. Crear tunnel con nombre
cloudflared tunnel create ptar-permoda

# 3. Crear config: C:\Users\santi\.cloudflared\config.yml
# tunnel: <UUID>
# credentials-file: C:\Users\santi\.cloudflared\<UUID>.json
# ingress:
#   - hostname: ptar.tudominio.com
#     service: http://localhost:5174
#   - service: http_status:404

# 4. Enrutar DNS
cloudflared tunnel route dns ptar-permoda ptar.tudominio.com

# 5. Correr
cloudflared tunnel run ptar-permoda
```

---

## Notas importantes

- **No cierres la terminal del tunnel** — si la cierras, la URL deja de funcionar
- El backend también debe seguir corriendo en su terminal
- La URL del Quick Tunnel cambia cada vez que reinicias cloudflared
- Cloudflare conecta desde el datacenter más cercano (bog01 = Bogotá)
