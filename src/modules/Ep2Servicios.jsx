import { useState } from 'react';
import { Camera, Car, CheckCircle2, Star } from 'lucide-react';
import { CATALOGO_SERVICIOS, formatPen, validarServicio } from '../lib/domain.js';
import { apiRequest } from '../lib/apiClient.js';

const EVIDENCIA_DEMO_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="220" viewBox="0 0 480 220">' +
      '<rect width="480" height="220" fill="#e0f2fe"/>' +
      '<rect x="24" y="24" width="432" height="172" rx="14" fill="#0f766e"/>' +
      '<text x="240" y="96" font-family="Arial" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">Evidencia Verificada — Parabrisas Limpio</text>' +
      '<text x="240" y="132" font-family="Arial" font-size="14" fill="#ccfbf1" text-anchor="middle">Zona Segura Autorizada · Registro con Marca de Tiempo</text>' +
      '</svg>'
  );

export default function Ep2Servicios({ zonas, operarios, servicios, onRefresh }) {
  const zonasAutorizadas = zonas.filter((z) => z.autorizada);

  const [form, setForm] = useState({
    zona_id: '',
    conductor_nombre: '',
    placa_vehiculo: '',
    tipo_servicio: 'parabrisas_rapido'
  });
  const [operarioSeleccionado, setOperarioSeleccionado] = useState({});
  const [ratingForm, setRatingForm] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCrearSolicitud(e) {
    e.preventDefault();
    setFeedback(null);

    const payload = {
      ...form,
      zona_id: form.zona_id || zonasAutorizadas[0]?.id || ''
    };

    const check = validarServicio(payload);
    if (!check.valido) {
      setFeedback({ type: 'error', text: check.errores[0] });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/api/servicios', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setFeedback({ type: 'success', text: res.message });
      setForm({ zona_id: '', conductor_nombre: '', placa_vehiculo: '', tipo_servicio: 'parabrisas_rapido' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleAceptar(servicioId) {
    const opId = operarioSeleccionado[servicioId] || operarios[0]?.id;
    if (!opId) {
      setFeedback({ type: 'error', text: 'Primero debe existir al menos un operario registrado en EP-1.' });
      return;
    }
    try {
      await apiRequest('/api/servicios', {
        method: 'PATCH',
        body: JSON.stringify({ id: servicioId, accion: 'aceptar', operario_id: opId })
      });
      setFeedback({ type: 'success', text: 'Servicio aceptado por el operario.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleSubirEvidencia(servicioId, file) {
    try {
      if (file) {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await apiRequest('/api/servicios', {
          method: 'PATCH',
          body: JSON.stringify({
            id: servicioId,
            accion: 'evidencia',
            evidencia_base64: base64,
            evidencia_url: EVIDENCIA_DEMO_SVG
          })
        });
      } else {
        await apiRequest('/api/servicios', {
          method: 'PATCH',
          body: JSON.stringify({
            id: servicioId,
            accion: 'evidencia',
            evidencia_url: EVIDENCIA_DEMO_SVG
          })
        });
      }
      setFeedback({ type: 'success', text: 'Evidencia fotográfica cargada y servicio completado.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleCalificar(e, servicioId) {
    e.preventDefault();
    const current = ratingForm[servicioId] || { calificacion: 5, propina: 2, comentario_conductor: '' };
    try {
      await apiRequest('/api/servicios', {
        method: 'PATCH',
        body: JSON.stringify({
          id: servicioId,
          accion: 'calificar',
          calificacion: Number(current.calificacion),
          propina: Number(current.propina || 0),
          comentario_conductor: current.comentario_conductor || ''
        })
      });
      setFeedback({ type: 'success', text: 'Calificación y propina registradas. Ya puede liquidar en EP-3.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  return (
    <section aria-labelledby="ep2-title">
      <div className="section-header">
        <h2 id="ep2-title">EP-2: Reserva y Gestión de Lavado Seguro bajo Demanda</h2>
        <p>
          Alineado a HU-04, HU-05 y HU-06. El conductor solicita limpieza con consentimiento en una bahía autorizada, el operario sube evidencia fotográfica y recibe calificación + propina digital.
        </p>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>
            <Car size={18} /> Solicitar Limpieza en Zona Segura (HU-04)
          </h3>

          <form className="form-grid" onSubmit={handleCrearSolicitud}>
            <div className="field">
              <label htmlFor="sv-zona">Bahía / Zona segura autorizada</label>
              <select
                id="sv-zona"
                value={form.zona_id}
                onChange={(e) => setForm({ ...form, zona_id: e.target.value })}
              >
                {zonasAutorizadas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.codigo} — {z.nombre} ({z.distrito})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="field">
                <label htmlFor="sv-conductor">Nombre del conductor</label>
                <input
                  id="sv-conductor"
                  required
                  value={form.conductor_nombre}
                  onChange={(e) => setForm({ ...form, conductor_nombre: e.target.value })}
                  placeholder="Ej. Ana Torres"
                />
              </div>
              <div className="field">
                <label htmlFor="sv-placa">Placa del vehículo</label>
                <input
                  id="sv-placa"
                  required
                  value={form.placa_vehiculo}
                  onChange={(e) => setForm({ ...form, placa_vehiculo: e.target.value.toUpperCase() })}
                  placeholder="ABC-123"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="sv-tipo">Tipo de servicio y tarifa transparente</label>
              <select
                id="sv-tipo"
                value={form.tipo_servicio}
                onChange={(e) => setForm({ ...form, tipo_servicio: e.target.value })}
              >
                {Object.entries(CATALOGO_SERVICIOS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label} — {formatPen(info.precio)}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando solicitud...' : 'Solicitar lavado autorizado'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>
            <CheckCircle2 size={18} /> Flujo Operativo de Servicios ({servicios.length})
          </h3>

          {servicios.length === 0 ? (
            <p className="meta-text">Aún no hay solicitudes registradas. Crea una solicitud para probar el flujo completo.</p>
          ) : (
            <div className="list-stack">
              {servicios.map((sv) => {
                const rf = ratingForm[sv.id] || { calificacion: 5, propina: 2, comentario_conductor: '' };
                return (
                  <div className="list-item" key={sv.id}>
                    <div className="list-item-top">
                      <strong>
                        {sv.placa_vehiculo} · {sv.conductor_nombre}
                      </strong>
                      <span
                        className={`badge ${
                          sv.estado === 'completado'
                            ? 'badge-success'
                            : sv.estado === 'aceptado'
                              ? 'badge-info'
                              : 'badge-warning'
                        }`}
                      >
                        {sv.estado}
                      </span>
                    </div>

                    <div className="meta-text">
                      {CATALOGO_SERVICIOS[sv.tipo_servicio]?.label || sv.tipo_servicio} ({formatPen(sv.monto_base)}) ·{' '}
                      {sv.zona?.nombre || 'Zona asignada'}
                    </div>

                    {sv.operario && (
                      <div className="meta-text">Operario asignado: <strong>{sv.operario.nombre_completo}</strong></div>
                    )}

                    {sv.estado === 'pendiente' && (
                      <div className="form-row" style={{ marginTop: '0.35rem' }}>
                        <select
                          aria-label="Seleccionar operario"
                          value={operarioSeleccionado[sv.id] || operarios[0]?.id || ''}
                          onChange={(e) =>
                            setOperarioSeleccionado({ ...operarioSeleccionado, [sv.id]: e.target.value })
                          }
                        >
                          {operarios.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.nombre_completo}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAceptar(sv.id)}>
                          Aceptar servicio
                        </button>
                      </div>
                    )}

                    {sv.estado === 'aceptado' && (
                      <div className="form-grid" style={{ marginTop: '0.35rem' }}>
                        <label className="meta-text" htmlFor={`file-${sv.id}`}>
                          Subir evidencia fotográfica (Supabase Storage):
                        </label>
                        <input
                          id={`file-${sv.id}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSubirEvidencia(sv.id, f);
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSubirEvidencia(sv.id, null)}
                        >
                          <Camera size={14} /> Adjuntar evidencia de demostración y completar
                        </button>
                      </div>
                    )}

                    {sv.evidencia_url && (
                      <img src={sv.evidencia_url} alt={`Evidencia del servicio ${sv.placa_vehiculo}`} className="evidencia-img" />
                    )}

                    {sv.estado === 'completado' && !sv.calificacion && (
                      <form className="form-grid" style={{ marginTop: '0.4rem' }} onSubmit={(e) => handleCalificar(e, sv.id)}>
                        <div className="form-row">
                          <div className="field">
                            <label htmlFor={`cal-${sv.id}`}>Calificación (1-5)</label>
                            <select
                              id={`cal-${sv.id}`}
                              value={rf.calificacion}
                              onChange={(e) =>
                                setRatingForm({
                                  ...ratingForm,
                                  [sv.id]: { ...rf, calificacion: Number(e.target.value) }
                                })
                              }
                            >
                              {[5, 4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>
                                  {n} estrellas
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`prop-${sv.id}`}>Propina digital (S/)</label>
                            <input
                              id={`prop-${sv.id}`}
                              type="number"
                              min="0"
                              step="0.5"
                              value={rf.propina}
                              onChange={(e) =>
                                setRatingForm({
                                  ...ratingForm,
                                  [sv.id]: { ...rf, propina: e.target.value }
                                })
                              }
                            />
                          </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm">
                          <Star size={14} /> Guardar calificación y propina
                        </button>
                      </form>
                    )}

                    {sv.calificacion && (
                      <div className="meta-text">
                        <Star size={13} /> Calificación: <strong>{sv.calificacion}/5</strong> · Propina:{' '}
                        <strong>{formatPen(sv.propina)}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
