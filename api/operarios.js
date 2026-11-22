import { getSupabaseAdmin } from './_lib/supabase.js';
import { getAuthUser, parseBody, sendJson } from './_lib/http.js';
import { TURNOS_VALIDOS, validarOperario } from './_lib/validators.js';

export function createOperariosHandler(getClient = getSupabaseAdmin) {
  return async function handler(req, res) {
    try {
      const supabase = getClient();

      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('operarios')
          .select('*, zona:zonas_seguras(id, codigo, nombre, distrito, nivel_riesgo, autorizada)')
          .order('created_at', { ascending: false });

        if (error) {
          return sendJson(res, 500, { error: 'No se pudo obtener la lista de operarios.' });
        }
        return sendJson(res, 200, { data: data || [] });
      }

      if (req.method === 'POST') {
        const body = parseBody(req);
        const validacion = validarOperario(body);

        if (!validacion.valido) {
          return sendJson(res, validacion.esMenor ? 422 : 400, {
            error: validacion.errores[0],
            errores: validacion.errores,
            esMenor: validacion.esMenor
          });
        }

        const user = await getAuthUser(req, supabase);
        const registro = {
          user_id: user?.id || null,
          nombre_completo: String(body.nombre_completo).trim(),
          tipo_documento: String(body.tipo_documento).trim(),
          numero_documento: String(body.numero_documento).trim(),
          fecha_nacimiento: String(body.fecha_nacimiento).trim(),
          nacionalidad: String(body.nacionalidad || 'Peruana').trim(),
          telefono: String(body.telefono).trim(),
          zona_asignada_id: body.zona_asignada_id || null,
          turno: String(body.turno || 'manana').trim(),
          porcentaje_microahorro: Number(body.porcentaje_microahorro ?? 10),
          enlace_proteccion_social: String(body.enlace_proteccion_social || 'SIS / Emprendedor').trim(),
          estado_verificacion: 'verificado'
        };

        const { data, error } = await supabase
          .from('operarios')
          .insert(registro)
          .select('*, zona:zonas_seguras(id, codigo, nombre, distrito)')
          .single();

        if (error) {
          const isDuplicate = error.code === '23505';
          return sendJson(res, isDuplicate ? 409 : 400, {
            error: isDuplicate
              ? 'Ya existe un operario registrado con ese número de documento.'
              : 'No se pudo registrar el operario.'
          });
        }

        return sendJson(res, 201, {
          message: 'Operario registrado y verificado correctamente.',
          data
        });
      }

      if (req.method === 'PATCH') {
        const body = parseBody(req);
        if (!body.id) {
          return sendJson(res, 400, { error: 'El identificador del operario es obligatorio.' });
        }

        const updates = {};
        if (body.zona_asignada_id !== undefined) updates.zona_asignada_id = body.zona_asignada_id || null;
        if (body.turno !== undefined) {
          if (!TURNOS_VALIDOS.includes(body.turno)) {
            return sendJson(res, 400, { error: 'Turno inválido.' });
          }
          updates.turno = body.turno;
        }
        if (body.porcentaje_microahorro !== undefined) {
          const pct = Number(body.porcentaje_microahorro);
          if (Number.isNaN(pct) || pct < 0 || pct > 50) {
            return sendJson(res, 400, { error: 'El microahorro debe estar entre 0% y 50%.' });
          }
          updates.porcentaje_microahorro = pct;
        }
        if (body.enlace_proteccion_social !== undefined) {
          updates.enlace_proteccion_social = String(body.enlace_proteccion_social).trim();
        }

        const { data, error } = await supabase
          .from('operarios')
          .update(updates)
          .eq('id', body.id)
          .select('*, zona:zonas_seguras(id, codigo, nombre, distrito)')
          .single();

        if (error) {
          return sendJson(res, 400, { error: 'No se pudo actualizar el operario.' });
        }

        return sendJson(res, 200, { message: 'Asignación actualizada.', data });
      }

      return sendJson(res, 405, { error: 'Método no permitido.' });
    } catch {
      return sendJson(res, 500, { error: 'Error interno en el servicio de operarios.' });
    }
  };
}

export default createOperariosHandler();
