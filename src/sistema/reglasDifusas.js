/**
 * Definición de los DOS sistemas difusos Mamdani del proyecto.
 * (Las mismas variables y reglas están en matlab/sistema_riego.m)
 *
 * Sistema 1 — URGENCIA DE RIEGO de cada parcela (0 a 100)
 * Sistema 2 — TASA DE PÉRDIDA de agua de cada canal (% por cada 100 m)
 */

// ───────────────────────── Sistema 1: urgencia de riego ─────────────────────────

const lluvia = {
  nombre: 'lluvia',
  unidad: 'mm/mes',
  rango: [0, 150],
  conjuntos: {
    baja: ['trapmf', [0, 0, 20, 50]],
    media: ['trimf', [30, 70, 110]],
    alta: ['trapmf', [90, 120, 150, 150]],
  },
};

const temperatura = {
  nombre: 'temperatura',
  unidad: '°C',
  rango: [5, 35],
  conjuntos: {
    fria: ['trapmf', [5, 5, 10, 16]],
    templada: ['trimf', [12, 19, 26]],
    calida: ['trapmf', [22, 28, 35, 35]],
  },
};

const humedadSuelo = {
  nombre: 'humedad_suelo',
  unidad: '%',
  rango: [0, 100],
  conjuntos: {
    seca: ['trapmf', [0, 0, 20, 40]],
    adecuada: ['trimf', [30, 50, 70]],
    saturada: ['trapmf', [60, 80, 100, 100]],
  },
};

const sensibilidad = {
  nombre: 'sensibilidad',
  unidad: '0–10',
  rango: [0, 10],
  conjuntos: {
    baja: ['trapmf', [0, 0, 2, 5]],
    media: ['trimf', [3, 5, 7]],
    alta: ['trapmf', [5, 8, 10, 10]],
  },
};

const urgencia = {
  nombre: 'urgencia',
  unidad: 'puntos',
  rango: [0, 100],
  conjuntos: {
    muy_baja: ['trapmf', [0, 0, 10, 25]],
    baja: ['trimf', [15, 30, 45]],
    media: ['trimf', [35, 50, 65]],
    alta: ['trimf', [55, 70, 85]],
    muy_alta: ['trapmf', [75, 90, 100, 100]],
  },
};

export const SISTEMA_URGENCIA = {
  nombre: 'Urgencia de riego',
  entradas: [lluvia, temperatura, humedadSuelo, sensibilidad],
  salida: urgencia,
  reglas: [
    // Suelo saturado: no se riega
    { si: { humedad_suelo: 'saturada' }, entonces: 'muy_baja' },
    // Suelo seco
    { si: { humedad_suelo: 'seca', lluvia: 'baja', temperatura: 'calida' }, entonces: 'muy_alta' },
    { si: { humedad_suelo: 'seca', lluvia: 'baja', temperatura: 'templada' }, entonces: 'alta' },
    { si: { humedad_suelo: 'seca', lluvia: 'baja', temperatura: 'fria' }, entonces: 'media' },
    { si: { humedad_suelo: 'seca', lluvia: 'media' }, entonces: 'alta' },
    { si: { humedad_suelo: 'seca', lluvia: 'alta' }, entonces: 'media' },
    // Suelo con humedad adecuada
    { si: { humedad_suelo: 'adecuada', lluvia: 'baja', temperatura: 'calida' }, entonces: 'alta' },
    { si: { humedad_suelo: 'adecuada', lluvia: 'baja', temperatura: 'templada' }, entonces: 'media' },
    { si: { humedad_suelo: 'adecuada', lluvia: 'baja', temperatura: 'fria' }, entonces: 'baja' },
    { si: { humedad_suelo: 'adecuada', lluvia: 'media' }, entonces: 'baja' },
    { si: { humedad_suelo: 'adecuada', lluvia: 'alta' }, entonces: 'muy_baja' },
    // Sensibilidad del cultivo al estrés hídrico
    { si: { sensibilidad: 'alta', humedad_suelo: 'seca' }, entonces: 'muy_alta' },
    { si: { sensibilidad: 'alta', humedad_suelo: 'adecuada', temperatura: 'calida' }, entonces: 'alta' },
    { si: { sensibilidad: 'alta', humedad_suelo: 'adecuada' }, entonces: 'media' },
    { si: { sensibilidad: 'media', humedad_suelo: 'seca' }, entonces: 'alta' },
    { si: { sensibilidad: 'baja', humedad_suelo: 'adecuada' }, entonces: 'muy_baja' },
    { si: { sensibilidad: 'baja', humedad_suelo: 'seca', lluvia: 'baja' }, entonces: 'media' },
  ],
};

// ───────────────────────── Sistema 2: pérdida en canales ─────────────────────────

const revestimiento = {
  nombre: 'revestimiento',
  unidad: '0–10',
  rango: [0, 10],
  conjuntos: {
    tierra: ['trapmf', [0, 0, 2, 4]],
    mamposteria: ['trimf', [3, 5, 7]],
    tuberia: ['trapmf', [6, 8, 10, 10]],
  },
};

const tasaPerdida = {
  nombre: 'tasa_perdida',
  unidad: '% cada 100 m',
  rango: [0, 6],
  conjuntos: {
    minima: ['trapmf', [0, 0, 0.2, 0.6]],
    baja: ['trimf', [0.4, 1.2, 2]],
    media: ['trimf', [1.5, 2.5, 3.5]],
    alta: ['trimf', [3, 4, 5]],
    muy_alta: ['trapmf', [4.5, 5.5, 6, 6]],
  },
};

export const SISTEMA_PERDIDA = {
  nombre: 'Pérdida en canales',
  entradas: [temperatura, revestimiento],
  salida: tasaPerdida,
  reglas: [
    { si: { revestimiento: 'tuberia' }, entonces: 'minima' },
    { si: { revestimiento: 'mamposteria', temperatura: 'fria' }, entonces: 'baja' },
    { si: { revestimiento: 'mamposteria', temperatura: 'templada' }, entonces: 'baja' },
    { si: { revestimiento: 'mamposteria', temperatura: 'calida' }, entonces: 'media' },
    { si: { revestimiento: 'tierra', temperatura: 'fria' }, entonces: 'media' },
    { si: { revestimiento: 'tierra', temperatura: 'templada' }, entonces: 'alta' },
    { si: { revestimiento: 'tierra', temperatura: 'calida' }, entonces: 'muy_alta' },
  ],
};
