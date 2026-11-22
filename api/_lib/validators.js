export const TIPOS_DOCUMENTO = ['DNI', 'CE', 'CPP', 'Pasaporte'];
export const TURNOS_VALIDOS = ['manana', 'tarde', 'noche'];
export const ENTIDADES_DERIVACION = ['DEMUNA', 'MIMP', 'ONG Aliada'];
export const ESTADOS_ALERTA = ['reportado', 'en_atencion', 'derivado'];
export const METODOS_PAGO = ['Yape', 'Plin', 'Tarjeta', 'Billetera'];

export const CATALOGO_SERVICIOS = {
  parabrisas_rapido: { label: 'Limpieza Rápida de Parabrisas', precio: 5.0 },
  cristales_completo: { label: 'Limpieza Completa de Cristales', precio: 10.0 },
  ecologico_premium: { label: 'Lavado Ecológico Exterior Express', precio: 15.0 }
};

export function calcularEdad(fechaNacimiento, fechaReferencia = new Date()) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return null;

  let edad = fechaReferencia.getFullYear() - nacimiento.getFullYear();
  const diffMes = fechaReferencia.getMonth() - nacimiento.getMonth();
  if (diffMes < 0 || (diffMes === 0 && fechaReferencia.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }
  return edad;
}

export function esMayorDeEdad(fechaNacimiento, fechaReferencia = new Date()) {
  const edad = calcularEdad(fechaNacimiento, fechaReferencia);
  return edad !== null && edad >= 18;
}

export function validarOperario(payload = {}, fechaReferencia = new Date()) {
  const errores = [];

  const nombre = String(payload.nombre_completo || '').trim();
  const tipoDoc = String(payload.tipo_documento || '').trim();
  const numDoc = String(payload.numero_documento || '').trim();
  const fechaNac = String(payload.fecha_nacimiento || '').trim();
  const telefono = String(payload.telefono || '').trim();
  const turno = String(payload.turno || 'manana').trim();
  const porcentajeAhorro = Number(payload.porcentaje_microahorro ?? 10);

  if (nombre.length < 3) {
    errores.push('El nombre completo debe tener al menos 3 caracteres.');
  }
  if (!TIPOS_DOCUMENTO.includes(tipoDoc)) {
    errores.push(`Tipo de documento inválido. Permitidos: ${TIPOS_DOCUMENTO.join(', ')}.`);
  }
  if (numDoc.length < 6 || numDoc.length > 20) {
    errores.push('El número de documento debe tener entre 6 y 20 caracteres.');
  }
  const edad = calcularEdad(fechaNac, fechaReferencia);
  if (edad === null) {
    errores.push('La fecha de nacimiento es obligatoria y debe tener formato YYYY-MM-DD.');
  } else if (edad < 18) {
    errores.push('Registro bloqueado: el operario debe ser mayor de edad (18+ años). Si se trata de un menor en riesgo, utilice el módulo de Alerta y Derivación.');
  }
  if (!/^[0-9+\-\s]{7,15}$/.test(telefono)) {
    errores.push('El teléfono debe contener entre 7 y 15 dígitos.');
  }
  if (!TURNOS_VALIDOS.includes(turno)) {
    errores.push(`Turno inválido. Permitidos: ${TURNOS_VALIDOS.join(', ')}.`);
  }
  if (Number.isNaN(porcentajeAhorro) || porcentajeAhorro < 0 || porcentajeAhorro > 50) {
    errores.push('El porcentaje de microahorro debe estar entre 0% y 50%.');
  }

  return {
    valido: errores.length === 0,
    esMenor: edad !== null && edad < 18,
    errores
  };
}

export function validarAlertaMenor(payload = {}) {
  const errores = [];
  const ubicacion = String(payload.ubicacion_referencia || '').trim();
  const descripcion = String(payload.descripcion || '').trim();
  const entidad = String(payload.entidad_derivada || 'DEMUNA').trim();

  if (ubicacion.length < 5) {
    errores.push('La ubicación o cruce de referencia debe tener al menos 5 caracteres.');
  }
  if (descripcion.length < 10) {
    errores.push('La descripción de la situación debe tener al menos 10 caracteres.');
  }
  if (!ENTIDADES_DERIVACION.includes(entidad)) {
    errores.push(`Entidad de derivación inválida. Permitidas: ${ENTIDADES_DERIVACION.join(', ')}.`);
  }

  return { valido: errores.length === 0, errores };
}

export function validarServicio(payload = {}) {
  const errores = [];
  const zonaId = String(payload.zona_id || '').trim();
  const conductor = String(payload.conductor_nombre || '').trim();
  const placa = String(payload.placa_vehiculo || '').trim().toUpperCase();
  const tipo = String(payload.tipo_servicio || 'parabrisas_rapido').trim();

  if (!zonaId) {
    errores.push('Debe seleccionar una zona segura autorizada.');
  }
  if (conductor.length < 2) {
    errores.push('El nombre del conductor debe tener al menos 2 caracteres.');
  }
  if (!/^[A-Z0-9-]{5,10}$/.test(placa)) {
    errores.push('La placa del vehículo debe tener entre 5 y 10 caracteres alfanuméricos (ej. ABC-123).');
  }
  if (!Object.prototype.hasOwnProperty.call(CATALOGO_SERVICIOS, tipo)) {
    errores.push('Tipo de servicio inválido.');
  }

  return { valido: errores.length === 0, errores };
}

export function calcularLiquidacionPago({ montoBase, propina = 0, porcentajeMicroahorro = 10 }) {
  const base = Number(montoBase);
  const tip = Number(propina);
  const pct = Number(porcentajeMicroahorro);

  if (Number.isNaN(base) || base <= 0) {
    throw new Error('El monto base debe ser mayor a 0.');
  }
  if (Number.isNaN(tip) || tip < 0) {
    throw new Error('La propina no puede ser negativa.');
  }
  if (Number.isNaN(pct) || pct < 0 || pct > 50) {
    throw new Error('El porcentaje de microahorro debe estar entre 0 y 50.');
  }

  const montoBruto = Number((base + tip).toFixed(2));
  const montoMicroahorro = Number(((montoBruto * pct) / 100).toFixed(2));
  const montoNeto = Number((montoBruto - montoMicroahorro).toFixed(2));

  return {
    montoBruto,
    montoPropina: Number(tip.toFixed(2)),
    montoMicroahorro,
    montoNeto
  };
}

export function validarPago(payload = {}) {
  const errores = [];
  const servicioId = String(payload.servicio_id || '').trim();
  const operarioId = String(payload.operario_id || '').trim();
  const metodo = String(payload.metodo_pago || '').trim();
  const montoBase = Number(payload.monto_base);
  const propina = Number(payload.propina ?? 0);

  if (!servicioId) errores.push('El identificador del servicio es obligatorio.');
  if (!operarioId) errores.push('El identificador del operario es obligatorio.');
  if (!METODOS_PAGO.includes(metodo)) {
    errores.push(`Método de pago inválido. Permitidos: ${METODOS_PAGO.join(', ')}.`);
  }
  if (Number.isNaN(montoBase) || montoBase <= 0) {
    errores.push('El monto base debe ser mayor a 0.');
  }
  if (Number.isNaN(propina) || propina < 0) {
    errores.push('La propina debe ser mayor o igual a 0.');
  }

  return { valido: errores.length === 0, errores };
}

export function generarCodigoConstancia(operarioId = 'OP', fecha = new Date()) {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  const prefijo = String(operarioId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'OP0000';
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  const sufijo = 100000 + (buf[0] % 900000);
  return `LS-${yyyy}${mm}${dd}-${prefijo}-${sufijo}`;
}

export function validarEntregaEpp(payload = {}) {
  const errores = [];
  const operarioId = String(payload.operario_id || '').trim();
  const item = String(payload.item || '').trim();
  const cantidad = Number(payload.cantidad ?? 1);

  if (!operarioId) errores.push('Debe seleccionar un operario.');
  if (item.length < 3) errores.push('El nombre del kit o EPP debe tener al menos 3 caracteres.');
  if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 20) {
    errores.push('La cantidad debe ser un entero entre 1 y 20.');
  }

  return { valido: errores.length === 0, errores };
}
