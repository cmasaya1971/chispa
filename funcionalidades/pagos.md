# Flujo: Pagos y transferencias

| | |
|---|---|
| **Código** | `pagos` |
| **Nombre** | Pagos y transferencias |
| **Funcionalidades** | **E4** Pago de servicios · **E1** Envío a contactos · **E5** Recargas |
| **Precondición** | `requiereAuth` (gate `acceso`/A10) — pagar/enviar es acción sensible |
| **Copy** | Validado (E4 y E1) . Fuente: §3.3 "Pagos — E4·E1·E5" (imagen). E5 sigue el mismo patrón (ver §5). |

---

## 1. Lógica (§3.3)

El usuario pide pagar un servicio; Chispa pide el identificador (contador, NIS o teléfono), consulta el monto real del recibo y verifica el saldo antes de pagar. El envío a contactos (**E1**) y las recargas (**E5**) siguen el mismo patrón.

---

## 2. Copy validado — transcripción literal

**E4 — pago de servicio (luz / EEGSA):**

| # | Emisor | Texto |
|---|---|---|
| 1 | Usuario | Quiero pagar la luz |
| 2 | Chispa | Con gusto. Pasame tu número de contador de EEGSA. |
| 3 | Usuario | N-8842137 |
| 4 | Chispa (tarjeta) | Encontré tu recibo:<br>EEGSA · contador N-8842137<br>Monto ····· **Q135.00**<br>Vence ····· **10 jul**<br>Tu saldo es **Q1,250**, alcanza sin problema. ¿Lo pago? |
| 5 | *(botón)* | **Pagar Q135** |
| 6 | Chispa | ¡Pagado! Tu recibo de EEGSA quedó al día. Saldo: **Q1,115.00**. |

**E1 — envío a contacto:**

| # | Emisor | Texto |
|---|---|---|
| 7 | Usuario | Ahora mandale Q100 a mi hermana |
| 8 | Chispa | Le envié **Q100** a Ana García (5548-9921). Le llegó al instante. Tu saldo quedó en **Q1,015.00**. |

**Procedencia:** recibo EEGSA (`Q135.00`, `10 jul`, `N-8842137`) del mock. "Tu saldo es **Q1,250**" = `{{saldo|Q0}}` vivo. "Saldo: **Q1,115.00**" = `{{saldo|Q2}}` tras pagar (1250−135). "Ana García (5548-9921)" del mock. `Q100` = monto del envío. "**Q1,015.00**" = `{{saldo|Q2}}` tras enviar (1115−100).

---

## 3. Máquina de estados

```ts
const flujoPagos: Flujo = {
  codigo: "pagos",
  nombre: "Pagos y transferencias",
  funcionalidades: ["E4", "E1", "E5"],
  precondiciones: [{ tipo: "requiereAuth", flujoGate: "acceso" }],
  disparador: {
    ctaMenu: "menu_pagos",
    keywords: ["pagar", "pago", "luz", "agua", "recibo", "enviar", "mandar", "recarga"],
  },
  estadoInicial: "pedirContador",
  estados: {

    // ── E4 · Pago de servicio ────────────────────────────────
    pedirContador: {
      id: "pedirContador",
      funcionalidad: "E4",
      alEntrar: [
        { tipo: "burbuja", texto: "Con gusto. Pasame tu número de contador de EEGSA." },
      ],
      respuestasRapidas: [
        { id: "contador_eegsa", label: "N-8842137", insertaBurbujaUsuario: "N-8842137" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "contador_eegsa" }, irA: "mostrarRecibo" },
        { cuando: { keywords: ["8842137", "n-8842137"] }, irA: "mostrarRecibo" },
      ],
    },

    mostrarRecibo: {
      id: "mostrarRecibo",
      funcionalidad: "E4",
      alEntrar: [
        { tipo: "tarjeta", tarjeta: {
            pie: "Encontré tu recibo:",
            filas: [
              { etiqueta: "EEGSA · contador N-8842137", valor: "" },
              { etiqueta: "Monto", valor: "**Q135.00**" },
              { etiqueta: "Vence", valor: "**10 jul**" },
            ],
            pieExtra: "Tu saldo es **{{saldo|Q0}}**, alcanza sin problema. ¿Lo pago?",
        }, datos: ["serviciosPendientes[eegsa]: monto 135.00, vence 10 jul", "saldo vivo"] },
      ],
      respuestasRapidas: [
        { id: "pagar_eegsa", label: "Pagar Q135" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "pagar_eegsa" }, efectos: [{ op: "pagarServicio", id: "eegsa" }], irA: "pagado" },
        { cuando: { keywords: ["pagar", "pagalo", "págalo", "si", "sí", "dale"] }, efectos: [{ op: "pagarServicio", id: "eegsa" }], irA: "pagado" },
      ],
    },

    pagado: {
      id: "pagado",
      funcionalidad: "E4",
      alEntrar: [
        { tipo: "burbuja",
          texto: "¡Pagado! Tu recibo de EEGSA quedó al día. Saldo: **{{saldo|Q2}}**.",
          datos: ["saldo vivo tras pagar = 1115.00 en semilla"] },
      ],
      // ofrece continuar; el envío (E1) puede iniciarse por texto libre
      respuestasRapidas: [
        { id: "enviar_dinero", label: "Enviar dinero a un contacto" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "enviar_dinero" }, irA: "envio" },
        { cuando: { keywords: ["mandale", "manda", "enviar", "envia", "hermana", "ana", "contacto"] }, irA: "envio" },
      ],
    },

    // ── E1 · Envío a contacto ────────────────────────────────
    envio: {
      id: "envio",
      funcionalidad: "E1",
      final: true,
      // el motor parsea monto y contacto del texto "mandale Q100 a mi hermana"
      alEntrar: [
        { tipo: "burbuja",
          texto: "Le envié **Q100** a Ana García (5548-9921). Le llegó al instante. Tu saldo quedó en **{{saldo|Q2}}**.",
          datos: ["monto=100", "contacto=Ana García 5548-9921", "saldo vivo tras enviar = 1015.00 en semilla"] },
      ],
      // efecto aplicado en la transición de entrada: debitarMonedero(100) + enviarAContacto
      transiciones: [],
    },

  },
};
```

> Nota de implementación: el efecto `enviarAContacto("ana", 100)` se aplica al **entrar** a `envio` (transición disparada por el mensaje del usuario "mandale Q100 a mi hermana"). El motor resuelve "mi hermana" → Ana vía `buscarContacto`, y el monto 100 del texto.

---

## 4. Efectos sobre el mock

| Efecto | Operación | Resultado |
|---|---|---|
| Pagar EEGSA | `pagarServicio("eegsa")` | saldo −Q135 (1250 → **1115.00**); quita EEGSA de `serviciosPendientes`; agrega movimiento |
| Enviar a Ana | `enviarAContacto("ana", 100)` | saldo −Q100 (1115 → **1015.00**); agrega movimiento "Envío a Ana García" |

---

## 5. E5 · Recargas (mismo patrón, no ilustrado en la imagen)

La imagen valida E4 + E1. E5 replica el patrón sobre `operadoresRecarga` (Tigo aparece en el historial a Q50):
- Usuario: "Quiero una recarga de Tigo de Q50" → Chispa confirma operador y monto, verifica saldo, `recargar("tigo", 50)`, comprueba y avisa el nuevo saldo.
- El copy de E5 **no está validado literal**; usar el mismo registro/tono (§ CLAUDE.md 6). **Marcar para validación** antes de darlo por cerrado.

---

## 6. Criterios de aceptación

1. "Quiero pagar la luz" corre el gate si aplica y pide el contador de EEGSA.
2. Con `N-8842137` muestra el recibo real: **Q135.00**, vence **10 jul**, y confirma que el saldo (`{{saldo|Q0}}`) alcanza.
3. Al pagar, el saldo baja a **Q1,115.00** (vivo) y EEGSA sale de pendientes.
4. "Mandale Q100 a mi hermana" resuelve a Ana García (5548-9921), baja el saldo a **Q1,015.00** y lo confirma.
5. Los saldos encadenan correctamente (1250 → 1115 → 1015) y persisten.
6. Copy de E4 y E1 idéntico al validado. E5 marcado como pendiente de validación.
