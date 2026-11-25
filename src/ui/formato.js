/** Utilidades de formato y color compartidas por la interfaz. */

export const num = (v, decimales = 0) =>
  Number(v).toLocaleString('es-BO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

const mezclar = (a, b, t) => {
  const ca = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const cb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

/** Escala de tierra: salvia (sin urgencia) → ocre → óxido (crítico). */
export function colorUrgencia(u) {
  const t = Math.min(1, Math.max(0, u / 100));
  return t < 0.5 ? mezclar('#7d9a6a', '#d49a2a', t / 0.5) : mezclar('#d49a2a', '#b0482c', (t - 0.5) / 0.5);
}

/** Escala de agua para la humedad en época de lluvias. */
export function colorHumedad(h) {
  const t = Math.min(1, Math.max(0, (h - 30) / 60));
  return mezclar('#cfe0ee', '#1e64a8', t);
}

/** Texto claro u oscuro según el fondo. */
export function tintaSobre(hex) {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#16261e' : '#ffffff';
}
