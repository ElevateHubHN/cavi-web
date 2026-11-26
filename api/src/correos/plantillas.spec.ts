import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  avisoCotizacionAceptada,
  avisoCotizacionCancelada,
  avisoMensajeContacto,
  avisoSolicitudNueva,
  bienvenidaUsuarioPanel,
  claveTemporal,
  confirmacion,
  cotizacionLista,
  type Contenido,
} from './plantillas.js';

const ctx = { sitio: 'https://repcavi.example', correoConsultas: 'consultas@repcavi.example' };
const MALO = '<script>alert(1)</script>';

function sinScript(c: Contenido) {
  expect(c.html).not.toContain('<script>');
  expect(c.html).toContain('&lt;script&gt;');
  expect(c.html).toContain('https://repcavi.example/logo-cavi-correo.png');
  expect(c.texto.length).toBeGreaterThan(20);
  expect(c.texto).not.toMatch(/<(strong|br|table|tr|td|p|div|a|h2|span)[\s>]/);
}

const piezas = [
  { nombre: `Turbo ${MALO}`, numeroParte: 'TRB-6650', cantidad: 1, precioUnitario: new Prisma.Decimal('38900.50') },
  { nombre: 'Filtro de aceite', numeroParte: 'FLT-2201', cantidad: 6, precioUnitario: new Prisma.Decimal('685') },
];

describe('plantillas de correo', () => {
  it('confirmación con clave temporal', () => {
    const c = confirmacion(ctx, { nombre: `${MALO} Banegas`, enlace: 'https://repcavi.example/portal/confirmar?token=abc', claveTemporal: 'Xk7pM3qR9a', numero: 'CT-1051' });
    expect(c.asunto).toBe('Confirma tu correo para seguir tu cotización CT-1051');
    expect(c.texto).toContain('Clave temporal: Xk7pM3qR9a');
    expect(c.html).toContain('href="https://repcavi.example/portal/confirmar?token=abc"');
    expect(c.html).toContain('no respondas a este correo');
    expect(c.html).toContain('consultas@repcavi.example');
    expect(c.nombreRemitente).toBeNull();
    sinScript(c);
    expect(confirmacion(ctx, { nombre: 'José', enlace: 'x', claveTemporal: 'a', numero: null }).asunto).toBe('Confirma tu correo para entrar a tu portal de CAVI');
  });

  it('clave temporal nueva', () => {
    const c = claveTemporal(ctx, { nombre: MALO, claveTemporal: 'bR4tW8nK2e' });
    expect(c.asunto).toBe('Tu clave temporal para entrar al portal de CAVI');
    expect(c.texto).toContain('tu clave actual sigue funcionando');
    expect(c.html).toContain('href="https://repcavi.example/portal"');
    sinScript(c);
  });

  it('cotización lista con su total', () => {
    const c = cotizacionLista(ctx, { nombre: 'Marta', numero: 'CT-1048', asesor: MALO, piezas, total: new Prisma.Decimal('43010.50'), entrega: 'Retiro en Sucursal La Laguna · Tegucigalpa' });
    expect(c.asunto).toBe('Tu cotización CT-1048 está lista: L 43,010.50');
    expect(c.html).toContain('L 4,110.00');
    expect(c.html).toContain('href="https://repcavi.example/portal/cotizacion?id=CT-1048"');
    expect(c.texto).toContain('Total: L 43,010.50');
    sinScript(c);
  });

  it('a CAVI: solicitud nueva', () => {
    const c = avisoSolicitudNueva(ctx, {
      numero: 'CT-1051',
      nombre: `José ${MALO}`,
      empresa: null,
      correo: 'jbanegas@cliente.example',
      telefono: '+504 9512-0034',
      rtn: null,
      entrega: 'Envío a La Ceiba, Atlántida · Col. El Sauce',
      equipo: 'Cabezal 6x4',
      serie: null,
      notas: MALO,
      conFoto: true,
      piezas,
    });
    expect(c.asunto).toBe(`Solicitud nueva CT-1051 · José ${MALO} · 2 repuestos`);
    expect(c.html).toContain('Cabezal 6x4 · con foto');
    expect(c.html).not.toContain('>RTN<');
    expect(c.html).toContain('href="https://repcavi.example/panel/cotizaciones/1051"');
    expect(c.html).toContain('Aviso automático del sitio');
    expect(c.nombreRemitente).toBe('Sitio de CAVI');
    sinScript(c);
  });

  it('a CAVI: cotización aceptada', () => {
    const c = avisoCotizacionAceptada(ctx, { numero: 'CT-1043', nombre: 'Óscar Rivera', empresa: MALO, telefono: '+504 9876-2210', entrega: 'Retiro en Casa Matriz', asesor: 'Karla Mejía', total: 'L 7,400.00' });
    expect(c.asunto).toBe('CT-1043 aceptada por Óscar Rivera · L 7,400.00');
    sinScript(c);
    expect(avisoCotizacionAceptada(ctx, { numero: 'CT-1', nombre: 'Ana', empresa: null, telefono: '1', entrega: 'x', asesor: null, total: null }).asunto).toBe('CT-1 aceptada por Ana');
  });

  it('a CAVI: cancelada por el cliente', () => {
    const c = avisoCotizacionCancelada(ctx, { numero: 'CT-1049', nombre: 'Lourdes Paz', empresa: null, comentario: MALO, estabaEn: 'Cotizada (enviada por WhatsApp)', asesor: null });
    expect(c.asunto).toBe('CT-1049 cancelada por el cliente · Lourdes Paz');
    expect(c.html).toContain('Cotizada (enviada por WhatsApp)');
    sinScript(c);
  });

  it('a CAVI: mensaje de contacto', () => {
    const c = avisoMensajeContacto(ctx, { nombre: 'Ana Castillo', empresa: 'Fletes del Norte', correo: 'ana@fletes.example', telefono: '+504 9900-1122', mensaje: MALO });
    expect(c.asunto).toBe('Mensaje del sitio · Ana Castillo (Fletes del Norte)');
    expect(c.html).toContain('href="https://repcavi.example/panel/mensajes"');
    sinScript(c);
  });

  it('acceso al panel con clave temporal', () => {
    const c = bienvenidaUsuarioPanel(ctx, { nombre: MALO, correo: 'meuceda@repcavi.example', claveTemporal: 'Hq6vT9mZ3c', rol: 'asesor', invitadoPor: 'Héctor Cáceres' });
    expect(c.asunto).toBe('Tu acceso al panel de cotizaciones de CAVI');
    expect(c.texto).toContain('Héctor Cáceres te dio acceso al panel de cotizaciones de CAVI como asesor');
    expect(c.texto).toContain('Clave temporal: Hq6vT9mZ3c');
    expect(c.html).toContain('href="https://repcavi.example/panel"');
    expect(c.nombreRemitente).toBeNull();
    sinScript(c);
  });
});
