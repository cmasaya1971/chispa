// Operaciones del modelo de datos = implementación de las tools de grounding.
// Puras y deterministas sobre `estado`. Ver 01-modelo-datos.md §4.
// Las de lectura devuelven montos ya formateados (Q0 y Q2) para que la IA use
// la cadena exacta sin re-formatear. Las de mutación cambian `estado` en sitio.
import type { Estado } from "../../shared/estado";
import { fmtQ0, fmtQ2 } from "../../shared/formato.js";
import { resumenOferta, buscarFrecuencia } from "../../shared/credito.js";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

// ── Lectura ──────────────────────────────────────────────────────────────────

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

// ── Cálculo ──────────────────────────────────────────────────────────────────

// Datos para evaluar el crédito (ingreso promedio, línea aprobada, tasa, plazos).
// Todos salen del mock, para que la IA NUNCA los invente.
export function datosCredito(e: Estado) {
  const pct = Math.round(e.credito.tasaMensual * 100);
  return {
    ingresoPromedio: e.usuario.ingresoPromedio,
    ingresoPromedioQ0: fmtQ0(e.usuario.ingresoPromedio),
    lineaAprobada: e.credito.lineaAprobada,
    lineaAprobadaQ0: fmtQ0(e.credito.lineaAprobada),
    tasaMensual: e.credito.tasaMensual,
    tasaMensualTexto: `${pct}% mensual`,
    plazosMeses: e.credito.plazosMeses,
  };
}

/** Amortización francesa (cuota fija) por PLAZO EN MESES. Redondeo a entero Q. */
export function calcularCuota(e: Estado, args: { monto: number; plazoMeses: number; tasaMensual?: number }) {
  const i = args.tasaMensual ?? e.credito.tasaMensual;
  const P = args.monto;
  const n = args.plazoMeses;
  const cuota = Math.round((P * i) / (1 - Math.pow(1 + i, -n)));
  return { monto: P, plazoMeses: n, tasaMensual: i, cuota, cuotaQ0: fmtQ0(cuota) };
}

// ── Mutación de saldo ────────────────────────────────────────────────────────

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

// ── Remesa ───────────────────────────────────────────────────────────────────

export function cobrarRemesa(e: Estado) {
  if (!e.remesa.disponible) return { ok: false, motivo: "sin_remesa_disponible" };
  const d = e.remesa.disponible;
  const q = d.montoUsd * e.tasaCambio.quetzalPorUsd;
  const r = acreditarMonedero(e, { monto: q, concepto: "Remesa de " + d.remitente });
  e.remesa.disponible = null;
  return { ...r, ok: true, montoUsd: d.montoUsd, remitente: d.remitente, acreditadoQ2: fmtQ2(q) };
}

// ── Servicios / envíos / recargas ────────────────────────────────────────────

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

// ── Chispa Pay ───────────────────────────────────────────────────────────────

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

// ── Crédito ──────────────────────────────────────────────────────────────────

export function crearCredito(
  e: Estado,
  args: {
    monto: number;
    plazoMeses?: number;
    cuota: number;
    tasaMensual?: number;
    // ── ZIGI (opcionales) ──
    frecuenciaId?: string;
    pagos?: number;
    total?: number;
    intereses?: number;
  }
) {
  const tasa = args.tasaMensual ?? e.credito.tasaMensual;
  const pagos = args.pagos ?? args.plazoMeses ?? 0;
  const total = args.total ?? args.cuota * pagos;
  const intereses = args.intereses ?? total - args.monto;
  const f = args.frecuenciaId ? buscarFrecuencia(e, args.frecuenciaId) : undefined;
  // Firma y declaraciones las deja el cliente en la sesión (widgets de la UI).
  const s = e.sesion as {
    firmaContrato?: string;
    declaraciones?: { tyc: boolean; pep_us_cpe: boolean; ts: string };
  };
  e.creditos.push({
    monto: args.monto,
    plazoMeses: args.plazoMeses ?? pagos,
    tasaMensual: tasa,
    cuota: args.cuota,
    primeraCuotaVence: e.credito.fechaPrimeraCuota,
    saldoPendiente: total > 0 ? total : args.monto,
    frecuenciaId: args.frecuenciaId,
    unidad: f?.unidad,
    pagos,
    total,
    intereses,
    pagado: 0,
    firma: s.firmaContrato,
    declaraciones: s.declaraciones,
    biometria: e.sesion.autenticada === true ? { ok: true, ts: new Date().toISOString() } : undefined,
  });
  const r = acreditarMonedero(e, { monto: args.monto, concepto: "Desembolso de crédito" });
  return {
    ...r,
    ok: true,
    desembolsadoQ0: fmtQ0(args.monto),
    cuotaQ0: fmtQ0(args.cuota),
    totalQ2: fmtQ2(total),
    interesesQ2: fmtQ2(intereses),
    pagos,
    primeraCuotaVence: e.credito.fechaPrimeraCuota,
  };
}

// ── Crédito estilo ZIGI: cálculo, widgets, comprobante y pago de cuota ────────

/** Cuota/total/intereses según FRECUENCIA (semanal/quincenal/mensual). Grounding del configurador. */
export function calcularCuotaFrecuencia(e: Estado, args: { monto: number; frecuenciaId: string; pagos: number }) {
  const r = resumenOferta(e, args.monto, args.frecuenciaId, args.pagos);
  return {
    ...r,
    montoQ0: fmtQ0(r.monto),
    cuotaQ0: fmtQ0(r.cuota),
    totalQ2: fmtQ2(r.total),
    interesesQ2: fmtQ2(r.intereses),
  };
}

/** Abre la pantalla de análisis del historial de remesas (el sistema "consulta" los registros). */
export function mostrarAnalisisRemesas() {
  return {
    uiAccion: "analisisRemesas",
    nota: "Se está mostrando en pantalla el análisis del historial de remesas del usuario (consultando registros de Chispa y de Banco GyT Continental). Espera el evento del sistema con el resultado; no inventes el historial ni los montos por texto.",
  };
}

/** Abre el configurador de préstamo en la UI (slider + frecuencia + N.º de pagos). */
export function mostrarConfigurador(e: Estado) {
  return {
    uiAccion: "configurador",
    montoMin: e.credito.montoMin ?? 100,
    montoMax: e.credito.montoMax ?? e.credito.lineaAprobada,
    montoDefault: e.credito.montoDefault ?? 2000,
    frecuencias: e.credito.frecuencias ?? [],
    frecuenciaDefault: e.credito.frecuenciaDefault ?? "mensual",
    tasaMensual: e.credito.tasaMensual,
    nota: "Se está mostrando el configurador del préstamo (monto, frecuencia y número de pagos). Espera a que el usuario elija y continúe.",
  };
}

/** Muestra el contrato para firmar con el dedo. */
export function mostrarContrato(e: Estado) {
  return {
    uiAccion: "contratoFirma",
    contrato: e.credito.contratoResumen ?? null,
    nota: "Se está mostrando el contrato para que el usuario lo firme con el dedo. Espera a que confirme la firma.",
  };
}

/** Muestra las declaraciones obligatorias (PEP/US/CPE + T&C). */
export function mostrarDeclaraciones(e: Estado) {
  return {
    uiAccion: "declaraciones",
    declaraciones: e.credito.declaracionesRequeridas ?? [],
    info: e.credito.infoDeclaraciones ?? null,
    nota: "Se están mostrando las declaraciones PEP/US/CPE y los Términos y Condiciones. Espera a que el usuario acepte y declare.",
  };
}

/** Datos del comprobante del último crédito (para la tarjeta 'Préstamo depositado'). */
export function generarComprobante(e: Estado, args: { creditoId?: number }) {
  const idx = args.creditoId ?? e.creditos.length - 1;
  const c = e.creditos[idx];
  if (!c) return { ok: false, motivo: "sin_credito" };
  return {
    ok: true,
    titulo: "Préstamo depositado",
    fecha: e.credito.fechaDesembolso ?? hoy(e),
    hora: e.credito.horaDesembolso ?? "",
    facturarA: e.usuario.nombreCompleto,
    dpi: e.usuario.dpi,
    montoQ0: fmtQ0(c.monto),
    totalQ2: fmtQ2(c.total ?? c.monto),
    interesesQ2: fmtQ2(c.intereses ?? 0),
    pagos: c.pagos ?? c.plazoMeses,
    cuotaQ2: fmtQ2(c.cuota),
    formaPago: e.credito.metodoPago ?? "Débito mensual automático",
    primeraCuotaVence: c.primeraCuotaVence,
    tieneFirma: Boolean(c.firma),
  };
}

/** Paga una cuota del crédito activo (baja el saldo y avanza el progreso). */
export function pagarCuota(e: Estado, args: { creditoId?: number }) {
  const c = e.creditos[args.creditoId ?? 0];
  if (!c) return { ok: false, motivo: "sin_credito_activo" };
  const pendiente = c.saldoPendiente;
  if (pendiente <= 0) return { ok: false, motivo: "credito_ya_pagado" };
  const pago = Math.min(c.cuota, pendiente);
  const r = debitarMonedero(e, { monto: pago, concepto: "Pago de cuota crédito" });
  if (!r.ok) return r;
  c.pagado = (c.pagado ?? 0) + pago;
  c.saldoPendiente -= pago;
  return {
    ...r,
    ok: true,
    pagoCuotaQ2: fmtQ2(pago),
    pagadoTotalQ2: fmtQ2(c.pagado),
    pendienteQ2: fmtQ2(c.saldoPendiente),
    liquidado: c.saldoPendiente <= 0,
  };
}

// ── Engagement ───────────────────────────────────────────────────────────────

export function acreditarReferido(e: Estado) {
  const r = acreditarMonedero(e, { monto: e.engagement.premioReferido, concepto: "Premio referido" });
  return { ...r, ok: true, premioQ0: fmtQ0(e.engagement.premioReferido) };
}

export function acreditarCashback(e: Estado) {
  const r = acreditarMonedero(e, { monto: e.engagement.cashbackMes, concepto: "Cashback" });
  return { ...r, ok: true, cashbackQ0: fmtQ0(e.engagement.cashbackMes) };
}

// ── Sesión ───────────────────────────────────────────────────────────────────

// Paso 1 de la ceremonia: valida el número de DPI contra el del mock.
// Compara solo dígitos (tolera espacios/guiones). NO autentica todavía.
export function validarDPI(e: Estado, args: { dpi?: string }) {
  const soloDigitos = (s: string) => (s ?? "").replace(/\D/g, "");
  const ingresado = soloDigitos(args.dpi ?? "");
  const real = soloDigitos(e.usuario.dpi);
  const valido = ingresado.length >= 13 && ingresado === real;
  return {
    valido,
    titular: valido ? e.usuario.nombreCompleto : null,
    motivo: valido ? undefined : ingresado.length < 13 ? "dpi_incompleto" : "dpi_no_coincide",
  };
}

// Paso 2 de la ceremonia: pide al cliente abrir la cámara para el reconocimiento
// facial. Devuelve una señal de UI que el frontend interpreta. NO autentica: hay
// que esperar a que el usuario complete el escaneo y luego llamar `autenticar`.
export function escanearRostro() {
  return {
    uiAccion: "escaneoRostro",
    nota: "Se está abriendo la cámara del usuario para validar su rostro contra RENAP. Pedile que mire a la cámara. NO llames autenticar hasta que el usuario confirme que completó el escaneo.",
  };
}

// Paso 3 (final): marca la sesión como autenticada tras el escaneo facial y
// devuelve los datos personales que "RENAP" confirmó (simulación de la respuesta
// del registro). Estos datos alimentan la tarjeta de identidad.
export function autenticar(e: Estado) {
  e.sesion.autenticada = true;
  const r = e.usuario.renap;
  return {
    ok: true,
    autenticada: true,
    validadoContra: "RENAP",
    titular: e.usuario.nombreCompleto,
    dpi: e.usuario.dpi,
    edad: r.edad,
    fechaNacimiento: r.fechaNacimiento,
    lugarNacimiento: r.lugarNacimiento,
    estadoCivil: r.estadoCivil,
    nacionalidad: r.nacionalidad,
    sexo: r.sexo,
  };
}

export function estadoSesion(e: Estado) {
  return { autenticada: e.sesion.autenticada === true };
}
