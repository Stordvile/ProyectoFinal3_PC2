import { getSupabaseAdmin } from './_lib/supabase.js';
import { parseBody, sendJson } from './_lib/http.js';
import { ESTADOS_ALERTA, validarAlertaMenor } from './_lib/validators.js';

export function createAlertasMenoresHandler(getClient = getSupabaseAdmin) {
  return async function handler(req, res) {
    try {
      const supabase = getClient();

      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('alertas_menores')
          .select('*, zona:zonas_seguras(id, codigo, nombre, distrito)')
          .order('created_at', { ascending: false });

        if (error) {
          return sendJson(res, 500, { error: 'No se pudieron consultar las alertas de menores.' });
        }
        return sendJson(res, 200, { data: data || [] });
      }

      if (req.method === 'POST') {
        const body = parseBody(req);
        const validacion = validarAlertaMenor(body);

        if (!validacion.valido) {
          return sendJson(res, 400, {
            error: validacion.errores[0],
            errores: validacion.errores
          });
        }

        const nuevaAlerta = {
          zona_id: body.zona_id || null,
          ubicacion_referencia: String(body.ubicacion_referencia).trim(),
          latitud: body.latitud !== undefined && body.latitud !== '' ? Number(body.latitud) : -12.0526,
          longitud: body.longitud !== undefined && body.longitud !== '' ? Number(body.longitud) : -77.0282,
          descripcion: String(body.descripcion).trim(),
          entidad_derivada: String(body.entidad_derivada || 'DEMUNA').trim(),
          reportado_por: String(body.reportado_por || 'Ciudadano / Operario').trim(),
          estado: 'reportado'
        };

        const { data, error } = await supabase
          .from('alertas_menores')
          .insert(nuevaAlerta)
          .select('*, zona:zonas_seguras(id, codigo, nombre, distrito)')
          .single();

        if (error) {
          return sendJson(res, 400, { error: 'No se pudo registrar la alerta de menor.' });
        }

        return sendJson(res, 201, {
          message: `Alerta registrada y derivada a ${nuevaAlerta.entidad_derivada}.`,
          canal_notificacion: `Webhook simulado -> ${nuevaAlerta.entidad_derivada}`,
          data
        });
      }

      if (req.method === 'PATCH') {
        const body = parseBody(req);
        if (!body.id || !ESTADOS_ALERTA.includes(body.estado)) {
          return sendJson(res, 400, { error: 'ID de alerta y estado válido son obligatorios.' });
        }

        const { data, error } = await supabase
          .from('alertas_menores')
          .update({ estado: body.estado })
          .eq('id', body.id)
          .select('*, zona:zonas_seguras(id, codigo, nombre, distrito)')
          .single();

        if (error) {
          return sendJson(res, 400, { error: 'No se pudo actualizar el estado de la alerta.' });
        }

        return sendJson(res, 200, { message: 'Estado de alerta actualizado.', data });
      }

      return sendJson(res, 405, { error: 'Método no permitido.' });
    } catch {
      return sendJson(res, 500, { error: 'Error interno en el servicio de alertas de menores.' });
    }
  };
}

export default createAlertasMenoresHandler();
