# Flujo: Chispa Pay

| | |
|---|---|
| **Código** | `chispapay` |
| **Nombre** | Chispa Pay |
| **Funcionalidades** | **E7** Pago por QR · **E8** Pago por enlace · **E9** Pago con saldo o en cuotas |
| **Precondición** | `requiereAuth` (gate `acceso`/A10) — pagar es acción sensible |
| **Copy** | Validado. Fuente: §3.3 "Chispa Pay — E7·E8·E9" (imagen). |

---

## 1. Lógica (§3.3)

El usuario escanea el QR o abre el enlace del comercio (**E7/E8**), ve el cobro y elige pagar con saldo o en cuotas (**E9**). En cuotas usa su línea de crédito; el comercio recibe su dinero al instante.

---

## 2. Copy validado — transcripción literal

| # | Emisor | Texto |
|---|---|---|
| 1 | Usuario *(acción)* | Escaneó el QR del comercio |
| 2 | Chispa (tarjeta) | Vas a pagar a **Tienda La Bendición**.<br>Monto ····· **Q450.00**<br>¿Cómo lo pagás? |
| 3 | *(botones)* | Con saldo **Q1,250 disponible** · En 3 cuotas **Q162 / mes** |
| 4 | Usuario | En 3 cuotas |
| 5 | Chispa | ¡Listo! Pagaste **Q450** a Tienda La Bendición. El comercio ya recibió su dinero. Vas a pagar **3 cuotas de Q162**, con tu línea de crédito. |

**Procedencia:** `Tienda La Bendición`, `Q450.00`, `Q162` = `comercio` + `comercio.cobroDemo` (monto 450, `cuotas3` 162 **literal, no recalcular**). "**Q1,250 disponible**" = `{{saldo|Q0}}` vivo.

---

## 3. Máquina de estados

```ts
const flujoChispaPay: Flujo = {
  codigo: "chispapay",
  nombre: "Chispa Pay",
  funcionalidades: ["E7", "E8", "E9"],
  precondiciones: [{ tipo: "requiereAuth", flujoGate: "acceso" }],
  disparador: {
    ctaMenu: "menu_chispapay",     // simula escanear QR / abrir enlace
    keywords: ["qr", "pagar comercio", "chispa pay", "escanear", "enlace de pago"],
    // burbuja del usuario al iniciar por QR: "Escaneó el QR del comercio"
  },
  estadoInicial: "cobro",
  estados: {

    // ── E7/E8 · Cobro presentado ─────────────────────────────
    cobro: {
      id: "cobro",
      funcionalidad: "E7",
      alEntrar: [
        { tipo: "tarjeta", tarjeta: {
            pie: "Vas a pagar a **Tienda La Bendición**.",
            filas: [ { etiqueta: "Monto", valor: "**Q450.00**" } ],
            pieExtra: "¿Cómo lo pagás?",
        }, datos: ["comercio.nombre=Tienda La Bendición", "comercio.cobroDemo.monto=450.00"] },
      ],
      respuestasRapidas: [
        { id: "con_saldo", label: "Con saldo · {{saldo|Q0}} disponible" },
        { id: "en_cuotas", label: "En 3 cuotas · Q162 / mes", insertaBurbujaUsuario: "En 3 cuotas" },
      ],
      esperaTexto: true,
      transiciones: [
        // E9 · con saldo (ramal alterno)
        { cuando: { respuestaRapida: "con_saldo" },
          efectos: [{ op: "pagarComercioConSaldo", monto: 450 }], irA: "pagadoSaldo" },
        // E9 · en cuotas (CAMINO VALIDADO)
        { cuando: { respuestaRapida: "en_cuotas" },
          efectos: [{ op: "pagarComercioEnCuotas", monto: 450, cuotas: 3, cuotaMensual: 162 }], irA: "pagadoCuotas" },
        { cuando: { keywords: ["cuotas", "3 cuotas", "en cuotas", "a cuotas"] },
          efectos: [{ op: "pagarComercioEnCuotas", monto: 450, cuotas: 3, cuotaMensual: 162 }], irA: "pagadoCuotas" },
        { cuando: { keywords: ["saldo", "con saldo", "de contado"] },
          efectos: [{ op: "pagarComercioConSaldo", monto: 450 }], irA: "pagadoSaldo" },
      ],
    },

    // ── E9 · Pagado en cuotas (validado) ─────────────────────
    pagadoCuotas: {
      id: "pagadoCuotas",
      funcionalidad: "E9",
      final: true,
      alEntrar: [
        { tipo: "burbuja",
          texto: "¡Listo! Pagaste **Q450** a Tienda La Bendición. El comercio ya recibió su dinero. Vas a pagar **3 cuotas de Q162**, con tu línea de crédito.",
          datos: ["cuotas3=162 (literal)", "saldo NO cambia: usa línea de crédito"] },
      ],
      transiciones: [],
    },

    // ── E9 · Pagado con saldo (ramal alterno, no validado literal) ──
    pagadoSaldo: {
      id: "pagadoSaldo",
      funcionalidad: "E9",
      final: true,
      alEntrar: [
        { tipo: "burbuja",
          texto: "¡Listo! Pagaste **Q450** a Tienda La Bendición. El comercio ya recibió su dinero. Tu saldo quedó en **{{saldo|Q2}}**.",
          datos: ["saldo vivo tras pagar = 800.00 en semilla (1250-450)"] },
      ],
      transiciones: [],
    },

  },
};
```

---

## 4. Efectos sobre el mock

| Efecto | Operación | Resultado |
|---|---|---|
| En cuotas (validado) | `pagarComercioEnCuotas(450, 3, 162)` | **saldo NO cambia** (línea de crédito); registra crédito de consumo y cobro al comercio |
| Con saldo (alterno) | `pagarComercioConSaldo(450)` | saldo −Q450 (1250 → **800.00**); agrega movimiento "Compra · Tienda La Bendición" |

---

## 5. Notas del molde

- **`Q162` es validado literal.** La cuota de 3 meses de Q450 NO se calcula con el 5% del crédito (eso daría ~Q165). Se lee de `comercio.cobroDemo.cuotas3`. No recalcular.
- El camino validado es **"En 3 cuotas"** (no toca el saldo). El ramal "Con saldo" es coherente pero su copy final **no está validado literal**; marcar si se va a mostrar.
- E7 (QR) y E8 (enlace) llegan al mismo estado `cobro`; cambia solo cómo se dispara (escanear vs. abrir enlace). Para el demo, un botón "Escanear QR" simula el escaneo.

---

## 6. Criterios de aceptación

1. Iniciar Chispa Pay (simular QR/enlace) corre el gate si aplica y muestra el cobro de **Q450.00** a **Tienda La Bendición**.
2. Los botones muestran "Con saldo **{{saldo|Q0}} disponible**" y "En 3 cuotas **Q162 / mes**".
3. Elegir "En 3 cuotas" reproduce el copy validado ("**3 cuotas de Q162**, con tu línea de crédito") y **no** modifica el saldo del monedero.
4. `Q162` sale del mock literal, sin recálculo.
5. Copy del camino en cuotas idéntico al validado.
