# Flujo: Crédito

| | |
|---|---|
| **Código** | `credito` |
| **Nombre** | Crédito |
| **Funcionalidades** | **D1** Solicitud por chat · **D2** Evaluación automática · **D3** Oferta personalizada · **D4** Desembolso instantáneo |
| **Precondición** | Requiere sesión autenticada (gate `acceso` / A10 — es acción sensible) |
| **Copy** | Validado. Fuente: documento maestro §3.3, "Crédito — D1·D2·D3·D4" (imagen de conversación) |

> **Esta ficha es el MOLDE.** Los otros seis flujos se replican con esta misma estructura. Validar aquí la plantilla antes de continuar.

---

## 1. Lógica (del documento maestro §3.3)

El usuario pide un préstamo (**D1**); Chispa pregunta su fuente de ingreso y evalúa con la remesa recurrente más el historial del sistema financiero — SIB/Verifiquemos (**D2**). Si aprueba, ofrece el monto elegido, una tasa de **5% mensual** (realista para microcrédito) y el plazo con su cuota (**D3**); al aceptar, desembolsa al monedero al instante (**D4**).

---

## 2. Precondición: gate de autenticación

Solicitar un crédito es una acción sensible. Antes del estado inicial:

```
si NO sesion.autenticada:
    ejecutar flujo `acceso` (A10 · rostro validado contra RENAP)
    al validar → sesion.autenticada = true → continuar en estado `solicitud`
si YA autenticada:
    entrar directo a `solicitud` (no se vuelve a pedir el rostro en la sesión)
```

El motor resuelve esto vía `precondiciones: [{ tipo: "requiereAuth", flujoGate: "acceso" }]`. **No se re-implementa el rostro aquí**; se invoca el flujo `acceso`.

---

## 3. Copy validado — transcripción literal

> Transcripción carácter por carácter de la conversación validada. `**negrita**` = negrita de WhatsApp tal como aparece validada. **No modificar.**

| # | Emisor | Texto |
|---|---|---|
| 1 | Usuario | Necesito un préstamo |
| 2 | Chispa | Con gusto, José. Para conocerte mejor, contame: ¿cuál es tu principal fuente de ingresos? |
| 3 | Usuario | Todos los meses recibo una remesa de mi hermano en Estados Unidos |
| 4 | Chispa | ¡Perfecto! Justo veo tus remesas de los últimos meses. Tu ingreso promedio es **Q2,325**, así que calificás hasta **Q3,000**. ¿Cuánto ocupás? |
| 5 | Usuario | Q2,000 está bien |
| 6 | Chispa | Perfecto, **Q2,000** a una tasa de **5% mensual**. Elegí el plazo:<br>▸ 3 meses — **Q734 / mes**<br>▸ 6 meses (elegido) — **Q394 / mes**<br>▸ 12 meses — **Q226 / mes**<br>Con **6 meses**, tu cuota es **Q394** al mes. ¿Lo aceptás? |
| 7 | Usuario | Sí, acepto |
| 8 | Chispa | ¡Listo! Deposité **Q2,000** en tu monedero. Tu saldo pasó de Q1,250 a **Q3,250.00**. Tu primera cuota de Q394 vence el 1 de agosto. |

**Procedencia de cada número (todo sale del mock):**

- `Q2,325` = `usuario.ingresoPromedio` · `Q3,000` = `credito.lineaAprobada`
- `Q2,000` = monto elegido por el usuario (paso 5)
- `5% mensual` = `credito.tasaMensual` (0.05)
- Cuotas `Q734 / Q394 / Q226` = `calcularCuota(2000, plazo)` para plazos 3/6/12 (ver §5)
- `Q1,250` = saldo antes · `Q3,250.00` = saldo después de acreditar Q2,000
- `1 de agosto` = `credito.fechaPrimeraCuota` (constante de demo, ver §6)

---

## 4. Máquina de estados (declarativa — esto es lo que consume el motor)

```ts
const flujoCredito: Flujo = {
  codigo: "credito",
  nombre: "Crédito",
  funcionalidades: ["D1", "D2", "D3", "D4"],
  precondiciones: [{ tipo: "requiereAuth", flujoGate: "acceso" }],

  disparador: {
    ctaMenu: "menu_credito",
    keywords: ["prestamo", "préstamo", "crédito", "credito", "necesito plata", "quiero un prestamo"],
    // la burbuja del usuario al iniciar por CTA es: "Necesito un préstamo"
  },

  estadoInicial: "solicitud",

  estados: {

    // ── D1 · Solicitud por chat ──────────────────────────────
    solicitud: {
      id: "solicitud",
      funcionalidad: "D1",
      alEntrar: [
        { tipo: "burbuja",
          texto: "Con gusto, José. Para conocerte mejor, contame: ¿cuál es tu principal fuente de ingresos?",
          datos: ["usuario.nombreCorto=José"] },
      ],
      respuestasRapidas: [
        { id: "fuente_remesa",
          label: "Recibo una remesa del exterior",
          insertaBurbujaUsuario: "Todos los meses recibo una remesa de mi hermano en Estados Unidos" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "fuente_remesa" }, irA: "evaluacion" },
        { cuando: { keywords: ["remesa", "hermano", "exterior", "estados unidos", "eeuu", "usa"] },
          irA: "evaluacion" },
        // porDefecto: repreguntar suave (opcional) — ver §7 decisión (a)
      ],
    },

    // ── D2 · Evaluación automática ───────────────────────────
    evaluacion: {
      id: "evaluacion",
      funcionalidad: "D2",
      alEntrar: [
        { tipo: "burbuja",
          texto: "¡Perfecto! Justo veo tus remesas de los últimos meses. Tu ingreso promedio es **Q2,325**, así que calificás hasta **Q3,000**. ¿Cuánto ocupás?",
          datos: ["usuario.ingresoPromedio=2325", "credito.lineaAprobada=3000"] },
      ],
      respuestasRapidas: [
        { id: "monto_2000", label: "Q2,000", insertaBurbujaUsuario: "Q2,000 está bien" }, // camino validado
        { id: "monto_1000", label: "Q1,000" },
        { id: "monto_3000", label: "Q3,000" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "monto_2000" }, efectos: [{ op: "set", ruta: "sesion.montoSolicitado", valor: 2000 }], irA: "oferta" },
        { cuando: { respuestaRapida: "monto_1000" }, efectos: [{ op: "set", ruta: "sesion.montoSolicitado", valor: 1000 }], irA: "oferta" },
        { cuando: { respuestaRapida: "monto_3000" }, efectos: [{ op: "set", ruta: "sesion.montoSolicitado", valor: 3000 }], irA: "oferta" },
        { cuando: { keywords: ["2000", "2,000", "2 mil", "dos mil"] }, efectos: [{ op: "set", ruta: "sesion.montoSolicitado", valor: 2000 }], irA: "oferta" },
        // texto libre con número ≤ lineaAprobada → set montoSolicitado → oferta (motor parsea monto)
      ],
    },

    // ── D3 · Oferta personalizada ────────────────────────────
    oferta: {
      id: "oferta",
      funcionalidad: "D3",
      // plazoSeleccionado por defecto = 6 (camino validado). Tocar un plazo lo cambia y re-renderiza.
      alEntrar: [
        { tipo: "tarjeta",
          tarjeta: {
            encabezado: "Perfecto, **Q2,000** a una tasa de **5% mensual**. Elegí el plazo:",
            opciones: [
              { plazoMeses: 3,  etiqueta: "3 meses",  valor: "**Q734 / mes**" },
              { plazoMeses: 6,  etiqueta: "6 meses",  valor: "**Q394 / mes**", seleccionado: true },
              { plazoMeses: 12, etiqueta: "12 meses", valor: "**Q226 / mes**" },
            ],
            pie: "Con **6 meses**, tu cuota es **Q394** al mes. ¿Lo aceptás?",
          },
          datos: ["sesion.montoSolicitado=2000", "credito.tasaMensual=0.05",
                  "cuota=calcularCuota(monto, plazoSeleccionado)"] },
      ],
      respuestasRapidas: [
        { id: "plazo_3",  label: "3 meses" },
        { id: "plazo_6",  label: "6 meses" },
        { id: "plazo_12", label: "12 meses" },
        { id: "aceptar",  label: "Sí, acepto", insertaBurbujaUsuario: "Sí, acepto" },
      ],
      esperaTexto: true,
      transiciones: [
        // cambiar de plazo: actualiza selección y el pie de la tarjeta; permanece en `oferta`
        { cuando: { respuestaRapida: "plazo_3" },  efectos: [{ op: "set", ruta: "sesion.plazoSeleccionado", valor: 3 }],  irA: "oferta" },
        { cuando: { respuestaRapida: "plazo_6" },  efectos: [{ op: "set", ruta: "sesion.plazoSeleccionado", valor: 6 }],  irA: "oferta" },
        { cuando: { respuestaRapida: "plazo_12" }, efectos: [{ op: "set", ruta: "sesion.plazoSeleccionado", valor: 12 }], irA: "oferta" },
        // aceptar: crea el crédito y desembolsa
        { cuando: { respuestaRapida: "aceptar" },
          efectos: [
            { op: "crearCredito", monto: "$montoSolicitado", plazoMeses: "$plazoSeleccionado",
              tasaMensual: 0.05, cuota: "$cuota", primeraCuotaVence: "credito.fechaPrimeraCuota" },
            { op: "acreditarMonedero", monto: "$montoSolicitado" },
          ],
          irA: "desembolso" },
        { cuando: { keywords: ["acepto", "si acepto", "sí", "si", "dale", "ok", "está bien", "de acuerdo"] },
          efectos: [
            { op: "crearCredito", monto: "$montoSolicitado", plazoMeses: "$plazoSeleccionado",
              tasaMensual: 0.05, cuota: "$cuota", primeraCuotaVence: "credito.fechaPrimeraCuota" },
            { op: "acreditarMonedero", monto: "$montoSolicitado" },
          ],
          irA: "desembolso" },
      ],
    },

    // ── D4 · Desembolso instantáneo ──────────────────────────
    desembolso: {
      id: "desembolso",
      funcionalidad: "D4",
      final: true,
      alEntrar: [
        { tipo: "burbuja",
          // Saldo vivo: {{saldoAntes|Q0}} = saldo capturado antes de acreditar; {{saldo|Q2}} = saldo después.
          // En semilla renderiza byte-idéntico al validado: "de Q1,250 a Q3,250.00". NO normalizar el formato mixto.
          texto: "¡Listo! Deposité **Q2,000** en tu monedero. Tu saldo pasó de {{saldoAntes|Q0}} a **{{saldo|Q2}}**. Tu primera cuota de Q394 vence el 1 de agosto.",
          datos: ["saldoAntes vivo (1250 en semilla)", "saldo vivo tras acreditar (3250.00 en semilla)", "cuota=394", "credito.fechaPrimeraCuota=1 de agosto"] },
      ],
      transiciones: [], // fin del flujo; el motor ofrece volver al menú
    },

  },
};
```

---

## 5. Cálculo de cuota (defensa del realismo)

Las cuotas **no están inventadas**: son amortización francesa (cuota fija) al 5% mensual. Operación en el modelo de datos:

```
calcularCuota(P, n, i = credito.tasaMensual):
    cuota = P · i / (1 − (1 + i)^(−n))
    → redondear a entero (Quetzal)
```

Verificación con P = Q2,000, i = 0.05:

| Plazo (n) | Fórmula | Cuota |
|---|---|---|
| 3 meses | 2000·0.05 / (1 − 1.05⁻³) | **Q734** ✓ |
| 6 meses | 2000·0.05 / (1 − 1.05⁻⁶) | **Q394** ✓ |
| 12 meses | 2000·0.05 / (1 − 1.05⁻¹²) | **Q226** ✓ |

Coinciden exactamente con el copy validado. Para el demo determinista, el motor puede leer `calcularCuota` **o** una tabla precomputada en el mock; ambas dan el mismo resultado.

---

## 6. Efectos sobre el mock

| Efecto | Operación | Antes → Después |
|---|---|---|
| Desembolso | `acreditarMonedero(2000)` | `monedero.saldo` 1250.00 → **3250.00** |
| Crédito creado | `crearCredito({...})` | agrega registro a `creditos[]`: `{ monto:2000, plazoMeses:6, tasaMensual:0.05, cuota:394, primeraCuotaVence:"1 de agosto", saldoPendiente:2000 }` |

- El nuevo saldo **persiste en la sesión**: al abrir luego el flujo `monedero` (B1), debe mostrar Q3,250.00.
- `fechaPrimeraCuota` se guarda como constante de demo (`"1 de agosto"`) para que el copy quede verbatim. En producción sería el 1.º del mes siguiente; aquí se fija para determinismo.
- **Reiniciar demo** revierte: saldo → Q1,250.00 y `creditos[]` → vacío.

---

## 7. Decisiones del molde a validar (Carlos)

Puntos donde el molde tomó un default razonable; confirmar antes de replicar a los otros seis:

- **(a) Fuente de ingreso.** Se ofrece un solo botón validado ("Recibo una remesa del exterior"), porque el usuario sembrado tiene remesa y la evaluación (D2) se apoya en ella. ¿Dejamos solo ese camino, o agregamos "Salario"/"Negocio" con una rama alterna? (Recomiendo dejar solo remesa para mantener el copy 100% validado.)
- **(b) Monto seleccionable.** El default es Q2,000 (camino validado) con botones Q1,000/Q3,000 y texto libre habilitados; otros montos recalculan la cuota vía `calcularCuota`. Alternativa: fijar únicamente Q2,000. (Recomiendo dejar seleccionable: da realismo sin salir del mock.)
- **(c) Copy de plazos no-validado.** El pie "Con 6 meses…" es validado literal. Si el usuario cambia a 3 o 12 meses, se genera el mismo patrón con el plazo/cuota correspondientes. Es una *parametrización* del patrón validado, no una reescritura — confirmar que es aceptable.

---

## 8. Criterios de aceptación

1. Escribir "necesito un préstamo" (o tocar el CTA del menú) inicia el flujo; si la sesión no está autenticada, primero corre el gate `acceso` (A10) y luego reanuda en `solicitud`.
2. Chispa saluda con el nombre real del mock ("José") y pregunta la fuente de ingresos.
3. Al indicar remesa (botón o texto con "remesa/hermano/exterior"), Chispa muestra ingreso promedio **Q2,325** y línea **Q3,000**, ambos leídos del mock (no fijos en la vista).
4. El monto Q2,000 genera la oferta con cuotas 3m **Q734** / 6m **Q394** / 12m **Q226**, con 6 meses preseleccionado; cambiar de plazo actualiza la cuota mostrada.
5. Al aceptar, el saldo sube de **Q1,250** a **Q3,250.00** y el cambio **persiste**: se ve en el flujo `monedero` (B1) sin reiniciar.
6. Se crea un crédito con cuota **Q394** y primera cuota **1 de agosto**; el mensaje final reproduce el copy validado **carácter por carácter** (incluida la mezcla Q1,250 / Q3,250.00).
7. "Reiniciar demo" devuelve el saldo a **Q1,250.00** y vacía `creditos[]`.
8. Aparece "escribiendo…" antes de cada burbuja de Chispa, con delay pequeño; todo determinista (sin IA en vivo).
9. Ninguna cadena de Chispa fue reescrita respecto al copy validado (§3).
