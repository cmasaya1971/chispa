# CLAUDE.md — Chispa (demo WhatsApp)

> Guía maestra para Claude Code. Léela completa antes de tocar código.
> **Regla de oro:** todo lo que ve el usuario sale del mock (`chispa_mock_data.json`) o del copy validado. Nada se inventa, nada se reescribe.

---

## 1. Qué estamos construyendo

**Chispa** es una solución de microcrédito digital sobre WhatsApp para **Banco GyT Continental (Guatemala)**. Este repo es una **webapp que simula WhatsApp** y demuestra los 7 flujos priorizados como si fueran un producto real.

El material lo revisan **Hersson y niveles gerenciales**. Por eso el estándar no es "una demo que funciona": es **credibilidad de banca formal**. Cada número, cada saldo, cada recibo debe verse real porque *sale de datos reales sembrados*, y cada frase de Chispa es la que ya se validó con el cliente.

**No es** un chatbot con IA en vivo. Es una simulación **determinista**: mismas entradas → mismas salidas, siempre.

---

## 2. Stack y cómo correr

- **React + Vite + TypeScript + Tailwind CSS**
- **Sin backend. Sin IA en vivo. Sin llamadas de red.** Todo el estado vive en memoria durante la sesión.
- Mock data en memoria (se puede reiniciar en cualquier momento).

```bash
npm install
npm run dev      # servidor de desarrollo (Vite)
npm run build    # build de producción
```

Objetivo de despliegue: un build estático que abra en cualquier navegador y en un teléfono, sin configurar nada.

---

## 3. Arquitectura: el motor y el kit se construyen UNA vez

Este es el corazón del diseño y la razón por la que es eficiente y realista a la vez:

```
┌─────────────────────────────────────────────────────────┐
│  Kit de UI de WhatsApp  (se construye una vez)           │
│  PhoneFrame · ChatHeader · ChatThread · Bubble · Card ·  │
│  QuickReplies · TypingIndicator                          │
├─────────────────────────────────────────────────────────┤
│  Motor de conversación  (se construye una vez)           │
│  - lee una máquina de estados declarativa                │
│  - renderiza mensajes con delay + indicador "escribiendo"│
│  - resuelve la entrada del usuario (botón o texto laxo)  │
│  - aplica efectos sobre el mock                          │
├─────────────────────────────────────────────────────────┤
│  Modelo de datos  (chispa_mock_data.json + operaciones)  │
│  leerSaldo · debitarMonedero · acreditarMonedero ·       │
│  consultarRecibo · crearCredito · calcularCuota · …      │
├─────────────────────────────────────────────────────────┤
│  7 flujos = 7 fichas de DATOS  (no código)               │
│  acceso · monedero · remesa · CRÉDITO · pagos ·          │
│  chispapay · engagement                                  │
└─────────────────────────────────────────────────────────┘
```

**Consecuencia práctica:** agregar o cambiar un flujo = editar una ficha declarativa en `funcionalidades/`. **No se escribe lógica nueva por flujo.** Si un flujo necesita código nuevo, primero preguntémonos si el motor o una operación del modelo de datos deberían absorberlo.

---

## 4. Contrato del flujo declarativo (lo que consume el motor)

Cada flujo es un objeto `Flujo`. Este es el contrato que el motor sabe interpretar (definición canónica; las fichas lo instancian):

```ts
type Flujo = {
  codigo: string;              // "credito"
  nombre: string;              // "Crédito"
  funcionalidades: string[];   // ["D1","D2","D3","D4"]  (trazabilidad al alcance 2.3)
  precondiciones?: Guard[];    // p.ej. requiere sesión autenticada (gate A10)
  disparador: Disparador;      // cómo arranca el flujo
  estadoInicial: string;
  estados: Record<string, Estado>;
};

type Disparador = {
  ctaMenu?: string;            // id del botón en el menú/inicio, si aplica
  keywords: string[];          // match laxo para iniciar por texto libre
};

type Estado = {
  id: string;
  funcionalidad?: string;      // "D2" — para trazar qué requisito cubre
  alEntrar: MensajeBot[];      // Chispa renderiza esto en orden, con delays
  respuestasRapidas?: RespuestaRapida[];   // camino principal (botones)
  esperaTexto?: boolean;       // además acepta texto libre
  transiciones: Transicion[];
  final?: boolean;
};

type MensajeBot =
  | { tipo: "burbuja"; texto: string; datos?: string[]; delayMs?: number }
  | { tipo: "tarjeta"; tarjeta: Tarjeta; datos?: string[]; delayMs?: number };

type RespuestaRapida = {
  id: string;
  label: string;               // texto del botón
  insertaBurbujaUsuario?: string; // burbuja que aparece del lado del usuario al tocarlo
};

type Transicion = {
  cuando: Matcher;             // botón, keywords, o por defecto
  efectos?: Efecto[];          // mutaciones sobre el mock (ver modelo de datos)
  irA: string;                 // id del siguiente estado
};

type Matcher =
  | { respuestaRapida: string }
  | { keywords: string[] }
  | { porDefecto: true };
```

- **`datos`**: lista opcional que documenta **de qué campos del mock salen los números** de esa burbuja (trazabilidad "todo sale del mock"). El motor no lo necesita para renderizar; existe para auditoría y para el reviewer.
- **`efectos`**: operaciones del modelo de datos (`acreditarMonedero`, `debitarMonedero`, `crearCredito`, `set`, …), definidas en `01-modelo-datos.md`.

---

## 5. Reglas de copy (crítico, no negociable)

1. **Copy exacto validado. No reescribir.** Las frases de Chispa ya se validaron con el cliente (Sección 3.3 del documento maestro). Se copian **carácter por carácter**, incluyendo signos, tildes y negritas.
2. **Negrita = `**...**`** en el campo `texto`; se renderiza como negrita de WhatsApp. El molde marca en negrita exactamente lo que la conversación validada marca.
3. **Formato de moneda literal.** El copy validado **no** es uniforme: el mismo flujo muestra `Q1,250` (sin decimales) y `Q3,250.00` (con decimales). Se respeta tal cual está validado. **No normalizar.**
4. **Interpolación permitida solo si es byte-idéntica.** Se puede usar un token del mock (p.ej. el nombre "José") únicamente cuando su render es idéntico al validado. Ante la mínima duda, se guarda el string literal y se anota la procedencia en `datos`.

---

## 6. Tono de Chispa

Guatemalteco, cálido y cercano, con **voseo**, breve y confiable como banca formal. Se deduce del copy validado y **no se altera**:

- Voseo natural: *contame, calificás, ocupás, elegí, ¿lo aceptás?*
- Cercanía respetuosa: *"Con gusto, José."*, *"¡Perfecto!"*, *"¡Listo!"*
- Frases cortas, una idea por burbuja, cero jerga técnica.
- Confirma antes de actuar y entrega comprobante después (comportamiento de banca formal).

Al crear copy nuevo para flujos aún no ilustrados, imitar este registro **exacto**. Cuando exista copy validado, usar ese y nada más.

---

## 7. Principios de realismo (Sección 3.2 del documento)

1. **El usuario pide, el sistema no adivina.** Nada proactivo; si quiere algo, lo solicita.
2. **Autenticación una vez por sesión.** El rostro (validado contra RENAP, flujo `acceso`/A10) se pide en la **primera acción sensible**; luego la sesión queda confiable y no se vuelve a pedir. Los flujos sensibles declaran `precondiciones: [requiereAuth]`.
3. **Datos reales de la base sembrada** en cada respuesta: saldo, movimientos, recibos, remesas.
4. **Comportamiento de banca formal:** verifica saldo antes de pagar, pide el identificador (contador/NIS/teléfono), pregunta rango de fechas, entrega comprobantes.

Y estos requisitos de experiencia:

- **Respuestas rápidas como camino principal** + **keyword-matching laxo** para texto escrito (acentos/mayúsculas indiferentes, coincidencia por inclusión).
- **Indicador "escribiendo…"** antes de cada burbuja de Chispa, con **delays pequeños** (sugerido 600–1200 ms según largo).
- **Los datos mutan en la sesión:** pagar baja el saldo, acreditar lo sube, y el cambio se ve en flujos posteriores.
- **Botón "Reiniciar demo"** que restaura el mock a su semilla.
- **Viewport de teléfono** (marco `PhoneFrame`).
- **Todo determinista.** Sin backend, sin IA en vivo, sin aleatoriedad.

---

## 8. Design tokens — WhatsApp (tema claro clásico)

Deben coincidir con los mockups validados del documento. Definir en Tailwind (`theme.extend.colors`) y/o variables CSS.

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

Tipografía: system UI / Helvetica Neue (aproxima WhatsApp). Burbujas con esquina "cola", sombra sutil, radio ~7–8px. Hora y checks dentro de la burbuja.

---

## 9. Estructura del repo (spec pack)

```
CLAUDE.md                    ← este archivo
01-modelo-datos.md           ← chispa_mock_data.json como fuente de verdad + operaciones
02-design-system.md          ← PhoneFrame, ChatHeader, ChatThread, Bubble, Card,
                               QuickReplies, TypingIndicator
funcionalidades/
  acceso.md                  ← A10 (gate de rostro/RENAP)
  monedero.md                ← B1 saldo · B3 movimientos
  remesa.md                  ← C1 · C3 · C5
  credito.md                 ← D1 · D2 · D3 · D4   ← MOLDE VALIDADO PRIMERO
  pagos.md                   ← E4 servicios · E1 envíos · E5 recargas
  chispapay.md               ← E7 QR · E8 enlace · E9 saldo/cuotas
  engagement.md              ← J1 referidos · J2 cashback
```

**Convención de fichas:** una por flujo, nombre en minúscula sin código (`credito.md`); el código va en el frontmatter/encabezado y en `funcionalidades[]`.

---

## 10. Semilla del mock (resumen — la fuente formal es `01-modelo-datos.md`)

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

> ⚠️ El archivo `chispa_mock_data.json` es la única fuente de verdad en runtime. Esta tabla es un resumen para orientación; los valores exactos y su forma se formalizan en `01-modelo-datos.md`.

---

## 11. Definición de "hecho" para cualquier flujo

- Copy idéntico al validado (o al registro de tono si aún no hay validado).
- Todos los números provienen del mock; ninguno hardcodeado en la vista.
- Los efectos mutan el mock y se ven en flujos posteriores dentro de la misma sesión.
- Camino principal por botones + texto libre por keywords laxos.
- Indicador "escribiendo…" con delays; comportamiento determinista.
- "Reiniciar demo" restaura la semilla.
- Renderiza dentro del `PhoneFrame` y se ve como WhatsApp real.
