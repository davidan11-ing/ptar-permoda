# ptarClient
`src/services/ptarClient.ts`

**Hub central de datos** — todas las llamadas HTTP al backend pasan por aquí.

## Es importado por
- [[useRegistrosPolling]]
- [[useCalidadData]]
- [[useGemEficiencia]]
- [[useMbrEficiencia]]
- [[useBalanceData]]
- [[useCargaRemovida]]
- [[useDispersionData]]
- [[useKgQuimico]]
- [[useParamVsDosis]]
- [[useRemocionCosto]]
- [[useRemociónGem]]
- [[02 Features/CalidadDashboardPage]]

## Funciones principales exportadas

| Función | Endpoint | Descripción |
|---------|----------|-------------|
| `getCaudalesRecientes()` | `GET /caudales` | Últimas lecturas de contadores |
| `getReactivosRecientes()` | `GET /reactivos` | Últimas dosis de químicos |
| `getCalidadMediciones()` | `GET /calidad/mediciones` | Parámetros físico-químicos |
| `getCalidadParametros()` | `GET /calidad/parametros` | Lista de parámetros disponibles |
| `getCalidadRemociones()` | `GET /calidad/remociones` | Datos remoción GEM |
| `getGemEficiencia()` | `GET /calidad/gem-eficiencia` | Eficiencia sistema GEM |
| `getCalidadMbrEficiencia()` | `GET /calidad/mbr-eficiencia` | Eficiencia MBR |
| `getCalidadDispersion()` | `GET /calidad/dispersion` | Datos de dispersión |
| `getBalanceHidrico()` | `GET /balance` | Balance hídrico |
| `getReporteCalidadHtmlUrl()` | — | URL del reporte HTML |

## Apunta a
`VITE_API_URL` en `.env` → `wserver.permoda.com.co:8001` (producción)

Tags: #servicio #api #datos #hub
