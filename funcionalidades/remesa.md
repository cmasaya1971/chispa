# Flujo: Remesa

| | |
|---|---|
| **Código** | `remesa` |
| **Nombre** | Remesa |
| **Funcionalidades** | **C1** Consulta de remesa · **C3** Canje a quetzales (acredita+convierte) · **C5** Historial |
| **Precondición** | `requiereAuth` (gate `acceso`/A10) — cobrar es acción sensible |
| **Copy** | Validado. Fuente: §3.3 "Remesa — C1·C3·C5" (imagen). |

---

## 1. Lógica (§3.3)

Precondición: la cañería del corredor (GyT como institución pagadora) y el usuario con DPI y teléfono asociados. El usuario pregunta si tiene una remesa; Chispa consulta el corredor, y si hay, propone el canje a la tasa Banguat. Al aceptar, se acredita y convierte a quetzales (**C1 + C3**) y queda en el historial (**C5**).

---

## 2. Copy validado — transcripción literal

| # | Emisor | Texto |
|---|---|---|
| 1 | Usuario | ¿Tengo alguna remesa disponible? |
| 2 | Chispa | **¡Sí, José, tenés una!** Recibiste una remesa de **US$300.00** de parte de **Rubén García**, desde Estados Unidos. ¿La cobramos? |
| 3 | Chispa (tarjeta) | Te la cambio a la tasa del día del Banguat: **Q7.62** por dólar.<br>US$300 × Q7.62 ····· **Q2,286.00**<br>Tu saldo pasaría a ····· **Q3,536.00** |
| 4 | *(botones)* | **Sí, cobrarla** · **Ver detalle** |
| 5 | Usuario | Sí, cóbrala |
| 6 | Chispa | ¡Listo, José! Acredité **Q2,286** a tu monedero. Tu saldo ahora es **Q3,536.00**. Ya quedó en tu historial de remesas. |

**Procedencia:** `US$300.00`, `Rubén García` = `remesa.disponible`. `Q7.62` = `tasaCambio.quetzalPorUsd`. `Q2,286.00` = 300 × 7.62. `Q3,536.00` = saldo vivo tras acreditar = `{{saldo|Q2}}` (1250 + 2286). `Q2,286` (acreditado) = fmtQ0 del monto convertido.

---

## 3. Máquina de estados

```ts
const flujoRemesa: Flujo = {
  codigo: "remesa",
  nombre: "Remesa",
  funcionalidades: ["C1", "C3", "C5"],
  precondiciones: [{ tipo: "requiereAuth", flujoGate: "acceso" }],
  disparador: {
    ctaMenu: "menu_remesa",
    keywords: ["remesa", "envío del exterior", "me mandaron", "dólares", "dolares"],
  },
  estadoInicial: "consulta",
  estados: {

    // ── C1 · Consulta ────────────────────────────────────────
    consulta: {
      id: "consulta",
      funcionalidad: "C1",
      alEntrar: [
        { tipo: "burbuja",
          texto: "**¡Sí, José, tenés una!** Recibiste una remesa de **US$300.00** de parte de **Rubén García**, desde Estados Unidos. ¿La cobramos?",
          datos: ["remesa.disponible.montoUsd=300", "remesa.disponible.remitente=Rubén García"] },
      ],
      // avanza sola a mostrar el canje (misma respuesta), o se puede unir en un solo estado con la tarjeta
      transiciones: [{ cuando: { porDefecto: true }, irA: "canje" }],
    },

    // ── C3 · Canje (oferta) ──────────────────────────────────
    canje: {
      id: "canje",
      funcionalidad: "C3",
      alEntrar: [
        { tipo: "tarjeta", tarjeta: {
            pie: "Te la cambio a la tasa del día del Banguat: **Q7.62** por dólar.",
            filas: [
              { etiqueta: "US$300 × Q7.62", valor: "**Q2,286.00**" },
              { etiqueta: "Tu saldo pasaría a", valor: "**Q3,536.00**" }, // = saldo vivo + 2286, en semilla 3536.00
            ],
        }, datos: ["tasaCambio.quetzalPorUsd=7.62", "conversion=2286.00", "saldoProyectado={{saldo+2286|Q2}}"] },
      ],
      respuestasRapidas: [
        { id: "cobrar", label: "Sí, cobrarla", insertaBurbujaUsuario: "Sí, cóbrala" },
        { id: "detalle", label: "Ver detalle" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "cobrar" }, efectos: [{ op: "cobrarRemesa" }], irA: "acreditada" },
        { cuando: { keywords: ["cobrala", "cóbrala", "si", "sí", "cobrar", "dale"] }, efectos: [{ op: "cobrarRemesa" }], irA: "acreditada" },
        { cuando: { respuestaRapida: "detalle" }, irA: "canje" }, // muestra detalle y permanece
      ],
    },

    // ── C3 + C5 · Acreditada e historial ─────────────────────
    acreditada: {
      id: "acreditada",
      funcionalidad: "C5",
      final: true,
      alEntrar: [
        { tipo: "burbuja",
          texto: "¡Listo, José! Acredité **Q2,286** a tu monedero. Tu saldo ahora es **{{saldo|Q2}}**. Ya quedó en tu historial de remesas.",
          datos: ["acreditado=2286 (fmtQ0)", "saldo vivo tras cobrar = 3536.00 en semilla"] },
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
| Cobrar remesa | `cobrarRemesa()` | saldo `{{saldo}}` += Q2,286.00 (1250 → **3536.00**); `remesa.disponible` → `null`; agrega movimiento "Remesa de Rubén García" +Q2,286.00 |

Reiniciar demo restaura `remesa.disponible` y el saldo.

---

## 5. Notas del molde

- **`Q2,286` vs `Q2,286.00`:** el copy usa `Q2,286` (fmtQ0) al decir "Acredité **Q2,286**" y `Q2,286.00` (fmtQ2) en la tarjeta de canje. Respetar ambos literales.
- "Ver detalle" es un ramal opcional; para el demo puede repetir/expandir la tarjeta y volver. No es obligatorio para el camino validado.
- Si la remesa ya fue cobrada (disponible = null) y el usuario vuelve a preguntar, Chispa debería responder que no hay remesa pendiente (ramal futuro, no validado; dejar simple).

---

## 6. Criterios de aceptación

1. "¿Tengo alguna remesa disponible?" corre el gate si aplica y responde con la remesa de **US$300.00** de **Rubén García**, leída del mock.
2. La tarjeta de canje muestra tasa **Q7.62**, conversión **Q2,286.00** y saldo proyectado **Q3,536.00**.
3. Al cobrar, el saldo sube a **Q3,536.00** (vivo), `remesa.disponible` queda en null y se agrega el movimiento; el copy final reproduce el validado (con `Q2,286` sin decimales y saldo con decimales).
4. El cambio de saldo persiste (visible en Monedero B1).
5. Copy idéntico al validado.
