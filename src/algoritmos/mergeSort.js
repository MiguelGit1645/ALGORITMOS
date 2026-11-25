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
 * @param alPaso    función opcional que recibe cada paso (la usa la pizarra):
 *                  { tipo: 'dividir', ini, medio, fin }
 *                  { tipo: 'comparar', a, b, gana }      (a y b son elementos)
 *                  { tipo: 'mezclar', ini, fin, resultado }
 */
export function mergeSort(lista, comparar = (a, b) => a - b, stats = { comparaciones: 0 }, alPaso = null) {
  return ordenar(lista, 0);

  function ordenar(sublista, ini) {
    if (sublista.length <= 1) return sublista.slice();

    const medio = Math.floor(sublista.length / 2);
    alPaso?.({ tipo: 'dividir', ini, medio: ini + medio, fin: ini + sublista.length });
    const izquierda = ordenar(sublista.slice(0, medio), ini);
    const derecha = ordenar(sublista.slice(medio), ini + medio);
    const resultado = mezclar(izquierda, derecha);
    alPaso?.({ tipo: 'mezclar', ini, fin: ini + sublista.length, resultado });
    return resultado;
  }

  function mezclar(izquierda, derecha) {
    const resultado = new Array(izquierda.length + derecha.length);
    let i = 0;
    let j = 0;
    let k = 0;

    while (i < izquierda.length && j < derecha.length) {
      stats.comparaciones++;
      const vaIzquierda = comparar(izquierda[i], derecha[j]) <= 0;
      alPaso?.({ tipo: 'comparar', a: izquierda[i], b: derecha[j], gana: vaIzquierda ? izquierda[i] : derecha[j] });
      if (vaIzquierda) resultado[k++] = izquierda[i++];
      else resultado[k++] = derecha[j++];
    }
    while (i < izquierda.length) resultado[k++] = izquierda[i++];
    while (j < derecha.length) resultado[k++] = derecha[j++];

    return resultado;
  }
}
