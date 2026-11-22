# LimpiaSeguro — Plataforma de Formalización e Impacto Social (PFC III — PC2)

Solución web orientada a formalizar y dignificar la labor de los limpiaparabrisas en cruces urbanos, reduciendo riesgos viales, protegiendo a menores de edad, habilitando pagos digitales verificables y brindando trazabilidad georreferenciada a municipalidades y ONG.

## Arquitectura y Stack Tecnológico

- **Frontend:** React 19 + Vite (SPA responsiva optimizada para móviles) + Leaflet / OpenStreetMap.
- **Backend / API:** Vercel Serverless Functions (`/api/*`) en Node.js.
- **Base de Datos, Auth y Storage:** Supabase (PostgreSQL con Row Level Security, Supabase Auth con JWT/RBAC y Storage para evidencias fotográficas).
- **CI/CD & DevSecOps:** GitHub Actions (Gitleaks, `npm audit`, ESLint Security + Semgrep, Vitest Unit & Integration Tests, Build y despliegue en Vercel).

## Cobertura de Épicas (Jira: `Alonso_Ortiz_PC2`)

- **EP-1:** Registro inclusivo con validación de mayoría de edad, asignación de turnos/zonas seguras y reporte/derivación de menores a DEMUNA/ONG.
- **EP-2:** Solicitud de limpieza rápida en zona segura, aceptación con evidencia fotográfica y calificación con propina digital opcional.
- **EP-3:** Pago digital sin efectivo (sandbox), billetera del operario, microahorro programado y constancia digital verificable con código QR.
- **EP-4:** Microcapacitaciones móviles con insignias, gestión de kits ecológicos/EPP y panel georreferenciado de impacto social.

## Configuración Local

1. Copiar `.env.example` a `.env` y completar las credenciales de Supabase.
2. Ejecutar `supabase/schema.sql` en el **SQL Editor** de Supabase.
3. Instalar dependencias y ejecutar:

```bash
npm install
npm run dev
```

## Scripts Disponibles

- `npm run dev` — Servidor de desarrollo Vite.
- `npm run build` — Compilación de producción.
- `npm run lint` — Análisis estático y reglas de seguridad con ESLint.
- `npm run test:unit` — Pruebas unitarias (Vitest).
- `npm run test:integration` — Pruebas de integración (Vitest + Testing Library).
