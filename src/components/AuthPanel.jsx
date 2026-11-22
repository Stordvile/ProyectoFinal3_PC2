import { useEffect, useRef, useState } from 'react';
import { Lock, LogOut, UserCheck, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { ROLES_USUARIO } from '../lib/domain.js';

export default function AuthPanel({ open, onClose, user, onAuthSuccess }) {
  const dialogRef = useRef(null);
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('operario');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase Auth no está configurado en el entorno local.');
      return;
    }

    setLoading(true);
    try {
      if (modo === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        onAuthSuccess(data.user);
        onClose();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { rol } }
        });
        if (signUpError) throw signUpError;
        setMensaje('Cuenta creada en Supabase Auth. Si la confirmación por correo está activa, revisa tu bandeja.');
        if (data.user) onAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'No se pudo autenticar con Supabase.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    onAuthSuccess(null);
    onClose();
  }

  return (
    <dialog ref={dialogRef} className="dialog-modal" onCancel={onClose} aria-labelledby="auth-dialog-title">
      <div className="list-item-top" style={{ marginBottom: '1rem' }}>
        <h3 id="auth-dialog-title" style={{ margin: 0 }}>
          <Lock size={18} /> Autenticación Supabase (JWT / RBAC)
        </h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} aria-label="Cerrar diálogo">
          <X size={16} />
        </button>
      </div>

      {user ? (
        <div className="form-grid">
          <div className="alert alert-success">
            <UserCheck size={16} /> Sesión activa: <strong>{user.email}</strong>
            <div className="meta-text">Rol RBAC: {user.user_metadata?.rol || 'operario'}</div>
          </div>
          <button type="button" className="btn btn-danger" onClick={handleLogout}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      ) : (
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-row">
            <button
              type="button"
              className={`btn btn-sm ${modo === 'login' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setModo('login')}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`btn btn-sm ${modo === 'register' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setModo('register')}
            >
              Crear cuenta
            </button>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {mensaje && <div className="alert alert-success" role="status">{mensaje}</div>}

          <div className="field">
            <label htmlFor="auth-email">Correo electrónico</label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {modo === 'register' && (
            <div className="field">
              <label htmlFor="auth-role">Rol en la plataforma</label>
              <select id="auth-role" value={rol} onChange={(e) => setRol(e.target.value)}>
                {ROLES_USUARIO.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Procesando...' : modo === 'login' ? 'Ingresar con JWT' : 'Registrar cuenta'}
          </button>
        </form>
      )}
    </dialog>
  );
}
