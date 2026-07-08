// Tipo del estado del mock + generador de semilla. Lo usan tanto el cliente
// (estado inicial / reinicio) como el servidor (ejecución de tools).
// La única fuente de verdad es chispa_mock_data.json.
import semillaJson from "../chispa_mock_data.json";

export type Movimiento = { concepto: string; fecha: string; monto: number };

export type ServicioPendiente = {
  id: string;
  proveedor: string;
  tipo: string;
  identificadorTipo: string;
  identificador: string;
  monto: number;
  vence: string | null;
};

export type Contacto = {
  id: string;
  nombre: string;
  relacion: string;
  telefono: string | null;
};

// ── Crédito estilo ZIGI ──────────────────────────────────────────────────────
// Frecuencia de pago del configurador (semanal/quincenal/mensual).
export type Frecuencia = {
  id: string;              // "mensual" | "quincenal" | "semanal"
  label: string;           // "Mensual"
  mesesPorPeriodo: number; // 1 | 0.5 | 0.25 (para convertir la tasa mensual)
  pagosOpciones: number[]; // ej. [3, 6, 12]
  pagosDefault: number;    // ej. 6
  unidad: string;          // "mes" | "quincena" | "semana"
};

// Declaración obligatoria (T&C, PEP/US/CPE).
export type DeclaracionRequerida = { id: string; texto: string };

// Registro de las declaraciones que hizo el usuario (rastro de auditoría IVE).
export type RegistroDeclaraciones = {
  tyc: boolean;
  pep_us_cpe: boolean;
  ts: string; // ISO timestamp
};

// Un crédito ya desembolsado. Los campos originales se conservan; los nuevos del
// flujo ZIGI son OPCIONALES para no romper el `crearCredito` actual.
export type CreditoActivo = {
  monto: number;
  plazoMeses: number;
  tasaMensual: number;
  cuota: number;
  primeraCuotaVence: string;
  saldoPendiente: number;

  // ── ZIGI (opcionales) ──
  frecuenciaId?: string;      // "mensual" | "quincenal" | "semanal"
  unidad?: string;            // "mes" | "quincena" | "semana"
  pagos?: number;             // número de pagos elegido
  total?: number;             // total a pagar (cuota × pagos)
  intereses?: number;         // total − monto
  pagado?: number;            // acumulado pagado (para "crédito activo")
  firma?: string;             // dataURL de la firma con el dedo
  declaraciones?: RegistroDeclaraciones;
  biometria?: { ok: boolean; ts: string };
};

export type Estado = {
  sesion: { autenticada: boolean; [k: string]: unknown };
  usuario: {
    nombreCompleto: string;
    nombreCuenta: string;
    nombreApellido: string;
    nombreCorto: string;
    dpi: string;
    telefono: string;
    municipio: string;
    ingresoPromedio: number;
    renap: {
      edad: number;
      fechaNacimiento: string;
      lugarNacimiento: string;
      estadoCivil: string;
      nacionalidad: string;
      sexo: string;
    };
  };
  monedero: { numeroCuenta: string; nombre: string; saldo: number };
  tasaCambio: { quetzalPorUsd: number; fuente: string };
  remesa: {
    recurrente: { montoUsd: number; remitente: string; origen: string; frecuencia: string };
    disponible: { montoUsd: number; remitente: string; origen: string } | null;
  };
  credito: {
    // ── originales (se conservan) ──
    lineaAprobada: number;
    tasaMensual: number;
    plazosMeses: number[];
    fechaPrimeraCuota: string;

    // ── ZIGI (nuevos, opcionales para tolerar mocks previos) ──
    montoMin?: number;
    montoMax?: number;
    montoDefault?: number;
    frecuencias?: Frecuencia[];
    frecuenciaDefault?: string;
    fechaDesembolso?: string;
    horaDesembolso?: string;
    metodoPago?: string;
    permitePagoAdelantado?: boolean;
    contratoResumen?: {
      titulo: string;
      formasDePago: string;
      costo: string;
      documentos: string;
    };
    declaracionesRequeridas?: DeclaracionRequerida[];
    infoDeclaraciones?: {
      pep: string;
      us_person: string;
      cpe: string;
    };
  };
  serviciosPendientes: ServicioPendiente[];
  contactos: Contacto[];
  operadoresRecarga: { id: string; nombre: string }[];
  comercio: {
    id: string;
    nombre: string;
    aceptaChispaPay: boolean;
    cobroDemo: { monto: number; cuotas3: number; _nota?: string };
  };
  engagement: {
    codigoReferido: string;
    enlaceReferido: string;
    premioReferido: number;
    cashbackMes: number;
    referidoDemo: { nombre: string };
  };
  movimientosRango: string;
  movimientos: Movimiento[];
  creditos: CreditoActivo[];
};

/** Clon fresco de la semilla. Restaura saldo, remesa, servicios, créditos y sesión. */
export function semilla(): Estado {
  return structuredClone(semillaJson) as unknown as Estado;
}
