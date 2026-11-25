import { PARCELAS, CANALES, NODOS_ESPECIALES, ESCENARIOS, FUENTE, DESAGUE, REVESTIMIENTO } from '../sistema/granja.js';
import { num } from './formato.js';

/**
 * Editor de grafos «Mi propio caso» (al estilo de la pizarra de grafos de Graphix).
 * El usuario dibuja la represa, las parcelas, el desagüe y los canales, y llena sus datos.
 * Cada cambio válido se envía al planificador para recalcular todo.
 */

const CLAVE = 'riego.casoPropio';
const ANCHO = 860;
const ALTO = 540;
const METROS_POR_PIXEL = 1.5;

const CULTIVOS = {
  Papa: 7, Maíz: 6, Haba: 5, Alfalfa: 3, Cebolla: 7, Hortalizas: 8, Durazno: 5, Arveja: 5, Quinua: 4, Trigo: 4, Invernadero: 9, Otro: 5,
};
const MATERIALES = { [REVESTIMIENTO.tierra]: 'Tierra', [REVESTIMIENTO.mamposteria]: 'Mampostería', [REVESTIMIENTO.tuberia]: 'Tubería' };

const HERRAMIENTAS = [
  { id: 'mover', nombre: 'Mover', ayuda: 'Toca un elemento para editar sus datos; arrástralo para moverlo.',
    icono: '<path d="M5 3l14 8-6 2-2 6z" />' },
  { id: 'parcela', nombre: 'Parcela', ayuda: 'Toca un lugar vacío del lienzo para agregar una parcela.',
    icono: '<rect x="4" y="6" width="16" height="12" rx="3" /><path d="M12 9v6M9 12h6" />' },
  { id: 'represa', nombre: 'Represa', ayuda: 'Toca el lienzo para ubicar la represa R (solo hay una: si ya existe, se mueve).',
    icono: '<path d="M12 3c-3.5 4.7-5.5 7.9-5.5 10.5a5.5 5.5 0 0 0 11 0C17.5 10.9 15.5 7.7 12 3z" />' },
  { id: 'desague', nombre: 'Desagüe', ayuda: 'Toca el lienzo para ubicar el desagüe D al río (lo necesita la época de lluvias).',
    icono: '<rect x="4" y="8" width="16" height="9" rx="4.5" /><path d="M8 12.5h8" />' },
  { id: 'canal', nombre: 'Canal', ayuda: 'Toca un nodo y luego otro para unirlos con un canal.',
    icono: '<circle cx="6" cy="17" r="2.5" /><circle cx="18" cy="7" r="2.5" /><path d="M8 15.5 16 8.5" />' },
  { id: 'borrar', nombre: 'Borrar', ayuda: 'Toca un nodo o un canal para eliminarlo.',
    icono: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />' },
];

function casoDeEjemplo() {
  return {
    nodos: [
      ...NODOS_ESPECIALES.map((n) => ({ id: n.id, tipo: n.id === FUENTE ? 'represa' : 'desague', x: n.x, y: n.y })),
      ...PARCELAS.map((p) => ({ ...p, tipo: 'parcela', cubierta: Boolean(p.cubierta) })),
    ],
    canales: CANALES.map((c) => ({ ...c })),
    clima: { ...ESCENARIOS.seca, id: 'propio', nombre: 'Mi caso' },
  };
}

const casoVacio = () => ({ nodos: [], canales: [], clima: { ...ESCENARIOS.seca, id: 'propio', nombre: 'Mi caso' } });

function cargarGuardado() {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (texto) return normalizar(JSON.parse(texto));
  } catch {
    /* sin almacenamiento o dato dañado: se usa el ejemplo */
  }
  return casoDeEjemplo();
}

/** Revisa la forma de un caso importado y completa valores faltantes. */
function normalizar(dato) {
  if (!dato || !Array.isArray(dato.nodos) || !Array.isArray(dato.canales)) throw new Error('El archivo no tiene nodos y canales.');
  const nodos = dato.nodos.map((n) => {
    if (!['represa', 'desague', 'parcela'].includes(n.tipo)) throw new Error(`Tipo de nodo desconocido: ${n.tipo}`);
    const base = { id: String(n.id), tipo: n.tipo, x: Number(n.x) || 100, y: Number(n.y) || 100 };
    if (n.tipo !== 'parcela') return base;
    return {
      ...base, cultivo: String(n.cultivo ?? 'Otro'), area: Number(n.area ?? 1), sensibilidad: Number(n.sensibilidad ?? 5),
      humedadBase: Number(n.humedadBase ?? 40), cubierta: Boolean(n.cubierta),
    };
  });
  const canales = dato.canales.map((c) => ({
    id: String(c.id), desde: String(c.desde), hasta: String(c.hasta),
    longitud: Number(c.longitud ?? 200), revestimiento: Number(c.revestimiento ?? REVESTIMIENTO.tierra), capacidad: Number(c.capacidad ?? 40),
  }));
  return { nodos, canales, clima: { ...ESCENARIOS.seca, ...(dato.clima ?? {}), id: 'propio' } };
}

export function crearEditor(contenedor, { alCambiar }) {
  let estado = cargarGuardado();
  let herramienta = 'mover';
  let seleccion = null; // { tipo: 'nodo' | 'canal', id }
  let origenCanal = null;
  let arrastre = null;
  let temporizador = null;

  contenedor.innerHTML = `
    <div class="ed">
      <div class="ed-barra">
        <div class="ed-herramientas" role="toolbar" aria-label="Herramientas del editor">
          ${HERRAMIENTAS.map((h) => `<button type="button" class="ed-herramienta" data-herramienta="${h.id}" aria-pressed="false" aria-label="${h.nombre}" title="${h.ayuda}">
            <svg viewBox="0 0 24 24" aria-hidden="true">${h.icono}</svg><span>${h.nombre}</span></button>`).join('')}
        </div>
        <div class="ed-acciones">
          <button type="button" class="pz-btn" data-accion="ejemplo">Cargar ejemplo</button>
          <button type="button" class="pz-btn" data-accion="limpiar">Limpiar</button>
          <button type="button" class="pz-btn" data-accion="exportar">Guardar archivo</button>
          <label class="pz-btn ed-abrir">Abrir archivo<input type="file" accept="application/json,.json" data-accion="importar" /></label>
        </div>
      </div>
      <p class="ed-ayuda" data-ayuda aria-live="polite"></p>
      <div class="ed-cuerpo">
        <div class="ed-lienzo pz-lienzo">
          <svg viewBox="0 0 ${ANCHO} ${ALTO}" data-lienzo role="application" aria-label="Lienzo del editor de la granja"></svg>
        </div>
        <aside class="ed-panel">
          <section class="ed-seccion">
            <h5>Elemento</h5>
            <label class="pz-campo"><span>Elegir de la lista</span><select data-lista></select></label>
            <div data-propiedades></div>
          </section>
          <section class="ed-seccion">
            <h5>Clima del caso</h5>
            <div data-clima></div>
          </section>
          <section class="ed-seccion" data-problemas></section>
        </aside>
      </div>
    </div>`;

  const svg = contenedor.querySelector('[data-lienzo]');
  const ayuda = contenedor.querySelector('[data-ayuda]');
  const lista = contenedor.querySelector('[data-lista]');
  const propiedades = contenedor.querySelector('[data-propiedades]');
  const clima = contenedor.querySelector('[data-clima]');
  const problemas = contenedor.querySelector('[data-problemas]');

  // ───────────── utilidades ─────────────
  const nodo = (id) => estado.nodos.find((n) => n.id === id);
  const canal = (id) => estado.canales.find((c) => c.id === id);
  const siguienteParcela = () => `P${Math.max(0, ...estado.nodos.filter((n) => n.tipo === 'parcela').map((n) => Number(n.id.slice(1)) || 0)) + 1}`;
  const siguienteCanal = () => `c${Math.max(0, ...estado.canales.map((c) => Number(c.id.slice(1)) || 0)) + 1}`;
  const limitar = (v, a, b) => Math.min(b, Math.max(a, v));

  function punto(evento) {
    const p = svg.createSVGPoint();
    p.x = evento.clientX;
    p.y = evento.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    return { x: limitar(Math.round(q.x), 40, ANCHO - 40), y: limitar(Math.round(q.y), 30, ALTO - 30) };
  }

  // ───────────── validación ─────────────
  function revisar() {
    const errores = [];
    const avisos = [];
    const parcelas = estado.nodos.filter((n) => n.tipo === 'parcela');
    const c = estado.clima;
    if (!nodo(FUENTE)) errores.push('Falta la represa R. Usa la herramienta «Represa».');
    if (parcelas.length === 0) errores.push('Agrega al menos una parcela.');
    if (estado.canales.length === 0) errores.push('Une los nodos con al menos un canal.');
    if (c.modo === 'drenaje' && !nodo(DESAGUE)) errores.push('El objetivo es drenar: agrega el desagüe D al río.');
    for (const p of parcelas) {
      if (!(p.area > 0)) errores.push(`${p.id}: el área debe ser mayor que 0.`);
      if (!(p.sensibilidad >= 0 && p.sensibilidad <= 10)) errores.push(`${p.id}: la sensibilidad va de 0 a 10.`);
      if (!(p.humedadBase >= 0 && p.humedadBase <= 100)) errores.push(`${p.id}: la humedad va de 0 a 100 %.`);
    }
    for (const k of estado.canales) {
      if (!(k.longitud > 0)) errores.push(`Canal ${k.desde}–${k.hasta}: la longitud debe ser mayor que 0.`);
      if (!(k.capacidad > 0)) errores.push(`Canal ${k.desde}–${k.hasta}: la capacidad debe ser mayor que 0.`);
    }
    if (!(c.lluvia >= 0)) errores.push('La lluvia no puede ser negativa.');
    if (!Number.isFinite(c.temperatura)) errores.push('Escribe la temperatura.');
    if (!Number.isFinite(c.ajusteHumedad)) errores.push('Escribe el ajuste de humedad (puede ser 0).');
    if (!(c.aguaPorTurno > 0)) errores.push('El agua por turno debe ser mayor que 0.');
    if (c.temperatura < 5 || c.temperatura > 35) avisos.push('La lógica difusa trabaja entre 5 y 35 °C: fuera de ese rango se toma el extremo.');
    if (c.lluvia > 150) avisos.push('Más de 150 mm de lluvia se toma como 150 (el máximo del sistema difuso).');

    // Parcelas que no llegan a la represa por ningún canal (recorrido en anchura)
    if (nodo(FUENTE)) {
      const vecinos = new Map(estado.nodos.map((n) => [n.id, []]));
      for (const k of estado.canales) {
        if (k.desde === DESAGUE || k.hasta === DESAGUE) continue;
        vecinos.get(k.desde)?.push(k.hasta);
        vecinos.get(k.hasta)?.push(k.desde);
      }
      const vistos = new Set([FUENTE]);
      const cola = [FUENTE];
      while (cola.length) for (const v of vecinos.get(cola.shift()) ?? []) if (!vistos.has(v)) { vistos.add(v); cola.push(v); }
      const aisladas = parcelas.filter((p) => !vistos.has(p.id)).map((p) => p.id);
      if (aisladas.length) avisos.push(`Sin camino a la represa: ${aisladas.join(', ')}. No recibirán agua.`);
    }
    return { errores, avisos };
  }

  function caso() {
    return {
      escenario: { ...estado.clima, id: 'propio', nombre: 'Mi caso', meses: 'clima propio' },
      especiales: estado.nodos.filter((n) => n.tipo !== 'parcela').map((n) => ({ id: n.id, nombre: n.tipo === 'represa' ? 'Represa' : 'Desagüe al río', x: n.x, y: n.y })),
      parcelas: estado.nodos.filter((n) => n.tipo === 'parcela').map(({ tipo, ...p }) => p),
      canales: estado.canales.map((c) => ({ ...c })),
    };
  }

  // ───────────── dibujo ─────────────
  function dibujar() {
    let html = '';
    for (const c of estado.canales) {
      const a = nodo(c.desde);
      const b = nodo(c.hasta);
      if (!a || !b) continue;
      const sel = seleccion?.tipo === 'canal' && seleccion.id === c.id;
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      const etiqueta = `${num(c.longitud)} m · ${MATERIALES[c.revestimiento] ?? '?'}`;
      html += `<g class="ed-canal${sel ? ' seleccionado' : ''}" data-canal="${c.id}">
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="ed-canal-golpe" />
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="ed-canal-linea material-${c.revestimiento}" />
        <rect x="${x - etiqueta.length * 3.1 - 6}" y="${y - 9}" width="${etiqueta.length * 6.2 + 12}" height="18" rx="5" class="ed-canal-caja" />
        <text x="${x}" y="${y + 4}" class="ed-canal-texto">${etiqueta}</text>
      </g>`;
    }
    for (const n of estado.nodos) {
      const sel = seleccion?.tipo === 'nodo' && seleccion.id === n.id;
      const clases = `ed-nodo ed-${n.tipo}${sel ? ' seleccionado' : ''}${origenCanal === n.id ? ' origen' : ''}`;
      let forma;
      if (n.tipo === 'parcela') {
        forma = `<rect x="-40" y="-25" width="80" height="50" rx="${n.cubierta ? 4 : 11}" class="ed-forma" />
          <text y="-3" class="ed-id">${n.id}</text><text y="13" class="ed-sub">${n.cultivo}</text>`;
      } else if (n.tipo === 'represa') {
        forma = `<path d="M0 -28 C-11 -13 -18 -2 -18 8 a18 18 0 0 0 36 0 C18 -2 11 -13 0 -28z" class="ed-forma" /><text y="12" class="ed-id">R</text>`;
      } else {
        forma = `<rect x="-24" y="-17" width="48" height="34" rx="17" class="ed-forma" /><text y="5" class="ed-id">D</text>`;
      }
      html += `<g class="${clases}" data-nodo="${n.id}" transform="translate(${n.x},${n.y})">${forma}</g>`;
    }
    if (!estado.nodos.length) {
      html += `<text x="${ANCHO / 2}" y="${ALTO / 2}" class="ed-vacio">Lienzo vacío: elige «Represa» o «Parcela» y toca aquí</text>`;
    }
    svg.innerHTML = html;
    svg.dataset.herramienta = herramienta;
  }

  function pintarLista() {
    const opciones = [
      '<option value="">— Ninguno —</option>',
      ...estado.nodos.map((n) => `<option value="nodo:${n.id}">${n.tipo === 'parcela' ? `${n.id} · ${n.cultivo}` : n.tipo === 'represa' ? 'R · Represa' : 'D · Desagüe'}</option>`),
      ...estado.canales.map((c) => `<option value="canal:${c.id}">Canal ${c.desde}–${c.hasta}</option>`),
    ];
    lista.innerHTML = opciones.join('');
    lista.value = seleccion ? `${seleccion.tipo}:${seleccion.id}` : '';
  }

  const campo = (etiqueta, nombre, valor, extra = '') =>
    `<label class="pz-campo ed-campo"><span>${etiqueta}</span><input type="number" data-campo="${nombre}" value="${valor}" ${extra} /></label>`;

  function pintarPropiedades() {
    if (!seleccion) {
      propiedades.innerHTML = '<p class="ed-nota">Toca un nodo o un canal en el lienzo (herramienta «Mover») o elígelo en la lista para editar sus datos.</p>';
      return;
    }
    if (seleccion.tipo === 'canal') {
      const c = canal(seleccion.id);
      propiedades.innerHTML = `
        <p class="ed-titulo">Canal ${c.desde}–${c.hasta}</p>
        <div class="ed-campos">
          ${campo('Longitud (m)', 'longitud', c.longitud, 'min="1" step="10"')}
          <label class="pz-campo ed-campo"><span>Material</span><select data-campo="revestimiento">
            ${Object.entries(MATERIALES).map(([v, t]) => `<option value="${v}" ${Number(v) === c.revestimiento ? 'selected' : ''}>${t}</option>`).join('')}
          </select></label>
          ${campo('Capacidad (L/s)', 'capacidad', c.capacidad, 'min="1" step="5"')}
        </div>
        <p class="ed-nota">La longitud y el material deciden la pérdida de agua (riego); la capacidad, cuánta agua puede evacuar (drenaje).</p>
        <button type="button" class="pz-btn ed-eliminar" data-eliminar>Eliminar canal</button>`;
      return;
    }
    const n = nodo(seleccion.id);
    if (n.tipo !== 'parcela') {
      propiedades.innerHTML = `<p class="ed-titulo">${n.tipo === 'represa' ? 'Represa R' : 'Desagüe D'}</p>
        <p class="ed-nota">${n.tipo === 'represa' ? 'Fuente del agua de riego. La cantidad por turno se define en el clima del caso.' : 'Salida del agua hacia el río. Solo se usa para drenar en época de lluvias.'}</p>
        <button type="button" class="pz-btn ed-eliminar" data-eliminar>Eliminar</button>`;
      return;
    }
    propiedades.innerHTML = `
      <p class="ed-titulo">Parcela ${n.id}</p>
      <div class="ed-campos">
        <label class="pz-campo ed-campo"><span>Cultivo</span><select data-campo="cultivo">
          ${Object.keys(CULTIVOS).map((k) => `<option ${k === n.cultivo ? 'selected' : ''}>${k}</option>`).join('')}
          ${CULTIVOS[n.cultivo] === undefined ? `<option selected>${n.cultivo}</option>` : ''}
        </select></label>
        ${campo('Área (ha)', 'area', n.area, 'min="0.1" step="0.1"')}
        ${campo('Sensibilidad (0–10)', 'sensibilidad', n.sensibilidad, 'min="0" max="10" step="1"')}
        ${campo('Humedad base (%)', 'humedadBase', n.humedadBase, 'min="0" max="100" step="1"')}
        <label class="ed-check"><input type="checkbox" data-campo="cubierta" ${n.cubierta ? 'checked' : ''} /> Techada (invernadero): no recibe lluvia</label>
      </div>
      <p class="ed-nota">Al elegir el cultivo se propone su sensibilidad; puedes cambiarla.</p>
      <button type="button" class="pz-btn ed-eliminar" data-eliminar>Eliminar parcela</button>`;
  }

  function pintarClima() {
    const c = estado.clima;
    clima.innerHTML = `
      <label class="pz-campo ed-campo"><span>Copiar valores de una época</span><select data-copiar>
        <option value="">— Elegir —</option>${Object.values(ESCENARIOS).map((e) => `<option value="${e.id}">${e.nombre}</option>`).join('')}
      </select></label>
      <div class="ed-campos">
        ${campo('Lluvia (mm/mes)', 'lluvia', c.lluvia, 'min="0" step="1" data-clima')}
        ${campo('Temperatura (°C)', 'temperatura', c.temperatura, 'step="1" data-clima')}
        ${campo('Ajuste de humedad', 'ajusteHumedad', c.ajusteHumedad, 'step="1" data-clima')}
        ${campo('Agua por turno (m³)', 'aguaPorTurno', c.aguaPorTurno, 'min="1" step="50" data-clima')}
        <label class="pz-campo ed-campo"><span>Objetivo</span><select data-campo="modo" data-clima>
          <option value="riego" ${c.modo === 'riego' ? 'selected' : ''}>Regar (red mínima)</option>
          <option value="drenaje" ${c.modo === 'drenaje' ? 'selected' : ''}>Drenar (red máxima)</option>
        </select></label>
      </div>
      <p class="ed-nota">El ajuste de humedad se suma a la humedad base de cada parcela al aire libre (negativo en época seca, positivo en lluvias).</p>`;
  }

  function pintarProblemas(revision) {
    const { errores, avisos } = revision;
    problemas.innerHTML = `<h5>Estado del caso</h5>${
      errores.length
        ? `<ul class="ed-errores">${errores.map((e) => `<li>${e}</li>`).join('')}</ul><p class="ed-nota">Corrige esto para calcular. Abajo se sigue viendo el último caso válido.</p>`
        : '<p class="ed-ok">Caso válido: el mapa, los turnos y las pizarras ya usan tus datos.</p>'
    }${avisos.length ? `<ul class="ed-avisos">${avisos.map((a) => `<li>${a}</li>`).join('')}</ul>` : ''}`;
  }

  function pintarHerramientas() {
    contenedor.querySelectorAll('[data-herramienta]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.herramienta === herramienta)));
    const h = HERRAMIENTAS.find((x) => x.id === herramienta);
    ayuda.textContent = herramienta === 'canal' && origenCanal ? `Origen: ${origenCanal}. Ahora toca el nodo de destino.` : h.ayuda;
  }

  // ───────────── cambios ─────────────
  function cambio({ propiedades: repintarPropiedades = true } = {}) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      /* sin almacenamiento: el caso dura solo esta visita */
    }
    dibujar();
    pintarLista();
    if (repintarPropiedades) pintarPropiedades();
    const revision = revisar();
    pintarProblemas(revision);
    clearTimeout(temporizador);
    temporizador = setTimeout(() => alCambiar(revision.errores.length ? null : caso()), 150);
  }

  function seleccionar(nueva) {
    seleccion = nueva;
    dibujar();
    pintarLista();
    pintarPropiedades();
  }

  function eliminar(sel) {
    if (sel.tipo === 'canal') estado.canales = estado.canales.filter((c) => c.id !== sel.id);
    else {
      estado.nodos = estado.nodos.filter((n) => n.id !== sel.id);
      estado.canales = estado.canales.filter((c) => c.desde !== sel.id && c.hasta !== sel.id);
    }
    if (seleccion && seleccion.tipo === sel.tipo && seleccion.id === sel.id) seleccion = null;
    cambio();
  }

  function agregarCanal(a, b) {
    if (a === b) return;
    const existe = estado.canales.some((c) => (c.desde === a && c.hasta === b) || (c.desde === b && c.hasta === a));
    if (existe) {
      ayuda.textContent = `Ya existe un canal entre ${a} y ${b}.`;
      return;
    }
    const na = nodo(a);
    const nb = nodo(b);
    const longitud = Math.max(50, Math.round((Math.hypot(na.x - nb.x, na.y - nb.y) * METROS_POR_PIXEL) / 10) * 10);
    const nuevo = { id: siguienteCanal(), desde: a, hasta: b, longitud, revestimiento: REVESTIMIENTO.tierra, capacidad: 40 };
    estado.canales.push(nuevo);
    seleccion = { tipo: 'canal', id: nuevo.id };
    cambio();
  }

  // ───────────── eventos del lienzo ─────────────
  svg.addEventListener('pointerdown', (e) => {
    const gNodo = e.target.closest('[data-nodo]');
    const gCanal = e.target.closest('[data-canal]');
    const p = punto(e);

    if (herramienta === 'borrar') {
      if (gNodo) eliminar({ tipo: 'nodo', id: gNodo.dataset.nodo });
      else if (gCanal) eliminar({ tipo: 'canal', id: gCanal.dataset.canal });
      return;
    }
    if (herramienta === 'canal') {
      if (!gNodo) { origenCanal = null; pintarHerramientas(); dibujar(); return; }
      const id = gNodo.dataset.nodo;
      if (!origenCanal) { origenCanal = id; pintarHerramientas(); dibujar(); return; }
      const desde = origenCanal;
      origenCanal = null;
      pintarHerramientas();
      agregarCanal(desde, id);
      return;
    }
    if (herramienta === 'parcela' && !gNodo && !gCanal) {
      const id = siguienteParcela();
      estado.nodos.push({ id, tipo: 'parcela', x: p.x, y: p.y, cultivo: 'Papa', area: 1, sensibilidad: CULTIVOS.Papa, humedadBase: 40, cubierta: false });
      seleccion = { tipo: 'nodo', id };
      cambio();
      return;
    }
    if ((herramienta === 'represa' || herramienta === 'desague') && !gNodo) {
      const id = herramienta === 'represa' ? FUENTE : DESAGUE;
      const existente = nodo(id);
      if (existente) Object.assign(existente, p);
      else estado.nodos.push({ id, tipo: herramienta, x: p.x, y: p.y });
      seleccion = { tipo: 'nodo', id };
      cambio();
      return;
    }
    // Mover / seleccionar
    if (gNodo) {
      const id = gNodo.dataset.nodo;
      seleccionar({ tipo: 'nodo', id });
      const n = nodo(id);
      arrastre = { id, dx: n.x - p.x, dy: n.y - p.y, movido: false };
      svg.setPointerCapture(e.pointerId);
    } else if (gCanal) {
      seleccionar({ tipo: 'canal', id: gCanal.dataset.canal });
    } else {
      seleccionar(null);
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const p = punto(e);
    const n = nodo(arrastre.id);
    n.x = limitar(p.x + arrastre.dx, 40, ANCHO - 40);
    n.y = limitar(p.y + arrastre.dy, 30, ALTO - 30);
    arrastre.movido = true;
    dibujar();
  });
  const soltar = () => {
    if (arrastre?.movido) cambio({ propiedades: false });
    arrastre = null;
  };
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);

  // ───────────── eventos de controles ─────────────
  contenedor.querySelector('.ed-herramientas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-herramienta]');
    if (!b) return;
    herramienta = b.dataset.herramienta;
    origenCanal = null;
    pintarHerramientas();
    dibujar();
  });

  lista.addEventListener('change', () => {
    if (!lista.value) return seleccionar(null);
    const [tipo, id] = lista.value.split(':');
    seleccionar({ tipo, id });
  });

  propiedades.addEventListener('input', (e) => {
    const nombre = e.target.dataset.campo;
    if (!nombre || !seleccion) return;
    const objeto = seleccion.tipo === 'canal' ? canal(seleccion.id) : nodo(seleccion.id);
    if (nombre === 'cubierta') objeto.cubierta = e.target.checked;
    else if (nombre === 'cultivo') {
      objeto.cultivo = e.target.value;
      if (CULTIVOS[objeto.cultivo] !== undefined) objeto.sensibilidad = CULTIVOS[objeto.cultivo];
      if (objeto.cultivo === 'Invernadero') objeto.cubierta = true;
      cambio();
      return;
    } else objeto[nombre] = e.target.value === '' ? NaN : Number(e.target.value);
    e.target.classList.toggle('invalido', Number.isNaN(objeto[nombre]));
    cambio({ propiedades: false });
  });
  propiedades.addEventListener('click', (e) => {
    if (e.target.closest('[data-eliminar]') && seleccion) eliminar(seleccion);
  });

  clima.addEventListener('input', (e) => {
    const nombre = e.target.dataset.campo;
    if (e.target.dataset.copiar !== undefined && e.target.value) {
      const { lluvia, temperatura, ajusteHumedad, aguaPorTurno, modo } = ESCENARIOS[e.target.value];
      Object.assign(estado.clima, { lluvia, temperatura, ajusteHumedad, aguaPorTurno, modo });
      pintarClima();
      cambio({ propiedades: false });
      return;
    }
    if (!nombre) return;
    estado.clima[nombre] = nombre === 'modo' ? e.target.value : e.target.value === '' ? NaN : Number(e.target.value);
    cambio({ propiedades: false });
  });

  contenedor.querySelector('.ed-acciones').addEventListener('click', (e) => {
    const accion = e.target.closest('[data-accion]')?.dataset.accion;
    if (accion === 'ejemplo') { estado = casoDeEjemplo(); seleccion = null; pintarClima(); cambio(); }
    if (accion === 'limpiar') { estado = casoVacio(); seleccion = null; herramienta = 'represa'; pintarHerramientas(); pintarClima(); cambio(); }
    if (accion === 'exportar') {
      const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(blob);
      enlace.download = 'mi-granja.json';
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    }
  });
  contenedor.querySelector('[data-accion="importar"]').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      estado = normalizar(JSON.parse(await archivo.text()));
      seleccion = null;
      pintarClima();
      cambio();
    } catch (error) {
      ayuda.textContent = `No se pudo abrir el archivo: ${error.message}`;
    }
    e.target.value = '';
  });

  document.addEventListener('keydown', (e) => {
    if (contenedor.hidden || !seleccion) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); eliminar(seleccion); }
    if (e.key === 'Escape') seleccionar(null);
  });

  // Estado inicial
  pintarHerramientas();
  pintarClima();
  dibujar();
  pintarLista();
  pintarPropiedades();
  pintarProblemas(revisar());

  return {
    /** Caso actual listo para el planificador, o null si tiene errores. */
    caso: () => (revisar().errores.length ? null : caso()),
  };
}
