import { getSupabaseAdmin } from './_lib/supabase.js';
import { parseBody, sendJson } from './_lib/http.js';
import { CATALOGO_SERVICIOS, validarServicio } from './_lib/validators.js';

async function subirEvidenciaSiBase64(supabase, servicioId, evidenciaBase64) {
  if (!evidenciaBase64 || typeof evidenciaBase64 !== 'string') return null;

  const match = evidenciaBase64.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return null;

  const mime = match[1];
  const ext = match[2] === 'jpeg' ? 'jpg' : match[2];
  const buffer = Buffer.from(match[3], 'base64');
  const filePath = `servicios/${servicioId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('evidencias')
    .upload(filePath, buffer, { contentType: mime, upsert: true });

  if (uploadError) return null;

  const { data } = supabase.storage.from('evidencias').getPublicUrl(filePath);
  return data?.publicUrl || null;
}

export function createServiciosHandler(getClient = getSupabaseAdmin) {
  return async function handler(req, res) {
    try {
      const supabase = getClient();

      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('servicios_lavado')
          .select('*, zona:zonas_seguras(id, codigo, nombre, distrito), operario:operarios(id, nombre_completo, porcentaje_microahorro)')
          .order('created_at', { ascending: false });

        if (error) {
          return sendJson(res, 500, { error: 'No se pudieron obtener los servicios de lavado.' });
        }
        return sendJson(res, 200, { data: data || [] });
      }

      if (req.method === 'POST') {
        const body = parseBody(req);
        const validacion = validarServicio(body);

        if (!validacion.valido) {
          return sendJson(res, 400, { error: validacion.errores[0], errores: validacion.errores });
        }

        const tipo = String(body.tipo_servicio || 'parabrisas_rapido').trim();
        const tarifa = CATALOGO_SERVICIOS[tipo].precio;

        const nuevoServicio = {
          zona_id: body.zona_id,
          conductor_nombre: String(body.conductor_nombre).trim(),
          placa_vehiculo: String(body.placa_vehiculo).trim().toUpperCase(),
          tipo_servicio: tipo,
          monto_base: tarifa,
          propina: 0,
          estado: 'pendiente'
        };

        const { data, error } = await supabase
          .from('servicios_lavado')
          .insert(nuevoServicio)
          .select('*, zona:zonas_seguras(id, codigo, nombre, distrito)')
          .single();

        if (error) {
          return sendJson(res, 400, { error: 'No se pudo registrar la solicitud de lavado.' });
        }

        return sendJson(res, 201, {
          message: 'Solicitud de lavado registrada en zona segura.',
          data
        });
      }

      if (req.method === 'PATCH') {
        const body = parseBody(req);
        if (!body.id || !body.accion) {
          return sendJson(res, 400, { error: 'Debe especificar id del servicio y acción.' });
        }

        const updates = {};

        if (body.accion === 'aceptar') {
          if (!body.operario_id) {
            return sendJson(res, 400, { error: 'Debe seleccionar un operario verificado.' });
          }
          updates.operario_id = body.operario_id;
          updates.estado = 'aceptado';
        } else if (body.accion === 'evidencia') {
          let evidenciaUrl = typeof body.evidencia_url === 'string' ? body.evidencia_url.trim() : '';

          if (body.evidencia_base64) {
            const uploadedUrl = await subirEvidenciaSiBase64(supabase, body.id, body.evidencia_base64);
            if (uploadedUrl) {
              evidenciaUrl = uploadedUrl;
            }
          }

          if (!evidenciaUrl) {
            return sendJson(res, 400, { error: 'Debe adjuntar una evidencia fotográfica para cerrar el servicio.' });
          }

          updates.evidencia_url = evidenciaUrl;
          updates.estado = 'completado';
          updates.completed_at = new Date().toISOString();
        } else if (body.accion === 'calificar') {
          const calificacion = Number(body.calificacion);
          const propina = Number(body.propina ?? 0);
          if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
            return sendJson(res, 400, { error: 'La calificación debe ser un entero entre 1 y 5.' });
          }
          if (Number.isNaN(propina) || propina < 0 || propina > 200) {
            return sendJson(res, 400, { error: 'La propina debe estar entre S/ 0 y S/ 200.' });
          }
          updates.calificacion = calificacion;
          updates.propina = propina;
          updates.comentario_conductor = String(body.comentario_conductor || '').trim();
        } else {
          return sendJson(res, 400, { error: 'Acción no reconocida.' });
        }

        const { data, error } = await supabase
          .from('servicios_lavado')
          .update(updates)
          .eq('id', body.id)
          .select('*, zona:zonas_seguras(id, codigo, nombre, distrito), operario:operarios(id, nombre_completo, porcentaje_microahorro)')
          .single();

        if (error) {
          return sendJson(res, 400, { error: 'No se pudo actualizar el servicio.' });
        }

        return sendJson(res, 200, { message: 'Servicio actualizado correctamente.', data });
      }

      return sendJson(res, 405, { error: 'Método no permitido.' });
    } catch {
      return sendJson(res, 500, { error: 'Error interno en el servicio de lavado.' });
    }
  };
}

export default createServiciosHandler();
