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

export type CreditoActivo = {
  monto: number;
  plazoMeses: number;
  tasaMensual: number;
  cuota: number;
  primeraCuotaVence: string;
  saldoPendiente: number;
};

export type Estado = {
  sesion: { autenticada: boolean; [k: string]: unknown };
  usuario: {
    nombreCompleto: string;
    nombreCuenta: string;
    nombreCorto: string;
    dpi: string;
    telefono: string;
    municipio: string;
    ingresoPromedio: number;
  };
  monedero: { numeroCuenta: string; nombre: string; saldo: number };
  tasaCambio: { quetzalPorUsd: number; fuente: string };
  remesa: {
    recurrente: { montoUsd: number; remitente: string; origen: string; frecuencia: string };
    disponible: { montoUsd: number; remitente: string; origen: string } | null;
  };
  credito: {
    lineaAprobada: number;
    tasaMensual: number;
    plazosMeses: number[];
    fechaPrimeraCuota: string;
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
