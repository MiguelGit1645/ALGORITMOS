import { mergeSort } from './mergeSort.js';
import { UnionFind } from './unionFind.js';

/**
 * KRUSKAL: árbol de expansión mínimo (o máximo) de un grafo no dirigido.
 *
 *  1. Ordena las aristas por peso (con nuestro propio Merge Sort).
 *  2. Recorre las aristas en ese orden y agrega cada una si NO forma ciclo
 *     (lo comprueba Union-Find).
 *  3. Termina cuando tiene V − 1 aristas.
 *
 * Complejidad: O(E log E) por el ordenamiento + O(E·α(V)) por Union-Find.
 *
 * - Mínimo (maximo = false): red de riego con la menor pérdida total.
 * - Máximo (maximo = true):  red de drenaje con la mayor capacidad total.
 *   Propiedad útil: en el árbol máximo, el camino entre dos nodos es el de
 *   MAYOR cuello de botella (la arista más débil es lo más fuerte posible).
 *
 * @param nodos    ids de los nodos
 * @param aristas  [{ id, desde, hasta, ... }]
 * @param opciones { peso: arista => número, maximo: boolean }
 */
export function kruskal(nodos, aristas, { peso = (a) => a.peso, maximo = false } = {}) {
  const stats = { comparaciones: 0 };
  const comparar = maximo ? (a, b) => peso(b) - peso(a) : (a, b) => peso(a) - peso(b);
  const ordenadas = mergeSort(aristas, comparar, stats);

  const conjuntos = new UnionFind(nodos);
  const arbol = [];
  const descartadas = []; // aristas rechazadas por formar ciclo
  let total = 0;

  for (const arista of ordenadas) {
    if (arbol.length === nodos.length - 1) break;
    if (conjuntos.unir(arista.desde, arista.hasta)) {
      arbol.push(arista);
      total += peso(arista);
    } else {
      descartadas.push(arista);
    }
  }

  return {
    arbol,
    total,
    descartadas,
    ordenadas,
    conexo: arbol.length === nodos.length - 1,
    comparaciones: stats.comparaciones,
  };
}

/**
 * Poda de hojas: quita del árbol las ramas que solo llevan a nodos
 * que NO necesitan servicio (no son "terminales").
 * Es el paso clásico para aproximar un árbol de Steiner a partir de un MST.
 * Complejidad: O(V + E).
 */
export function podarArbol(arbol, terminales) {
  const esTerminal = new Set(terminales);
  const grado = new Map();
  const incidentes = new Map();
  for (const a of arbol) {
    for (const n of [a.desde, a.hasta]) {
      grado.set(n, (grado.get(n) ?? 0) + 1);
      if (!incidentes.has(n)) incidentes.set(n, []);
      incidentes.get(n).push(a);
    }
  }

  const activas = new Set(arbol);
  const cola = [...grado.keys()].filter((n) => grado.get(n) === 1 && !esTerminal.has(n));

  while (cola.length) {
    const hoja = cola.pop();
    const arista = incidentes.get(hoja).find((a) => activas.has(a));
    if (!arista) continue;
    activas.delete(arista);
    grado.set(hoja, 0);
    const otro = arista.desde === hoja ? arista.hasta : arista.desde;
    grado.set(otro, grado.get(otro) - 1);
    if (grado.get(otro) === 1 && !esTerminal.has(otro)) cola.push(otro);
  }

  return arbol.filter((a) => activas.has(a));
}
