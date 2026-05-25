import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import RoleGuard from './guards/RoleGuard';
import { ROUTES } from '../lib/routes';

const SplashScreen       = lazy(() => import('../features/splash/SplashScreen'));
const LoginPage          = lazy(() => import('../features/auth/LoginPage'));
const OperarioHome       = lazy(() => import('../features/operario/OperarioHome'));
const FormatoCaudales    = lazy(() => import('../features/operario/FormatoCaudales'));
const FormatoReactivos   = lazy(() => import('../features/operario/FormatoReactivos'));
const FormatoIncidencias    = lazy(() => import('../features/operario/FormatoIncidencias'));
const FormatoCondicionesOp  = lazy(() => import('../features/operario/FormatoCondicionesOp'));
const DashboardPage            = lazy(() => import('../features/dashboard/DashboardPage'));
const CalidadDashboardPage     = lazy(() => import('../features/calidad/CalidadDashboardPage'));
const BalanceHidricoDashboard  = lazy(() => import('../features/balance/BalanceHidricoDashboard'));
const CostosDashboard          = lazy(() => import('../features/costos/CostosDashboard'));

const Spinner = () => (
  <div className="page-loading">
    <div className="spinner" />
  </div>
);


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />

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
              <RoleGuard allowedRoles={['encargado', 'administrador']}>
                <CalidadDashboardPage />
              </RoleGuard>
            }/>
            <Route path="/encargado/balance" element={
              <RoleGuard allowedRoles={['encargado', 'administrador']}>
                <BalanceHidricoDashboard />
              </RoleGuard>
            }/>
            <Route path="/encargado/costos" element={
              <RoleGuard allowedRoles={['encargado', 'administrador']}>
                <CostosDashboard />
              </RoleGuard>
            }/>

            {/* Administrador */}
            <Route path="/admin/dashboard" element={
              <RoleGuard allowedRoles={['administrador']}>
                <DashboardPage canEdit={false} />
              </RoleGuard>
            }/>
          </Route>

          <Route path="/" element={<SplashScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
