// Formatters de moneda GTQ (lado servidor). El copy validado no es uniforme:
// algunos montos van sin decimales y otros con dos. Ver 01-modelo-datos.md §3.
const miles = new Intl.NumberFormat("en-US");

/** `Q1,250` — sin decimales. */
export function fmtQ0(n: number): string {
  return "Q" + miles.format(Math.round(n));
}

/** `Q1,250.00` — dos decimales. */
export function fmtQ2(n: number): string {
  return "Q" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
