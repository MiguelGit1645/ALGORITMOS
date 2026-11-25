import { FUENTE, DESAGUE } from '../sistema/granja.js';
import { num, colorUrgencia, colorHumedad, tintaSobre } from './formato.js';

const SVG = 'http://www.w3.org/2000/svg';

function el(tipo, atributos = {}, padre) {
  const e = document.createElementNS(SVG, tipo);
  for (const [k, v] of Object.entries(atributos)) if (v != null) e.setAttribute(k, v);
  if (padre) padre.appendChild(e);
  return e;
}

/**
 * Dibuja el campo como grafo.
 * Capas de abajo hacia arriba: canales inactivos → red de Kruskal → ruta de Dijkstra → nodos.
 */
export function dibujarGrafo(svg, resultado, { seleccion, alSeleccionar }) {
  svg.replaceChildren();
  const { red, emergencia, escenario } = resultado;
  const POS = Object.fromEntries([...resultado.parcelas, ...resultado.especiales].map((n) => [n.id, n]));
  const esRiego = escenario.modo === 'riego';

  el('title', { id: 'grafo-titulo' }, svg).textContent =
    `Mapa de la granja: red de ${red.tipo} con ${red.activa.length} canales activos`;

  const activas = new Set(red.activa.map((a) => a.id));
  const podadas = new Set(esRiego ? red.arbol.filter((a) => !activas.has(a.id)).map((a) => a.id) : []);
  const puntuales = new Set((red.riegoPuntual ?? []).map((a) => a.id));
  const ruta = new Set((emergencia?.optima?.aristas ?? []).map((a) => a.id));

  const capaCanales = el('g', { class: 'canales' }, svg);
  const capaEtiquetas = el('g', { class: 'etiquetas-canal' }, svg);

  for (const c of resultado.canales) {
    const a = POS[c.desde];
    const b = POS[c.hasta];
    let clase = 'canal';
    if (activas.has(c.id)) clase += esRiego ? ' activo' : ' drenaje';
    else if (podadas.has(c.id)) clase += ' podado';
    else if (puntuales.has(c.id)) clase += ' puntual';

    const grosor = esRiego ? 3 + (1 - Math.min(c.perdida, 20) / 20) * 3 : 2 + (c.capacidad / 90) * 6;
    el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: clase, 'stroke-width': activas.has(c.id) ? grosor : null }, capaCanales);

    const enUso = activas.has(c.id) || puntuales.has(c.id) || ruta.has(c.id);
    if (enUso) {
      const t = el('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, class: 'peso' }, capaEtiquetas);
      t.textContent = esRiego ? `${num(c.perdida, 1)}%` : `${c.capacidad} L/s`;
    }
  }

  // Ruta óptima de emergencia (Dijkstra)
  if (emergencia?.optima) {
    const puntos = emergencia.optima.nodos.map((id) => `${POS[id].x},${POS[id].y}`).join(' ');
    el('polyline', { points: puntos, class: 'ruta-emergencia' }, svg);
  }

  // Nodos especiales
  for (const n of resultado.especiales) {
    const usado = (n.id === FUENTE && (esRiego || puntuales.size)) || (n.id === DESAGUE && !esRiego);
    const g = el('g', { class: `especial ${usado ? '' : 'apagado'}`, transform: `translate(${n.x},${n.y})` }, svg);
    if (n.id === FUENTE) {
      el('path', { d: 'M0 -26 C-10 -12 -17 -2 -17 7 a17 17 0 0 0 34 0 C17 -2 10 -12 0 -26z', class: 'gota' }, g);
    } else {
      el('rect', { x: -22, y: -16, width: 44, height: 32, rx: 16, class: 'gota' }, g);
    }
    el('text', { y: 4, class: 'especial-id' }, g).textContent = n.id;
    el('text', { y: n.id === FUENTE ? 40 : 34, class: 'especial-nombre' }, g).textContent = n.nombre;
  }

  // Parcelas
  for (const p of resultado.parcelas) {
    const base = p;
    const relleno = esRiego || p.cubierta ? colorUrgencia(p.urgencia) : colorHumedad(p.humedad);
    const g = el(
      'g',
      {
        class: `parcela${seleccion === p.id ? ' seleccionada' : ''}${emergencia?.parcela.id === p.id ? ' critica' : ''}`,
        transform: `translate(${base.x},${base.y})`,
        tabindex: 0,
        role: 'button',
        'aria-label': `${p.id} ${p.cultivo}, urgencia ${num(p.urgencia)}`,
      },
      svg,
    );
    el('rect', { x: -38, y: -24, width: 76, height: 48, rx: p.cubierta ? 3 : 10, fill: relleno, class: 'lote' }, g);
    const tinta = tintaSobre(relleno);
    el('text', { y: -4, class: 'lote-id', fill: tinta }, g).textContent = p.id;
    el('text', { y: 12, class: 'lote-cultivo', fill: tinta }, g).textContent = p.cultivo;
    if (p.turno) {
      el('circle', { cx: 36, cy: -22, r: 11, class: 'turno' }, g);
      el('text', { x: 36, y: -18, class: 'turno-num' }, g).textContent = p.turno;
    }
    const elegir = () => alSeleccionar(p.id);
    g.addEventListener('click', elegir);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        elegir();
      }
    });
  }
}

export function textoLeyenda(resultado) {
  if (resultado.escenario.modo === 'riego') {
    return `
      <span><i class="m-linea activo"></i>Red de riego (Kruskal mínimo, ya podada)</span>
      <span><i class="m-linea podado"></i>Rama podada: no lleva a nadie que necesite agua</span>
      <span><i class="m-linea ruta"></i>Ruta de emergencia (Dijkstra)</span>
      <span><i class="m-escala urgencia"></i>Urgencia: baja → crítica</span>
      <span><i class="m-turno">1</i>Turno de riego</span>`;
  }
  return `
    <span><i class="m-linea drenaje"></i>Red de drenaje (Kruskal máximo por capacidad)</span>
    <span><i class="m-linea puntual"></i>Riego puntual al invernadero</span>
    <span><i class="m-linea ruta"></i>Evacuación más rápida (Dijkstra)</span>
    <span><i class="m-escala humedad"></i>Humedad del suelo: normal → saturada</span>`;
}
