import { describe, expect, it } from 'vitest';
import { createOperariosHandler } from '../../api/operarios.js';
import { createAlertasMenoresHandler } from '../../api/alertas-menores.js';
import { createServiciosHandler } from '../../api/servicios.js';
import { createPagosHandler } from '../../api/pagos.js';
import { createImpactoHandler } from '../../api/impacto.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
    end(raw) {
      this.body = raw ? JSON.parse(raw) : null;
      return this;
    }
  };
  return res;
}

function createMockSupabase(tableResponses = {}) {
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      }
    },
    from(table) {
      const result = tableResponses[table] || { data: { id: 'mock-id' }, error: null };
      const chain = {
        select() {
          return chain;
        },
        insert(payload) {
          chain._inserted = payload;
          return chain;
        },
        update(payload) {
          chain._updated = payload;
          return chain;
        },
        eq() {
          return chain;
        },
        order() {
          return Promise.resolve(result);
        },
        single() {
          if (result.error) return Promise.resolve(result);
          const merged =
            chain._inserted && typeof result.data === 'object' && !Array.isArray(result.data)
              ? { ...chain._inserted, ...result.data }
              : result.data;
          return Promise.resolve({ data: merged, error: null });
        }
      };
      return chain;
    }
  };
}

describe('Pruebas de integración de endpoints Serverless (/api/*)', () => {
  it('POST /api/operarios rechaza menores de edad con código HTTP 422', async () => {
    const handler = createOperariosHandler(() => createMockSupabase());
    const req = {
      method: 'POST',
      headers: {},
      body: {
        nombre_completo: 'Menor Prueba',
        tipo_documento: 'DNI',
        numero_documento: '80123456',
        fecha_nacimiento: '2012-02-10',
        telefono: '987654321',
        turno: 'manana'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(422);
    expect(res.body.esMenor).toBe(true);
    expect(res.body.error).toMatch(/mayor de edad/i);
  });

  it('POST /api/operarios registra operario migrante con CPP válido (HTTP 201)', async () => {
    const mockDb = createMockSupabase({
      operarios: { data: { id: 'op-101', estado_verificacion: 'verificado' }, error: null }
    });
    const handler = createOperariosHandler(() => mockDb);
    const req = {
      method: 'POST',
      headers: {},
      body: {
        nombre_completo: 'Andrés Bolívar',
        tipo_documento: 'CPP',
        numero_documento: '005412399',
        fecha_nacimiento: '1996-07-04',
        nacionalidad: 'Venezolana',
        telefono: '912345678',
        turno: 'tarde'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBe('op-101');
    expect(res.body.data.tipo_documento).toBe('CPP');
  });

  it('DELETE /api/operarios responde HTTP 405 Método no permitido', async () => {
    const handler = createOperariosHandler(() => createMockSupabase());
    const res = createMockRes();
    await handler({ method: 'DELETE', headers: {} }, res);
    expect(res.statusCode).toBe(405);
  });

  it('POST /api/alertas-menores registra alerta y deriva a DEMUNA (HTTP 201)', async () => {
    const mockDb = createMockSupabase({
      alertas_menores: { data: { id: 'al-201', estado: 'reportado' }, error: null }
    });
    const handler = createAlertasMenoresHandler(() => mockDb);
    const req = {
      method: 'POST',
      body: {
        ubicacion_referencia: 'Av. Abancay con Jr. Cusco',
        descripcion: 'Menor trabajando entre carriles en hora punta.',
        entidad_derivada: 'DEMUNA'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.canal_notificacion).toContain('DEMUNA');
  });

  it('POST /api/servicios crea solicitud en zona segura con tarifa oficial (HTTP 201)', async () => {
    const mockDb = createMockSupabase({
      servicios_lavado: { data: { id: 'sv-301' }, error: null }
    });
    const handler = createServiciosHandler(() => mockDb);
    const req = {
      method: 'POST',
      body: {
        zona_id: 'zs-1',
        conductor_nombre: 'Carla Díaz',
        placa_vehiculo: 'f4b-890',
        tipo_servicio: 'cristales_completo'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.placa_vehiculo).toBe('F4B-890');
    expect(res.body.data.monto_base).toBe(10);
  });

  it('POST /api/pagos procesa pago digital, aparta microahorro y genera código QR (HTTP 201)', async () => {
    const mockDb = createMockSupabase({
      operarios: { data: { id: 'op-101', porcentaje_microahorro: 15 }, error: null },
      transacciones_billetera: { data: { id: 'tx-401' }, error: null }
    });
    const handler = createPagosHandler(() => mockDb);
    const req = {
      method: 'POST',
      body: {
        servicio_id: 'sv-301',
        operario_id: 'op-101',
        metodo_pago: 'Yape',
        monto_base: 10,
        propina: 10
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.monto_bruto).toBe(20);
    expect(res.body.data.monto_microahorro).toBe(3);
    expect(res.body.data.monto_neto).toBe(17);
    expect(res.body.data.codigo_constancia_qr).toMatch(/^LS-/);
  });

  it('POST /api/impacto registra entrega de kit ecológico / EPP (HTTP 201)', async () => {
    const mockDb = createMockSupabase({
      entregas_epp: { data: { id: 'epp-501' }, error: null }
    });
    const handler = createImpactoHandler(() => mockDb);
    const req = {
      method: 'POST',
      body: {
        accion: 'entregar_epp',
        operario_id: 'op-101',
        item: 'Chaleco reflectivo certificado',
        cantidad: 1
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.item).toBe('Chaleco reflectivo certificado');
  });
});
