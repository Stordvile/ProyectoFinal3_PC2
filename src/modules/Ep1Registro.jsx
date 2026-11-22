import { useState } from 'react';
import { AlertTriangle, MapPin, ShieldAlert, UserPlus, Users } from 'lucide-react';
import {
  ENTIDADES_DERIVACION,
  LABELS_TURNO,
  TIPOS_DOCUMENTO,
  TURNOS_VALIDOS,
  validarAlertaMenor,
  validarOperario
} from '../lib/domain.js';
import { apiRequest } from '../lib/apiClient.js';

const INITIAL_OPERARIO = {
  nombre_completo: '',
  tipo_documento: 'CE',
  numero_documento: '',
  fecha_nacimiento: '1998-06-15',
  nacionalidad: 'Venezolana',
  telefono: '',
  zona_asignada_id: '',
  turno: 'manana'
};

const INITIAL_ALERTA = {
  zona_id: '',
  ubicacion_referencia: '',
  descripcion: '',
  entidad_derivada: 'DEMUNA',
  reportado_por: 'Operario / Vecino'
};

export default function Ep1Registro({ zonas, operarios, alertas, onRefresh, rolActivo }) {
  const [formOp, setFormOp] = useState(INITIAL_OPERARIO);
  const [formAlerta, setFormAlerta] = useState(INITIAL_ALERTA);
  const [opFeedback, setOpFeedback] = useState(null);
  const [alertaFeedback, setAlertaFeedback] = useState(null);
  const [submittingOp, setSubmittingOp] = useState(false);
  const [submittingAlerta, setSubmittingAlerta] = useState(false);

  const zonasAutorizadas = zonas.filter((z) => z.autorizada);

  async function handleRegistrarOperario(e) {
    e.preventDefault();
    setOpFeedback(null);

    const check = validarOperario(formOp);
    if (!check.valido) {
      setOpFeedback({ type: 'error', text: check.errores[0], esMenor: check.esMenor });
      return;
    }

    setSubmittingOp(true);
    try {
      const payload = {
        ...formOp,
        zona_asignada_id: formOp.zona_asignada_id || zonasAutorizadas[0]?.id || null
      };
      const res = await apiRequest('/api/operarios', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setOpFeedback({ type: 'success', text: res.message || 'Operario registrado y verificado.' });
      setFormOp(INITIAL_OPERARIO);
      await onRefresh();
    } catch (err) {
      setOpFeedback({
        type: 'error',
        text: err.message,
        esMenor: Boolean(err.details?.esMenor)
      });
    } finally {
      setSubmittingOp(false);
    }
  }

  async function handleCambiarTurno(operarioId, nuevoTurno) {
    try {
      await apiRequest('/api/operarios', {
        method: 'PATCH',
        body: JSON.stringify({ id: operarioId, turno: nuevoTurno })
      });
      await onRefresh();
    } catch (err) {
      setOpFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleReportarMenor(e) {
    e.preventDefault();
    setAlertaFeedback(null);

    const check = validarAlertaMenor(formAlerta);
    if (!check.valido) {
      setAlertaFeedback({ type: 'error', text: check.errores[0] });
      return;
    }

    setSubmittingAlerta(true);
    try {
      const zonaSel = zonas.find((z) => z.id === formAlerta.zona_id);
      const res = await apiRequest('/api/alertas-menores', {
        method: 'POST',
        body: JSON.stringify({
          ...formAlerta,
          latitud: zonaSel?.latitud,
          longitud: zonaSel?.longitud
        })
      });
      setAlertaFeedback({ type: 'success', text: res.message || 'Alerta enviada a entidad aliada.' });
      setFormAlerta(INITIAL_ALERTA);
      await onRefresh();
    } catch (err) {
      setAlertaFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmittingAlerta(false);
    }
  }

  async function handleAvanzarEstadoAlerta(alerta) {
    const siguiente = alerta.estado === 'reportado' ? 'en_atencion' : 'derivado';
    try {
      await apiRequest('/api/alertas-menores', {
        method: 'PATCH',
        body: JSON.stringify({ id: alerta.id, estado: siguiente })
      });
      await onRefresh();
    } catch (err) {
      setAlertaFeedback({ type: 'error', text: err.message });
    }
  }

  return (
    <section aria-labelledby="ep1-title">
      <div className="section-header">
        <h2 id="ep1-title">EP-1: Registro Inclusivo, Turnos en Zonas Seguras y Protección de Menores</h2>
        <p>
          Alineado a HU-01, HU-02 y HU-03. Admite DNI, CE, CPP y Pasaporte, bloquea el registro laboral de menores de 18 años y activa derivación a DEMUNA / ONG.
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>
            <UserPlus size={18} /> Registro Inclusivo de Operario (HU-01 / HU-03)
          </h3>

          {opFeedback && (
            <div className={`alert ${opFeedback.type === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
              {opFeedback.text}
            </div>
          )}

          <form className="form-grid" onSubmit={handleRegistrarOperario}>
            <div className="field">
              <label htmlFor="op-nombre">Nombre completo</label>
              <input
                id="op-nombre"
                required
                value={formOp.nombre_completo}
                onChange={(e) => setFormOp({ ...formOp, nombre_completo: e.target.value })}
                placeholder="Ej. José Luis Paredes"
              />
            </div>

            <div className="form-row">
              <div className="field">
                <label htmlFor="op-tipodoc">Documento inclusivo</label>
                <select
                  id="op-tipodoc"
                  value={formOp.tipo_documento}
                  onChange={(e) => setFormOp({ ...formOp, tipo_documento: e.target.value })}
                >
                  {TIPOS_DOCUMENTO.map((doc) => (
                    <option key={doc} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="op-numdoc">Número de documento</label>
                <input
                  id="op-numdoc"
                  required
                  value={formOp.numero_documento}
                  onChange={(e) => setFormOp({ ...formOp, numero_documento: e.target.value })}
                  placeholder="Ej. 005192831"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label htmlFor="op-nacimiento">Fecha de nacimiento (18+)</label>
                <input
                  id="op-nacimiento"
                  type="date"
                  required
                  value={formOp.fecha_nacimiento}
                  onChange={(e) => setFormOp({ ...formOp, fecha_nacimiento: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="op-nacionalidad">Nacionalidad</label>
                <input
                  id="op-nacionalidad"
                  value={formOp.nacionalidad}
                  onChange={(e) => setFormOp({ ...formOp, nacionalidad: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label htmlFor="op-telefono">Teléfono / WhatsApp</label>
                <input
                  id="op-telefono"
                  required
                  value={formOp.telefono}
                  onChange={(e) => setFormOp({ ...formOp, telefono: e.target.value })}
                  placeholder="987654321"
                />
              </div>
              <div className="field">
                <label htmlFor="op-turno">Turno asignado</label>
                <select
                  id="op-turno"
                  value={formOp.turno}
                  onChange={(e) => setFormOp({ ...formOp, turno: e.target.value })}
                >
                  {TURNOS_VALIDOS.map((t) => (
                    <option key={t} value={t}>
                      {LABELS_TURNO[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="op-zona">Zona segura autorizada</label>
              <select
                id="op-zona"
                value={formOp.zona_asignada_id}
                onChange={(e) => setFormOp({ ...formOp, zona_asignada_id: e.target.value })}
              >
                <option value="">Asignación automática (zona con aforo)</option>
                {zonasAutorizadas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.codigo} — {z.nombre} ({z.distrito})
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submittingOp}>
              {submittingOp ? 'Validando identidad...' : 'Verificar mayoría de edad y registrar'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>
            <ShieldAlert size={18} color="#b91c1c" /> Reporte y Derivación de Menores (HU-02)
          </h3>

          {alertaFeedback && (
            <div className={`alert ${alertaFeedback.type === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
              {alertaFeedback.text}
            </div>
          )}

          <form className="form-grid" onSubmit={handleReportarMenor}>
            <div className="field">
              <label htmlFor="al-zona">Cruce o zona cercana (opcional)</label>
              <select
                id="al-zona"
                value={formAlerta.zona_id}
                onChange={(e) => setFormAlerta({ ...formAlerta, zona_id: e.target.value })}
              >
                <option value="">Seleccionar punto de referencia...</option>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.codigo} — {z.nombre} ({z.nivel_riesgo})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="al-ubicacion">Ubicación exacta del cruce</label>
              <input
                id="al-ubicacion"
                required
                value={formAlerta.ubicacion_referencia}
                onChange={(e) => setFormAlerta({ ...formAlerta, ubicacion_referencia: e.target.value })}
                placeholder="Ej. Semáforo Av. Abancay cruce con Nicolás de Piérola"
              />
            </div>

            <div className="field">
              <label htmlFor="al-desc">Descripción de la situación de riesgo</label>
              <textarea
                id="al-desc"
                rows={3}
                required
                value={formAlerta.descripcion}
                onChange={(e) => setFormAlerta({ ...formAlerta, descripcion: e.target.value })}
                placeholder="Detalle horario, número aproximado de menores y condición vial observada..."
              />
            </div>

            <div className="form-row">
              <div className="field">
                <label htmlFor="al-entidad">Entidad de derivación</label>
                <select
                  id="al-entidad"
                  value={formAlerta.entidad_derivada}
                  onChange={(e) => setFormAlerta({ ...formAlerta, entidad_derivada: e.target.value })}
                >
                  {ENTIDADES_DERIVACION.map((ent) => (
                    <option key={ent} value={ent}>
                      {ent}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="al-reportante">Reportado por</label>
                <input
                  id="al-reportante"
                  value={formAlerta.reportado_por}
                  onChange={(e) => setFormAlerta({ ...formAlerta, reportado_por: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-danger" disabled={submittingAlerta}>
              <AlertTriangle size={16} /> {submittingAlerta ? 'Enviando alerta...' : 'Enviar alerta de protección'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1.25rem' }}>
        <div className="card">
          <h3>
            <Users size={18} /> Operarios Formalizados ({operarios.length})
          </h3>
          <div className="list-stack">
            {operarios.map((op) => (
              <div className="list-item" key={op.id}>
                <div className="list-item-top">
                  <strong>{op.nombre_completo}</strong>
                  <span className="badge badge-success">{op.estado_verificacion}</span>
                </div>
                <div className="meta-text">
                  {op.tipo_documento}: {op.numero_documento} · {op.nacionalidad} · Microahorro: {op.porcentaje_microahorro}%
                </div>
                <div className="list-item-top">
                  <span className="meta-text">
                    <MapPin size={13} /> {op.zona?.nombre || 'Sin zona asignada'}
                  </span>
                  <select
                    aria-label={`Cambiar turno de ${op.nombre_completo}`}
                    value={op.turno}
                    onChange={(e) => handleCambiarTurno(op.id, e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.4rem', borderRadius: '6px' }}
                  >
                    {TURNOS_VALIDOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>
            <AlertTriangle size={18} /> Seguimiento de Alertas de Menores ({alertas.length})
          </h3>
          {alertas.length === 0 ? (
            <p className="meta-text">No hay alertas activas registradas aún.</p>
          ) : (
            <div className="list-stack">
              {alertas.map((al) => (
                <div className="list-item" key={al.id}>
                  <div className="list-item-top">
                    <strong>{al.ubicacion_referencia}</strong>
                    <span
                      className={`badge ${
                        al.estado === 'derivado'
                          ? 'badge-success'
                          : al.estado === 'en_atencion'
                            ? 'badge-warning'
                            : 'badge-danger'
                      }`}
                    >
                      {al.estado} · {al.entidad_derivada}
                    </span>
                  </div>
                  <div className="meta-text">{al.descripcion}</div>
                  {al.estado !== 'derivado' && (rolActivo === 'admin_ong' || rolActivo === 'operario') && (
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAvanzarEstadoAlerta(al)}
                      >
                        Marcar como {al.estado === 'reportado' ? 'En atención' : 'Derivado'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
