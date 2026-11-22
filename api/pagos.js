import { getSupabaseAdmin } from './_lib/supabase.js';
import { parseBody, sendJson } from './_lib/http.js';
import {
  calcularLiquidacionPago,
  generarCodigoConstancia,
  validarPago
} from './_lib/validators.js';

export function createPagosHandler(getClient = getSupabaseAdmin) {
  return async function handler(req, res) {
    try {
      const supabase = getClient();

      if (req.method === 'GET') {
        const codigo = req.query?.codigo;
        if (codigo) {
          const { data, error } = await supabase
            .from('transacciones_billetera')
            .select('*, operario:operarios(id, nombre_completo, tipo_documento, numero_documento), servicio:servicios_lavado(id, placa_vehiculo, tipo_servicio)')
            .eq('codigo_constancia_qr', String(codigo).trim())
            .single();

          if (error || !data) {
            return sendJson(res, 404, { error: 'No se encontró ninguna constancia con ese código QR.' });
          }
          return sendJson(res, 200, { verified: true, data });
        }

        const { data, error } = await supabase
          .from('transacciones_billetera')
          .select('*, operario:operarios(id, nombre_completo, porcentaje_microahorro, enlace_proteccion_social), servicio:servicios_lavado(id, placa_vehiculo, conductor_nombre, tipo_servicio)')
          .order('created_at', { ascending: false });

        if (error) {
          return sendJson(res, 500, { error: 'No se pudo consultar el historial de pagos.' });
        }
        return sendJson(res, 200, { data: data || [] });
      }

      if (req.method === 'POST') {
        const body = parseBody(req);
        const validacion = validarPago(body);
        if (!validacion.valido) {
          return sendJson(res, 400, { error: validacion.errores[0], errores: validacion.errores });
        }

        const { data: operario, error: opErr } = await supabase
          .from('operarios')
          .select('id, porcentaje_microahorro')
          .eq('id', body.operario_id)
          .single();

        if (opErr || !operario) {
          return sendJson(res, 404, { error: 'Operario no encontrado para liquidar el pago.' });
        }

        const porcentajeAhorro =
          body.porcentaje_microahorro !== undefined
            ? Number(body.porcentaje_microahorro)
            : Number(operario.porcentaje_microahorro ?? 10);

        const liquidacion = calcularLiquidacionPago({
          montoBase: Number(body.monto_base),
          propina: Number(body.propina ?? 0),
          porcentajeMicroahorro: porcentajeAhorro
        });

        const codigoQr = generarCodigoConstancia(operario.id);

        const registro = {
          servicio_id: body.servicio_id,
          operario_id: operario.id,
          metodo_pago: String(body.metodo_pago).trim(),
          monto_bruto: liquidacion.montoBruto,
          monto_propina: liquidacion.montoPropina,
          monto_microahorro: liquidacion.montoMicroahorro,
          monto_neto: liquidacion.montoNeto,
          codigo_constancia_qr: codigoQr,
          estado: 'aprobado'
        };

        const { data, error } = await supabase
          .from('transacciones_billetera')
          .insert(registro)
          .select('*, operario:operarios(id, nombre_completo, porcentaje_microahorro, enlace_proteccion_social), servicio:servicios_lavado(id, placa_vehiculo, conductor_nombre, tipo_servicio)')
          .single();

        if (error) {
          const isDuplicate = error.code === '23505';
          return sendJson(res, isDuplicate ? 409 : 400, {
            error: isDuplicate
              ? 'Este servicio ya fue pagado y liquidado en la billetera.'
              : 'No se pudo procesar el pago digital.'
          });
        }

        return sendJson(res, 201, {
          message: 'Pago digital aprobado (sandbox), microahorro apartado y constancia QR emitida.',
          pasarela_referencia: `SANDBOX-${Date.now()}`,
          data
        });
      }

      return sendJson(res, 405, { error: 'Método no permitido.' });
    } catch {
      return sendJson(res, 500, { error: 'Error interno en el módulo de pagos digitales.' });
    }
  };
}

export default createPagosHandler();
