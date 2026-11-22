-- ============================================================================
-- LimpiaSeguro — Esquema PostgreSQL + RLS + Datos Semilla (Supabase)
-- Proyecto Final de Carrera III — Práctica Calificada 2
-- Cobertura: EP-1, EP-2, EP-3 y EP-4
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ZONAS SEGURAS Y CRUCES AUTORIZADOS (EP-1, EP-2, EP-4)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zonas_seguras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  distrito TEXT NOT NULL,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  aforo_maximo INTEGER NOT NULL DEFAULT 6 CHECK (aforo_maximo > 0),
  nivel_riesgo TEXT NOT NULL DEFAULT 'bajo' CHECK (nivel_riesgo IN ('bajo', 'medio', 'critico')),
  autorizada BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. OPERARIOS FORMALIZADOS — REGISTRO INCLUSIVO Y MAYORÍA DE EDAD (EP-1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre_completo TEXT NOT NULL CHECK (char_length(trim(nombre_completo)) >= 3),
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('DNI', 'CE', 'CPP', 'Pasaporte')),
  numero_documento TEXT UNIQUE NOT NULL CHECK (char_length(trim(numero_documento)) >= 6),
  fecha_nacimiento DATE NOT NULL CHECK (fecha_nacimiento <= (CURRENT_DATE - INTERVAL '18 years')),
  nacionalidad TEXT NOT NULL DEFAULT 'Peruana',
  telefono TEXT NOT NULL,
  zona_asignada_id UUID REFERENCES public.zonas_seguras(id) ON DELETE SET NULL,
  turno TEXT NOT NULL DEFAULT 'manana' CHECK (turno IN ('manana', 'tarde', 'noche')),
  estado_verificacion TEXT NOT NULL DEFAULT 'verificado' CHECK (estado_verificacion IN ('pendiente', 'verificado', 'suspendido')),
  porcentaje_microahorro NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (porcentaje_microahorro >= 0 AND porcentaje_microahorro <= 50),
  enlace_proteccion_social TEXT DEFAULT 'SIS / Emprendedor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. ALERTAS Y DERIVACIÓN DE MENORES EN CRUCES DE ALTO TRÁFICO (EP-1 / HU-02)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alertas_menores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id UUID REFERENCES public.zonas_seguras(id) ON DELETE SET NULL,
  ubicacion_referencia TEXT NOT NULL CHECK (char_length(trim(ubicacion_referencia)) >= 5),
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  descripcion TEXT NOT NULL CHECK (char_length(trim(descripcion)) >= 10),
  entidad_derivada TEXT NOT NULL DEFAULT 'DEMUNA' CHECK (entidad_derivada IN ('DEMUNA', 'MIMP', 'ONG Aliada')),
  estado TEXT NOT NULL DEFAULT 'reportado' CHECK (estado IN ('reportado', 'en_atencion', 'derivado')),
  reportado_por TEXT NOT NULL DEFAULT 'Ciudadano / Operario',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. RESERVA Y GESTIÓN DE LAVADO SEGURO BAJO DEMANDA (EP-2 / HU-04, HU-05, HU-06)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.servicios_lavado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id UUID NOT NULL REFERENCES public.zonas_seguras(id) ON DELETE RESTRICT,
  operario_id UUID REFERENCES public.operarios(id) ON DELETE SET NULL,
  conductor_nombre TEXT NOT NULL CHECK (char_length(trim(conductor_nombre)) >= 2),
  placa_vehiculo TEXT NOT NULL CHECK (char_length(trim(placa_vehiculo)) >= 5),
  tipo_servicio TEXT NOT NULL DEFAULT 'parabrisas_rapido' CHECK (tipo_servicio IN ('parabrisas_rapido', 'cristales_completo', 'ecologico_premium')),
  monto_base NUMERIC(10,2) NOT NULL CHECK (monto_base > 0),
  propina NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (propina >= 0),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptado', 'completado', 'cancelado')),
  evidencia_url TEXT,
  calificacion INTEGER CHECK (calificacion IS NULL OR (calificacion >= 1 AND calificacion <= 5)),
  comentario_conductor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 5. PAGOS DIGITALES, BILLETERA, MICROAHORRO Y CONSTANCIA QR (EP-3)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transacciones_billetera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID UNIQUE NOT NULL REFERENCES public.servicios_lavado(id) ON DELETE CASCADE,
  operario_id UUID NOT NULL REFERENCES public.operarios(id) ON DELETE RESTRICT,
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('Yape', 'Plin', 'Tarjeta', 'Billetera')),
  monto_bruto NUMERIC(10,2) NOT NULL CHECK (monto_bruto > 0),
  monto_propina NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_propina >= 0),
  monto_microahorro NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_microahorro >= 0),
  monto_neto NUMERIC(10,2) NOT NULL CHECK (monto_neto >= 0),
  codigo_constancia_qr TEXT UNIQUE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'aprobado' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. MICROCAPACITACIONES E INSIGNIAS (EP-4 / HU-10)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('seguridad_vial', 'lavado_ecologico', 'atencion_cliente', 'educacion_financiera')),
  duracion_min INTEGER NOT NULL DEFAULT 15 CHECK (duracion_min > 0),
  insignia_nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.operario_capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operario_id UUID NOT NULL REFERENCES public.operarios(id) ON DELETE CASCADE,
  capacitacion_id UUID NOT NULL REFERENCES public.capacitaciones(id) ON DELETE CASCADE,
  completado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operario_id, capacitacion_id)
);

-- ----------------------------------------------------------------------------
-- 7. GESTIÓN DE KITS ECOLÓGICOS Y EQUIPO DE PROTECCIÓN PERSONAL (EP-4 / HU-11)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entregas_epp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operario_id UUID NOT NULL REFERENCES public.operarios(id) ON DELETE CASCADE,
  item TEXT NOT NULL CHECK (char_length(trim(item)) >= 3),
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  estado TEXT NOT NULL DEFAULT 'entregado' CHECK (estado IN ('solicitado', 'entregado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- ÍNDICES DE RENDIMIENTO
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_operarios_zona ON public.operarios(zona_asignada_id);
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON public.servicios_lavado(estado);
CREATE INDEX IF NOT EXISTS idx_servicios_zona ON public.servicios_lavado(zona_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_operario ON public.transacciones_billetera(operario_id);
CREATE INDEX IF NOT EXISTS idx_alertas_estado ON public.alertas_menores(estado);

-- ----------------------------------------------------------------------------
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- Las APIs serverless (/api/*) operan validando JWT/reglas con SUPABASE_SECRET_KEY.
-- El acceso directo desde cliente anónimo queda restringido a catálogos públicos.
-- ----------------------------------------------------------------------------
ALTER TABLE public.zonas_seguras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_menores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_lavado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones_billetera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operario_capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_epp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zonas_public_read" ON public.zonas_seguras;
CREATE POLICY "zonas_public_read"
  ON public.zonas_seguras FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "capacitaciones_public_read" ON public.capacitaciones;
CREATE POLICY "capacitaciones_public_read"
  ON public.capacitaciones FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "operarios_authenticated_read" ON public.operarios;
CREATE POLICY "operarios_authenticated_read"
  ON public.operarios FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "servicios_authenticated_read" ON public.servicios_lavado;
CREATE POLICY "servicios_authenticated_read"
  ON public.servicios_lavado FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "transacciones_owner_read" ON public.transacciones_billetera;
CREATE POLICY "transacciones_owner_read"
  ON public.transacciones_billetera FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.operarios o
      WHERE o.id = transacciones_billetera.operario_id
        AND (o.user_id = auth.uid() OR o.user_id IS NULL)
    )
  );

-- ----------------------------------------------------------------------------
-- STORAGE BUCKET PARA EVIDENCIAS FOTOGRÁFICAS (EP-2 / HU-05)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias', 'evidencias', true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- DATOS SEMILLA (ZONAS SEGURAS EN LIMA Y MICROCAPACITACIONES)
-- ----------------------------------------------------------------------------
INSERT INTO public.zonas_seguras (codigo, nombre, distrito, latitud, longitud, aforo_maximo, nivel_riesgo, autorizada)
VALUES
  ('ZS-01', 'Bahía Segura Av. Javier Prado / Aviación', 'San Borja', -12.0887, -77.0046, 6, 'bajo', true),
  ('ZS-02', 'Óvalo Higuereta — Módulo Autorizado', 'Santiago de Surco', -12.1292, -76.9999, 5, 'bajo', true),
  ('ZS-03', 'Plaza San Miguel — Zona de Lavado Ecológico', 'San Miguel', -12.0772, -77.0819, 8, 'bajo', true),
  ('ZS-04', 'Cruce Av. Universitaria / Av. Colonial', 'Cercado de Lima', -12.0558, -77.0802, 4, 'medio', true),
  ('ZS-05', 'Cruce Crítico Av. Abancay / Nicolás de Piérola', 'Cercado de Lima', -12.0526, -77.0282, 3, 'critico', false)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.capacitaciones (codigo, titulo, categoria, duracion_min, insignia_nombre, descripcion)
VALUES
  ('CAP-01', 'Seguridad Vial y Uso de Chaleco Reflectivo', 'seguridad_vial', 15, 'Guardián Vial', 'Protocolos de posicionamiento en bahías autorizadas y prevención de accidentes de tránsito.'),
  ('CAP-02', 'Lavado Ecológico sin Desperdicio de Agua', 'lavado_ecologico', 20, 'Eco-Operario', 'Uso de soluciones biodegradables y paños de microfibra para limpieza rápida sin contaminación.'),
  ('CAP-03', 'Atención Respetuosa y Consentimiento del Conductor', 'atencion_cliente', 10, 'Servicio Respetuoso', 'Buenas prácticas de trato cordial, solicitud previa de permiso y gestión de calificaciones.'),
  ('CAP-04', 'Finanzas Personales, Microahorro y Protección Social', 'educacion_financiera', 20, 'Ahorro Seguro', 'Administración de ingresos digitales, ahorro programado y afiliación a seguros sociales.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.operarios (nombre_completo, tipo_documento, numero_documento, fecha_nacimiento, nacionalidad, telefono, zona_asignada_id, turno, estado_verificacion, porcentaje_microahorro)
SELECT
  'Carlos Mendoza Rojas', 'CE', '004512890', DATE '1997-05-14', 'Venezolana', '987654321',
  z.id, 'manana', 'verificado', 15.00
FROM public.zonas_seguras z WHERE z.codigo = 'ZS-01'
ON CONFLICT (numero_documento) DO NOTHING;

INSERT INTO public.operarios (nombre_completo, tipo_documento, numero_documento, fecha_nacimiento, nacionalidad, telefono, zona_asignada_id, turno, estado_verificacion, porcentaje_microahorro)
SELECT
  'Lucía Quispe Huamán', 'DNI', '72345618', DATE '1999-11-02', 'Peruana', '912345678',
  z.id, 'tarde', 'verificado', 10.00
FROM public.zonas_seguras z WHERE z.codigo = 'ZS-02'
ON CONFLICT (numero_documento) DO NOTHING;
