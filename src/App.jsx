import { useCallback, useEffect, useState } from 'react';
import { Award, Car, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { apiRequest } from './lib/apiClient.js';
import { ROLES_USUARIO } from './lib/domain.js';
import { supabase } from './lib/supabaseClient.js';
import AuthPanel from './components/AuthPanel.jsx';
import Ep1Registro from './modules/Ep1Registro.jsx';
import Ep2Servicios from './modules/Ep2Servicios.jsx';
import Ep3Pagos from './modules/Ep3Pagos.jsx';
import Ep4Impacto from './modules/Ep4Impacto.jsx';

const TABS = [
  { id: 'ep1', label: 'EP-1 Registro y Protección', icon: ShieldCheck },
  { id: 'ep2', label: 'EP-2 Lavado Seguro', icon: Car },
  { id: 'ep3', label: 'EP-3 Pagos y Constancia QR', icon: Wallet },
  { id: 'ep4', label: 'EP-4 Capacitación e Impacto', icon: Award }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('ep1');
  const [rolActivo, setRolActivo] = useState('operario');
  const [authOpen, setAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);

  const [zonas, setZonas] = useState([]);
  const [operarios, setOperarios] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [impacto, setImpacto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const [zRes, oRes, aRes, sRes, pRes, iRes] = await Promise.all([
        apiRequest('/api/zonas'),
        apiRequest('/api/operarios'),
        apiRequest('/api/alertas-menores'),
        apiRequest('/api/servicios'),
        apiRequest('/api/pagos'),
        apiRequest('/api/impacto')
      ]);
      setZonas(zRes.data || []);
      setOperarios(oRes.data || []);
      setAlertas(aRes.data || []);
      setServicios(sRes.data || []);
      setTransacciones(pRes.data || []);
      setImpacto(iRes.data || null);
    } catch (err) {
      setGlobalError(err.message || 'No se pudieron cargar los datos del servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setAuthUser(data.user);
        if (data.user.user_metadata?.rol) {
          setRolActivo(data.user.user_metadata.rol);
        }
      }
    });
  }, []);

  return (
    <div>
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon" aria-hidden="true">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1>LimpiaSeguro</h1>
              <p>Formalización, seguridad vial, pagos digitales e impacto social</p>
            </div>
          </div>

          <div className="header-actions">
            <label htmlFor="rol-switcher" className="meta-text" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Rol activo:
            </label>
            <select
              id="rol-switcher"
              className="role-select"
              value={rolActivo}
              onChange={(e) => setRolActivo(e.target.value)}
            >
              {ROLES_USUARIO.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>

            <button type="button" className="btn btn-outline-light btn-sm" onClick={() => setAuthOpen(true)}>
              <Lock size={15} /> {authUser ? authUser.email : 'Iniciar sesión'}
            </button>
          </div>
        </div>
      </header>

      <nav className="nav-tabs" aria-label="Módulos del sistema">
        <div className="nav-tabs-inner" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="container">
        {globalError && (
          <div className="alert alert-warning" role="alert">
            {globalError}
          </div>
        )}

        {loading && <p className="meta-text">Sincronizando datos con Supabase...</p>}

        {activeTab === 'ep1' && (
          <Ep1Registro
            zonas={zonas}
            operarios={operarios}
            alertas={alertas}
            onRefresh={cargarDatos}
            rolActivo={rolActivo}
          />
        )}

        {activeTab === 'ep2' && (
          <Ep2Servicios
            zonas={zonas}
            operarios={operarios}
            servicios={servicios}
            onRefresh={cargarDatos}
          />
        )}

        {activeTab === 'ep3' && (
          <Ep3Pagos
            operarios={operarios}
            servicios={servicios}
            transacciones={transacciones}
            onRefresh={cargarDatos}
          />
        )}

        {activeTab === 'ep4' && (
          <Ep4Impacto
            zonas={zonas}
            operarios={operarios}
            alertas={alertas}
            impacto={impacto}
            onRefresh={cargarDatos}
          />
        )}
      </main>

      <footer className="app-footer">
        LimpiaSeguro · Proyecto Final de Carrera III (PC2) · React + Vercel Serverless + Supabase PostgreSQL RLS
      </footer>

      <AuthPanel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        user={authUser}
        onAuthSuccess={(u) => {
          setAuthUser(u);
          if (u?.user_metadata?.rol) setRolActivo(u.user_metadata.rol);
        }}
      />
    </div>
  );
}
