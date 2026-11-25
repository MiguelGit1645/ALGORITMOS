/**
 * MERGE SORT (ordenamiento por mezcla).
 *
 * - Tiempo:  O(n log n) en el mejor, promedio y peor caso.
 * - Espacio: O(n) adicional (los arreglos de la mezcla).
 * - Estable: si dos elementos empatan, conserva su orden original.
 *   (Por eso se usa `<= 0` al mezclar: ante un empate gana el de la izquierda.)
 *
 * No modifica la lista original: devuelve una nueva.
 *
 * @param lista     elementos a ordenar
 * @param comparar  (a, b) => número negativo si a va antes que b
 * @param stats     objeto opcional donde se cuentan las comparaciones
 */
export function mergeSort(lista, comparar = (a, b) => a - b, stats = { comparaciones: 0 }) {
  if (lista.length <= 1) return lista.slice();

  const medio = Math.floor(lista.length / 2);
  const izquierda = mergeSort(lista.slice(0, medio), comparar, stats);
  const derecha = mergeSort(lista.slice(medio), comparar, stats);
  return mezclar(izquierda, derecha, comparar, stats);
}

function mezclar(izquierda, derecha, comparar, stats) {
  const resultado = new Array(izquierda.length + derecha.length);
  let i = 0;
  let j = 0;
  let k = 0;

  while (i < izquierda.length && j < derecha.length) {
    stats.comparaciones++;
    if (comparar(izquierda[i], derecha[j]) <= 0) resultado[k++] = izquierda[i++];
    else resultado[k++] = derecha[j++];
  }
  while (i < izquierda.length) resultado[k++] = izquierda[i++];
  while (j < derecha.length) resultado[k++] = derecha[j++];

  return resultado;
}
