import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Pruebas de endurecimiento de seguridad y configuración DevSecOps', () => {
  it('vercel.json define las cabeceras HTTP de seguridad obligatorias', () => {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
    const headersRule = vercelConfig.headers?.find((h) => h.source === '/(.*)');

    expect(headersRule).toBeDefined();
    const headerMap = Object.fromEntries(headersRule.headers.map((h) => [h.key, h.value]));

    expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
    expect(headerMap['X-Frame-Options']).toBe('DENY');
    expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headerMap['Strict-Transport-Security']).toContain('max-age=');
  });

  it('.gitignore protege los archivos .env con secretos de Supabase', () => {
    const gitignore = fs.readFileSync('.gitignore', 'utf-8');
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('.env.*');
  });
});
