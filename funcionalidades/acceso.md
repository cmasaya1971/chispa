# Flujo: Acceso (gate)

| | |
|---|---|
| **Código** | `acceso` |
| **Nombre** | Acceso |
| **Funcionalidades** | **A10** Rostro validado con RENAP |
| **Rol especial** | Es el **gate de autenticación reutilizable**. Otros flujos con `requiereAuth` lo invocan antes de su primera acción sensible. |
| **Copy** | Validado. Fuente: documento maestro §3.3, "Acceso — A10" (imagen). |

---

## 1. Lógica (§3.3)

El usuario pide su primera acción sensible (por ejemplo, ver su saldo). Si la sesión no está autenticada, se hace reconocimiento facial validado contra RENAP; si coincide, la sesión queda confiable —no vuelve a pedirlo— y se continúa con la acción pedida.

---

## 2. Cómo se invoca

- **Como precondición de otro flujo:** el flujo con `precondiciones: [{ tipo:"requiereAuth", flujoGate:"acceso" }]` corre `acceso` primero; al confirmar, regresa a su estado inicial.
- **Directo (ver saldo):** el usuario escribe "quiero ver mi saldo" → dispara el flujo `monedero` (B1), que tiene `requiereAuth` → corre este gate → luego B1 muestra la cuenta. La conversación validada de la imagen A10 es exactamente esa combinación (gate + tarjeta de cuenta de B1).

Si `sesion.autenticada` ya es `true`, el gate se salta por completo.

---

## 3. Copy validado — transcripción literal

| # | Emisor | Texto |
|---|---|---|
| 1 | Usuario | Quiero ver mi saldo *(o la acción sensible que haya pedido)* |
| 2 | Chispa | Con gusto. Como es tu primera consulta de hoy, validá tu identidad para continuar. |
| 3 | Chispa (tarjeta) | **Reconocimiento facial** · Se valida contra RENAP · [ **Validar mi rostro** ] |
| 4 | Chispa (tarjeta) | **Identidad confirmada con RENAP** |

> La tarjeta de cuenta ("¡Hola, José! Esta es tu cuenta:" + Titular/Cuenta/Saldo) pertenece a **B1** (`monedero.md`) y se muestra después del gate cuando la acción pedida era ver el saldo.

---

## 4. Máquina de estados

```ts
const flujoAcceso: Flujo = {
  codigo: "acceso",
  nombre: "Acceso",
  funcionalidades: ["A10"],
  disparador: { keywords: ["identidad", "acceso", "validar"] }, // normalmente se invoca como gate
  estadoInicial: "pedirIdentidad",
  estados: {

    pedirIdentidad: {
      id: "pedirIdentidad",
      funcionalidad: "A10",
      alEntrar: [
        { tipo: "burbuja", texto: "Con gusto. Como es tu primera consulta de hoy, validá tu identidad para continuar." },
        { tipo: "tarjeta", tarjeta: {
            titulo: "**Reconocimiento facial**",
            contenido: "Se valida contra RENAP",
        } },
      ],
      respuestasRapidas: [
        { id: "validar", label: "Validar mi rostro" },
      ],
      transiciones: [
        { cuando: { respuestaRapida: "validar" }, efectos: [{ op: "autenticar" }], irA: "confirmado" },
        { cuando: { keywords: ["validar", "rostro", "si", "sí", "ok"] }, efectos: [{ op: "autenticar" }], irA: "confirmado" },
      ],
    },

    confirmado: {
      id: "confirmado",
      funcionalidad: "A10",
      final: true, // devuelve control al flujo invocador (o continúa a B1 si era "ver saldo")
      alEntrar: [
        { tipo: "tarjeta", tarjeta: { titulo: "**Identidad confirmada con RENAP**" } },
      ],
      transiciones: [],
    },

  },
};
```

---

## 5. Efectos sobre el mock

| Efecto | Operación | Resultado |
|---|---|---|
| Validar rostro | `autenticar()` | `sesion.autenticada` → `true` (persiste toda la sesión) |

Reiniciar demo vuelve `autenticada` a `false`.

---

## 6. Criterios de aceptación

1. Cualquier acción sensible con la sesión sin autenticar corre este gate primero.
2. El copy del gate es idéntico al validado; la tarjeta muestra "Reconocimiento facial / Se valida contra RENAP" y el botón "Validar mi rostro".
3. Al validar, `sesion.autenticada = true` y **no se vuelve a pedir** en el resto de la sesión.
4. Tras confirmar, el flujo continúa exactamente donde iba (ej. muestra el saldo si eso se pidió).
5. Determinista; sin cámara real ni IA — el botón simula la validación.
