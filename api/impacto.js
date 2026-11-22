import { getSupabaseAdmin } from './_lib/supabase.js';
import { parseBody, sendJson } from './_lib/http.js';
import { validarEntregaEpp } from './_lib/validators.js';

export function createImpactoHandler(getClient = getSupabaseAdmin) {
  return async function handler(req, res) {
    try {
      const supabase = getClient();

      if (req.method === 'GET') {
        const [capRes, opCapRes, eppRes, opRes, alRes, svRes, txRes] = await Promise.all([
          supabase.from('capacitaciones').select('*').order('codigo', { ascending: true }),
          supabase
            .from('operario_capacitaciones')
            .select('*, operario:operarios(id, nombre_completo), capacitacion:capacitaciones(id, titulo, insignia_nombre)')
            .order('completado_en', { ascending: false }),
          supabase
            .from('entregas_epp')
            .select('*, operario:operarios(id, nombre_completo)')
            .order('created_at', { ascending: false }),
          supabase.from('operarios').select('id, estado_verificacion'),
          supabase.from('alertas_menores').select('id, estado'),
          supabase.from('servicios_lavado').select('id, estado'),
          supabase.from('transacciones_billetera').select('monto_bruto, monto_microahorro')
        ]);

        const transacciones = txRes.data || [];
        const ingresosDigitales = transacciones.reduce((sum, t) => sum + Number(t.monto_bruto || 0), 0);
        const microahorroTotal = transacciones.reduce((sum, t) => sum + Number(t.monto_microahorro || 0), 0);

        return sendJson(res, 200, {
          data: {
            capacitaciones: capRes.data || [],
            insignias: opCapRes.data || [],
            entregasEpp: eppRes.data || [],
            metricas: {
              operariosFormalizados: (opRes.data || []).length,
              alertasMenoresTotal: (alRes.data || []).length,
              alertasDerivadas: (alRes.data || []).filter((a) => a.estado === 'derivado').length,
              serviciosCompletados: (svRes.data || []).filter((s) => s.estado === 'completado').length,
              ingresosDigitales: Number(ingresosDigitales.toFixed(2)),
              microahorroTotal: Number(microahorroTotal.toFixed(2)),
              insigniasEmitidas: (opCapRes.data || []).length,
              kitsEppEntregados: (eppRes.data || []).reduce((sum, e) => sum + Number(e.cantidad || 0), 0)
            }
          }
        });
      }

      if (req.method === 'POST') {
        const body = parseBody(req);

        if (body.accion === 'completar_capacitacion') {
          if (!body.operario_id || !body.capacitacion_id) {
            return sendJson(res, 400, { error: 'Operario y capacitación son obligatorios.' });
          }

          const { data, error } = await supabase
            .from('operario_capacitaciones')
            .insert({
              operario_id: body.operario_id,
              capacitacion_id: body.capacitacion_id
            })
            .select('*, operario:operarios(id, nombre_completo), capacitacion:capacitaciones(id, titulo, insignia_nombre)')
            .single();

          if (error) {
            const isDup = error.code === '23505';
            return sendJson(res, isDup ? 409 : 400, {
              error: isDup
                ? 'El operario ya obtuvo esta insignia de capacitación.'
                : 'No se pudo registrar la capacitación.'
            });
          }

          return sendJson(res, 201, { message: 'Microcapacitación completada e insignia otorgada.', data });
        }

        if (body.accion === 'entregar_epp') {
          const validacion = validarEntregaEpp(body);
          if (!validacion.valido) {
            return sendJson(res, 400, { error: validacion.errores[0], errores: validacion.errores });
          }

          const { data, error } = await supabase
            .from('entregas_epp')
            .insert({
              operario_id: body.operario_id,
              item: String(body.item).trim(),
              cantidad: Number(body.cantidad ?? 1),
              estado: 'entregado'
            })
            .select('*, operario:operarios(id, nombre_completo)')
            .single();

          if (error) {
            return sendJson(res, 400, { error: 'No se pudo registrar la entrega del kit / EPP.' });
          }

          return sendJson(res, 201, { message: 'Entrega de kit ecológico / EPP registrada.', data });
        }

        return sendJson(res, 400, { error: 'Acción no reconocida en módulo de impacto.' });
      }

      return sendJson(res, 405, { error: 'Método no permitido.' });
    } catch {
      return sendJson(res, 500, { error: 'Error interno en el módulo de impacto social.' });
    }
  };
}

export default createImpactoHandler();
