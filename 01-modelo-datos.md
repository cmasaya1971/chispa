# 01 · Modelo de datos

`chispa_mock_data.json` es la **única fuente de verdad** en runtime. Se carga en memoria al iniciar la app y todas las operaciones lo leen y lo mutan. Este documento define su forma y las operaciones que las fichas invocan.

---

## 1. Carga y reinicio

- Al iniciar: se clona el JSON semilla a un estado en memoria (`estado`).
- **Reiniciar demo:** vuelve a clonar la semilla → `estado = clon(semilla)`. Restaura saldo, remesa disponible, servicios pendientes, créditos y `sesion.autenticada = false`.
- Nunca se escribe al archivo; toda mutación es en memoria y dura la sesión.

---

## 2. Forma del estado

Ver `chispa_mock_data.json`. Bloques clave:

| Bloque | Contenido |
|---|---|
| `sesion` | Semilla: `{ autenticada }`. En runtime, el flujo de crédito agrega estado de trabajo: `montoSolicitado`, `frecuencia`, `pagos`, `cuota`, `total`, `intereses`, `firma` (dataURL), `declaraciones`, `biometria`. Se limpian al reiniciar. |
| `usuario` | nombre (completo / cuenta / corto), DPI, teléfono, municipio, `ingresoPromedio`. |
| `monedero` | `numeroCuenta`, `nombre`, **`saldo`** (el número que muta en toda la demo). |
| `tasaCambio` | `quetzalPorUsd` (7.62), fuente Banguat. |
| `remesa` | `recurrente` (perfil) y `disponible` (la que se puede cobrar; pasa a `null` al cobrar). |
| `credito` | `lineaAprobada`, `tasaMensual`, `plazosMeses`, `fechaPrimeraCuota`. |
| `serviciosPendientes[]` | recibos por pagar (EEGSA, EMPAGUA) con identificador y monto. |
| `contactos[]` | Ana García (con teléfono), Luis Pérez. |
| `operadoresRecarga[]` | Tigo. |
| `comercio` | Tienda La Bendición + `cobroDemo` (monto 450, `cuotas3` 162 **literal**). |
| `engagement` | código/enlace de referido, `premioReferido` 30, `cashbackMes` 12. |
| `movimientos[]` | historial (16 al 30 jun). Débitos negativos, créditos positivos. |
| `creditos[]` | vacío en la semilla; se llena al desembolsar. |

---

## 3. Formato de moneda (crítico para el copy exacto)

El copy validado **no es uniforme**: el mismo valor aparece a veces con 0 decimales y a veces con 2. Por eso hay **dos formatters** y cada frase declara cuál usa:

| Formatter | Ejemplo | Dónde aparece (validado) |
|---|---|---|
| `fmtQ0(n)` → `Q1,250` | sin decimales, coma de miles | "Tu saldo es **Q1,250**…", "…pasó de Q1,250 a…", "**Q1,250 disponible**" |
| `fmtQ2(n)` → `Q1,250.00` | 2 decimales, coma de miles | "Saldo: **Q1,115.00**", "…a **Q3,250.00**", "Saldo disponible Q1,250.00" |

**Regla de oro del saldo (resuelve mutación + copy exacto):**
Todo monto de **saldo** en el copy se interpola del saldo vivo (`estado.monedero.saldo`) con el formatter que la frase validada usa. En el camino semilla (saldo = 1250) el render es **byte-idéntico** al validado; si el usuario encadena flujos, el número sigue siendo correcto. Los demás números (ingreso, línea, cuotas fijas, montos de recibo) son literales del mock.

> En las fichas, los tokens de saldo vivo se escriben `{{saldo|Q0}}` o `{{saldo|Q2}}`. Todo lo demás va literal.

---

## 4. Operaciones (lo que invocan las fichas vía `efectos`)

Puras sobre `estado`; deterministas; sin red.

### Lectura
- `leerSaldo()` → `estado.monedero.saldo`
- `leerCuenta()` → `{ titular: usuario.nombreCuenta, cuenta: monedero.numeroCuenta, saldo }`
- `listarMovimientos()` → `estado.movimientos` (con `estado.movimientosRango`)
- `buscarServicio(identificador)` → servicio en `serviciosPendientes` que calce por `identificador`
- `buscarContacto(texto)` → contacto por nombre/relación (match laxo: "mi hermana" → Ana)
- `remesaDisponible()` → `estado.remesa.disponible` (o `null`)

### Mutación de saldo (y registro en movimientos)
- `acreditarMonedero(monto, concepto, fecha?)` → `saldo += monto`; antepone `{concepto, fecha: hoy, monto:+monto}` a `movimientos`
- `debitarMonedero(monto, concepto, fecha?)` → `saldo -= monto`; antepone movimiento `-monto`
- `saldoAlcanza(monto)` → `saldo >= monto`

### Crédito (flujo estilo ZIGI: configurar → autorizar → desembolsar)
- `tasaPeriodo(frecuencia)` → `credito.tasaMensual × frecuencia.mesesPorPeriodo` (Mensual 5%, Quincenal 2.5%, Semanal 1.25%).
- `calcularCuota(P, n, i)` → amortización francesa: `P·i / (1 − (1+i)^(−n))`, redondeo a entero Q. Con `i = tasaPeriodo`.
  Verificado (Mensual, i=5%): `calcularCuota(2000,3,0.05)=734`, `(2000,6,0.05)=394`, `(2000,12,0.05)=226`.
- `recalcularOferta()` → recalcula `cuota`, `total = cuota×pagos`, `intereses = total−monto` cada vez que cambia monto/frecuencia/pagos en el configurador.
- `firmarContrato(dataURL)` → guarda el trazo de la firma (imagen en memoria) en `sesion.firma`.
- `registrarDeclaraciones()` → guarda `sesion.declaraciones = { tyc:true, pep_us_cpe:true, ts: <timestamp> }` (rastro de auditoría para IVE).
- `capturarBiometria()` → marca `sesion.biometria = { ok:true, ts }` (captura simulada, sin cámara).
- `crearCredito({ monto, frecuencia, pagos, tasaMensual, cuota, total, intereses, primeraCuotaVence, metodoPago, firma, declaraciones, biometria })` → agrega a `creditos[]` con `saldoPendiente = total`, `pagado = 0`, y toda la evidencia de autorización (firma, declaraciones, biometría).
- `pagarCuota(creditoId)` → `debitarMonedero(cuota, "Pago de cuota crédito")`; `pagado += cuota`; `saldoPendiente -= cuota` (para #8, ver `monedero.md`).
- `descargarComprobante()` / `compartirComprobante()` → acciones simuladas (PDF), sin backend.

### Remesa
- `cobrarRemesa()` → toma `remesa.disponible`, calcula `Q = montoUsd × tasaCambio.quetzalPorUsd`, `acreditarMonedero(Q, "Remesa de "+remitente)`, pone `remesa.disponible = null`. (US$300 × 7.62 = Q2,286.00)

### Servicios / envíos / recargas
- `pagarServicio(id)` → `debitarMonedero(servicio.monto, "Pago de "+tipo+" · "+proveedor)`; quita de `serviciosPendientes`.
- `enviarAContacto(contactoId, monto)` → `debitarMonedero(monto, "Envío a "+nombre)`.
- `recargar(operadorId, monto)` → `debitarMonedero(monto, "Recarga · "+operador)`.

### Chispa Pay
- `pagarComercioConSaldo(monto)` → `debitarMonedero(monto, "Compra · "+comercio.nombre)`.
- `pagarComercioEnCuotas(monto, cuotas, cuotaMensual)` → **no toca el saldo** (usa línea de crédito); registra el cobro al comercio y agrega un crédito de consumo. La cuota es el valor validado del mock, no se recalcula.

### Engagement
- `acreditarReferido()` → `acreditarMonedero(engagement.premioReferido, "Premio referido")` (Q30)
- `acreditarCashback()` → `acreditarMonedero(engagement.cashbackMes, "Cashback")` (Q12)

### Sesión
- `autenticar()` → `sesion.autenticada = true`
- `reiniciarDemo()` → `estado = clon(semilla)`

---

## 5. Nota de consistencia (para el reviewer)

Los números del mock están cruzados para que la demo cuadre:

- Remesa histórica 28 jun = US$300 × Q7.62 = **Q2,286.00** (aparece en movimientos y en el flujo de remesa).
- `ingresoPromedio` (Q2,325) es el promedio para evaluar crédito; distinto del monto de una remesa puntual (Q2,286). Ambos coexisten a propósito.
- Servicios pendientes (EEGSA Q135 vence 10 jul, EMPAGUA Q96) son recibos **por pagar**; los `-Q120`/`-Q96` en movimientos son pagos **pasados**. No se confunden.
- `comercio.cobroDemo.cuotas3 = 162` es validado; equivale a ~4%/mes, no al 5% del crédito. Se guarda literal.
