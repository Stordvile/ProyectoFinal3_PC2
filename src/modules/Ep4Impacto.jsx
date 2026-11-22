import { useState } from 'react';
import { Award, GraduationCap, MapPinned, PackageCheck } from 'lucide-react';
import { ITEMS_EPP, formatPen } from '../lib/domain.js';
import { apiRequest } from '../lib/apiClient.js';
import MapaZonas from '../components/MapaZonas.jsx';

export default function Ep4Impacto({ zonas, operarios, alertas, impacto, onRefresh }) {
  const {
    capacitaciones = [],
    insignias = [],
    entregasEpp = [],
    metricas = {}
  } = impacto || {};

  const [opCapId, setOpCapId] = useState('');
  const [eppForm, setEppForm] = useState({
    operario_id: '',
    item: ITEMS_EPP[0],
    cantidad: 1
  });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCompletarCurso(capacitacionId) {
    setFeedback(null);
    const opId = opCapId || operarios[0]?.id;
    if (!opId) {
      setFeedback({ type: 'error', text: 'Debe existir al menos un operario registrado.' });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/api/impacto', {
        method: 'POST',
        body: JSON.stringify({
          accion: 'completar_capacitacion',
          operario_id: opId,
          capacitacion_id: capacitacionId
        })
      });
      setFeedback({ type: 'success', text: res.message });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleEntregarEpp(e) {
    e.preventDefault();
    setFeedback(null);
    const opId = eppForm.operario_id || operarios[0]?.id;
    if (!opId) {
      setFeedback({ type: 'error', text: 'Debe seleccionar un operario.' });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/api/impacto', {
        method: 'POST',
        body: JSON.stringify({
          accion: 'entregar_epp',
          operario_id: opId,
          item: eppForm.item,
          cantidad: Number(eppForm.cantidad)
        })
      });
      setFeedback({ type: 'success', text: res.message });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="ep4-title">
      <div className="section-header">
        <h2 id="ep4-title">EP-4: Capacitación Móvil, Kits Ecológicos / EPP y Panel de Impacto Social</h2>
        <p>
          Alineado a HU-10, HU-11 y HU-12. Monitoreo georreferenciado para municipalidades y ONG, certificación mediante microcapacitaciones y control de entrega de equipo protector.
        </p>
      </div>

      <div className="grid-4">
        <div className="kpi-card">
          <div className="kpi-label">Operarios Formalizados</div>
          <div className="kpi-value">{metricas.operariosFormalizados ?? operarios.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Servicios Seguros Completados</div>
          <div className="kpi-value">{metricas.serviciosCompletados ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ingresos Digitalizados</div>
          <div className="kpi-value" style={{ color: 'var(--primary)' }}>
            {formatPen(metricas.ingresosDigitales ?? 0)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Insignias + Kits EPP</div>
          <div className="kpi-value">
            {(metricas.insigniasEmitidas ?? 0) + (metricas.kitsEppEntregados ?? 0)}
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3>
          <MapPinned size={18} /> Panel Georreferenciado de Zonas Seguras y Cruces Críticos (HU-12)
        </h3>
        <MapaZonas zonas={zonas} alertas={alertas} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>
            <GraduationCap size={18} /> Microcapacitaciones Móviles e Insignias (HU-10)
          </h3>

          <div className="field" style={{ marginBottom: '0.8rem' }}>
            <label htmlFor="cap-operario">Operario a certificar</label>
            <select id="cap-operario" value={opCapId} onChange={(e) => setOpCapId(e.target.value)}>
              {operarios.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.nombre_completo}
                </option>
              ))}
            </select>
          </div>

          <div className="list-stack">
            {capacitaciones.map((cap) => (
              <div className="list-item" key={cap.id}>
                <div className="list-item-top">
                  <strong>{cap.titulo}</strong>
                  <span className="badge badge-info">{cap.duracion_min} min</span>
                </div>
                <div className="meta-text">{cap.descripcion}</div>
                <div className="list-item-top">
                  <span className="badge badge-success">
                    <Award size={12} /> Insignia: {cap.insignia_nombre}
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={loading}
                    onClick={() => handleCompletarCurso(cap.id)}
                  >
                    Certificar curso
                  </button>
                </div>
              </div>
            ))}
          </div>

          {insignias.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong style={{ fontSize: '0.9rem' }}>Insignias otorgadas ({insignias.length})</strong>
              <div className="list-stack">
                {insignias.map((ins) => (
                  <div className="list-item" key={ins.id}>
                    <div className="list-item-top">
                      <span>{ins.operario?.nombre_completo}</span>
                      <span className="badge badge-success">{ins.capacitacion?.insignia_nombre}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3>
            <PackageCheck size={18} /> Gestión de Kits Ecológicos y EPP (HU-11)
          </h3>

          <form className="form-grid" onSubmit={handleEntregarEpp}>
            <div className="field">
              <label htmlFor="epp-op">Operario beneficiario</label>
              <select
                id="epp-op"
                value={eppForm.operario_id}
                onChange={(e) => setEppForm({ ...eppForm, operario_id: e.target.value })}
              >
                {operarios.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nombre_completo}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="epp-item">Equipo / Kit ecológico</label>
              <select
                id="epp-item"
                value={eppForm.item}
                onChange={(e) => setEppForm({ ...eppForm, item: e.target.value })}
              >
                {ITEMS_EPP.map((it) => (
                  <option key={it} value={it}>
                    {it}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="epp-qty">Cantidad</label>
              <input
                id="epp-qty"
                type="number"
                min="1"
                max="10"
                value={eppForm.cantidad}
                onChange={(e) => setEppForm({ ...eppForm, cantidad: Number(e.target.value) })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              Registrar entrega de kit / EPP
            </button>
          </form>

          <div className="list-stack" style={{ marginTop: '1rem' }}>
            {entregasEpp.length === 0 ? (
              <p className="meta-text">No hay entregas de EPP registradas todavía.</p>
            ) : (
              entregasEpp.map((ep) => (
                <div className="list-item" key={ep.id}>
                  <div className="list-item-top">
                    <strong>{ep.item}</strong>
                    <span className="badge badge-success">x{ep.cantidad} · {ep.estado}</span>
                  </div>
                  <div className="meta-text">Beneficiario: {ep.operario?.nombre_completo}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
