import { num } from '../formato.js';

/** Posición (x, y) de cada nodo del caso actual (granja de ejemplo o caso propio). */
export const posiciones = (resultado) => Object.fromEntries([...resultado.parcelas, ...resultado.especiales].map((n) => [n.id, n]));

/** Encabezado de pizarra al estilo de Graphix: título con indicador, subtítulo y contadores. */
export function cabeceraPizarra({ titulo, subtitulo }) {
  return `
    <div class="pz-cabecera">
      <div class="pz-titulo">
        <h4>${titulo} <span class="pz-indicador" aria-hidden="true"></span></h4>
        <p class="pz-subtitulo">${subtitulo}</p>
      </div>
      <div class="pz-contadores" data-contadores></div>
    </div>`;
}

export function pintarContadores(contenedor, contadores) {
  contenedor.querySelector('[data-contadores]').innerHTML = contadores
    .map(([nombre, valor, destacado]) => `<span class="pz-contador${destacado ? ' destacado' : ''}">${nombre}: <strong>${valor}</strong></span>`)
    .join('');
}

/**
 * Dibuja un grafo de la granja (mismo lienzo que el mapa) para las pizarras de grafos.
 * @param opciones.posiciones  id => { x, y }
 * @param opciones.claseArista  arista => clase extra ('aceptada', 'actual', ...)
 * @param opciones.claseNodo    id => clase extra
 * @param opciones.peso         arista => texto del peso
 * @param opciones.nota         id => texto pequeño bajo el nodo (p. ej. la distancia)
 * @param opciones.ruta         lista de ids de nodos a resaltar como ruta final
 */
export function dibujarGrafoPizarra(svg, nodos, aristas, { posiciones: POSICIONES, claseArista, claseNodo, peso, nota, ruta }) {
  let html = '';
  for (const a of aristas) {
    const p = POSICIONES[a.desde];
    const q = POSICIONES[a.hasta];
    html += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" class="pg-arista ${claseArista(a) ?? ''}" />`;
  }
  if (ruta && ruta.length > 1) {
    html += `<polyline points="${ruta.map((id) => `${POSICIONES[id].x},${POSICIONES[id].y}`).join(' ')}" class="pg-ruta" />`;
  }
  for (const a of aristas) {
    const p = POSICIONES[a.desde];
    const q = POSICIONES[a.hasta];
    const texto = peso(a);
    const ancho = texto.length * 6.4 + 10;
    const x = (p.x + q.x) / 2;
    const y = (p.y + q.y) / 2;
    html += `<g class="pg-peso ${claseArista(a) ?? ''}"><rect x="${x - ancho / 2}" y="${y - 9}" width="${ancho}" height="18" rx="5" /><text x="${x}" y="${y + 4}">${texto}</text></g>`;
  }
  for (const id of nodos) {
    const n = POSICIONES[id];
    const extra = nota?.(id);
    html += `<g class="pg-nodo ${claseNodo?.(id) ?? ''}" transform="translate(${n.x},${n.y})">
      <circle r="23" /><text y="5" class="pg-id">${id}</text>
      ${extra ? `<text y="40" class="pg-nota">${extra}</text>` : ''}
    </g>`;
  }
  svg.innerHTML = html;
}

/** Formato corto para distancias de Dijkstra. */
export const dist = (v) => (v === Infinity || v === undefined ? '∞' : num(v, 1));

/** Bloque de explicación de cada pizarra: de dónde salen los datos, cómo funciona y por qué. */
export function explicacionPizarra() {
  return `
    <details class="pz-explicacion" open>
      <summary>Explicación de la pizarra</summary>
      <div class="pz-exp-rejilla">
        <section><h5><span aria-hidden="true">1</span>De dónde salen los datos</h5><div data-exp="datos"></div></section>
        <section><h5><span aria-hidden="true">2</span>Cómo funciona</h5><div data-exp="como"></div></section>
        <section><h5><span aria-hidden="true">3</span>Por qué lo hace así</h5><div data-exp="porque"></div></section>
      </div>
    </details>`;
}

export function pintarExplicacion(contenedor, { datos, como, porque }) {
  contenedor.querySelector('[data-exp="datos"]').innerHTML = datos;
  contenedor.querySelector('[data-exp="como"]').innerHTML = como;
  contenedor.querySelector('[data-exp="porque"]').innerHTML = porque;
}
