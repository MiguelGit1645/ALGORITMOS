import { trapmf, trimf } from '../algoritmos/logicaDifusa.js';
import { SISTEMA_URGENCIA } from '../sistema/reglasDifusas.js';
import { planificar } from '../sistema/planificador.js';
import { ESCENARIOS } from '../sistema/granja.js';
import { num } from './formato.js';

const FUNC = { trapmf, trimf };

/** Figura 1: funciones de pertenencia de la humedad del suelo, dibujadas con los datos reales del sistema. */
export function dibujarFiguraPertenencia(svg) {
  const variable = SISTEMA_URGENCIA.entradas.find((v) => v.nombre === 'humedad_suelo');
  const [min, max] = variable.rango;
  const X0 = 50, X1 = 610, Y0 = 170, Y1 = 30;
  const sx = (x) => X0 + ((x - min) / (max - min)) * (X1 - X0);
  const sy = (y) => Y0 - y * (Y0 - Y1);
  const colores = { seca: '#b0482c', adecuada: '#5f7a4e', saturada: '#1e64a8' };

  let html = `
    <line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" class="eje-linea"/>
    <line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1 - 6}" class="eje-linea"/>
    <text x="${X0 - 8}" y="${sy(1) + 4}" class="eje-texto" text-anchor="end">1</text>
    <text x="${X0 - 8}" y="${Y0 + 4}" class="eje-texto" text-anchor="end">0</text>
    <text x="${X1}" y="${Y0 + 34}" class="eje-texto" text-anchor="end">humedad del suelo (%)</text>`;
  for (let t = min; t <= max; t += 10) {
    html += `<text x="${sx(t)}" y="${Y0 + 16}" class="eje-texto" text-anchor="middle">${t}</text>`;
  }

  for (const [nombre, [tipo, params]] of Object.entries(variable.conjuntos)) {
    const puntos = [];
    for (let x = min; x <= max; x += 0.5) puntos.push(`${sx(x).toFixed(1)},${sy(FUNC[tipo](x, params)).toFixed(1)}`);
    const pico = tipo === 'trimf' ? params[1] : (params[1] + params[2]) / 2;
    html += `<polyline points="${puntos.join(' ')}" fill="none" stroke="${colores[nombre]}" stroke-width="2.5"/>
      <text x="${sx(pico)}" y="${Y1 - 10}" fill="${colores[nombre]}" class="conjunto-texto" text-anchor="middle">${nombre}</text>`;
  }

  // Ejemplo: 35 % pertenece a "seca" y "adecuada" con grado 0,25
  const x = 35;
  const g = trapmf(x, variable.conjuntos.seca[1]);
  html += `<line x1="${sx(x)}" y1="${Y0}" x2="${sx(x)}" y2="${sy(g) - 2}" class="ejemplo"/>
    <circle cx="${sx(x)}" cy="${sy(g)}" r="4.5" class="ejemplo-punto"/>
    <text x="${sx(x) - 8}" y="${Y0 - 8}" class="eje-texto" text-anchor="end">x = 35: μ = ${num(g, 2)} en «seca» y en «adecuada»</text>`;

  svg.innerHTML = html;
}

/** Tabla 2: resultados de las tres épocas, calculados en vivo con el mismo planificador. */
export function pintarTablaResultados(tabla) {
  const resultados = Object.keys(ESCENARIOS).map((id) => planificar(id));
  const fila = (titulo, fn) => `<tr><th scope="row">${titulo}</th>${resultados.map((r) => `<td class="n">${fn(r)}</td>`).join('')}</tr>`;
  const pct = (r) => (r.resumen.aguaRequerida ? ((r.resumen.aguaRequerida - r.resumen.demandaNeta) / r.resumen.aguaRequerida) * 100 : 0);
  const ruta = (e) =>
    e ? `${num(e.optima.costo, 1)} vs ${num(e.porRed.costo, 1)}<small>${e.optima.costo + 0.05 < e.porRed.costo ? 'Dijkstra mejora la ruta' : 'misma ruta'}</small>` : '—';

  const caption = tabla.querySelector('caption')?.outerHTML ?? '';
  tabla.innerHTML = `${caption}
    <thead><tr><th></th>${resultados.map((r) => `<th class="n">${r.escenario.nombre}</th>`).join('')}</tr></thead>
    <tbody>
      ${fila('Lluvia y temperatura', (r) => `${r.escenario.lluvia} mm, ${r.escenario.temperatura} °C`)}
      ${fila('Parcelas que necesitan riego', (r) => `${r.resumen.parcelasConRiego} de ${r.parcelas.length}`)}
      ${fila('Turnos de riego', (r) => r.resumen.turnos)}
      ${fila('Agua liberada de la represa', (r) => `${num(r.resumen.aguaRequerida)} m³`)}
      ${fila('Pérdida en los canales', (r) => `${num(r.resumen.aguaRequerida - r.resumen.demandaNeta)} m³<small>${num(pct(r), 1)} % de lo liberado</small>`)}
      ${fila('Red de Kruskal', (r) => `${r.red.criterio}, ${r.red.activa.length} canales<small>${num(r.red.longitudTotal)} m</small>`)}
      ${fila('Emergencia: óptima vs. por la red', (r) => ruta(r.emergencia))}
      ${fila('Comparaciones de Merge Sort', (r) => r.comparacionesOrden)}
    </tbody>`;
}
