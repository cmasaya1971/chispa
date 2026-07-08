// Declaración de tools para OpenAI (function-calling) + despachador que las
// ejecuta contra el estado. Es la ÚNICA vía por la que la IA lee o muta datos.
import type OpenAI from "openai";
import type { Estado } from "../../shared/estado";
import * as op from "./operaciones.js";

type ToolFn = OpenAI.Chat.Completions.ChatCompletionTool;

export const toolSchemas: ToolFn[] = [
  // ── Lectura ──
  fn("leerSaldo", "Devuelve el saldo actual del Monedero Chispa del usuario.", {}),
  fn("leerCuenta", "Devuelve titular, número de cuenta y saldo del monedero.", {}),
  fn("listarMovimientos", "Lista los movimientos recientes del monedero con su rango de fechas.", {}),
  fn("buscarServicio", "Busca un servicio/recibo pendiente por identificador (contador/NIS) o proveedor (EEGSA/EMPAGUA).", {
    identificador: { type: "string", description: "Contador, NIS u otro identificador del recibo." },
    proveedor: { type: "string", description: "Nombre del proveedor, ej. EEGSA o EMPAGUA." },
  }),
  fn("buscarContacto", "Busca un contacto por nombre o relación (ej. 'mi hermana' → Ana).", {
    texto: { type: "string", description: "Nombre o relación del contacto." },
  }, ["texto"]),
  fn("remesaDisponible", "Consulta si hay una remesa disponible para cobrar y su equivalente en quetzales.", {}),

  // ── Crédito: evaluación ──
  fn("datosCredito", "Devuelve los datos para evaluar un crédito: ingreso promedio del usuario, línea aprobada, tasa mensual y plazos. Úsalo SIEMPRE antes de ofrecer un crédito; nunca inventes estos números.", {}),

  // ── Cálculo ──
  // (El cálculo de la cuota del crédito lo hace el configurador en pantalla; por
  //  eso NO se exponen calcularCuota/calcularCuotaFrecuencia como tools: así el
  //  modelo no puede resolver el préstamo por texto y se ve forzado a abrir el
  //  configurador. Las funciones siguen existiendo en operaciones.ts.)

  // ── Mutación de saldo ──
  fn("acreditarMonedero", "Acredita (suma) un monto al monedero y registra el movimiento. Requiere confirmación previa del usuario.", {
    monto: { type: "number" },
    concepto: { type: "string", description: "Concepto del movimiento." },
  }, ["monto", "concepto"]),
  fn("debitarMonedero", "Debita (resta) un monto del monedero si hay saldo. Requiere confirmación previa.", {
    monto: { type: "number" },
    concepto: { type: "string" },
  }, ["monto", "concepto"]),

  // ── Remesa ──
  fn("cobrarRemesa", "Cobra la remesa disponible: la convierte a quetzales y la acredita al monedero. Confirmar antes.", {}),

  // ── Servicios / envíos / recargas ──
  fn("pagarServicio", "Paga un servicio pendiente (baja el saldo). Confirmar antes. Identificar por id o identificador.", {
    id: { type: "string", description: "id interno del servicio (ej. 'eegsa')." },
    identificador: { type: "string", description: "Contador/NIS del recibo." },
  }),
  fn("enviarAContacto", "Envía dinero a un contacto (baja el saldo). Confirmar antes.", {
    contactoId: { type: "string" },
    nombre: { type: "string", description: "Nombre del contacto." },
    monto: { type: "number" },
  }, ["monto"]),
  fn("recargar", "Hace una recarga de saldo telefónico (baja el saldo). Confirmar antes.", {
    operador: { type: "string", description: "Operador, ej. Tigo." },
    monto: { type: "number" },
  }, ["monto"]),

  // ── Chispa Pay ──
  fn("pagarComercioConSaldo", "Paga a un comercio usando el saldo del monedero. Confirmar antes.", {
    monto: { type: "number" },
  }, ["monto"]),
  fn("pagarComercioEnCuotas", "Paga a un comercio en cuotas usando la línea de crédito (no toca el saldo). Confirmar antes.", {
    monto: { type: "number" },
    cuotas: { type: "number" },
    cuotaMensual: { type: "number", description: "Cuota mensual validada." },
  }, ["monto", "cuotas", "cuotaMensual"]),

  // ── Crédito (flujo ZIGI) ──
  fn("mostrarAnalisisRemesas", "Muestra en pantalla el análisis del historial de remesas del usuario (consulta los registros de Chispa y de Banco GyT Continental). Llámalo cuando el usuario diga que recibe remesas del exterior, ANTES de evaluar. Espera el evento del sistema con el resultado.", {}),
  fn("mostrarConfigurador", "Abre en la pantalla el configurador del préstamo (slider de monto + frecuencia + número de pagos). Llámalo cuando el usuario vaya a elegir cuánto necesita. Espera a que el usuario elija y continúe.", {}),
  fn("mostrarContrato", "Muestra el contrato del préstamo para que el usuario lo firme con el dedo. Espera a que confirme la firma antes de seguir.", {}),
  fn("mostrarDeclaraciones", "Muestra las declaraciones obligatorias (PEP/US/CPE y Términos y Condiciones) que exige la ley. Espera a que el usuario acepte y declare.", {}),
  fn("crearCredito", "Crea el crédito y desembolsa el monto al monedero. Llámalo SOLO tras la confirmación, el contrato firmado, las declaraciones y la validación biométrica. Usa la cuota de calcularCuota/calcularCuotaFrecuencia.", {
    monto: { type: "number" },
    cuota: { type: "number", description: "Cuota por período (de calcularCuota/calcularCuotaFrecuencia)." },
    plazoMeses: { type: "number", description: "Plazo en meses (si aplica el flujo por meses)." },
    frecuenciaId: { type: "string", description: "'mensual' | 'quincenal' | 'semanal' (flujo ZIGI)." },
    pagos: { type: "number", description: "Número de pagos (flujo ZIGI)." },
    total: { type: "number", description: "Total a pagar (cuota × pagos)." },
    intereses: { type: "number", description: "Intereses (total − monto)." },
  }, ["monto", "cuota"]),
  fn("generarComprobante", "Devuelve los datos del comprobante del último préstamo desembolsado (para la tarjeta 'Préstamo depositado').", {
    creditoId: { type: "number", description: "Índice del crédito (opcional; por defecto el último)." },
  }),
  fn("pagarCuota", "Paga una cuota del crédito activo (baja el saldo y avanza el progreso de pago). Confirmar antes.", {
    creditoId: { type: "number", description: "Índice del crédito activo (opcional; por defecto el primero)." },
  }),

  // ── Engagement ──
  fn("acreditarReferido", "Acredita el premio por referido al monedero.", {}),
  fn("acreditarCashback", "Acredita el cashback del mes al monedero.", {}),

  // ── Sesión / autenticación (ceremonia de 3 pasos) ──
  fn("validarDPI", "Paso 1 de autenticación: valida el número de DPI que envió el usuario contra el registro. NO autentica todavía.", {
    dpi: { type: "string", description: "Número de DPI que envió el usuario (13 dígitos, con o sin espacios)." },
  }, ["dpi"]),
  fn("escanearRostro", "Paso 2 de autenticación: abre la cámara del teléfono para el reconocimiento facial contra RENAP. Llamalo SOLO después de validar el DPI. NO autentica: esperá a que el usuario complete el escaneo.", {}),
  fn("autenticar", "Paso 3 (final) de autenticación: marca la sesión como validada. Llamalo SOLO cuando el usuario confirme que completó el escaneo facial.", {}),
];

// Despacha una tool por nombre. Muta `estado` en sitio y devuelve el resultado.
export function ejecutarTool(nombre: string, args: Record<string, unknown>, estado: Estado): unknown {
  const a = args as never;
  switch (nombre) {
    case "leerSaldo": return op.leerSaldo(estado);
    case "leerCuenta": return op.leerCuenta(estado);
    case "listarMovimientos": return op.listarMovimientos(estado);
    case "buscarServicio": return op.buscarServicio(estado, a);
    case "buscarContacto": return op.buscarContacto(estado, a);
    case "remesaDisponible": return op.remesaDisponible(estado);
    case "datosCredito": return op.datosCredito(estado);
    case "calcularCuota": return op.calcularCuota(estado, a);
    case "calcularCuotaFrecuencia": return op.calcularCuotaFrecuencia(estado, a);
    case "acreditarMonedero": return op.acreditarMonedero(estado, a);
    case "debitarMonedero": return op.debitarMonedero(estado, a);
    case "cobrarRemesa": return op.cobrarRemesa(estado);
    case "pagarServicio": return op.pagarServicio(estado, a);
    case "enviarAContacto": return op.enviarAContacto(estado, a);
    case "recargar": return op.recargar(estado, a);
    case "pagarComercioConSaldo": return op.pagarComercioConSaldo(estado, a);
    case "pagarComercioEnCuotas": return op.pagarComercioEnCuotas(estado, a);
    case "mostrarAnalisisRemesas": return op.mostrarAnalisisRemesas();
    case "mostrarConfigurador": return op.mostrarConfigurador(estado);
    case "mostrarContrato": return op.mostrarContrato(estado);
    case "mostrarDeclaraciones": return op.mostrarDeclaraciones(estado);
    case "crearCredito": return op.crearCredito(estado, a);
    case "generarComprobante": return op.generarComprobante(estado, a);
    case "pagarCuota": return op.pagarCuota(estado, a);
    case "acreditarReferido": return op.acreditarReferido(estado);
    case "acreditarCashback": return op.acreditarCashback(estado);
    case "validarDPI": return op.validarDPI(estado, a);
    case "escanearRostro": return op.escanearRostro();
    case "autenticar": return op.autenticar(estado);
    default: return { error: `tool desconocida: ${nombre}` };
  }
}

// Helper para declarar una tool con menos ruido.
function fn(
  name: string,
  description: string,
  props: Record<string, object>,
  required: string[] = []
): ToolFn {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: { type: "object", properties: props, required, additionalProperties: false },
    },
  };
}
