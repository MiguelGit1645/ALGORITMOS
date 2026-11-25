import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kruskal, podarArbol } from '../src/algoritmos/kruskal.js';
import { UnionFind } from '../src/algoritmos/unionFind.js';

// Grafo clásico de libro: MST mínimo = 16, MST máximo = 32
const nodos = ['A', 'B', 'C', 'D', 'E'];
const aristas = [
  { id: 'AB', desde: 'A', hasta: 'B', peso: 4 },
  { id: 'AC', desde: 'A', hasta: 'C', peso: 8 },
  { id: 'BC', desde: 'B', hasta: 'C', peso: 11 },
  { id: 'BD', desde: 'B', hasta: 'D', peso: 2 },
  { id: 'CE', desde: 'C', hasta: 'E', peso: 7 },
  { id: 'DE', desde: 'D', hasta: 'E', peso: 6 },
  { id: 'CD', desde: 'C', hasta: 'D', peso: 4 },
];

test('Union-Find detecta ciclos', () => {
  const uf = new UnionFind(['x', 'y', 'z']);
  assert.equal(uf.unir('x', 'y'), true);
  assert.equal(uf.unir('y', 'z'), true);
  assert.equal(uf.unir('x', 'z'), false);
});

test('Kruskal mínimo', () => {
  const r = kruskal(nodos, aristas);
  assert.equal(r.arbol.length, nodos.length - 1);
  assert.equal(r.total, 16);
  assert.equal(r.conexo, true);
});

test('Kruskal máximo', () => {
  const r = kruskal(nodos, aristas, { maximo: true });
  assert.equal(r.arbol.length, nodos.length - 1);
  assert.equal(r.total, 32);
});

test('Kruskal en grafo desconectado devuelve un bosque', () => {
  const r = kruskal(['A', 'B', 'C'], [{ id: 'AB', desde: 'A', hasta: 'B', peso: 1 }]);
  assert.equal(r.conexo, false);
  assert.equal(r.arbol.length, 1);
});

test('La poda quita ramas que no llevan a terminales', () => {
  // Árbol: A-B-C y B-D. Solo A y C son terminales → se elimina B-D.
  const arbol = [
    { id: 'AB', desde: 'A', hasta: 'B' },
    { id: 'BC', desde: 'B', hasta: 'C' },
    { id: 'BD', desde: 'B', hasta: 'D' },
  ];
  const podado = podarArbol(arbol, ['A', 'C']);
  assert.deepEqual(podado.map((a) => a.id).sort(), ['AB', 'BC']);
});
