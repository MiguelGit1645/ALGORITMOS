import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trapmf, trimf, evaluar } from '../src/algoritmos/logicaDifusa.js';
import { SISTEMA_URGENCIA, SISTEMA_PERDIDA } from '../src/sistema/reglasDifusas.js';

test('trapmf y trimf coinciden con las definiciones de MATLAB', () => {
  assert.equal(trapmf(0, [0, 0, 20, 50]), 1); // hombro izquierdo
  assert.equal(trapmf(35, [0, 0, 20, 50]), 0.5);
  assert.equal(trapmf(60, [0, 0, 20, 50]), 0);
  assert.equal(trimf(70, [30, 70, 110]), 1);
  assert.equal(trimf(50, [30, 70, 110]), 0.5);
  assert.equal(trimf(150, [30, 70, 110]), 0);
});

test('todas las reglas usan variables y conjuntos que existen', () => {
  for (const sistema of [SISTEMA_URGENCIA, SISTEMA_PERDIDA]) {
    const variables = Object.fromEntries(sistema.entradas.map((v) => [v.nombre, v]));
    for (const regla of sistema.reglas) {
      for (const [v, c] of Object.entries(regla.si)) {
        assert.ok(variables[v]?.conjuntos[c], `${sistema.nombre}: ${v}=${c}`);
      }
      assert.ok(sistema.salida.conjuntos[regla.entonces]);
    }
  }
});

test('suelo seco con calor y sin lluvia da urgencia muy alta', () => {
  const r = evaluar(SISTEMA_URGENCIA, { lluvia: 5, temperatura: 30, humedad_suelo: 10, sensibilidad: 7 });
  assert.ok(r.valor > 80, `urgencia = ${r.valor}`);
});

test('suelo saturado da urgencia muy baja', () => {
  const r = evaluar(SISTEMA_URGENCIA, { lluvia: 130, temperatura: 20, humedad_suelo: 90, sensibilidad: 7 });
  assert.ok(r.valor < 20, `urgencia = ${r.valor}`);
});

test('la urgencia nunca aumenta si sube la humedad del suelo (monotonía)', () => {
  let anterior = Infinity;
  for (let h = 0; h <= 100; h += 5) {
    const { valor } = evaluar(SISTEMA_URGENCIA, { lluvia: 10, temperatura: 28, humedad_suelo: h, sensibilidad: 5 });
    assert.ok(valor <= anterior + 1e-9, `h=${h}: ${valor} > ${anterior}`);
    anterior = valor;
  }
});

test('un canal de tierra con calor pierde más que una tubería', () => {
  const tierra = evaluar(SISTEMA_PERDIDA, { temperatura: 30, revestimiento: 2 }).valor;
  const tubo = evaluar(SISTEMA_PERDIDA, { temperatura: 30, revestimiento: 9 }).valor;
  assert.ok(tierra > tubo);
});

test('si falta una entrada, lanza un error claro', () => {
  assert.throws(() => evaluar(SISTEMA_PERDIDA, { temperatura: 20 }), /revestimiento/);
});
