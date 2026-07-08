# Flujo: Monedero

| | |
|---|---|
| **Código** | `monedero` |
| **Nombre** | Monedero |
| **Funcionalidades** | **B1** Consulta de saldo · **B3** Movimientos + estado de cuenta (PDF) · **Crédito activo + pagar cuota** (#8) |
| **Precondición** | `requiereAuth` (gate `acceso`/A10) — B1 es la primera acción sensible típica |
| **Copy** | Validado. Fuente: §3.3 "Acceso — A10" (tarjeta de cuenta) y "Monedero — B1·B3" (imagen). |

---

## 1. Lógica (§3.3)

El usuario pide su saldo y Chispa lo muestra con sus datos (**B1**). Si pide sus movimientos, Chispa pregunta el rango de fechas, los muestra en pantalla y ofrece el estado de cuenta en PDF (**B3**).

---

## 2. Copy validado — transcripción literal

**B1 — saldo** (se muestra tras el gate de acceso, o directo si ya está autenticado):

| # | Emisor | Texto |
|---|---|---|
| 1 | Usuario | Quiero ver mi saldo |
| 2 | Chispa (tarjeta) | ¡Hola, José! Esta es tu cuenta:<br>Titular — **José M. García López**<br>Cuenta — **\*\*\*\*4821**<br>Saldo disponible — **Q1,250.00** |

**B3 — movimientos:**

| # | Emisor | Texto |
|---|---|---|
| 3 | Usuario | Ahora mostrame mis movimientos |
| 4 | Chispa | Claro. ¿De cuántos días atrás querés verlos? Por ejemplo, los últimos 15 días, o desde una fecha específica. |
| 5 | Usuario | Los últimos 15 días |
| 6 | Chispa (tarjeta) | Estos son tus movimientos del **16 al 30 de junio**:<br>Pago de luz · EEGSA — 30 jun ····· **- Q120.00**<br>Compra · Tienda La Bendición — 30 jun ····· **- Q300.00**<br>Pago de agua · EMPAGUA — 29 jun ····· **- Q96.00**<br>Recarga · Tigo — 29 jun ····· **- Q50.00**<br>Envío a Ana García — 28 jun ····· **- Q600.00**<br>Remesa de Rubén García — 28 jun ····· **+ Q2,286.00**<br>[ Descargar estado de cuenta (PDF) ] |

**Procedencia:** el saldo `Q1,250.00` = `{{saldo|Q2}}` (vivo). Titular/cuenta del mock. Las filas de movimientos = `estado.movimientos` con `estado.movimientosRango`.

---

## 3. Máquina de estados

```ts
const flujoMonedero: Flujo = {
  codigo: "monedero",
  nombre: "Monedero",
  funcionalidades: ["B1", "B3"],
  precondiciones: [{ tipo: "requiereAuth", flujoGate: "acceso" }],
  disparador: {
    ctaMenu: "menu_saldo",
    keywords: ["saldo", "cuenta", "cuánto tengo", "cuanto tengo", "mi dinero"],
  },
  estadoInicial: "saldo",
  estados: {

    // ── B1 · Saldo ───────────────────────────────────────────
    saldo: {
      id: "saldo",
      funcionalidad: "B1",
      alEntrar: [
        { tipo: "tarjeta", tarjeta: {
            pie: "¡Hola, José! Esta es tu cuenta:",
            filas: [
              { etiqueta: "Titular", valor: "**José M. García López**" },
              { etiqueta: "Cuenta", valor: "**\\*\\*\\*\\*4821**" },
              { etiqueta: "Saldo disponible", valor: "**{{saldo|Q2}}**" },
            ],
        }, datos: ["saldo vivo = 1250.00 en semilla"] },
      ],
      respuestasRapidas: [
        { id: "ver_movimientos", label: "Ver mis movimientos", insertaBurbujaUsuario: "Ahora mostrame mis movimientos" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "ver_movimientos" }, irA: "preguntarRango" },
        { cuando: { keywords: ["movimientos", "transacciones", "historial"] }, irA: "preguntarRango" },
      ],
    },

    // ── B3 · Movimientos ─────────────────────────────────────
    preguntarRango: {
      id: "preguntarRango",
      funcionalidad: "B3",
      alEntrar: [
        { tipo: "burbuja", texto: "Claro. ¿De cuántos días atrás querés verlos? Por ejemplo, los últimos 15 días, o desde una fecha específica." },
      ],
      respuestasRapidas: [
        { id: "ultimos_15", label: "Los últimos 15 días", insertaBurbujaUsuario: "Los últimos 15 días" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "ultimos_15" }, irA: "listaMovimientos" },
        { cuando: { keywords: ["15", "quince", "últimos", "ultimos"] }, irA: "listaMovimientos" },
      ],
    },

    listaMovimientos: {
      id: "listaMovimientos",
      funcionalidad: "B3",
      final: true,
      alEntrar: [
        { tipo: "tarjeta", tarjeta: {
            pie: "Estos son tus movimientos del **{{movimientosRango}}**:",
            // el motor renderiza estado.movimientos: concepto — fecha ····· ±fmtQ2
            listaMovimientos: true,
            accion: { label: "Descargar estado de cuenta (PDF)", op: "descargarEstadoCuenta" },
        }, datos: ["estado.movimientos", "estado.movimientosRango=16 al 30 de junio"] },
      ],
      transiciones: [],
    },

  },
};
```

---

## 4. Efectos sobre el mock

Ninguno muta datos (solo lectura). "Descargar estado de cuenta (PDF)" es una **acción simulada**: muestra un aviso/toast tipo "PDF generado" (sin descarga real ni backend). No cambia saldo ni movimientos.

---

## 5. Notas del molde

- **Formato de montos en movimientos:** débitos `- Q120.00`, créditos `+ Q2,286.00` (fmtQ2 con signo explícito y espacio), tal como el mockup.
- El saldo del B1 es vivo: si el usuario ya hizo crédito/remesa antes en la sesión, aquí se ve el nuevo saldo (así se demuestra la persistencia).

---

## 6. Criterios de aceptación

1. "Quiero ver mi saldo" corre el gate de acceso (si aplica) y luego muestra la tarjeta de cuenta con titular, cuenta `****4821` y saldo `{{saldo|Q2}}` (Q1,250.00 en semilla).
2. "Mostrame mis movimientos" pregunta el rango; con "los últimos 15 días" muestra la lista del **16 al 30 de junio** con los seis movimientos exactos y sus signos/montos.
3. El botón de PDF muestra un aviso simulado, sin romper la demo ni mutar datos.
4. El saldo mostrado refleja el estado vivo (persistencia entre flujos).
5. Copy idéntico al validado.

---

## 7. Crédito activo + pagar cuota (#8)

Después de tomar un crédito (ver `credito.md`), el usuario puede administrarlo y pagarlo desde el Monedero. Muestra el otro lado del ciclo: la deuda viva.

**Disparo:** botón "Ver mi crédito" en la tarjeta de saldo (aparece solo si `creditos[]` no está vacío) o texto "quiero pagar mi crédito" / "cuánto debo".

**Copy (nuevo — tono Chispa, pendiente de validación):**
- Chispa: "Este es tu crédito activo:"
- Card **`CreditoActivoCard`**: "Debés **{{saldoPendiente|Q2}}** de **{{total|Q2}}**. Pagaste **{{pagado|Q2}}**." · barra de progreso · "Próxima cuota **{{cuota|Q2}}**, vence {{fechaPrimeraCuota}}." · [ Pagar cuota ]
- Al pagar: "¡Listo! Pagaste tu cuota de **{{cuota|Q2}}**. Te quedan **{{saldoPendiente|Q2}}** por pagar. Tu saldo ahora es **{{saldo|Q2}}**."

**Máquina (fragmento, se integra al flujo `monedero`):**

```ts
creditoActivo: {
  id: "creditoActivo",
  alEntrar: [
    { tipo: "burbuja", texto: "Este es tu crédito activo:" },
    { tipo: "tarjeta", tarjeta: {
        componente: "CreditoActivoCard",
        credito: "creditos[0]",  // saldoPendiente, total, pagado, cuota, fechaPrimeraCuota
    }, datos: ["creditos[0]"] },
  ],
  respuestasRapidas: [ { id: "pagar_cuota", label: "Pagar cuota" } ],
  transiciones: [
    { cuando: { respuestaRapida: "pagar_cuota" }, efectos: [{ op: "pagarCuota", creditoId: "creditos[0].id" }], irA: "cuotaPagada" },
    { cuando: { keywords: ["pagar", "pagá", "cuota", "abonar"] }, efectos: [{ op: "pagarCuota", creditoId: "creditos[0].id" }], irA: "cuotaPagada" },
  ],
},

cuotaPagada: {
  id: "cuotaPagada", final: true,
  alEntrar: [
    { tipo: "burbuja",
      texto: "¡Listo! Pagaste tu cuota de **{{cuota|Q2}}**. Te quedan **{{saldoPendiente|Q2}}** por pagar. Tu saldo ahora es **{{saldo|Q2}}**.",
      datos: ["pagarCuota debitó la cuota y avanzó el progreso"] },
  ],
  transiciones: [],
},
```

**Efectos:** `pagarCuota(creditoId)` → `debitarMonedero(cuota, "Pago de cuota crédito")`; `pagado += cuota`; `saldoPendiente -= cuota`. Con el crédito de oro (Q2,000/6/Q394) y saldo tras desembolso Q3,250.00: pagar una cuota deja saldo Q2,856.00, saldoPendiente Q1,970 (de Q2,364), pagado Q394.

**Criterios de aceptación (#8):**
1. La opción "Ver mi crédito" aparece solo cuando hay un crédito activo.
2. La tarjeta muestra deuda pendiente, total, pagado, barra de progreso y próxima cuota, todo desde `creditos[]`.
3. "Pagar cuota" debita la cuota del monedero, avanza el progreso y baja el saldo (persistente).
4. Copy en tono Chispa (pendiente de validación).
