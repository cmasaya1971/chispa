# Flujo: Engagement

| | |
|---|---|
| **Código** | `engagement` |
| **Nombre** | Engagement |
| **Funcionalidades** | **J1** Referidos · **J2** Cashback |
| **Precondición** | Ninguna sensible (mostrar beneficios no requiere gate; acreditar sí ocurre en sesión) |
| **Copy** | Validado. Fuente: §3.3 "Engagement — J1·J2" (imagen). |

---

## 1. Lógica (§3.3)

Chispa ofrece el beneficio: por cada persona que el usuario invite, gana un premio (**J1**). Cuando un amigo se une y usa Chispa, se le acredita; además, un porcentaje de sus pagos vuelve como cashback (**J2**).

> Realismo (principio 1: el usuario pide, el sistema no adivina): el flujo **lo inicia el usuario** (toca "Invitá y ganá" o escribe sobre referidos/cashback); recién ahí Chispa presenta el beneficio.

---

## 2. Copy validado — transcripción literal

| # | Emisor | Texto |
|---|---|---|
| 1 | Chispa (tarjeta) | **Invitá y ganá**<br>José, ¿sabías que Chispa te premia por invitar? Por cada persona que invités a usar la app, ganás **Q30**. Compartí tu enlace:<br>`chispa.gt/r/JOSE24` |
| 2 | Usuario | Ya se lo mandé a Luis |
| 3 | Chispa (tarjeta) | **¡Ganaste un premio!**<br>Tu amigo Luis Pérez ya se unió y usó Chispa. Te acreditamos **Q30** a tu saldo. |
| 4 | Chispa (tarjeta) | **Cashback del mes**<br>Además, por tus pagos con Chispa te devolvimos **Q12**. Ya están en tu monedero. |

**Procedencia:** `Q30` = `engagement.premioReferido`. `chispa.gt/r/JOSE24` = `engagement.enlaceReferido`. `Luis Pérez` = `engagement.referidoDemo.nombre`. `Q12` = `engagement.cashbackMes`.

---

## 3. Máquina de estados

```ts
const flujoEngagement: Flujo = {
  codigo: "engagement",
  nombre: "Engagement",
  funcionalidades: ["J1", "J2"],
  disparador: {
    ctaMenu: "menu_invita",
    keywords: ["invitar", "referido", "referidos", "premio", "cashback", "invitá y ganá", "gano"],
  },
  estadoInicial: "invita",
  estados: {

    // ── J1 · Invitación ──────────────────────────────────────
    invita: {
      id: "invita",
      funcionalidad: "J1",
      alEntrar: [
        { tipo: "tarjeta", tarjeta: {
            titulo: "**Invitá y ganá**",
            contenido: "José, ¿sabías que Chispa te premia por invitar? Por cada persona que invités a usar la app, ganás **Q30**. Compartí tu enlace:",
            enlace: "chispa.gt/r/JOSE24",
        }, datos: ["engagement.premioReferido=30", "engagement.enlaceReferido=chispa.gt/r/JOSE24"] },
      ],
      respuestasRapidas: [
        { id: "compartir", label: "Ya lo compartí", insertaBurbujaUsuario: "Ya se lo mandé a Luis" },
      ],
      esperaTexto: true,
      transiciones: [
        { cuando: { respuestaRapida: "compartir" }, efectos: [{ op: "acreditarReferido" }], irA: "premio" },
        { cuando: { keywords: ["mandé", "mande", "compartí", "comparti", "se lo envié", "luis", "listo"] },
          efectos: [{ op: "acreditarReferido" }], irA: "premio" },
      ],
    },

    // ── J1 · Premio acreditado ───────────────────────────────
    premio: {
      id: "premio",
      funcionalidad: "J1",
      alEntrar: [
        { tipo: "tarjeta", tarjeta: {
            titulo: "**¡Ganaste un premio!**",
            contenido: "Tu amigo Luis Pérez ya se unió y usó Chispa. Te acreditamos **Q30** a tu saldo.",
        }, datos: ["referidoDemo.nombre=Luis Pérez", "premioReferido=30"] },
      ],
      // encadena a mostrar el cashback (mismo turno de Chispa)
      transiciones: [{ cuando: { porDefecto: true }, efectos: [{ op: "acreditarCashback" }], irA: "cashback" }],
    },

    // ── J2 · Cashback ────────────────────────────────────────
    cashback: {
      id: "cashback",
      funcionalidad: "J2",
      final: true,
      alEntrar: [
        { tipo: "tarjeta", tarjeta: {
            titulo: "**Cashback del mes**",
            contenido: "Además, por tus pagos con Chispa te devolvimos **Q12**. Ya están en tu monedero.",
        }, datos: ["cashbackMes=12"] },
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
| Premio por referido | `acreditarReferido()` | saldo +Q30; movimiento "Premio referido" |
| Cashback del mes | `acreditarCashback()` | saldo +Q12; movimiento "Cashback" |

En semilla, tras el flujo el saldo sube Q42 (1250 → 1292). El copy validado no muestra el saldo total, así que no hay número que calzar; solo se aplican los créditos para mantener consistencia si luego se consulta el monedero.

---

## 5. Notas del molde

- El flujo lo **inicia el usuario** (respeta "el sistema no adivina"). No debe dispararse solo.
- `premio` → `cashback` encadenan como dos tarjetas seguidas de Chispa (como en el mockup), con su indicador "escribiendo…" entre ambas.
- Los créditos Q30 y Q12 se aplican una sola vez por corrida del flujo; reiniciar demo los revierte.

---

## 6. Criterios de aceptación

1. El usuario inicia el flujo (botón "Invitá y ganá" o texto sobre referidos); Chispa muestra la tarjeta con **Q30** y el enlace `chispa.gt/r/JOSE24`.
2. Al indicar que compartió, aparece "**¡Ganaste un premio!**" con **Luis Pérez** y **Q30**, seguido de "**Cashback del mes**" con **Q12**.
3. Los créditos Q30 y Q12 se acreditan al saldo (consistencia con Monedero) y persisten hasta reiniciar.
4. El flujo no se dispara proactivamente.
5. Copy idéntico al validado.
