# useRegistrosPolling
`src/hooks/useRegistrosPolling.ts`

Polling cada **15 segundos** para mantener actualizados los registros recientes.

## Importa a
- [[ptarClient]] — `getCaudalesRecientes`, `getReactivosRecientes`

## Es importado por
- Usado en el dashboard del encargado para mostrar datos en vivo

## Por qué polling y no WebSocket
> Zscaler (proxy corporativo Permoda) bloquea conexiones WebSocket.
> El polling es el workaround permanente.

Tags: #hook #polling #tiempo-real
