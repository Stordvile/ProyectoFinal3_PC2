import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PiggyBank, QrCode, ShieldCheck, Wallet } from 'lucide-react';
import { METODOS_PAGO, formatPen } from '../lib/domain.js';
import { apiRequest } from '../lib/apiClient.js';

export default function Ep3Pagos({ operarios, servicios, transacciones, onRefresh }) {
  const serviciosPagadosIds = new Set(transacciones.map((t) => t.servicio_id));
  const serviciosPorPagar = servicios.filter(
    (s) => s.estado === 'completado' && s.operario_id && !serviciosPagadosIds.has(s.id)
  );

  const [servicioSel, setServicioSel] = useState('');
  const [metodoPago, setMetodoPago] = useState('Yape');
  const [operarioAhorroId, setOperarioAhorroId] = useState('');
  const [nuevoPorcentaje, setNuevoPorcentaje] = useState(15);
  const [proteccionSocial, setProteccionSocial] = useState('SIS / Emprendedor');
  const [qrTarget, setQrTarget] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [codigoVerificar, setCodigoVerificar] = useState('');
  const [verificacionRes, setVerificacionRes] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!qrTarget) {
      setQrDataUrl('');
      return;
    }
    const contenidoQr = JSON.stringify({
      codigo: qrTarget.codigo_constancia_qr,
      operario: qrTarget.operario?.nombre_completo,
      monto_bruto: qrTarget.monto_bruto,
      microahorro: qrTarget.monto_microahorro,
      verificado_por: 'LimpiaSeguro'
    });
    QRCode.toDataURL(contenidoQr, { width: 180, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [qrTarget]);

  const totalNeto = transacciones.reduce((acc, t) => acc + Number(t.monto_neto || 0), 0);
  const totalAhorro = transacciones.reduce((acc, t) => acc + Number(t.monto_microahorro || 0), 0);
  const totalPropinas = transacciones.reduce((acc, t) => acc + Number(t.monto_propina || 0), 0);

  async function handleLiquidarPago(e) {
    e.preventDefault();
    setFeedback(null);

    const sv = serviciosPorPagar.find((s) => s.id === servicioSel) || serviciosPorPagar[0];
    if (!sv) {
      setFeedback({
        type: 'error',
        text: 'No hay servicios completados pendientes de pago. Completa un servicio en EP-2 primero.'
      });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/api/pagos', {
        method: 'POST',
        body: JSON.stringify({
          servicio_id: sv.id,
          operario_id: sv.operario_id,
          metodo_pago: metodoPago,
          monto_base: Number(sv.monto_base),
          propina: Number(sv.propina || 0)
        })
      });
      setFeedback({ type: 'success', text: res.message });
      setQrTarget(res.data);
      setServicioSel('');
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleActualizarMicroahorro(e) {
    e.preventDefault();
    setFeedback(null);
    const opId = operarioAhorroId || operarios[0]?.id;
    if (!opId) return;

    try {
      await apiRequest('/api/operarios', {
        method: 'PATCH',
        body: JSON.stringify({
          id: opId,
          porcentaje_microahorro: Number(nuevoPorcentaje),
          enlace_proteccion_social: proteccionSocial
        })
      });
      setFeedback({ type: 'success', text: 'Plan de microahorro y protección social actualizado.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleVerificarConstancia(e) {
    e.preventDefault();
    setVerificacionRes(null);
    if (!codigoVerificar.trim()) return;
    try {
      const res = await apiRequest(`/api/pagos?codigo=${encodeURIComponent(codigoVerificar.trim())}`);
      setVerificacionRes({ ok: true, data: res.data });
    } catch (err) {
      setVerificacionRes({ ok: false, error: err.message });
    }
  }

  return (
    <section aria-labelledby="ep3-title">
      <div className="section-header">
        <h2 id="ep3-title">EP-3: Pagos Digitales, Constancia QR y Microahorro para Protección Social</h2>
        <p>
          Alineado a HU-07, HU-08 y HU-09. Elimina el manejo riesgoso de efectivo, aparta microahorro programado automáticamente y genera constancias de ingreso verificables por QR.
        </p>
      </div>

      <div className="grid-4">
        <div className="kpi-card">
          <div className="kpi-label">Liquidado Neto en Billetera</div>
          <div className="kpi-value">{formatPen(totalNeto)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Fondo de Microahorro</div>
          <div className="kpi-value" style={{ color: 'var(--primary)' }}>
            {formatPen(totalAhorro)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Propinas Digitales</div>
          <div className="kpi-value">{formatPen(totalPropinas)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Constancias QR Emitidas</div>
          <div className="kpi-value">{transacciones.length}</div>
        </div>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>
            <Wallet size={18} /> Procesar Pago Digital sin Efectivo (HU-07)
          </h3>

          <form className="form-grid" onSubmit={handleLiquidarPago}>
            <div className="field">
              <label htmlFor="pg-servicio">Servicio completado pendiente de cobro</label>
              <select
                id="pg-servicio"
                value={servicioSel}
                onChange={(e) => setServicioSel(e.target.value)}
              >
                {serviciosPorPagar.length === 0 ? (
                  <option value="">No hay servicios completados pendientes</option>
                ) : (
                  serviciosPorPagar.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.placa_vehiculo} · {s.operario?.nombre_completo} · Base {formatPen(s.monto_base)} + Propina{' '}
                      {formatPen(s.propina)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="field">
              <label htmlFor="pg-metodo">Pasarela digital (Modo Sandbox)</label>
              <select id="pg-metodo" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || serviciosPorPagar.length === 0}>
              {loading ? 'Liquidando...' : 'Cobrar digitalmente y emitir constancia QR'}
            </button>
          </form>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.25rem 0' }} />

          <h3>
            <PiggyBank size={18} /> Microahorro y Protección Social (HU-09)
          </h3>
          <form className="form-grid" onSubmit={handleActualizarMicroahorro}>
            <div className="field">
              <label htmlFor="ah-op">Operario</label>
              <select
                id="ah-op"
                value={operarioAhorroId}
                onChange={(e) => setOperarioAhorroId(e.target.value)}
              >
                {operarios.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nombre_completo} (actual: {op.porcentaje_microahorro}%)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="ah-pct">% Microahorro automático (0-50%)</label>
                <input
                  id="ah-pct"
                  type="number"
                  min="0"
                  max="50"
                  value={nuevoPorcentaje}
                  onChange={(e) => setNuevoPorcentaje(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="ah-seguro">Enlace a protección social</label>
                <select
                  id="ah-seguro"
                  value={proteccionSocial}
                  onChange={(e) => setProteccionSocial(e.target.value)}
                >
                  <option value="SIS / Emprendedor">SIS / Emprendedor</option>
                  <option value="EsSalud Independiente">EsSalud Independiente</option>
                  <option value="ONP / Ahorro Previsional">ONP / Ahorro Previsional</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-secondary">
              Guardar configuración de microahorro
            </button>
          </form>
        </div>

        <div className="card">
          <h3>
            <QrCode size={18} /> Constancia Digital de Ingresos Verificable (HU-08)
          </h3>

          {qrTarget && qrDataUrl ? (
            <div className="qr-box">
              <img src={qrDataUrl} alt={`Código QR de constancia ${qrTarget.codigo_constancia_qr}`} width={180} height={180} />
              <strong>{qrTarget.codigo_constancia_qr}</strong>
              <span className="meta-text">
                Operario: {qrTarget.operario?.nombre_completo} · Bruto: {formatPen(qrTarget.monto_bruto)} · Ahorro:{' '}
                {formatPen(qrTarget.monto_microahorro)}
              </span>
            </div>
          ) : (
            <p className="meta-text">Selecciona cualquier transacción del historial inferior para visualizar su constancia QR.</p>
          )}

          <form className="form-grid" style={{ marginTop: '1rem' }} onSubmit={handleVerificarConstancia}>
            <div className="field">
              <label htmlFor="ver-qr">Verificar constancia por código QR</label>
              <div className="form-row">
                <input
                  id="ver-qr"
                  value={codigoVerificar}
                  onChange={(e) => setCodigoVerificar(e.target.value)}
                  placeholder="Ej. LS-20261121-..."
                />
                <button type="submit" className="btn btn-secondary btn-sm">
                  <ShieldCheck size={15} /> Verificar
                </button>
              </div>
            </div>
          </form>

          {verificacionRes && (
            <div
              className={`alert ${verificacionRes.ok ? 'alert-success' : 'alert-error'}`}
              style={{ marginTop: '0.75rem' }}
              role="status"
            >
              {verificacionRes.ok ? (
                <>
                  Constancia auténtica: <strong>{verificacionRes.data.operario?.nombre_completo}</strong> — Ingreso
                  registrado {formatPen(verificacionRes.data.monto_bruto)} ({verificacionRes.data.metodo_pago}).
                </>
              ) : (
                verificacionRes.error
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <h3>Historial de Ingresos y Liquidaciones ({transacciones.length})</h3>
        {transacciones.length === 0 ? (
          <p className="meta-text">No se registran pagos digitales aún.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código Constancia</th>
                  <th>Operario</th>
                  <th>Método</th>
                  <th>Bruto</th>
                  <th>Microahorro</th>
                  <th>Neto Billetera</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {transacciones.map((tx) => (
                  <tr key={tx.id}>
                    <td><code>{tx.codigo_constancia_qr}</code></td>
                    <td>{tx.operario?.nombre_completo || '—'}</td>
                    <td><span className="badge badge-info">{tx.metodo_pago}</span></td>
                    <td>{formatPen(tx.monto_bruto)}</td>
                    <td>{formatPen(tx.monto_microahorro)}</td>
                    <td><strong>{formatPen(tx.monto_neto)}</strong></td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setQrTarget(tx)}
                      >
                        Ver QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
