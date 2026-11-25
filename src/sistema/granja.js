/**
 * Granja de ejemplo en el Valle Alto de Cochabamba (Bolivia).
 *
 * Los valores son ILUSTRATIVOS: se eligieron dentro de rangos típicos de la
 * zona para que el modelo sea realista, pero no provienen de una medición real.
 * Para usar datos reales: SENAMHI publica resúmenes climáticos mensuales.
 *
 * Grafo:
 *   - R  = represa (fuente de agua para riego)
 *   - D  = desagüe al río (salida del drenaje en época de lluvias)
 *   - P1..P12 = parcelas
 *   - Aristas = canales (no dirigidos)
 */

export const FUENTE = 'R';
export const DESAGUE = 'D';

/** Revestimiento del canal en escala 0–10 (entrada del sistema difuso de pérdida). */
export const REVESTIMIENTO = { tierra: 2, mamposteria: 5, tuberia: 9 };

export const NODOS_ESPECIALES = [
  { id: FUENTE, nombre: 'Represa', x: 70, y: 270 },
  { id: DESAGUE, nombre: 'Desagüe al río', x: 790, y: 470 },
];

/**
 * humedadBase: humedad del suelo (%) en época normal.
 * sensibilidad: qué tanto sufre el cultivo por falta de agua (0–10).
 * cubierta: true si está bajo techo (invernadero): no recibe lluvia.
 * area: hectáreas.
 */
export const PARCELAS = [
  { id: 'P1', cultivo: 'Papa', area: 1.2, sensibilidad: 7, humedadBase: 40, x: 200, y: 110 },
  { id: 'P2', cultivo: 'Maíz', area: 1.5, sensibilidad: 6, humedadBase: 45, x: 210, y: 270 },
  { id: 'P3', cultivo: 'Haba', area: 0.8, sensibilidad: 5, humedadBase: 50, x: 200, y: 430 },
  { id: 'P4', cultivo: 'Alfalfa', area: 2.0, sensibilidad: 3, humedadBase: 55, x: 350, y: 60 },
  { id: 'P5', cultivo: 'Cebolla', area: 0.9, sensibilidad: 7, humedadBase: 35, x: 360, y: 200 },
  { id: 'P6', cultivo: 'Hortalizas', area: 0.6, sensibilidad: 8, humedadBase: 38, x: 370, y: 340 },
  { id: 'P7', cultivo: 'Durazno', area: 1.4, sensibilidad: 5, humedadBase: 48, x: 350, y: 480 },
  { id: 'P8', cultivo: 'Invernadero', area: 0.3, sensibilidad: 9, humedadBase: 30, x: 520, y: 100, cubierta: true },
  { id: 'P9', cultivo: 'Papa', area: 1.1, sensibilidad: 7, humedadBase: 33, x: 530, y: 260 },
  { id: 'P10', cultivo: 'Maíz', area: 1.6, sensibilidad: 6, humedadBase: 44, x: 530, y: 420 },
  { id: 'P11', cultivo: 'Arveja', area: 0.7, sensibilidad: 5, humedadBase: 40, x: 680, y: 170 },
  { id: 'P12', cultivo: 'Alfalfa', area: 1.8, sensibilidad: 3, humedadBase: 52, x: 690, y: 340 },
];

const { tierra, mamposteria, tuberia } = REVESTIMIENTO;

/** longitud en metros, capacidad en litros por segundo. */
export const CANALES = [
  { id: 'c1', desde: 'R', hasta: 'P1', longitud: 320, revestimiento: tierra, capacidad: 40 },
  { id: 'c2', desde: 'R', hasta: 'P2', longitud: 260, revestimiento: mamposteria, capacidad: 80 },
  { id: 'c3', desde: 'R', hasta: 'P3', longitud: 300, revestimiento: tierra, capacidad: 45 },
  { id: 'c4', desde: 'P1', hasta: 'P2', longitud: 220, revestimiento: tierra, capacidad: 35 },
  { id: 'c5', desde: 'P2', hasta: 'P3', longitud: 210, revestimiento: tierra, capacidad: 35 },
  { id: 'c6', desde: 'P1', hasta: 'P4', longitud: 260, revestimiento: tierra, capacidad: 30 },
  { id: 'c7', desde: 'P1', hasta: 'P5', longitud: 280, revestimiento: mamposteria, capacidad: 50 },
  { id: 'c8', desde: 'P2', hasta: 'P5', longitud: 230, revestimiento: tuberia, capacidad: 40 },
  { id: 'c9', desde: 'P2', hasta: 'P6', longitud: 240, revestimiento: mamposteria, capacidad: 60 },
  { id: 'c10', desde: 'P3', hasta: 'P6', longitud: 250, revestimiento: tierra, capacidad: 40 },
  { id: 'c11', desde: 'P3', hasta: 'P7', longitud: 230, revestimiento: tierra, capacidad: 35 },
  { id: 'c12', desde: 'P4', hasta: 'P5', longitud: 200, revestimiento: tierra, capacidad: 25 },
  { id: 'c13', desde: 'P4', hasta: 'P8', longitud: 270, revestimiento: mamposteria, capacidad: 30 },
  { id: 'c14', desde: 'P5', hasta: 'P9', longitud: 250, revestimiento: tuberia, capacidad: 45 },
  { id: 'c15', desde: 'P6', hasta: 'P9', longitud: 230, revestimiento: mamposteria, capacidad: 55 },
  { id: 'c16', desde: 'P6', hasta: 'P7', longitud: 240, revestimiento: tierra, capacidad: 40 },
  { id: 'c17', desde: 'P7', hasta: 'P10', longitud: 260, revestimiento: mamposteria, capacidad: 60 },
  { id: 'c18', desde: 'P6', hasta: 'P10', longitud: 250, revestimiento: tierra, capacidad: 45 },
  { id: 'c19', desde: 'P8', hasta: 'P9', longitud: 220, revestimiento: tierra, capacidad: 30 },
  { id: 'c20', desde: 'P8', hasta: 'P11', longitud: 260, revestimiento: tierra, capacidad: 25 },
  { id: 'c21', desde: 'P9', hasta: 'P11', longitud: 240, revestimiento: mamposteria, capacidad: 40 },
  { id: 'c22', desde: 'P9', hasta: 'P12', longitud: 270, revestimiento: tierra, capacidad: 50 },
  { id: 'c23', desde: 'P10', hasta: 'P12', longitud: 240, revestimiento: mamposteria, capacidad: 65 },
  { id: 'c24', desde: 'P11', hasta: 'P12', longitud: 230, revestimiento: tierra, capacidad: 35 },
  { id: 'c25', desde: 'P12', hasta: 'D', longitud: 200, revestimiento: mamposteria, capacidad: 90 },
  { id: 'c26', desde: 'P10', hasta: 'D', longitud: 300, revestimiento: tierra, capacidad: 70 },
  { id: 'c27', desde: 'P7', hasta: 'D', longitud: 440, revestimiento: tierra, capacidad: 50 },
];

/**
 * Escenarios climáticos (los 3 de la herramienta de MATLAB).
 *  modo 'riego':   Kruskal MÍNIMO sobre la pérdida → red de riego.
 *  modo 'drenaje': Kruskal MÁXIMO sobre la capacidad → red de drenaje.
 *  aguaPorTurno: m³ que la represa puede entregar en un turno.
 */
export const ESCENARIOS = {
  seca: {
    id: 'seca',
    nombre: 'Época seca con El Niño',
    meses: 'septiembre – octubre',
    lluvia: 8,
    temperatura: 29,
    ajusteHumedad: -12,
    aguaPorTurno: 1800,
    modo: 'riego',
  },
  normal: {
    id: 'normal',
    nombre: 'Época de transición',
    meses: 'abril – mayo',
    lluvia: 45,
    temperatura: 21,
    ajusteHumedad: 0,
    aguaPorTurno: 1500,
    modo: 'riego',
  },
  lluvias: {
    id: 'lluvias',
    nombre: 'Época de lluvias',
    meses: 'enero – febrero',
    lluvia: 130,
    temperatura: 24,
    ajusteHumedad: 35,
    aguaPorTurno: 1500,
    modo: 'drenaje',
  },
};
