# Flujo: Crédito

| | |
|---|---|
| **Código** | `credito` |
| **Nombre** | Crédito |
| **Funcionalidades** | **D1** Solicitud · **D2** Evaluación automática · **D3** Configuración monto/plan · **Confirmación** · **Contrato + firma** · **Declaraciones (IVE)** · **Biometría** · **D4** Desembolso · **Comprobante** |
| **Base de referencia** | Flujo de autorización y desembolso de **ZIGI** (receta de mercado), traducido a conversación WhatsApp. |
| **Copy** | D1 y D2: **validados** (documento §3.3). Del configurador en adelante: **copy nuevo — pendiente de validación** (redactado en tono Chispa). |

> **Esta ficha reemplaza la versión conversacional simple anterior.** Ahora tiene espina regulatoria de banco (declaraciones IVE, contrato firmado, biometría) + transparencia de costo estilo ZIGI, manteniendo el formato de chat y el número de oro validado (Q2,000 / Mensual / 6 pagos → cuota **Q394**).

---

## 1. Secuencia completa

```
D1 solicitud ─▶ D2 evaluación ─▶ D3 configurador (slider + frecuencia + N.º pagos + Total a pagar)
   ─▶ confirmación ─▶ contrato + firma con el dedo ─▶ declaraciones PEP/US/CPE + T&C
   ─▶ biometría (rostro) ─▶ D4 desembolso ─▶ comprobante descargable
```

Decisiones del cliente incorporadas: transparencia de costo (A/#1), declaraciones PEP/CPE/US requisito IVE (#2), contrato con **firma con el dedo** (#3), **biometría para autorizar** (#4), paso de confirmación (#5), comprobante (#6), método de pago débito automático + pago adelantado (#7), configurador tipo app con slider/frecuencia/pagos (#9). Crédito activo + pagar → ver `monedero.md` (#8).

---

## 2. Autenticación (cambia respecto a la versión previa)

La **biometría se hace dentro del flujo, al autorizar** (paso `biometria`), tal como ZIGI. Por eso este flujo **ya no usa la precondición A10**: la captura de rostro en `biometria` autentica la sesión (`autenticar()`) *y* autoriza el préstamo. A10 sigue siendo el gate de los demás flujos (saldo, remesa, pagos).

---

## 3. Copy validado (D1–D2) — literal, no reescribir

| # | Emisor | Texto |
|---|---|---|
| 1 | Usuario | Necesito un préstamo |
| 2 | Chispa | Con gusto, José. Para conocerte mejor, contame: ¿cuál es tu principal fuente de ingresos? |
| 3 | Usuario | Todos los meses recibo una remesa de mi hermano en Estados Unidos |
| 4 | Chispa | ¡Perfecto! Justo veo tus remesas de los últimos meses. Tu ingreso promedio es **Q2,325**, así que calificás hasta **Q3,000**. ¿Cuánto ocupás? |

*(Procedencia: `usuario.nombreCorto`, `usuario.ingresoPromedio`, `credito.lineaAprobada`.)*

---

## 4. Copy nuevo (pendiente de validación) — tono Chispa

**D3 · Configurador**
- Chispa: "Perfecto. Configurá tu préstamo a tu medida:"
- Card **"¿Cuánto necesitás?"** con slider Q100–Q3,000 (default **Q2,000**), selector de **frecuencia** (Semanal / Quincenal / **Mensual**) y **N.º de pagos** (Mensual: 3 / **6** / 12). Muestra en vivo: **Cuota Q394 / mes** y **Total a pagar Q2,364** con nota "Q2,000 + Q364 de intereses (5% mensual)".

**Confirmación**
- Chispa: "Revisá y confirmá tu préstamo:"
- Card **"Confirmá tu préstamo"**: Estás pidiendo **Q2,000** [Editar] · Intereses **Q364** · **Total a pagar Q2,364** · Solicitante **José M. García López** · **6 pagos de Q394** · Primer pago **1 de agosto** · Método: **Débito automático de tu monedero** (podés adelantar pagos) · [ Ver contrato del préstamo → ]

**Contrato + firma**
- Chispa: "Este es tu contrato. Leelo y, si estás de acuerdo, firmalo con tu dedo."
- Card contrato (formas de pago · costo · "te enviamos el pagaré, el plan de pagos y los T&C a tu correo") + **SignaturePad** ("Firmá aquí con tu dedo").

**Declaraciones (IVE)**
- Chispa: "Antes de desembolsar, necesito dos confirmaciones que nos pide la ley:"
- Card con dos casillas: (1) "Confirmo que he leído y acepto los Términos y Condiciones" · (2) "Confirmo que no soy Persona Expuesta Políticamente (PEP), Persona Estadounidense, ni Proveedor del Estado (CPE)". Info expandible: **¿Qué es PEP?** · **¿U.S. Person?** · **¿CPE?**

**Biometría**
- Chispa: "Solo falta validar tu identidad con una foto. Buscá un lugar con buena luz y no te movás." → captura simulada (círculo + progreso) → "¡Identidad confirmada con RENAP!"

**D4 · Desembolso (copy validado, preservado)**
- Chispa: "¡Listo! Deposité **Q2,000** en tu monedero. Tu saldo pasó de Q1,250 a **Q3,250.00**. Tu primera cuota de Q394 vence el 1 de agosto."

**Comprobante**
- Chispa: "Acá está tu comprobante:"
- Card **"Préstamo depositado"**: fecha/hora · **Total a pagar Q2,364** · Monto solicitado **Q2,000** · Facturar a **José Manuel García López** · DPI **2547 89632 0101** · Intereses **Q364** · **6 pagos de Q394** · Forma de pago **Débito mensual automático** · Primera cuota **1 de agosto** · firma del usuario · [ Descargar ] [ Compartir ].

---

## 5. Máquina de estados (declarativa)

```ts
const flujoCredito: Flujo = {
  codigo: "credito",
  nombre: "Crédito",
  funcionalidades: ["D1", "D2", "D3", "D4"],
  // sin precondición A10: la biometría in-flow autentica y autoriza
  disparador: {
    ctaMenu: "menu_credito",
    keywords: ["prestamo", "préstamo", "crédito", "credito", "necesito plata"],
    // burbuja del usuario al iniciar por CTA: "Necesito un préstamo"
  },
  estadoInicial: "solicitud",
  estados: {

    // ── D1 · Solicitud (validado) ────────────────────────────
    solicitud: {
      id: "solicitud", funcionalidad: "D1",
      alEntrar: [
        { tipo: "burbuja", texto: "Con gusto, José. Para conocerte mejor, contame: ¿cuál es tu principal fuente de ingresos?",
          datos: ["usuario.nombreCorto=José"] },
      ],
      respuestasRapidas: [
        { id: "fuente_remesa", label: "Recibo una remesa del exterior",
          insertaBurbujaUsuario: "Todos los meses recibo una remesa de mi hermano en Estados Unidos" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "fuente_remesa" }, irA: "evaluacion" },
        { cuando: { keywords: ["remesa", "hermano", "exterior", "estados unidos", "eeuu"] }, irA: "evaluacion" },
      ],
    },

    // ── D2 · Evaluación (validado) ───────────────────────────
    evaluacion: {
      id: "evaluacion", funcionalidad: "D2",
      alEntrar: [
        { tipo: "burbuja", texto: "¡Perfecto! Justo veo tus remesas de los últimos meses. Tu ingreso promedio es **Q2,325**, así que calificás hasta **Q3,000**. ¿Cuánto ocupás?",
          datos: ["usuario.ingresoPromedio=2325", "credito.lineaAprobada=3000"] },
        { tipo: "burbuja", texto: "Perfecto. Configurá tu préstamo a tu medida:" },
      ],
      transiciones: [{ cuando: { porDefecto: true }, irA: "configurador" }],
    },

    // ── D3 · Configurador (nuevo · #9 + #1) ──────────────────
    configurador: {
      id: "configurador", funcionalidad: "D3",
      // estado de sesión: monto=montoDefault(2000), frecuencia=mensual, pagos=6
      alEntrar: [
        { tipo: "tarjeta", tarjeta: {
            titulo: "¿Cuánto necesitás?",
            slider: { min: "credito.montoMin", max: "credito.montoMax", valor: "credito.montoDefault", paso: 50, formato: "Q0" },
            selectorFrecuencia: { opciones: "credito.frecuencias", valor: "credito.frecuenciaDefault" },
            selectorPagos: { opciones: "según frecuencia.pagosOpciones", valor: "frecuencia.pagosDefault" },
            resumen: {
              cuota: "**{{cuota|Q0}} / {{unidadFrecuencia}}**",     // default: Q394 / mes
              total: "Total a pagar **{{total|Q0}}**",              // default: Q2,364
              nota: "{{monto|Q0}} + {{intereses|Q0}} de intereses (5% mensual)", // Q2,000 + Q364
            },
        }, datos: ["cuota=calcularCuota(monto, pagos, tasaPeriodo)", "total=cuota*pagos", "intereses=total-monto"] },
      ],
      respuestasRapidas: [ { id: "continuar", label: "Continuar" } ],
      esperaTexto: false,
      transiciones: [
        // cambios de slider/frecuencia/pagos re-renderizan el resumen y permanecen en `configurador`
        { cuando: { evento: "cambioConfigurador" }, efectos: [{ op: "recalcularOferta" }], irA: "configurador" },
        { cuando: { respuestaRapida: "continuar" }, irA: "confirmacion" },
      ],
    },

    // ── Confirmación (nuevo · #5 + #1 + #7) ──────────────────
    confirmacion: {
      id: "confirmacion",
      alEntrar: [
        { tipo: "burbuja", texto: "Revisá y confirmá tu préstamo:" },
        { tipo: "tarjeta", tarjeta: {
            titulo: "Confirmá tu préstamo",
            filas: [
              { etiqueta: "Estás pidiendo", valor: "**{{monto|Q2}}**", accion: "Editar" },
              { etiqueta: "Intereses", valor: "**{{intereses|Q2}}**" },
              { etiqueta: "Total a pagar", valor: "**{{total|Q2}}**" },
              { etiqueta: "Solicitante", valor: "**José M. García López**" },
              { etiqueta: "Cantidad de pagos", valor: "**{{pagos}} pagos de {{cuota|Q2}}**" },
              { etiqueta: "Fecha de primer pago", valor: "**{{fechaPrimeraCuota}}**" },
            ],
            metodoPago: "Débito automático de tu monedero · Podés adelantar pagos cuando querás",
            enlaceContrato: "Ver contrato del préstamo",
        }, datos: ["monto/intereses/total/pagos/cuota de la sesión", "credito.fechaPrimeraCuota", "credito.metodoPago", "credito.permitePagoAdelantado"] },
      ],
      respuestasRapidas: [
        { id: "ver_contrato", label: "Ver contrato" },
        { id: "editar", label: "Editar" },
        { id: "confirmar", label: "Confirmar" },
      ],
      transiciones: [
        { cuando: { respuestaRapida: "editar" }, irA: "configurador" },
        { cuando: { respuestaRapida: "ver_contrato" }, irA: "contrato" },
        { cuando: { respuestaRapida: "confirmar" }, irA: "contrato" },
        { cuando: { keywords: ["confirmar", "confirmo", "si", "sí", "dale"] }, irA: "contrato" },
      ],
    },

    // ── Contrato + firma (nuevo · #3) ────────────────────────
    contrato: {
      id: "contrato",
      alEntrar: [
        { tipo: "burbuja", texto: "Este es tu contrato. Leelo y, si estás de acuerdo, firmalo con tu dedo." },
        { tipo: "tarjeta", tarjeta: {
            titulo: "**Contrato del préstamo**",
            contrato: "credito.contratoResumen",   // formasDePago · costo · documentos
            firma: { tipo: "signaturePad", placeholder: "Firmá aquí con tu dedo" },
        }, datos: ["credito.contratoResumen"] },
      ],
      respuestasRapidas: [ { id: "firmar", label: "Firmar y continuar", requiereFirma: true } ],
      transiciones: [
        // el efecto guarda el trazo de la firma (dataURL en memoria)
        { cuando: { respuestaRapida: "firmar" }, efectos: [{ op: "firmarContrato" }], irA: "declaraciones" },
      ],
    },

    // ── Declaraciones IVE (nuevo · #2) ───────────────────────
    declaraciones: {
      id: "declaraciones",
      alEntrar: [
        { tipo: "burbuja", texto: "Antes de desembolsar, necesito dos confirmaciones que nos pide la ley:" },
        { tipo: "tarjeta", tarjeta: {
            checklist: "credito.declaracionesRequeridas",  // tyc + pep_us_cpe
            infoExpandible: { pep: "credito.infoDeclaraciones.pep", us_person: "credito.infoDeclaraciones.us_person", cpe: "credito.infoDeclaraciones.cpe" },
        }, datos: ["credito.declaracionesRequeridas", "credito.infoDeclaraciones"] },
      ],
      respuestasRapidas: [ { id: "declarar", label: "Acepto y declaro", requiereChecklistCompleto: true } ],
      transiciones: [
        // registra declaraciones con timestamp (rastro de auditoría)
        { cuando: { respuestaRapida: "declarar" }, efectos: [{ op: "registrarDeclaraciones" }], irA: "biometria" },
      ],
    },

    // ── Biometría (nuevo · #4) ───────────────────────────────
    biometria: {
      id: "biometria",
      alEntrar: [
        { tipo: "burbuja", texto: "Solo falta validar tu identidad con una foto. Buscá un lugar con buena luz y no te movás." },
        { tipo: "tarjeta", tarjeta: { biometria: { tipo: "capturaRostro", estilo: "circuloProgreso" } } },
      ],
      respuestasRapidas: [ { id: "validar_rostro", label: "Validar mi rostro" } ],
      transiciones: [
        { cuando: { respuestaRapida: "validar_rostro" },
          efectos: [{ op: "capturarBiometria" }, { op: "autenticar" }], irA: "rostroOk" },
      ],
    },

    rostroOk: {
      id: "rostroOk",
      alEntrar: [ { tipo: "tarjeta", tarjeta: { titulo: "**¡Identidad confirmada con RENAP!**" } } ],
      transiciones: [{ cuando: { porDefecto: true }, irA: "desembolso" }],
    },

    // ── D4 · Desembolso (copy validado, parametrizado) ───────
    desembolso: {
      id: "desembolso", funcionalidad: "D4",
      alEntrar: [
        { tipo: "burbuja",
          // en defaults renderiza byte-idéntico al validado: "Deposité Q2,000 ... de Q1,250 a Q3,250.00 ... Q394 ... 1 de agosto"
          texto: "¡Listo! Deposité **{{monto|Q0}}** en tu monedero. Tu saldo pasó de {{saldoAntes|Q0}} a **{{saldo|Q2}}**. Tu primera cuota de {{cuota|Q0}} vence el {{fechaPrimeraCuota}}.",
          datos: ["monto=2000", "saldoAntes=1250", "saldo=3250.00", "cuota=394", "fechaPrimeraCuota=1 de agosto"] },
      ],
      // efectos al entrar (disparados por rostroOk): crea el crédito con toda la evidencia y acredita
      efectosAlEntrar: [
        { op: "crearCredito", monto: "$monto", frecuencia: "$frecuencia", pagos: "$pagos",
          tasaMensual: 0.05, cuota: "$cuota", total: "$total", intereses: "$intereses",
          primeraCuotaVence: "credito.fechaPrimeraCuota", metodoPago: "credito.metodoPago",
          firma: "$firmaDataURL", declaraciones: "$declaracionesRegistradas", biometria: "$biometriaOk" },
        { op: "acreditarMonedero", monto: "$monto", concepto: "Préstamo abonado" },
      ],
      transiciones: [{ cuando: { porDefecto: true }, irA: "comprobante" }],
    },

    // ── Comprobante (nuevo · #6) ─────────────────────────────
    comprobante: {
      id: "comprobante", final: true,
      alEntrar: [
        { tipo: "burbuja", texto: "Acá está tu comprobante:" },
        { tipo: "tarjeta", tarjeta: {
            titulo: "**Préstamo depositado**",
            fechaHora: "{{fechaDesembolso}} · {{horaDesembolso}}",
            destacado: { etiqueta: "Total a pagar", valor: "**{{total|Q2}}**", sub: "Monto solicitado {{monto|Q0}}" },
            filas: [
              { etiqueta: "Facturar a", valor: "José Manuel García López" },
              { etiqueta: "DPI", valor: "2547 89632 0101" },
              { etiqueta: "Intereses", valor: "{{intereses|Q2}}" },
              { etiqueta: "Cantidad de cuotas", valor: "{{pagos}} pagos de {{cuota|Q2}}" },
              { etiqueta: "Forma de pago", valor: "Débito mensual automático" },
              { etiqueta: "Fecha de primera cuota", valor: "{{fechaPrimeraCuota}}" },
            ],
            firma: "$firmaDataURL",
            acciones: [ { label: "Descargar", op: "descargarComprobante" }, { label: "Compartir", op: "compartirComprobante" } ],
        }, datos: ["credito.fechaDesembolso", "credito.horaDesembolso", "usuario.nombreCompleto", "usuario.dpi", "firma guardada"] },
      ],
      transiciones: [],
    },

  },
};
```

---

## 6. Cálculo de cuota (con frecuencia · defensa del realismo)

```
tasaPeriodo = credito.tasaMensual × frecuencia.mesesPorPeriodo
cuota       = calcularCuota(monto, pagos, tasaPeriodo)   // amortización francesa
total       = cuota × pagos
intereses   = total − monto
```

Verificación del **camino de oro** (monto Q2,000, Mensual → mesesPorPeriodo 1 → tasaPeriodo 5%):

| Pagos | Cuota | Total | Intereses |
|---|---|---|---|
| 3 | Q734 | Q2,202 | Q202 |
| **6 (default)** | **Q394** | **Q2,364** | **Q364** |
| 12 | Q226 | Q2,712 | Q712 |

El default reproduce la cuota validada **Q394**. Semanal/Quincenal recalculan con su `tasaPeriodo` (2.5% quincenal, 1.25% semanal); esos valores no son copy validado, pero son deterministas y defendibles.

---

## 7. Efectos sobre el mock

| Momento | Operación | Resultado |
|---|---|---|
| Firmar contrato | `firmarContrato()` | guarda el trazo de firma (dataURL en memoria) |
| Declarar | `registrarDeclaraciones()` | guarda `{ tyc:true, pep_us_cpe:true, ts }` (rastro de auditoría) |
| Biometría | `capturarBiometria()` + `autenticar()` | marca rostro validado; `sesion.autenticada=true` |
| Desembolso | `crearCredito({...})` | agrega a `creditos[]` con monto, frecuencia, pagos, cuota, total, saldoPendiente=total, pagado=0, firma, declaraciones, biometria |
| Desembolso | `acreditarMonedero(monto,"Préstamo abonado")` | saldo 1250 → **3250.00**; agrega movimiento "Préstamo abonado +Q2,000.00" |

Reiniciar demo revierte saldo, vacía `creditos[]` y limpia sesión/firma/declaraciones.

---

## 8. Componentes de UI nuevos (ver `02-design-system.md`)

`Slider`, `SelectorSegmentado` (frecuencia y N.º de pagos), `SignaturePad` (canvas de firma con el dedo), `BiometricCapture` (círculo + progreso, simulado), `ContratoCard`, `DeclaracionesCard` (checklist + info expandible), `ComprobanteCard` (descargable/compartible, PDF simulado).

---

## 9. Criterios de aceptación

1. D1 y D2 conservan su copy validado carácter por carácter.
2. El configurador abre con Q2,000 / Mensual / 6 pagos y muestra **Cuota Q394**, **Total a pagar Q2,364**, "Q2,000 + Q364 de intereses"; mover slider/frecuencia/pagos recalcula en vivo.
3. La confirmación resume monto, intereses, total, 6 pagos de Q394, primer pago 1 de agosto y método de pago (débito automático + pago adelantado), con acceso al contrato.
4. El contrato se muestra y **se firma con el dedo** (canvas real); sin firma no avanza. La firma aparece luego en el comprobante.
5. Las **declaraciones PEP/US/CPE + T&C** son obligatorias (no avanza sin ambas), con info expandible; se registran con timestamp (auditoría IVE).
6. La **biometría** (simulada) autoriza el préstamo y autentica la sesión; no requiere A10 aparte.
7. El desembolso reproduce el copy validado en el camino de oro (saldo 1250 → 3250.00, cuota Q394, 1 de agosto) y el saldo **persiste** (visible en Monedero).
8. El **comprobante** muestra fecha/hora, total, monto, DPI, intereses, cuotas, forma de pago, primera cuota y la firma; Descargar/Compartir simulan PDF.
9. Tras el desembolso, el crédito queda **activo y pagable** desde Monedero (ver `monedero.md`, #8).
10. Determinista; firma y rostro son simulados (sin cámara ni backend).
