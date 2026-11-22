import { getSupabaseAdmin } from './_lib/supabase.js';
import { sendJson } from './_lib/http.js';

export function createZonasHandler(getClient = getSupabaseAdmin) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: 'Método no permitido. Use GET.' });
    }

    try {
      const supabase = getClient();
      const { data, error } = await supabase
        .from('zonas_seguras')
        .select('*')
        .order('codigo', { ascending: true });

      if (error) {
        return sendJson(res, 500, { error: 'No se pudieron obtener las zonas seguras.' });
      }

      return sendJson(res, 200, { data: data || [] });
    } catch {
      return sendJson(res, 500, { error: 'Error interno al consultar zonas seguras.' });
    }
  };
}

export default createZonasHandler();
