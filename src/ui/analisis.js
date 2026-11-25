import { mergeSort } from '../algoritmos/mergeSort.js';
import { SISTEMA_URGENCIA } from '../sistema/reglasDifusas.js';
import { seleccion, insercion, shell } from '../algoritmos/ordenamientosComparativa.js';
import { num } from './formato.js';

const ms = (v) => (v < 0.01 ? '< 0,01 ms' : `${num(v, 2)} ms`);

const ALGORITMOS = [
  { nombre: 'Merge Sort', fn: mergeSort, teoria: 'O(n log n)' },
  { nombre: 'Shell', fn: shell, teoria: '≈ O(n^1.5)' },
  { nombre: 'Inserción', fn: insercion, teoria: 'O(n²) / O(n)' },
  { nombre: 'Selección', fn: seleccion, teoria: 'O(n²)' },
];
const TAMANOS = [100, 1000, 5000];

/** Urgencias simuladas (0–100) para n parcelas. */
function generar(n, caso) {
  const datos = Array.from({ length: n }, () => Math.random() * 100);
  if (caso === 'aleatorio') return datos;
  // "Casi ordenado": la lista del turno anterior con un 2 % de parcelas que cambiaron
  datos.sort((a, b) => b - a);
  for (let k = 0; k < Math.max(1, Math.floor(n * 0.02)); k++) {
    const i = Math.floor(Math.random() * n);
    const j = Math.floor(Math.random() * n);
    [datos[i], datos[j]] = [datos[j], datos[i]];
  }
  return datos;
}

function medir(caso) {
  const comparar = (a, b) => b - a;
  return ALGORITMOS.map((alg) => ({
    ...alg,
    resultados: TAMANOS.map((n) => {
      const datos = generar(n, caso);
      const stats = { comparaciones: 0 };
      const t0 = performance.now();
      alg.fn(datos, comparar, stats);
      return { n, comparaciones: stats.comparaciones, ms: performance.now() - t0 };
    }),
  }));
}

function tablaResultados(filas) {
  const cab = TAMANOS.map((n) => `<th class="n">n = ${num(n)}</th>`).join('');
  const cuerpo = filas
    .map((f) => {
      const mejor = (i) => Math.min(...filas.map((x) => x.resultados[i].comparaciones));
      const celdas = f.resultados
        .map(
          (r, i) => `<td class="n ${r.comparaciones === mejor(i) ? 'mejor' : ''}">${num(r.comparaciones)}<small>${ms(r.ms)}</small></td>`,
        )
        .join('');
      return `<tr><td><strong>${f.nombre}</strong> <small>${f.teoria}</small></td>${celdas}</tr>`;
    })
    .join('');
  return `<table class="tabla compacta"><thead><tr><th>Algoritmo</th>${cab}</tr></thead><tbody>${cuerpo}</tbody></table>`;
}

export function pintarAnalisis(contenedor, r) {
  const t = r.tiempos;
  contenedor.innerHTML = `
    <div class="bloque-cabecera">
      <h3 class="h-bloque">Análisis de los algoritmos</h3>
      <p>Complejidad teórica de cada capa y tiempo medido en este navegador para la granja actual.</p>
    </div>
    <table class="tabla compacta complejidad">
      <thead><tr><th>Capa</th><th>Algoritmo</th><th>Complejidad</th><th>Variables</th><th class="n">Tiempo medido</th></tr></thead>
      <tbody>
        <tr><td>1. Diagnóstico</td><td>Lógica difusa (Mamdani)</td><td>O(n·r·m)</td><td>n parcelas, r reglas, m = 101 puntos</td><td class="n">${ms(t.difusa)}</td></tr>
        <tr><td>2. Turnos</td><td>Merge Sort</td><td>O(n log n)</td><td>n parcelas</td><td class="n">${ms(t.mergeSort)}</td></tr>
        <tr><td>3. Red</td><td>Kruskal + Union-Find</td><td>O(E log E)</td><td>E canales</td><td class="n">${ms(t.kruskal)}</td></tr>
        <tr><td>3. Emergencia</td><td>Dijkstra con montículo</td><td>O((V + E) log V)</td><td>V nodos, E canales</td><td class="n">${ms(t.dijkstra)}</td></tr>
      </tbody>
    </table>
    <p class="nota">Con solo ${r.parcelas.length} parcelas los tiempos son muy pequeños y varían entre ejecuciones (la primera incluye la compilación del navegador). La capa más costosa es la lógica difusa: evalúa ${r.parcelas.length} parcelas × ${SISTEMA_URGENCIA.reglas.length} reglas × 101 puntos. Para ver cómo crece cada algoritmo hay que aumentar n, como en la comparación de abajo.</p>

    <h4>¿Por qué Merge Sort? Comparación con los otros ordenamientos</h4>
    <p class="nota">Se ordenan urgencias simuladas para granjas de distinto tamaño. Cada celda muestra comparaciones y tiempo; en verde, el que menos compara.</p>
    <button type="button" id="correr" class="boton">Ejecutar comparación</button>
    <div id="resultados-orden" class="resultados-orden"></div>`;

  const boton = contenedor.querySelector('#correr');
  const salida = contenedor.querySelector('#resultados-orden');
  boton.addEventListener('click', () => {
    boton.disabled = true;
    boton.textContent = 'Midiendo…';
    setTimeout(() => {
      salida.innerHTML = `
        <div><h4>Lista aleatoria</h4>${tablaResultados(medir('aleatorio'))}</div>
        <div><h4>Lista casi ordenada (turno anterior con 2 % de cambios)</h4>${tablaResultados(medir('casi'))}</div>
        <p class="nota">En comparaciones, Merge Sort gana con datos aleatorios y la diferencia con Selección e Inserción crece como n² frente a n log n. En tiempo, Shell puede igualarlo o ganarle: Merge Sort crea arreglos nuevos al mezclar (O(n) de memoria extra) y eso cuesta. Con la lista casi ordenada, Inserción compara menos para n pequeño. Merge Sort se mantiene porque garantiza O(n log n) en cualquier caso y es estable ante empates, cosa que Shell y Selección no cumplen.</p>`;
      boton.disabled = false;
      boton.textContent = 'Volver a ejecutar';
    }, 30);
  });
}
