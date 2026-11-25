import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../shared/prisma.js';
import { crearAsesor, crearCliente, limpiarBase } from '../testing/db.js';
import {
  cambiarEstado,
  cancelarPorAsesor,
  enviarCotizacion,
  guardarPrecios,
  marcarEnviadaPorFuera,
  numeroDesdeTexto,
  preciosVisiblesParaCliente,
  tomar,
  totalDe,
} from './cotizaciones.js';

const D = (v: string) => new Prisma.Decimal(v);

afterAll(async () => {
  await prisma.$disconnect();
});
beforeEach(async () => {
  await limpiarBase();
});

async function nueva() {
  const { cliente } = await crearCliente();
  const asesor = await crearAsesor();
  const c = await prisma.cotizacion.create({
    data: {
      clienteId: cliente.id,
      nombre: 'Lourdes Paz',
      telefono: '+504 9988-7766',
      modoEntrega: 'retiro',
      sucursal: 'Casa Matriz · San Pedro Sula',
      items: {
        create: [
          { orden: 0, productoId: 'p1', nombre: 'Filtro', numeroParte: '1R-0750', cantidad: 3 },
          { orden: 1, productoId: 'p2', nombre: 'Empaque', numeroParte: '245-3456', cantidad: 2 },
        ],
      },
    },
    include: { items: { orderBy: { orden: 'asc' } } },
  });
  const [a, b] = c.items;
  if (!a || !b) throw new Error('faltan piezas');
  return { c, asesor, items: [a, b] as const };
}

const leer = (numero: number) => prisma.cotizacion.findUniqueOrThrow({ where: { numero }, include: { cambios: { orderBy: { creadoEn: 'asc' } } } });

describe('reglas sin base', () => {
  it('lee el número con o sin prefijo y rechaza lo demás', () => {
    expect(numeroDesdeTexto('CT-1042')).toBe(1042);
    expect(numeroDesdeTexto('1042')).toBe(1042);
    expect(numeroDesdeTexto('ct-7')).toBe(7);
    expect(numeroDesdeTexto('CT-')).toBeNull();
    expect(numeroDesdeTexto('0')).toBeNull();
    expect(numeroDesdeTexto('1042; drop')).toBeNull();
  });

  it('el total es la suma de cantidad × precio, redondeada a dos decimales', () => {
    expect(totalDe([{ cantidad: 3, precioUnitario: D('0.335') }, { cantidad: 1, precioUnitario: D('10') }]).toFixed(2)).toBe('11.01');
    expect(totalDe([{ cantidad: 3, precioUnitario: D('1250.50') }, { cantidad: 2, precioUnitario: null }]).toFixed(2)).toBe('3751.50');
  });

  it('los precios se ven solo si se enviaron por el sistema y la cotización está cotizada, confirmada o entregada', () => {
    expect(preciosVisiblesParaCliente({ estado: 'cotizada', cotizadaPor: 'sistema' })).toBe(true);
    expect(preciosVisiblesParaCliente({ estado: 'entregada', cotizadaPor: 'sistema' })).toBe(true);
    expect(preciosVisiblesParaCliente({ estado: 'en_revision', cotizadaPor: 'sistema' })).toBe(false);
    expect(preciosVisiblesParaCliente({ estado: 'cotizada', cotizadaPor: 'whatsapp' })).toBe(false);
    expect(preciosVisiblesParaCliente({ estado: 'cancelada', cotizadaPor: 'sistema' })).toBe(false);
  });
});

describe('acciones del asesor', () => {
  it('tomar pasa de recibida a en revisión y deja el asesor; tomarla otra vez responde 409', async () => {
    const { c, asesor } = await nueva();
    await tomar(prisma, { numero: c.numero, usuarioId: asesor.id });
    const despues = await leer(c.numero);
    expect(despues.estado).toBe('en_revision');
    expect(despues.asesorId).toBe(asesor.id);
    expect(despues.cambios.at(-1)).toMatchObject({ de: 'recibida', a: 'en_revision', usuarioId: asesor.id, canal: 'sistema' });
    await expect(tomar(prisma, { numero: c.numero, usuarioId: asesor.id })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('enviar con todas las piezas con precio deja cotizada por el sistema y pide avisar al cliente', async () => {
    const { c, asesor, items } = await nueva();
    const r = await enviarCotizacion(prisma, {
      numero: c.numero,
      usuarioId: asesor.id,
      precios: [
        { itemId: items[0].id, precioUnitario: D('1250.50') },
        { itemId: items[1].id, precioUnitario: D('99.99') },
      ],
    });
    expect(r).toMatchObject({ de: 'recibida', a: 'cotizada', avisos: ['cliente_cotizacion_lista'] });
    const d = await leer(c.numero);
    expect(d).toMatchObject({ estado: 'cotizada', cotizadaPor: 'sistema' });
    expect(d.cotizadaEn).not.toBeNull();
  });

  it.each([
    ['falta un precio', [null, '10']],
    ['un precio en 0', ['0', '10']],
    ['un precio negativo', ['-5', '10']],
    ['un precio con tres decimales', ['1.005', '10']],
  ])('enviar con %s responde 400 y el estado no cambia', async (_caso, valores) => {
    const { c, asesor, items } = await nueva();
    const precios = items.map((i, k) => ({ itemId: i.id, precioUnitario: valores[k] === null || valores[k] === undefined ? null : D(String(valores[k])) }));
    await expect(enviarCotizacion(prisma, { numero: c.numero, usuarioId: asesor.id, precios })).rejects.toMatchObject({ statusCode: 400 });
    const d = await leer(c.numero);
    expect(d.estado).toBe('recibida');
    expect(d.cambios).toHaveLength(0);
    expect(await prisma.cotizacionItem.count({ where: { precioUnitario: { not: null } } })).toBe(0);
  });

  it('una pieza de otra cotización responde 400', async () => {
    const { c, asesor } = await nueva();
    const otra = await nueva();
    await expect(
      guardarPrecios(prisma, { numero: c.numero, usuarioId: asesor.id, precios: [{ itemId: otra.items[0].id, precioUnitario: D('5') }] }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('corregir precios de una cotizada solo avisa al cliente si se pide, y queda en la bitácora', async () => {
    const { c, asesor, items } = await nueva();
    const precios = items.map((i) => ({ itemId: i.id, precioUnitario: D('100') }));
    await enviarCotizacion(prisma, { numero: c.numero, usuarioId: asesor.id, precios });
    const sinAviso = await enviarCotizacion(prisma, { numero: c.numero, usuarioId: asesor.id, precios: [{ itemId: items[0].id, precioUnitario: D('90') }] });
    expect(sinAviso.avisos).toEqual([]);
    const sinCambios = await enviarCotizacion(prisma, { numero: c.numero, usuarioId: asesor.id, avisar: true });
    expect(sinCambios.avisos).toEqual([]);
    const conAviso = await enviarCotizacion(prisma, { numero: c.numero, usuarioId: asesor.id, precios: [{ itemId: items[0].id, precioUnitario: D('95') }], avisar: true });
    expect(conAviso.avisos).toEqual(['cliente_cotizacion_lista']);
    const d = await leer(c.numero);
    expect(d.cambios.filter((x) => x.nota === 'Corrigió los precios')).toHaveLength(2);
  });

  it('los precios de una confirmada no se cambian', async () => {
    const { c, asesor, items } = await nueva();
    await prisma.cotizacion.update({ where: { id: c.id }, data: { estado: 'confirmada' } });
    await expect(
      guardarPrecios(prisma, { numero: c.numero, usuarioId: asesor.id, precios: [{ itemId: items[0].id, precioUnitario: D('5') }] }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('«la envié por fuera» deja cotizada con el canal, sin precios; sin canal válido responde 400 y no cambia nada', async () => {
    const { c, asesor } = await nueva();
    await expect(marcarEnviadaPorFuera(prisma, { numero: c.numero, usuarioId: asesor.id, canal: 'sistema' })).rejects.toMatchObject({ statusCode: 400 });
    expect((await leer(c.numero)).estado).toBe('recibida');
    const r = await marcarEnviadaPorFuera(prisma, { numero: c.numero, usuarioId: asesor.id, canal: 'whatsapp', nota: 'le mandé la del sistema' });
    expect(r.avisos).toEqual([]);
    const d = await leer(c.numero);
    expect(d).toMatchObject({ estado: 'cotizada', cotizadaPor: 'whatsapp' });
    expect(d.cambios.at(-1)).toMatchObject({ canal: 'whatsapp', nota: 'le mandé la del sistema', usuarioId: asesor.id });
  });

  it('cambiar estado mueve a cualquier estado, también hacia atrás, sin avisos y con su fila en la bitácora', async () => {
    const { c, asesor } = await nueva();
    await cambiarEstado(prisma, { numero: c.numero, usuarioId: asesor.id, a: 'entregada', canal: 'tienda', nota: 'retiró en mostrador' });
    let d = await leer(c.numero);
    expect(d).toMatchObject({ estado: 'entregada', cotizadaPor: 'tienda' });
    expect(d.entregadaEn).not.toBeNull();
    const r = await cambiarEstado(prisma, { numero: c.numero, usuarioId: asesor.id, a: 'en_revision', canal: 'llamada' });
    expect(r).toMatchObject({ de: 'entregada', a: 'en_revision', avisos: [] });
    d = await leer(c.numero);
    expect(d.entregadaEn).toBeNull();
    expect(d.cambios.map((x) => [x.de, x.a, x.canal])).toEqual([
      ['recibida', 'entregada', 'tienda'],
      ['entregada', 'en_revision', 'llamada'],
    ]);
    await expect(cambiarEstado(prisma, { numero: c.numero, usuarioId: asesor.id, a: 'en_revision', canal: 'llamada' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('cancelar sin motivo responde 400; con motivo cancela y reactivarla borra el motivo', async () => {
    const { c, asesor } = await nueva();
    await expect(cancelarPorAsesor(prisma, { numero: c.numero, usuarioId: asesor.id, motivo: '  ' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(cambiarEstado(prisma, { numero: c.numero, usuarioId: asesor.id, a: 'cancelada', canal: 'whatsapp' })).rejects.toMatchObject({ statusCode: 400 });
    expect((await leer(c.numero)).estado).toBe('recibida');

    await cancelarPorAsesor(prisma, { numero: c.numero, usuarioId: asesor.id, motivo: 'Sin existencia en ninguna sucursal' });
    let d = await leer(c.numero);
    expect(d).toMatchObject({ estado: 'cancelada', motivoCancelacion: 'Sin existencia en ninguna sucursal' });
    await cambiarEstado(prisma, { numero: c.numero, usuarioId: asesor.id, a: 'recibida', canal: 'whatsapp', nota: 'el cliente volvió a escribir' });
    d = await leer(c.numero);
    expect(d).toMatchObject({ estado: 'recibida', motivoCancelacion: null, canceladaEn: null });
  });

  it('una cotización que no existe responde 404', async () => {
    const asesor = await crearAsesor();
    await expect(tomar(prisma, { numero: 99999, usuarioId: asesor.id })).rejects.toMatchObject({ statusCode: 404 });
  });
});
