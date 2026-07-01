# 02 · Sistema de diseño (kit de UI de WhatsApp)

El kit se construye **una vez** y lo consumen los siete flujos. Debe verse como WhatsApp real (los mockups validados del documento §3.3 son la referencia visual). Tokens de color en `CLAUDE.md §8`.

Regla: los componentes son **tontos** (presentacionales). No conocen los flujos; solo renderizan lo que el motor de conversación les pasa.

---

## Componentes

### `PhoneFrame`
Marco de teléfono que contiene toda la demo. Da el viewport móvil creíble.
- Ancho fijo tipo teléfono (~390px), alto tipo pantalla, esquinas redondeadas, borde/sombra sutil. Centrado en la página.
- Contiene: `ChatHeader` (arriba, fijo), `ChatThread` (scrollable, ocupa el resto), zona de `QuickReplies` (abajo).
- Incluye el botón **Reiniciar demo** (icono discreto en una esquina del marco o del header). Al tocarlo → `reiniciarDemo()` y limpia el hilo.

### `ChatHeader`
Barra superior verde de WhatsApp.
- Fondo `wa-header`. Avatar circular verde (`wa-brand`) con la inicial **C**. Título **Chispa**, subtítulo **en línea**.
- Texto blanco. Altura ~56px.

### `ChatThread`
Lista scrollable de mensajes sobre fondo `wa-chat-bg`.
- Renderiza en orden la secuencia de items (burbujas, tarjetas). Auto-scroll al último.
- Inserta el `TypingIndicator` mientras el motor "piensa" antes de una burbuja de Chispa.
- Padding lateral cómodo; separación vertical entre mensajes ~4–8px.

### `Bubble`
Burbuja de mensaje.
- Props: `emisor` (`"chispa" | "usuario"`), `texto` (soporta **negrita** `**...**`), `hora?`.
- Chispa: fondo `wa-bubble-in` (blanco), alineada a la izquierda, cola arriba-izquierda.
- Usuario: fondo `wa-bubble-out` (verde claro), alineada a la derecha, cola arriba-derecha; check `wa-tick`.
- Radio ~7–8px, sombra sutil, texto `wa-text`, hora `wa-text-2` pequeña abajo a la derecha.
- Ancho máximo ~75% del hilo. Respeta saltos de línea.

### `Card`
Tarjeta dentro de una burbuja de Chispa, para contenido estructurado (cuenta, recibo, oferta, movimientos, remesa, referido). Es el patrón visual gris/claro que se ve en los mockups.
- Props: `titulo?` (a veces en color teal/negrita, ej. "Reconocimiento facial", "¡Ganaste un premio!"), `filas?` (lista de `{ etiqueta, valor }` con `valor` en negrita alineado a la derecha), `pie?` (texto bajo la tarjeta), `contenido?` (libre).
- Variante **oferta/opciones**: filas seleccionables (ej. plazos 3/6/12), una marcada como `seleccionado` (borde `wa-brand`).
- Variante **enlace/código**: muestra un texto tipo campo (ej. `chispa.gt/r/JOSE24`, `US$300 × Q7.62`).
- Los montos en negrita a la derecha replican el estilo de los mockups.

### `QuickReplies`
Botones de respuesta rápida — **camino principal** del usuario.
- Se muestran bajo el último mensaje de Chispa cuando el estado los ofrece.
- Estilo WhatsApp: píldoras/botones con texto en teal (`wa-teal`), borde suave, apilados o en fila según quepan.
- Al tocar uno: se inserta la burbuja del usuario (`insertaBurbujaUsuario` si existe, si no el `label`), se limpian los botones y el motor avanza.
- Debajo (o como campo) hay una **entrada de texto** opcional para escribir libre; el motor la resuelve por keywords laxos.

### `TypingIndicator`
Los tres puntos "escribiendo…".
- Aparece como una burbuja de Chispa con animación de puntos, antes de cada burbuja real de Chispa.
- Duración: delay pequeño y determinista, sugerido **600–1200 ms** según el largo del texto (no aleatorio; función del número de caracteres para que sea reproducible).

---

## Comportamiento de render (lo maneja el motor, no las fichas)

1. Estado entra → por cada `MensajeBot` en `alEntrar`: mostrar `TypingIndicator` (delay) → reemplazar por la `Bubble`/`Card`.
2. Si el estado tiene `respuestasRapidas`, mostrarlas tras el último mensaje.
3. Entrada del usuario (botón o texto) → resolver `transiciones` → aplicar `efectos` (operaciones del modelo de datos) → ir al siguiente estado.
4. Los tokens `{{saldo|Q0}}` / `{{saldo|Q2}}` se resuelven contra el saldo vivo al momento de render (ver `01-modelo-datos.md §3`).

---

## Matcher de texto libre (keyword-matching laxo)

Determinista y tolerante, para que escribir también funcione:
- Normalizar: minúsculas, quitar tildes y signos, colapsar espacios.
- Match por **inclusión** de cualquiera de las `keywords` del estado.
- Números: extraer dígitos para montos (ej. "quiero 2000" → 2000), validar contra la línea/saldo.
- Si nada calza: repregunta suave y mantiene el estado (no rompe la demo).
