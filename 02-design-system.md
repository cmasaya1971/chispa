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

---

## Componentes del flujo de crédito (estilo ZIGI, dentro del chat)

Se renderizan como tarjetas dentro de burbujas de Chispa. Todos simulados, deterministas, sin backend ni cámara.

### `Slider`
Selector de monto. Props: `min`, `max`, `paso`, `valor`, `formato` (Q0). Muestra el valor grande arriba (ej. **Q2,000**). Al arrastrar, dispara `recalcularOferta` y actualiza el resumen en vivo. Riel en `wa-brand`.

### `SelectorSegmentado`
Píldoras mutuamente excluyentes para **frecuencia** (Semanal / Quincenal / Mensual) y **N.º de pagos** (opciones según la frecuencia). La opción activa va con fondo/borde `wa-brand`. Cambiar cualquiera dispara `recalcularOferta`.

### `ResumenOferta`
Bloque de costo transparente bajo el configurador: **Cuota {{cuota}} / {{unidad}}**, **Total a pagar {{total}}**, y nota "{{monto}} + {{intereses}} de intereses (5% mensual)".

### `ConfirmacionCard`
Tarjeta "Confirmá tu préstamo": filas etiqueta→valor (monto con acción **Editar**, intereses, total, solicitante, pagos, fecha primer pago), bloque **Método de pago** (débito automático + pago adelantado con check `wa-brand`) y fila-enlace **Ver contrato del préstamo** con chevron.

### `ContratoCard`
Tarjeta con el resumen del contrato (formas de pago · costo · documentos por correo) y, embebido, el `SignaturePad`.

### `SignaturePad`
**Canvas real** donde el usuario firma con el dedo (touch) o mouse. Trazo en tinta oscura sobre fondo claro, botón "Borrar". El botón "Firmar y continuar" se habilita solo cuando hay trazo. Al firmar, se guarda el `dataURL` en memoria y luego se muestra en el comprobante. (Es el "plus" de Chispa.)

### `DeclaracionesCard`
Checklist con dos casillas obligatorias (T&C y PEP/US/CPE). Junto a la segunda, enlaces de info **¿Qué es PEP?** / **¿U.S. Person?** / **¿CPE?** que abren un popover con el texto de `credito.infoDeclaraciones`. El botón "Acepto y declaro" se habilita al marcar ambas.

### `BiometricCapture`
Simulación de captura facial estilo ZIGI: marco circular con anillo de progreso animado. No usa cámara. El botón "Validar mi rostro" corre la animación (determinista, ~1.5 s) y termina en éxito → "¡Identidad confirmada con RENAP!".

### `ComprobanteCard`
Comprobante "Préstamo depositado": encabezado con check verde y fecha/hora, bloque destacado (Total a pagar + Monto solicitado), filas de detalle (Facturar a, DPI, Intereses, Cuotas, Forma de pago, Primera cuota), la **firma** renderizada, y botones **Descargar** / **Compartir** (PDF simulado, muestra un aviso).

### `CreditoActivoCard` (para Monedero · #8)
Tarjeta de deuda viva: "Tu crédito", **Debés {{saldoPendiente}}**, **Pagaste {{pagado}}**, barra de progreso, próxima cuota y fecha, botón **Pagar cuota** → `pagarCuota`.
