import { supabase } from './supabaseClient.js';

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Continuar sin token en modo exploración
    }
  }
  return headers;
}

export async function apiRequest(path, options = {}) {
  const headers = await getAuthHeaders();
  const response = await fetch(path, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload.error || 'Error al comunicarse con el servidor.');
    err.status = response.status;
    err.details = payload;
    throw err;
  }
  return payload;
}
