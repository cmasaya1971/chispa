// Operaciones del modelo de datos = implementación de las tools de grounding.
// Puras y deterministas sobre `estado`. Ver 01-modelo-datos.md §4.
// Las de lectura devuelven montos ya formateados (Q0 y Q2) para que la IA use
// la cadena exacta sin re-formatear. Las de mutación cambian `estado` en sitio.
import type { Estado } from "../../shared/estado";
import { fmtQ0, fmtQ2 } from "../../shared/formato";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// ── Lectura ────────────────────────────────────────────────────────────────

export function leerSaldo(e: Estado) {
  return { saldo: e.monedero.saldo, saldoQ0: fmtQ0(e.monedero.saldo), saldoQ2: fmtQ2(e.monedero.saldo) };
}

export function leerCuenta(e: Estado) {
  return {
    titular: e.usuario.nombreCuenta,
    cuenta: e.monedero.numeroCuenta,
    nombreMonedero: e.monedero.nombre,
    saldo: e.monedero.saldo,
    saldoQ2: fmtQ2(e.monedero.saldo),
  };
}

export function listarMovimientos(e: Estado) {
  return {
    rango: e.movimientosRango,
    movimientos: e.movimientos.map((m) => ({
      concepto: m.concepto,
      fecha: m.fecha,
      monto: m.monto,
      montoQ2: (m.monto < 0 ? "-" : "+") + fmtQ2(Math.abs(m.monto)),
    })),
  };
}

export function buscarServicio(e: Estado, args: { identificador?: string; proveedor?: string }) {
  const q = norm(args.identificador ?? args.proveedor ?? "");
  const s = e.serviciosPendientes.find(
    (x) => q && (norm(x.identificador).includes(q) || norm(x.proveedor).includes(q) || norm(x.tipo).includes(q))
  );
  if (!s) return { encontrado: false, pendientes: e.serviciosPendientes.map((x) => x.proveedor) };
  return {
    encontrado: true,
    id: s.id,
    proveedor: s.proveedor,
    tipo: s.tipo,
    identificadorTipo: s.identificadorTipo,
    identificador: s.identificador,
    monto: s.monto,
    montoQ0: fmtQ0(s.monto),
    montoQ2: fmtQ2(s.monto),
    vence: s.vence,
  };
}

export function buscarContacto(e: Estado, args: { texto?: string }) {
  const q = norm(args.texto ?? "");
  const c = e.contactos.find(
    (x) => q && (norm(x.nombre).includes(q) || norm(x.relacion).includes(q))
  );
  if (!c) return { encontrado: false, contactos: e.contactos.map((x) => `${x.nombre} (${x.relacion})`) };
  return { encontrado: true, id: c.id, nombre: c.nombre, relacion: c.relacion, telefono: c.telefono };
}

export function remesaDisponible(e: Estado) {
  if (!e.remesa.disponible) return { disponible: false };
  const d = e.remesa.disponible;
  const q = d.montoUsd * e.tasaCambio.quetzalPorUsd;
  return {
    disponible: true,
    montoUsd: d.montoUsd,
    remitente: d.remitente,
    origen: d.origen,
    tasa: e.tasaCambio.quetzalPorUsd,
    equivalenteQ: q,
    equivalenteQ2: fmtQ2(q),
  };
}

// ── Cálculo ──────────────────────────────────────────────────────────────

/** Amortización francesa (cuota fija). Redondeo a entero Q. */
export function calcularCuota(e: Estado, args: { monto: number; plazoMeses: number; tasaMensual?: number }) {
  const i = args.tasaMensual ?? e.credito.tasaMensual;
  const P = args.monto;
  const n = args.plazoMeses;
  const cuota = Math.round((P * i) / (1 - Math.pow(1 + i, -n)));
  return { monto: P, plazoMeses: n, tasaMensual: i, cuota, cuotaQ0: fmtQ0(cuota) };
}

// ── Mutación de saldo ────────────────────────────────────────────────────

// "Hoy" del demo sale del mock (_meta.hoy = "30 jun"); determinista, sin Date.
function hoy(e: Estado): string {
  return (e as { _meta?: { hoy?: string } })._meta?.hoy ?? "hoy";
}

function registrar(e: Estado, concepto: string, monto: number, fecha?: string) {
  e.movimientos.unshift({ concepto, fecha: fecha ?? hoy(e), monto });
}

export function acreditarMonedero(e: Estado, args: { monto: number; concepto: string }) {
  const antes = e.monedero.saldo;
  e.monedero.saldo += args.monto;
  registrar(e, args.concepto, +args.monto);
  return {
    ok: true,
    saldoAntes: antes,
    saldoAntesQ0: fmtQ0(antes),
    saldoDespues: e.monedero.saldo,
    saldoDespuesQ2: fmtQ2(e.monedero.saldo),
  };
}

export function debitarMonedero(e: Estado, args: { monto: number; concepto: string }) {
  if (e.monedero.saldo < args.monto) {
    return { ok: false, motivo: "saldo_insuficiente", saldo: e.monedero.saldo, saldoQ2: fmtQ2(e.monedero.saldo) };
  }
  const antes = e.monedero.saldo;
  e.monedero.saldo -= args.monto;
  registrar(e, args.concepto, -args.monto);
  return {
    ok: true,
    saldoAntes: antes,
    saldoAntesQ2: fmtQ2(antes),
    saldoDespues: e.monedero.saldo,
    saldoDespuesQ2: fmtQ2(e.monedero.saldo),
  };
}

// ── Remesa ────────────────────────────────────────────────────────────────

export function cobrarRemesa(e: Estado) {
  if (!e.remesa.disponible) return { ok: false, motivo: "sin_remesa_disponible" };
  const d = e.remesa.disponible;
  const q = d.montoUsd * e.tasaCambio.quetzalPorUsd;
  const r = acreditarMonedero(e, { monto: q, concepto: "Remesa de " + d.remitente });
  e.remesa.disponible = null;
  return { ...r, ok: true, montoUsd: d.montoUsd, remitente: d.remitente, acreditadoQ2: fmtQ2(q) };
}

// ── Servicios / envíos / recargas ─────────────────────────────────────────

export function pagarServicio(e: Estado, args: { id?: string; identificador?: string }) {
  const idx = e.serviciosPendientes.findIndex(
    (x) => (args.id && x.id === args.id) || (args.identificador && norm(x.identificador) === norm(args.identificador))
  );
  if (idx === -1) return { ok: false, motivo: "servicio_no_encontrado" };
  const s = e.serviciosPendientes[idx];
  const r = debitarMonedero(e, { monto: s.monto, concepto: `Pago de ${s.tipo} · ${s.proveedor}` });
  if (!r.ok) return r;
  e.serviciosPendientes.splice(idx, 1);
  return { ...r, ok: true, proveedor: s.proveedor, tipo: s.tipo, pagadoQ2: fmtQ2(s.monto) };
}

export function enviarAContacto(e: Estado, args: { contactoId?: string; nombre?: string; monto: number }) {
  const c = e.contactos.find(
    (x) => (args.contactoId && x.id === args.contactoId) || (args.nombre && norm(x.nombre).includes(norm(args.nombre)))
  );
  if (!c) return { ok: false, motivo: "contacto_no_encontrado" };
  const r = debitarMonedero(e, { monto: args.monto, concepto: "Envío a " + c.nombre });
  if (!r.ok) return r;
  return { ...r, ok: true, destinatario: c.nombre, enviadoQ2: fmtQ2(args.monto) };
}

export function recargar(e: Estado, args: { operadorId?: string; operador?: string; monto: number }) {
  const op = e.operadoresRecarga.find(
    (x) => (args.operadorId && x.id === args.operadorId) || (args.operador && norm(x.nombre).includes(norm(args.operador)))
  ) ?? e.operadoresRecarga[0];
  const r = debitarMonedero(e, { monto: args.monto, concepto: "Recarga · " + op.nombre });
  if (!r.ok) return r;
  return { ...r, ok: true, operador: op.nombre, recargadoQ2: fmtQ2(args.monto) };
}

// ── Chispa Pay ────────────────────────────────────────────────────────────

export function pagarComercioConSaldo(e: Estado, args: { monto: number }) {
  const r = debitarMonedero(e, { monto: args.monto, concepto: "Compra · " + e.comercio.nombre });
  if (!r.ok) return r;
  return { ...r, ok: true, comercio: e.comercio.nombre, pagadoQ2: fmtQ2(args.monto) };
}

export function pagarComercioEnCuotas(e: Estado, args: { monto: number; cuotas: number; cuotaMensual: number }) {
  // No toca el saldo: usa línea de crédito. La cuota es el valor validado del mock.
  e.creditos.push({
    monto: args.monto,
    plazoMeses: args.cuotas,
    tasaMensual: e.credito.tasaMensual,
    cuota: args.cuotaMensual,
    primeraCuotaVence: e.credito.fechaPrimeraCuota,
    saldoPendiente: args.monto,
  });
  return {
    ok: true,
    comercio: e.comercio.nombre,
    totalQ2: fmtQ2(args.monto),
    cuotas: args.cuotas,
    cuotaMensualQ0: fmtQ0(args.cuotaMensual),
  };
}

// ── Crédito ────────────────────────────────────────────────────────────────

export function crearCredito(
  e: Estado,
  args: { monto: number; plazoMeses: number; cuota: number; tasaMensual?: number }
) {
  const tasa = args.tasaMensual ?? e.credito.tasaMensual;
  e.creditos.push({
    monto: args.monto,
    plazoMeses: args.plazoMeses,
    tasaMensual: tasa,
    cuota: args.cuota,
    primeraCuotaVence: e.credito.fechaPrimeraCuota,
    saldoPendiente: args.monto,
  });
  const r = acreditarMonedero(e, { monto: args.monto, concepto: "Desembolso de crédito" });
  return {
    ...r,
    ok: true,
    desembolsadoQ0: fmtQ0(args.monto),
    cuotaQ0: fmtQ0(args.cuota),
    primeraCuotaVence: e.credito.fechaPrimeraCuota,
  };
}

// ── Engagement ───────────────────────────────────────────────────────────

export function acreditarReferido(e: Estado) {
  const r = acreditarMonedero(e, { monto: e.engagement.premioReferido, concepto: "Premio referido" });
  return { ...r, ok: true, premioQ0: fmtQ0(e.engagement.premioReferido) };
}

export function acreditarCashback(e: Estado) {
  const r = acreditarMonedero(e, { monto: e.engagement.cashbackMes, concepto: "Cashback" });
  return { ...r, ok: true, cashbackQ0: fmtQ0(e.engagement.cashbackMes) };
}

// ── Sesión ────────────────────────────────────────────────────────────────

export function autenticar(e: Estado) {
  e.sesion.autenticada = true;
  return { ok: true, autenticada: true, titular: e.usuario.nombreCompleto };
}

export function estadoSesion(e: Estado) {
  return { autenticada: e.sesion.autenticada === true };
}
