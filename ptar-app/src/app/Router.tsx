// Definición central de rutas de la aplicación PTAR con carga diferida y guards de rol
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import RoleGuard from './guards/RoleGuard';
import { ROUTES } from '../lib/routes';

// Páginas cargadas de forma diferida para optimizar el bundle inicial
const SplashScreen       = lazy(() => import('../features/splash/SplashScreen'));
const LoginPage          = lazy(() => import('../features/auth/LoginPage'));
const OperarioHome       = lazy(() => import('../features/operario/OperarioHome'));
const FormatoCaudales    = lazy(() => import('../features/operario/FormatoCaudales'));
const FormatoReactivos   = lazy(() => import('../features/operario/FormatoReactivos'));
const FormatoCalidad        = lazy(() => import('../features/operario/FormatoCalidad'));
const FormatoIncidencias    = lazy(() => import('../features/operario/FormatoIncidencias'));
const FormatoCondicionesOp  = lazy(() => import('../features/operario/FormatoCondicionesOp'));
const DashboardPage            = lazy(() => import('../features/dashboard/DashboardPage'));
const CalidadDashboardPage     = lazy(() => import('../features/calidad/CalidadDashboardPage'));
const BalanceHidricoDashboard  = lazy(() => import('../features/balance/BalanceHidricoDashboard'));
const CostosDashboard          = lazy(() => import('../features/costos/CostosDashboard'));
const RegistrosPanel           = lazy(() => import('../features/encargado/RegistrosPanel'));
const MantenimientosDashboard  = lazy(() => import('../features/mantenimientos/MantenimientosDashboard'));
const AnalistaPage             = lazy(() => import('../features/analista/AnalistaPage'));
const InformeCalidadPage       = lazy(() => import('../features/calidad/InformeCalidadPage'));
const InformeBalancePage       = lazy(() => import('../features/balance/InformeBalancePage'));
const InformeCostosPage        = lazy(() => import('../features/costos/InformeCostosPage'));
const AdminDashboardPage       = lazy(() => import('../features/dashboard/AdminDashboardPage'));

// Indicador de carga mientras se resuelve el lazy import
const Spinner = () => (
  <div className="page-loading">
    <div className="spinner" />
  </div>
);


// Árbol de rutas protegidas por rol con layout compartido e informes standalone
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />

          {/* Rutas con navbar y layout principal */}
          <Route element={<Layout />}>
            {/* Operario */}
            <Route path="/operario" element={
              <RoleGuard allowedRoles={['operario']}>
                <OperarioHome />
              </RoleGuard>
            }/>
            <Route path="/operario/formato/caudales" element={
              <RoleGuard allowedRoles={['operario']}>
                <FormatoCaudales />
              </RoleGuard>
            }/>
            <Route path="/operario/formato/reactivos" element={
              <RoleGuard allowedRoles={['operario']}>
                <FormatoReactivos />
              </RoleGuard>
            }/>
            <Route path="/operario/formato/calidad" element={
              <RoleGuard allowedRoles={['operario']}>
                <FormatoCalidad />
              </RoleGuard>
            }/>
            <Route path="/operario/formato/incidencias" element={
              <RoleGuard allowedRoles={['operario']}>
                <FormatoIncidencias />
              </RoleGuard>
            }/>
            <Route path="/operario/formato/condiciones" element={
              <RoleGuard allowedRoles={['operario']}>
                <FormatoCondicionesOp />
              </RoleGuard>
            }/>

            {/* Encargado */}
            <Route path="/encargado/dashboard" element={
              <RoleGuard allowedRoles={['encargado']}>
                <DashboardPage canEdit={true} />
              </RoleGuard>
            }/>
            <Route path="/encargado/calidad" element={
              <RoleGuard allowedRoles={['encargado']}>
                <CalidadDashboardPage />
              </RoleGuard>
            }/>
            <Route path="/encargado/balance" element={
              <RoleGuard allowedRoles={['encargado']}>
                <BalanceHidricoDashboard />
              </RoleGuard>
            }/>
            <Route path="/encargado/costos" element={
              <RoleGuard allowedRoles={['encargado']}>
                <CostosDashboard />
              </RoleGuard>
            }/>

            <Route path="/encargado/registros" element={
              <RoleGuard allowedRoles={['encargado']}>
                <RegistrosPanel />
              </RoleGuard>
            }/>

            <Route path="/encargado/analisis" element={
              <RoleGuard allowedRoles={['encargado', 'administrador']}>
                <AnalistaPage />
              </RoleGuard>
            }/>

            {/* Mantenimientos — encargado y administrador (Visualizador) */}
            <Route path="/mantenimientos" element={
              <RoleGuard allowedRoles={['encargado', 'administrador']}>
                <MantenimientosDashboard />
              </RoleGuard>
            }/>

            {/* Administrador */}
            <Route path="/admin/dashboard" element={
              <RoleGuard allowedRoles={['administrador']}>
                <AdminDashboardPage />
              </RoleGuard>
            }/>
          </Route>

          {/* Informes standalone — sin navbar, con auth */}
          <Route path="/informe/calidad" element={
            <RoleGuard allowedRoles={['encargado', 'administrador']}>
              <InformeCalidadPage />
            </RoleGuard>
          }/>
          <Route path="/informe/balance" element={
            <RoleGuard allowedRoles={['encargado', 'administrador']}>
              <InformeBalancePage />
            </RoleGuard>
          }/>
          <Route path="/informe/costos" element={
            <RoleGuard allowedRoles={['encargado', 'administrador']}>
              <InformeCostosPage />
            </RoleGuard>
          }/>

          <Route path="/" element={<SplashScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
