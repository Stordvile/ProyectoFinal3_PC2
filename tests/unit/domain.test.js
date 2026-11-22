import { describe, expect, it } from 'vitest';
import {
  calcularEdad,
  calcularLiquidacionPago,
  esMayorDeEdad,
  formatPen,
  generarCodigoConstancia,
  validarAlertaMenor,
  validarEntregaEpp,
  validarOperario,
  validarPago,
  validarServicio
} from '../../src/lib/domain.js';

describe('Pruebas unitarias de reglas de dominio (EP-1 a EP-4)', () => {
  const hoyFijo = new Date('2026-11-21T12:00:00');

  it('calcula correctamente la edad y bloquea menores de 18 años (HU-01)', () => {
    expect(calcularEdad('2008-11-21', hoyFijo)).toBe(18);
    expect(esMayorDeEdad('2008-11-21', hoyFijo)).toBe(true);
    expect(calcularEdad('2010-05-10', hoyFijo)).toBe(16);
    expect(esMayorDeEdad('2010-05-10', hoyFijo)).toBe(false);
    expect(esMayorDeEdad('', hoyFijo)).toBe(false);
  });

  it('valida registro inclusivo con CE/CPP para operarios mayores de edad', () => {
    const res = validarOperario(
      {
        nombre_completo: 'María Fernanda Pérez',
        tipo_documento: 'CPP',
        numero_documento: '004891234',
        fecha_nacimiento: '1999-03-20',
        telefono: '987654321',
        turno: 'manana',
        porcentaje_microahorro: 15
      },
      hoyFijo
    );

    expect(res.valido).toBe(true);
    expect(res.esMenor).toBe(false);
    expect(res.errores).toHaveLength(0);
  });

  it('bloquea registro laboral de menores y marca bandera esMenor (HU-01 / HU-02)', () => {
    const res = validarOperario(
      {
        nombre_completo: 'Joven Menor',
        tipo_documento: 'DNI',
        numero_documento: '78901234',
        fecha_nacimiento: '2011-08-12',
        telefono: '912345678',
        turno: 'tarde'
      },
      hoyFijo
    );

    expect(res.valido).toBe(false);
    expect(res.esMenor).toBe(true);
    expect(res.errores[0]).toMatch(/mayor de edad/i);
  });

  it('valida correctamente reportes de derivación de menores (HU-02)', () => {
    const valido = validarAlertaMenor({
      ubicacion_referencia: 'Av. Abancay cruce Nicolás de Piérola',
      descripcion: 'Dos menores limpiando parabrisas en carril central con alto tráfico.',
      entidad_derivada: 'DEMUNA'
    });
    expect(valido.valido).toBe(true);

    const invalido = validarAlertaMenor({
      ubicacion_referencia: 'Av.',
      descripcion: 'Corto',
      entidad_derivada: 'Otra'
    });
    expect(invalido.valido).toBe(false);
    expect(invalido.errores.length).toBeGreaterThanOrEqual(3);
  });

  it('valida solicitudes de limpieza en zona segura y placa vehicular (HU-04)', () => {
    expect(
      validarServicio({
        zona_id: 'zona-1',
        conductor_nombre: 'Luis Ramos',
        placa_vehiculo: 'ABC-123',
        tipo_servicio: 'ecologico_premium'
      }).valido
    ).toBe(true);

    expect(
      validarServicio({
        zona_id: '',
        conductor_nombre: 'A',
        placa_vehiculo: '12',
        tipo_servicio: 'inexistente'
      }).valido
    ).toBe(false);
  });

  it('calcula liquidación digital con propina y microahorro programado (HU-07 / HU-09)', () => {
    const liq = calcularLiquidacionPago({
      montoBase: 10,
      propina: 5,
      porcentajeMicroahorro: 20
    });

    expect(liq).toEqual({
      montoBruto: 15,
      montoPropina: 5,
      montoMicroahorro: 3,
      montoNeto: 12
    });
    expect(formatPen(liq.montoNeto)).toBe('S/ 12.00');
  });

  it('rechaza cálculos de liquidación con valores negativos o fuera de rango', () => {
    expect(() => calcularLiquidacionPago({ montoBase: 0, propina: 0, porcentajeMicroahorro: 10 })).toThrow();
    expect(() => calcularLiquidacionPago({ montoBase: 10, propina: -2, porcentajeMicroahorro: 10 })).toThrow();
    expect(() => calcularLiquidacionPago({ montoBase: 10, propina: 0, porcentajeMicroahorro: 65 })).toThrow();
  });

  it('valida pagos digitales y genera código único de constancia QR (HU-08)', () => {
    expect(
      validarPago({
        servicio_id: 'sv-1',
        operario_id: 'op-1',
        metodo_pago: 'Yape',
        monto_base: 10,
        propina: 2
      }).valido
    ).toBe(true);

    const codigo = generarCodigoConstancia('op-123456', hoyFijo);
    expect(codigo).toMatch(/^LS-20261121-OP1234-\d{6}$/);
  });

  it('valida entregas de kits ecológicos y EPP (HU-11)', () => {
    expect(
      validarEntregaEpp({
        operario_id: 'op-1',
        item: 'Chaleco reflectivo certificado',
        cantidad: 2
      }).valido
    ).toBe(true);

    expect(
      validarEntregaEpp({
        operario_id: '',
        item: 'AB',
        cantidad: 0
      }).valido
    ).toBe(false);
  });
});
