import { MinHeap } from './minHeap.js';

/**
 * DIJKSTRA: caminos de costo mínimo desde un nodo origen a todos los demás.
 *
 * Usa un montículo de mínimos (MinHeap) como cola de prioridad.
 * Complejidad: O((V + E) log V).
 * Requisito: todos los pesos deben ser >= 0 (si no, el algoritmo no es correcto).
 *
 * @param nodos    ids de los nodos
 * @param aristas  [{ id, desde, hasta, ... }]
 * @param origen   id del nodo de partida
 * @param opciones { peso: arista => número, dirigido: boolean,
 *                   alPaso: función opcional (la usa la pizarra) que recibe
 *                     { tipo: 'extraer', nodo, distancia }
 *                     { tipo: 'relajar', desde, hacia, arista, anterior, nueva, mejora } }
 * @returns { origen, distancia: Map, previo: Map, visitados: número }
 */
export function dijkstra(nodos, aristas, origen, { peso = (a) => a.peso, dirigido = false, alPaso = null } = {}) {
  if (!nodos.includes(origen)) throw new Error(`El origen "${origen}" no está en el grafo`);

  // Lista de adyacencia
  const adyacencia = new Map(nodos.map((n) => [n, []]));
  for (const arista of aristas) {
    const w = peso(arista);
    if (w < 0) throw new Error(`Dijkstra no admite pesos negativos (arista ${arista.id}: ${w})`);
    if (!adyacencia.has(arista.desde) || !adyacencia.has(arista.hasta)) {
      throw new Error(`La arista ${arista.id} usa un nodo que no está en el grafo`);
    }
    adyacencia.get(arista.desde).push({ vecino: arista.hasta, w, arista });
    if (!dirigido) adyacencia.get(arista.hasta).push({ vecino: arista.desde, w, arista });
  }

  const distancia = new Map(nodos.map((n) => [n, Infinity]));
  const previo = new Map(); // nodo -> { nodo anterior, arista usada }
  const cerrados = new Set();
  const cola = new MinHeap();

  distancia.set(origen, 0);
  cola.insertar(0, origen);

  while (cola.tamano > 0) {
    const { prioridad: d, valor: u } = cola.extraer();
    if (cerrados.has(u)) continue; // entrada vieja del montículo
    cerrados.add(u);
    alPaso?.({ tipo: 'extraer', nodo: u, distancia: d });

    for (const { vecino, w, arista } of adyacencia.get(u)) {
      if (cerrados.has(vecino)) continue; // ya tiene su distancia definitiva
      const nueva = d + w;
      const anterior = distancia.get(vecino);
      alPaso?.({ tipo: 'relajar', desde: u, hacia: vecino, arista, anterior, nueva, mejora: nueva < anterior });
      if (nueva < anterior) {
        distancia.set(vecino, nueva);
        previo.set(vecino, { nodo: u, arista });
        cola.insertar(nueva, vecino);
      }
    }
  }

  return { origen, distancia, previo, visitados: cerrados.size };
}

/** Reconstruye la ruta origen → destino. Devuelve null si no hay camino. */
export function reconstruirRuta(resultado, destino) {
  const costo = resultado.distancia.get(destino);
  if (costo === undefined || costo === Infinity) return null;

  const nodos = [destino];
  const aristas = [];
  let actual = destino;
  while (actual !== resultado.origen) {
    const paso = resultado.previo.get(actual);
    aristas.unshift(paso.arista);
    nodos.unshift(paso.nodo);
    actual = paso.nodo;
  }
  return { nodos, aristas, costo };
}
