/**
 * Algoritmos de ordenamiento usados SOLO para la comparación empírica
 * contra Merge Sort (sección "Análisis" de la app).
 * Todos cuentan comparaciones y no modifican la lista original.
 */

/** Selección: O(n²) siempre. No es estable. */
export function seleccion(lista, comparar, stats = { comparaciones: 0 }) {
  const a = lista.slice();
  for (let i = 0; i < a.length - 1; i++) {
    let menor = i;
    for (let j = i + 1; j < a.length; j++) {
      stats.comparaciones++;
      if (comparar(a[j], a[menor]) < 0) menor = j;
    }
    if (menor !== i) [a[i], a[menor]] = [a[menor], a[i]];
  }
  return a;
}

/** Inserción: O(n²) peor caso, O(n) si la lista ya está casi ordenada. Estable. */
export function insercion(lista, comparar, stats = { comparaciones: 0 }) {
  const a = lista.slice();
  for (let i = 1; i < a.length; i++) {
    const actual = a[i];
    let j = i - 1;
    while (j >= 0) {
      stats.comparaciones++;
      if (comparar(a[j], actual) <= 0) break;
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = actual;
  }
  return a;
}

/** Shell sort con brechas n/2, n/4, ..., 1. Entre O(n log² n) y O(n²). No es estable. */
export function shell(lista, comparar, stats = { comparaciones: 0 }) {
  const a = lista.slice();
  for (let brecha = Math.floor(a.length / 2); brecha > 0; brecha = Math.floor(brecha / 2)) {
    for (let i = brecha; i < a.length; i++) {
      const actual = a[i];
      let j = i;
      while (j >= brecha) {
        stats.comparaciones++;
        if (comparar(a[j - brecha], actual) <= 0) break;
        a[j] = a[j - brecha];
        j -= brecha;
      }
      a[j] = actual;
    }
  }
  return a;
}
