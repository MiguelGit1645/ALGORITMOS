import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSort } from '../src/algoritmos/mergeSort.js';
import { seleccion, insercion, shell } from '../src/algoritmos/ordenamientosComparativa.js';

const aleatorios = (n, semilla = 7) => {
  let s = semilla;
  return Array.from({ length: n }, () => (s = (s * 1103515245 + 12345) % 2147483648) % 1000);
};

test('Merge Sort ordena igual que el sort nativo', () => {
  for (const n of [0, 1, 2, 3, 10, 101, 1000]) {
    const datos = aleatorios(n, n + 1);
    assert.deepEqual(mergeSort(datos), [...datos].sort((a, b) => a - b));
  }
});

test('Merge Sort es estable', () => {
  const parcelas = [
    { id: 'A', urgencia: 50 },
    { id: 'B', urgencia: 80 },
    { id: 'C', urgencia: 50 },
    { id: 'D', urgencia: 80 },
    { id: 'E', urgencia: 50 },
  ];
  const ordenadas = mergeSort(parcelas, (a, b) => b.urgencia - a.urgencia);
  assert.deepEqual(ordenadas.map((p) => p.id), ['B', 'D', 'A', 'C', 'E']);
});

test('Merge Sort no modifica la lista original', () => {
  const datos = [3, 1, 2];
  mergeSort(datos);
  assert.deepEqual(datos, [3, 1, 2]);
});

test('Merge Sort hace como máximo n·log2(n) comparaciones', () => {
  const n = 1024;
  const stats = { comparaciones: 0 };
  mergeSort(aleatorios(n), (a, b) => a - b, stats);
  assert.ok(stats.comparaciones <= n * Math.log2(n), `${stats.comparaciones}`);
});

test('Selección, Inserción y Shell también ordenan bien', () => {
  const datos = aleatorios(300);
  const esperado = [...datos].sort((a, b) => a - b);
  const cmp = (a, b) => a - b;
  assert.deepEqual(seleccion(datos, cmp), esperado);
  assert.deepEqual(insercion(datos, cmp), esperado);
  assert.deepEqual(shell(datos, cmp), esperado);
});

test('Merge Sort informa sus pasos y el último deja la lista ordenada', () => {
  const pasos = [];
  const stats = { comparaciones: 0 };
  const r = mergeSort([5, 2, 9, 1, 7], (a, b) => a - b, stats, (p) => pasos.push(p));
  const comparaciones = pasos.filter((p) => p.tipo === 'comparar').length;
  assert.equal(comparaciones, stats.comparaciones);
  const ultimo = pasos.at(-1);
  assert.equal(ultimo.tipo, 'mezclar');
  assert.deepEqual(ultimo.resultado, r);
});
