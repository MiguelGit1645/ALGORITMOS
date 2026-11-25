import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dijkstra, reconstruirRuta } from '../src/algoritmos/dijkstra.js';
import { MinHeap } from '../src/algoritmos/minHeap.js';
import { planificar } from '../src/sistema/planificador.js';

const nodos = ['A', 'B', 'C', 'D', 'E', 'F'];
const aristas = [
  { id: 'AB', desde: 'A', hasta: 'B', peso: 7 },
  { id: 'AC', desde: 'A', hasta: 'C', peso: 9 },
  { id: 'AF', desde: 'A', hasta: 'F', peso: 14 },
  { id: 'BC', desde: 'B', hasta: 'C', peso: 10 },
  { id: 'BD', desde: 'B', hasta: 'D', peso: 15 },
  { id: 'CD', desde: 'C', hasta: 'D', peso: 11 },
  { id: 'CF', desde: 'C', hasta: 'F', peso: 2 },
  { id: 'DE', desde: 'D', hasta: 'E', peso: 6 },
  { id: 'EF', desde: 'E', hasta: 'F', peso: 9 },
];

test('MinHeap extrae en orden de prioridad', () => {
  const h = new MinHeap();
  [5, 1, 4, 2, 3].forEach((p) => h.insertar(p, `v${p}`));
  const salida = [];
  while (h.tamano) salida.push(h.extraer().prioridad);
  assert.deepEqual(salida, [1, 2, 3, 4, 5]);
});

test('Dijkstra encuentra el camino mínimo', () => {
  const r = dijkstra(nodos, aristas, 'A');
  assert.equal(r.distancia.get('E'), 20);
  assert.deepEqual(reconstruirRuta(r, 'E').nodos, ['A', 'C', 'F', 'E']);
});

test('Dijkstra rechaza pesos negativos', () => {
  assert.throws(() => dijkstra(['A', 'B'], [{ id: 'x', desde: 'A', hasta: 'B', peso: -1 }], 'A'), /negativos/);
});

test('Ruta inexistente devuelve null', () => {
  const r = dijkstra(['A', 'B'], [], 'A');
  assert.equal(reconstruirRuta(r, 'B'), null);
});

test('Planificador: la ruta de Dijkstra nunca es peor que la ruta por la red', () => {
  for (const escenario of ['seca', 'normal', 'lluvias']) {
    const { emergencia } = planificar(escenario);
    assert.ok(emergencia.optima.costo <= emergencia.porRed.costo + 1e-9, escenario);
  }
});

test('Planificador: todas las parcelas con riego tienen turno y ruta', () => {
  for (const escenario of ['seca', 'normal', 'lluvias']) {
    const r = planificar(escenario);
    for (const p of r.parcelas.filter((x) => x.necesitaRiego)) {
      assert.ok(p.turno >= 1 && p.ruta, `${escenario} ${p.id}`);
    }
  }
});

test('Dijkstra informa extracciones y relajaciones', () => {
  const pasos = [];
  const r = dijkstra(nodos, aristas, 'A', { alPaso: (p) => pasos.push(p) });
  const extraidos = pasos.filter((p) => p.tipo === 'extraer');
  assert.equal(extraidos.length, r.visitados);
  assert.equal(extraidos[0].nodo, 'A');
  for (const p of extraidos) assert.equal(p.distancia, r.distancia.get(p.nodo));
});
