import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App.jsx';

const MOCK_ZONAS = [
  {
    id: 'z-1',
    codigo: 'ZS-01',
    nombre: 'Bahía Segura Av. Javier Prado',
    distrito: 'San Borja',
    latitud: -12.0887,
    longitud: -77.0046,
    aforo_maximo: 6,
    nivel_riesgo: 'bajo',
    autorizada: true
  }
];

const MOCK_OPERARIOS = [
  {
    id: 'op-1',
    nombre_completo: 'Carlos Mendoza Rojas',
    tipo_documento: 'CE',
    numero_documento: '004512890',
    nacionalidad: 'Venezolana',
    turno: 'manana',
    estado_verificacion: 'verificado',
    porcentaje_microahorro: 15,
    zona: MOCK_ZONAS[0]
  }
];

describe('Pruebas de integración de interfaz React (App + 4 Épicas)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        let data = [];
        if (path.includes('/api/zonas')) data = MOCK_ZONAS;
        else if (path.includes('/api/operarios')) data = MOCK_OPERARIOS;
        else if (path.includes('/api/impacto')) {
          data = {
            capacitaciones: [
              {
                id: 'cap-1',
                titulo: 'Seguridad Vial y Chaleco Reflectivo',
                duracion_min: 15,
                insignia_nombre: 'Guardián Vial',
                descripcion: 'Buenas prácticas en bahías autorizadas.'
              }
            ],
            insignias: [],
            entregasEpp: [],
            metricas: {
              operariosFormalizados: 1,
              serviciosCompletados: 2,
              ingresosDigitales: 25,
              microahorroTotal: 3.75,
              insigniasEmitidas: 1,
              kitsEppEntregados: 2
            }
          };
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ data })
        };
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('carga los operarios desde la API y muestra las 4 pestañas de épicas', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /LimpiaSeguro/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Carlos Mendoza Rojas/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /EP-1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /EP-2/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /EP-3/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /EP-4/i })).toBeInTheDocument();
  });

  it('bloquea en el formulario EP-1 el intento de registrar un menor de edad', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Nombre completo/i), 'Menor de Prueba');
    await user.type(screen.getByLabelText(/Número de documento/i), '77665544');
    await user.clear(screen.getByLabelText(/Fecha de nacimiento/i));
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '2012-01-15');
    await user.type(screen.getByLabelText(/Teléfono/i), '987654321');

    await user.click(screen.getByRole('button', { name: /Verificar mayoría de edad/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/mayor de edad/i);
  });

  it('permite navegar entre EP-2, EP-3 y EP-4 mostrando sus módulos funcionales', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Carlos Mendoza Rojas/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /EP-2/i }));
    expect(screen.getByRole('heading', { name: /EP-2: Reserva y Gestión/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /EP-3/i }));
    expect(screen.getByRole('heading', { name: /EP-3: Pagos Digitales/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /EP-4/i }));
    expect(screen.getByRole('heading', { name: /EP-4: Capacitación Móvil/i })).toBeInTheDocument();
    expect(screen.getByText(/Seguridad Vial y Chaleco Reflectivo/i)).toBeInTheDocument();
  });
});
