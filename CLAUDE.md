# CLAUDE.md — Chispa (demo WhatsApp · IA generativa)

> Guía maestra para Claude Code. Léela completa antes de tocar código.
> **Regla de oro:** Chispa **conversa** con IA generativa y **personalidad propia**, pero **todo número, saldo, recibo o dato la IA lo obtiene de una herramienta (tool) que lee el mock** (`chispa_mock_data.json`). La IA redacta; **los datos nunca los inventa.**

---

## 0. Cambio de arquitectura (Nivel 2) — léelo primero

Este proyecto arrancó como una simulación **determinista** (máquina de estados + copy validado carácter por carácter). **Se migró conscientemente a Nivel 2: IA generativa plena con personalidad**, usando la API de **OpenAI**.

Qué cambia y qué NO:

| | Antes (determinista) | Ahora (Nivel 2 · IA generativa) |
|---|---|---|
| Motor | Máquina de estados declarativa | **Orquestador LLM** (OpenAI) con function-calling |
| Copy | Validado, byte-idéntico | **Guía de tono + ejemplos gold**; la IA parafrasea con personalidad |
| Datos | Interpolados del mock | **Solo vía tools** (grounding); la IA nunca escribe un número de su cabeza |
| Red / backend | Ninguno, offline | **Serverless function en Vercel** que llama a OpenAI (protege la API key) |
| Determinismo | Total | La conversación varía; **los datos y las acciones son deterministas** (los ejecutan las tools) |

**Lo que se conserva intacto del diseño original:**
- `chispa_mock_data.json` sigue siendo la **única fuente de verdad** de los datos.
- Las **operaciones** del modelo de datos (`01-modelo-datos.md`) siguen existiendo — ahora se exponen como **tools**.
- El **kit de UI de WhatsApp** (`02-design-system.md`) se construye igual, una sola vez.
- El **tono** de Chispa (guatemalteco de "tú"/tuteo, cálido, con emojis, banca formal) es la base de su personalidad.
- Las **7 fichas** (`funcionalidades/`) dejan de ser máquinas de estado y pasan a ser **la base de conocimiento y los ejemplos gold** que alimentan el system prompt.

---

## 1. Qué estamos construyendo

**Chispa** es una solución de microcrédito digital sobre WhatsApp para **Banco GyT Continental (Guatemala)**. Este repo es una **webapp que simula WhatsApp** y demuestra los 7 flujos priorizados como si fueran un producto real, **con un asistente conversacional inteligente**.

El material lo revisan **Hersson y niveles gerenciales**. El estándar es **credibilidad de banca formal**: cada número, cada saldo, cada recibo debe verse real **porque sale de datos reales sembrados** (vía tools), y Chispa debe conversar de forma natural, cálida y con criterio bancario.

**Es** un asistente con IA generativa (OpenAI) que conversa en lenguaje natural y tiene personalidad. **No es** un bot de árbol de botones. Pero **está aterrizado (grounded):** los hechos vienen del mock a través de herramientas, nunca de la imaginación del modelo.

---

## 2. Stack y cómo correr

- **Frontend:** React + Vite + TypeScript + Tailwind CSS.
- **Backend:** una **serverless function** (`/api/chat`) desplegable en **Vercel**, que hace de proxy hacia **OpenAI**. Existe para **no exponer la API key en el navegador**.
- **IA:** OpenAI (modelo por defecto sugerido: `gpt-4o`), con **function-calling / tools**. Idealmente vía **Vercel AI SDK** para simplificar el streaming.
- **Estado del mock:** vive en memoria en el cliente durante la sesión; se reinicia con "Reiniciar demo".

```bash
npm install
npm run dev      # Vite + funciones (vercel dev, o proxy local)
npm run build    # build de producción
```

**API key (NUNCA al repo):**
- Local: archivo `.env` (ignorado por git) con `OPENAI_API_KEY=...`.
- Producción: variable de entorno en Vercel.
- La key **solo** se usa en la serverless function (lado servidor). El frontend nunca la ve.

Objetivo de despliegue: build estático + serverless function en Vercel; se comparte con un **link** que cualquiera abre en su teléfono, sin instalar nada.

---

## 3. Arquitectura: el kit y el orquestador se construyen UNA vez

```
┌─────────────────────────────────────────────────────────┐
│  Kit de UI de WhatsApp  (se construye una vez)           │
│  PhoneFrame · ChatHeader · ChatThread · Bubble · Card ·  │
│  QuickReplies · TypingIndicator                          │
│  (streaming de texto tipo "escribiendo…")                │
├─────────────────────────────────────────────────────────┤
│  Orquestador LLM  (se construye una vez)                 │
│  - system prompt = personalidad + capacidades + guardas  │
│  - llama a OpenAI con las TOOLS declaradas               │
│  - loop de tool-calling: modelo pide tool → se ejecuta   │
│    contra el mock → resultado vuelve al modelo → responde│
│  - vive en la serverless function (API key server-side)  │
├─────────────────────────────────────────────────────────┤
│  Tools = operaciones del modelo de datos  (grounding)    │
│  leerSaldo · consultarRecibo · calcularCuota ·           │
│  crearCredito · debitarMonedero · acreditarMonedero · …  │
│  → ÚNICA vía por la que la IA obtiene o cambia datos     │
├─────────────────────────────────────────────────────────┤
│  Modelo de datos  (chispa_mock_data.json + operaciones)  │
├─────────────────────────────────────────────────────────┤
│  7 flujos = conocimiento + ejemplos gold en el prompt    │
│  acceso · monedero · remesa · CRÉDITO · pagos ·          │
│  chispapay · engagement                                  │
└─────────────────────────────────────────────────────────┘
```

**Consecuencia práctica:** la inteligencia vive en **(a)** el system prompt (quién es Chispa, qué puede hacer, cómo habla) y **(b)** el conjunto de tools (qué datos puede leer/mutar). Agregar capacidad = agregar una tool y/o describir el flujo en el prompt. **No se escribe una máquina de estados por flujo.**

---

## 4. El contrato ahora: system prompt + tools

### 4.1 System prompt (la personalidad y las reglas de Chispa)

El system prompt es el "alma" de Chispa. Debe codificar, como mínimo:

1. **Identidad:** asistente de **Chispa**, microcrédito de **Banco GyT Continental** sobre WhatsApp.
2. **Personalidad y tono:** guatemalteco, cálido, cercano, **tuteo (de "tú")** con **emojis frecuentes** (*cuéntame, calificas, ¿cuánto necesitas?, elige, ¿lo aceptas?*), breve (una idea por mensaje), confiable como banca formal. Ver §6.
3. **Regla de grounding (crítica):** *"Nunca inventes ni estimes saldos, montos, recibos, cuotas ni fechas. Para cualquier dato, llamá a la herramienta correspondiente y usá su resultado. Si no hay tool para algo, decilo con naturalidad; no lo inventes."*
4. **Comportamiento de banca formal:** confirmá antes de actuar (pagar, desembolsar, enviar); entregá comprobante después; verificá saldo antes de pagar; pedí el identificador (contador/NIS/teléfono) cuando aplique.
5. **Autenticación:** las acciones sensibles (crédito, pagos, envíos) requieren sesión autenticada. Si `sesion.autenticada` es falso, activá el gate de rostro (tool `autenticar` / flujo `acceso`) **una vez por sesión**; luego no lo vuelvas a pedir.
6. **Capacidades (los 7 flujos):** describir qué puede hacer Chispa, con los **ejemplos gold** de cada ficha como referencia de tono y de secuencia ideal.

Las **fichas de `funcionalidades/`** son la fuente de este contenido: su copy validado se usa como **ejemplos few-shot / gold** de cómo suena Chispa, no como texto a recitar literal.

### 4.2 Tools (grounding — la única puerta a los datos)

Cada operación de `01-modelo-datos.md` se expone como una tool con su JSON Schema. Divididas en:

- **Lectura:** `leerSaldo`, `leerCuenta`, `listarMovimientos`, `buscarServicio`, `buscarContacto`, `remesaDisponible`.
- **Cálculo:** `calcularCuota` (amortización francesa, determinista).
- **Mutación (acciones):** `acreditarMonedero`, `debitarMonedero`, `cobrarRemesa`, `pagarServicio`, `enviarAContacto`, `recargar`, `pagarComercioConSaldo`, `pagarComercioEnCuotas`, `crearCredito`, `acreditarReferido`, `acreditarCashback`.
- **Sesión:** `autenticar`, `reiniciarDemo`.

Reglas de las tools:
- Son **puras y deterministas** sobre el estado del mock. Mismo estado + mismos argumentos → mismo resultado.
- Las de **mutación** exigen (por diseño de prompt) **confirmación del usuario antes** de ejecutarse.
- El **resultado de la tool es la verdad**: la IA debe reflejar exactamente los números que la tool devuelve (formateados según §5).
- Firmas y semántica exactas: `01-modelo-datos.md §4`.

### 4.3 Loop de orquestación (en la serverless function)

```
1. Cliente envía: historial de mensajes + snapshot del estado del mock.
2. Serverless function llama a OpenAI con: system prompt + historial + tools.
3. Si el modelo pide una o más tools:
      ejecutar cada tool contra el estado → obtener resultado (y estado mutado)
      devolver resultados al modelo → repetir desde 2.
4. Cuando el modelo responde texto final → se transmite (stream) al cliente.
5. El cliente renderiza el texto y guarda el estado mutado devuelto.
```

La API key vive solo aquí. El estado autoritativo lo mantiene el cliente y se pasa en cada request (mock pequeño; simple y reiniciable).

---

## 5. Reglas de datos y formato (grounding)

1. **Todo dato viene de una tool.** Saldos, montos, recibos, cuotas, fechas, nombres de contacto: la IA los obtiene llamando la tool, no de memoria. Esta es la garantía de credibilidad bancaria.
2. **Formato de moneda.** Dos formatters conviven (el copy original no era uniforme): `fmtQ0(n)` → `Q1,250` y `fmtQ2(n)` → `Q1,250.00`. La serverless function/tools devuelven los montos ya formateados o con indicación de formato; la IA los usa tal cual. Ver `01-modelo-datos.md §3`.
3. **Los datos mutan en la sesión y se ven después.** Pagar baja el saldo; acreditar lo sube; el cambio se refleja en consultas posteriores (misma sesión).
4. **Ante duda, la IA pregunta o consulta la tool** — nunca rellena con un valor plausible.

---

## 6. Personalidad y tono de Chispa (base del system prompt)

Guatemalteco, cálido, muy cercano y amigable, breve y confiable como banca formal:

- **Tuteo (de "tú"), NO voseo ni usted.** El mercado meta es gente de recursos limitados; el trato de "tú" y los emojis les dan cercanía y confianza. Ej.: *cuéntame, calificas, ¿cuánto necesitas?, elige, ¿lo aceptas?, envíame, mira.* (Nunca *contame, tenés, querés, aceptás*.)
- **Emojis con frecuencia** (1–2 por mensaje, naturales): 💰 dinero/saldo, ✅ confirmaciones, 📄 recibos, 🙌 😊 👍 cercanía, 📷 cámara, 🎉 logros. Sin saturar ni infantilizar.
- Cercanía respetuosa: *"Con gusto, José 😊"*, *"¡Perfecto!"*, *"¡Listo!"*
- Frases cortas, una idea por mensaje, cero jerga técnica.
- Confirma antes de actuar; entrega comprobante después (banca formal).
- Nunca revela que es un modelo de IA ni habla de "prompts", "tokens" ni de su funcionamiento interno.

**Ejemplos gold** (tono actual — tuteo + emojis; imitar el registro, no recitar):

> Con gusto, José 😊 Para conocerte mejor, cuéntame: ¿cuál es tu principal fuente de ingresos?
> ¡Perfecto! 🙌 Justo veo tus remesas de los últimos meses. Tu ingreso promedio es **Q2,325**, así que calificas hasta **Q3,000**. ¿Cuánto necesitas?
> ¡Listo! 🎉 Deposité **Q2,000** en tu monedero 💰 Tu saldo pasó de Q1,250 a **Q3,250.00**. Tu primera cuota de Q394 vence el 1 de agosto.

La IA puede parafrasear con esta voz, pero los **números** de esos mensajes siempre salen de las tools (`leerSaldo`, `calcularCuota`, etc.).

---

## 7. Principios de realismo

1. **El usuario pide, Chispa no adivina** el dato: si no lo sabe, llama la tool o pregunta.
2. **Autenticación una vez por sesión.** El rostro (validado contra RENAP, flujo `acceso`/A10) se pide en la **primera acción sensible**; luego la sesión queda confiable. Tool `autenticar`.
3. **Datos reales de la base sembrada** en cada respuesta, siempre vía tools.
4. **Banca formal:** verifica saldo antes de pagar, pide el identificador (contador/NIS/teléfono), confirma antes de actuar, entrega comprobantes.

Requisitos de experiencia:
- **Lenguaje natural como camino principal.** Se pueden ofrecer **quick replies** como sugerencias/atajos, pero el usuario puede escribir libre y la IA entiende.
- **Streaming tipo "escribiendo…"**: el texto de Chispa aparece progresivamente (indicador antes / stream durante).
- **Los datos mutan en la sesión** y se ven en interacciones posteriores.
- **Botón "Reiniciar demo"** → tool `reiniciarDemo` → restaura la semilla y limpia el hilo.
- **Viewport de teléfono** (`PhoneFrame`).
- **Acciones deterministas:** aunque la redacción varíe, ejecutar la misma acción sobre el mismo estado da el mismo resultado numérico.

---

## 8. Design tokens — WhatsApp (tema claro clásico)

| Token | Uso | Valor |
|---|---|---|
| `wa-header` | barra superior del chat | `#075E54` |
| `wa-teal` | acento teal | `#128C7E` |
| `wa-brand` | verde Chispa (avatar, énfasis) | `#25D366` |
| `wa-bubble-out` | burbuja del usuario (saliente) | `#DCF8C6` |
| `wa-bubble-in` | burbuja de Chispa (entrante) | `#FFFFFF` |
| `wa-chat-bg` | fondo del hilo | `#ECE5DD` |
| `wa-tick` | check azul (leído) | `#34B7F1` |
| `wa-text` | texto principal | `#111B21` |
| `wa-text-2` | hora / secundario | `#667781` |
| `wa-link` | enlaces | `#027EB5` |

Tipografía: system UI / Helvetica Neue. Burbujas con esquina "cola", sombra sutil, radio ~7–8px. Hora y checks dentro de la burbuja. Detalle en `02-design-system.md`.

---

## 9. Estructura del repo

```
CLAUDE.md                    ← este archivo
01-modelo-datos.md           ← chispa_mock_data.json + operaciones (ahora = tools)
02-design-system.md          ← kit de UI de WhatsApp
funcionalidades/             ← base de conocimiento + ejemplos gold por flujo
  acceso.md · monedero.md · remesa.md · credito.md ·
  pagos.md · chispapay.md · engagement.md
src/                         ← (a construir) app React + kit UI + cliente de chat
api/                         ← (a construir) serverless function /api/chat (OpenAI)
```

Las fichas ya **no** son máquinas de estado a ejecutar; son la **fuente del system prompt** (capacidades, tono, ejemplos gold) y la referencia de qué tools hace falta.

---

## 10. Semilla del mock (resumen — fuente formal: `01-modelo-datos.md` / `chispa_mock_data.json`)

| Entidad | Datos |
|---|---|
| Usuario | José Manuel García López · DPI 2547 89632 0101 · +502 5512 8834 · Mixco |
| Cuenta/monedero | N.º ****4821 · Monedero Chispa · **Saldo Q1,250.00** |
| Remesa recurrente | US$300/mes de Rubén García (EE.UU.) · **ingreso promedio Q2,325** |
| Tasa de cambio | Q7.62 / USD (ref. Banguat) |
| Crédito | **Línea aprobada Q3,000** · tasa **5% mensual** · plazos 3/6/12 |
| Servicios pendientes | EEGSA · contador N-8842137 · Q135 · EMPAGUA · NIS 0524417 · Q96 |
| Contactos | Ana García (hermana) · Luis Pérez (amigo) |
| Comercio | Tienda La Bendición (acepta Chispa Pay) |
| Engagement | Código JOSE24 · premio Q30 por referido · cashback Q12 |

> ⚠️ `chispa_mock_data.json` es la única fuente de verdad en runtime.

---

## 11. Definición de "hecho" para cualquier flujo

- Chispa conversa en lenguaje natural, con su personalidad (tuteo, cálido, con emojis, banca formal).
- **Todos los datos provienen de tools** que leen el mock; ninguno lo inventa la IA.
- Las **acciones** (pagar, desembolsar, enviar) confirman antes, ejecutan vía tool y entregan comprobante.
- Los **efectos mutan el mock** y se ven en interacciones posteriores de la misma sesión.
- Acciones sensibles pasan por el **gate de autenticación** una vez por sesión.
- **Streaming "escribiendo…"**; render dentro del `PhoneFrame`; se ve como WhatsApp real.
- **"Reiniciar demo"** restaura la semilla.
- La **API key** vive solo en la serverless function; nunca en el frontend ni en git.
