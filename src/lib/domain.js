export {
  CATALOGO_SERVICIOS,
  ENTIDADES_DERIVACION,
  ESTADOS_ALERTA,
  METODOS_PAGO,
  TIPOS_DOCUMENTO,
  TURNOS_VALIDOS,
  calcularEdad,
  calcularLiquidacionPago,
  esMayorDeEdad,
  generarCodigoConstancia,
  validarAlertaMenor,
  validarEntregaEpp,
  validarOperario,
  validarPago,
  validarServicio
} from '../../api/_lib/validators.js';

export const ROLES_USUARIO = [
  { id: 'operario', label: 'Operario (Limpiaparabrisas)' },
  { id: 'conductor', label: 'Conductor' },
  { id: 'admin_ong', label: 'Municipalidad / ONG' }
];

export const LABELS_TURNO = {
  manana: 'Mañana (07:00 - 13:00)',
  tarde: 'Tarde (13:00 - 19:00)',
  noche: 'Noche (19:00 - 22:00)'
};

export const ITEMS_EPP = [
  'Chaleco reflectivo certificado',
  'Kit ecológico biodegradable (microfibra + atomizador)',
  'Guantes de protección química',
  'Gorra UV y bloqueador solar'
];

export function formatPen(amount) {
  const value = Number(amount || 0);
  return `S/ ${value.toFixed(2)}`;
}
