import { useEffect, useRef } from 'react';
import L from 'leaflet';

function crearPopupSeguro(titulo, linea1, linea2) {
  const container = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = titulo;
  container.appendChild(strong);

  if (linea1) {
    const p1 = document.createElement('div');
    p1.textContent = linea1;
    container.appendChild(p1);
  }
  if (linea2) {
    const p2 = document.createElement('div');
    p2.style.fontSize = '12px';
    p2.style.color = '#475569';
    p2.textContent = linea2;
    container.appendChild(p2);
  }
  return container;
}

export default function MapaZonas({ zonas = [], alertas = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const map = L.map(containerRef.current).setView([-12.082, -77.04], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    } catch {
      // En entornos sin canvas/layout real (como tests jsdom) degradamos de forma segura
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    zonas.forEach((z) => {
      if (typeof z.latitud !== 'number' || typeof z.longitud !== 'number') return;
      const color =
        z.nivel_riesgo === 'critico' ? '#dc2626' : z.nivel_riesgo === 'medio' ? '#d97706' : '#0f766e';

      const marker = L.circleMarker([z.latitud, z.longitud], {
        radius: 10,
        color,
        fillColor: color,
        fillOpacity: 0.65,
        weight: 2
      });

      marker.bindPopup(
        crearPopupSeguro(
          `${z.codigo} — ${z.nombre}`,
          `Distrito: ${z.distrito} | Riesgo: ${z.nivel_riesgo}`,
          z.autorizada ? `Zona segura autorizada (Aforo: ${z.aforo_maximo})` : 'Cruce crítico no autorizado'
        )
      );
      marker.addTo(group);
    });

    alertas.forEach((a) => {
      if (typeof a.latitud !== 'number' || typeof a.longitud !== 'number') return;
      const marker = L.circleMarker([a.latitud, a.longitud], {
        radius: 8,
        color: '#991b1b',
        fillColor: '#ef4444',
        fillOpacity: 0.9,
        weight: 2
      });
      marker.bindPopup(
        crearPopupSeguro(
          `Alerta Menor (${a.estado})`,
          a.ubicacion_referencia,
          `Derivado a: ${a.entidad_derivada}`
        )
      );
      marker.addTo(group);
    });
  }, [zonas, alertas]);

  return (
    <div>
      <div
        ref={containerRef}
        className="map-container"
        aria-label="Mapa georreferenciado de zonas seguras y cruces críticos"
      />
      <div className="list-item-top" style={{ marginTop: '0.6rem' }}>
        <span className="badge badge-success">Verde: Zona segura autorizada</span>
        <span className="badge badge-warning">Ámbar: Riesgo medio</span>
        <span className="badge badge-danger">Rojo: Cruce crítico / Alerta de menor</span>
      </div>
    </div>
  );
}
