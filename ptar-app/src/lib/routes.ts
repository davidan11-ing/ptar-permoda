export const ROUTES = {
  LOGIN: '/login',
  // Operario
  OPERARIO_HOME: '/operario',
  FORMATO_CAUDALES: '/operario/formato/caudales',
  FORMATO_REACTIVOS: '/operario/formato/reactivos',
  FORMATO_INCIDENCIAS: '/operario/formato/incidencias',
  FORMATO_CONDICIONES_OP: '/operario/formato/condiciones',
  // Encargado
  ENCARGADO_DASHBOARD: '/encargado/dashboard',
  ENCARGADO_CALIDAD:   '/encargado/calidad',
  ENCARGADO_BALANCE:   '/encargado/balance',
  ENCARGADO_COSTOS:    '/encargado/costos',
  // Administrador
  ADMIN_DASHBOARD: '/admin/dashboard',
} as const;

export const ROLE_HOME = {
  operario: ROUTES.OPERARIO_HOME,
  encargado: ROUTES.ENCARGADO_DASHBOARD,
  administrador: ROUTES.ADMIN_DASHBOARD,
} as const;
