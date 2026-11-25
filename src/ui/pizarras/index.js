import { crearPizarraDifusa } from './pizarraDifusa.js';
import { crearPizarraMerge } from './pizarraMerge.js';
import { crearPizarraKruskal } from './pizarraKruskal.js';
import { crearPizarraDijkstra } from './pizarraDijkstra.js';

const PIZARRAS = [
  { id: 'difusa', nombre: 'Lógica difusa', complejidad: 'O(n · r · m)', crear: crearPizarraDifusa,
    icono: '<path d="M3 18c3 0 4-12 9-12s6 12 9 12" />' },
  { id: 'merge', nombre: 'Merge Sort', complejidad: 'O(n log n)', crear: crearPizarraMerge,
    icono: '<path d="M4 18h3V9H4zM10.5 18h3V5h-3zM17 18h3v-6h-3z" />' },
  { id: 'kruskal', nombre: 'Kruskal', complejidad: 'O(E log E)', crear: crearPizarraKruskal,
    icono: '<circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="M7 6h10M6 8l5 8.5" />' },
  { id: 'dijkstra', nombre: 'Dijkstra', complejidad: 'O((V + E) log V)', crear: crearPizarraDijkstra,
    icono: '<circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M7 18h4a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" />' },
];

/**
 * Pizarras paso a paso de los cuatro algoritmos del proyecto (formato de Graphix).
 * Todas usan los datos de la época elegida en el planificador.
 */
export function crearPizarras(pestanas, area) {
  pestanas.innerHTML = PIZARRAS.map(
    (p) => `<button type="button" role="tab" class="pz-pestana" id="tab-${p.id}" aria-controls="pz-${p.id}" data-id="${p.id}">
      <span class="icono"><svg viewBox="0 0 24 24" aria-hidden="true">${p.icono}</svg></span>
      <span class="pz-pestana-texto"><strong>${p.nombre}</strong><small>${p.complejidad}</small></span>
    </button>`,
  ).join('');
  area.innerHTML = PIZARRAS.map((p) => `<div class="pz" id="pz-${p.id}" role="tabpanel" aria-labelledby="tab-${p.id}" hidden></div>`).join('');

  const instancias = Object.fromEntries(PIZARRAS.map((p) => [p.id, p.crear(area.querySelector(`#pz-${p.id}`))]));
  let activa = 'difusa';
  let resultado = null;
  const pendientes = new Set(); // pizarras ocultas que deben recalcularse al abrirse

  function abrir(id) {
    instancias[activa]?.detener();
    activa = id;
    pestanas.querySelectorAll('.pz-pestana').forEach((b) => {
      const sel = b.dataset.id === id;
      b.classList.toggle('activa', sel);
      b.setAttribute('aria-selected', String(sel));
      b.tabIndex = sel ? 0 : -1;
    });
    area.querySelectorAll('.pz').forEach((el) => (el.hidden = el.id !== `pz-${id}`));
    if (pendientes.has(id) && resultado) {
      instancias[id].actualizar(resultado);
      pendientes.delete(id);
    }
  }

  pestanas.addEventListener('click', (e) => {
    const boton = e.target.closest('.pz-pestana');
    if (boton) abrir(boton.dataset.id);
  });
  pestanas.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = PIZARRAS.findIndex((p) => p.id === activa);
    const siguiente = PIZARRAS[(i + (e.key === 'ArrowRight' ? 1 : PIZARRAS.length - 1)) % PIZARRAS.length].id;
    abrir(siguiente);
    pestanas.querySelector(`[data-id="${siguiente}"]`).focus();
  });

  abrir(activa);

  return {
    /** Nueva época: la pizarra visible se recalcula ahora; las demás al abrirse. */
    actualizar(nuevo) {
      resultado = nuevo;
      PIZARRAS.forEach((p) => pendientes.add(p.id));
      instancias[activa].actualizar(nuevo);
      pendientes.delete(activa);
    },
    /** Abre la pizarra de lógica difusa con una parcela elegida en el mapa o la tabla. */
    verParcela(id) {
      abrir('difusa');
      instancias.difusa.actualizar(resultado, { parcela: id });
      pendientes.delete('difusa');
    },
  };
}
