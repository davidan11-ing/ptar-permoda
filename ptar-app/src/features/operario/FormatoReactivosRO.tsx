// F-04 fue integrado en F-02 "Consumo Químico".
// Este archivo redirige para mantener compatibilidad con URLs guardadas.
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';

export default function FormatoReactivosRO() {
  return <Navigate to={ROUTES.FORMATO_REACTIVOS} replace />;
}
