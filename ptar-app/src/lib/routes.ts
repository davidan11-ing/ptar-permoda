// Constantes de rutas y mapa de página inicial por rol de usuario

// Rutas absolutas de todas las páginas de la aplicación
export const ROUTES = {
  LOGIN: '/login',
  // Operario
  OPERARIO_HOME: '/operario',
  FORMATO_CAUDALES: '/operario/formato/caudales',
  FORMATO_REACTIVOS: '/operario/formato/reactivos',
  FORMATO_CALIDAD: '/operario/formato/calidad',
  FORMATO_INCIDENCIAS: '/operario/formato/incidencias',
  FORMATO_CONDICIONES_OP: '/operario/formato/condiciones',
  // Encargado
  ENCARGADO_DASHBOARD:  '/encargado/dashboard',
  ENCARGADO_CALIDAD:    '/encargado/calidad',
  ENCARGADO_BALANCE:    '/encargado/balance',
  ENCARGADO_COSTOS:     '/encargado/costos',
  ENCARGADO_REGISTROS:  '/encargado/registros',
  ENCARGADO_ANALISIS:   '/encargado/analisis',
  // Administrador
  ADMIN_DASHBOARD: '/admin/dashboard',
  // Mantenimientos (SharePoint)
  MANTENIMIENTOS: '/mantenimientos',
} as const;

// Ruta de inicio por defecto según el rol del usuario autenticado
export const ROLE_HOME = {
  operario: ROUTES.OPERARIO_HOME,
  encargado: ROUTES.ENCARGADO_DASHBOARD,
  administrador: ROUTES.ADMIN_DASHBOARD,
} as const;
