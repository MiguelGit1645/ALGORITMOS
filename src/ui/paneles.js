import { describirRegla } from '../algoritmos/logicaDifusa.js';
import { SISTEMA_URGENCIA } from '../sistema/reglasDifusas.js';
import { UMBRAL_RIEGO } from '../sistema/planificador.js';
import { num, colorUrgencia } from './formato.js';

const NOMBRES_VARIABLE = {
  lluvia: 'Lluvia',
  temperatura: 'Temperatura',
  humedad_suelo: 'Humedad del suelo',
  sensibilidad: 'Sensibilidad del cultivo',
};

// ───────────────────────── Resumen ─────────────────────────
export function pintarResumen(contenedor, r) {
  const { escenario, resumen, red } = r;
  const datosRed =
    red.tipo === 'riego'
      ? `<dt>Canales habilitados</dt><dd>${red.activa.length} de ${red.arbol.length} del árbol <small>(${num(red.longitudTotal)} m)</small></dd>
         <dt>Pérdida sumada de la red</dt><dd>${num(red.perdidaTotal, 1)} %</dd>`
      : `<dt>Canales de drenaje</dt><dd>${red.activa.length} <small>(${num(red.longitudTotal)} m)</small></dd>
         <dt>Capacidad sumada</dt><dd>${num(red.capacidadTotal)} L/s</dd>`;

  contenedor.innerHTML = `
    <div class="clima">
      <p class="clima-meses">${escenario.meses}</p>
      <p class="clima-datos"><span>${escenario.lluvia} mm de lluvia</span><span>${escenario.temperatura} °C</span></p>
    </div>
    <p class="cifra-principal"><strong>${resumen.parcelasConRiego}</strong> de ${r.parcelas.length} parcelas necesitan riego</p>
    <dl class="datos">
      <dt>Turnos necesarios</dt><dd>${resumen.turnos} <small>(${num(escenario.aguaPorTurno)} m³ por turno)</small></dd>
      <dt>Agua a liberar de la represa</dt><dd>${num(resumen.aguaRequerida)} m³</dd>
      <dt>Se pierde en los canales</dt><dd>${num(resumen.aguaRequerida - resumen.demandaNeta)} m³</dd>
      ${datosRed}
      <dt>Comparaciones de Merge Sort</dt><dd>${r.comparacionesOrden} <small>(n = ${r.parcelas.length})</small></dd>
    </dl>`;
}

// ───────────────────────── Emergencia ─────────────────────────
export function pintarEmergencia(contenedor, r) {
  const e = r.emergencia;
  if (!e) {
    contenedor.innerHTML = '<div class="emergencia"><h2>Emergencia</h2><p>Ninguna parcela necesita agua.</p></div>';
    return;
  }
  const esRiego = e.tipo === 'riego';
  const formato = (c) => (esRiego ? `${num(c, 1)} % de pérdida` : `${num(c, 1)} de tiempo`);
  const ahorro = e.porRed.costo - e.optima.costo;
  const conclusion =
    ahorro < 0.05
      ? 'La red de Kruskal ya usa el mejor camino para esta parcela.'
      : esRiego
        ? `Abrir los canales de la ruta de Dijkstra pierde ${num(ahorro, 1)} puntos menos que ir por la red habilitada.`
        : `La ruta de Dijkstra evacúa ${num((ahorro / e.porRed.costo) * 100)} % más rápido que la red de drenaje.`;

  contenedor.innerHTML = `
    <div class="emergencia">
      <h2>${esRiego ? 'Parcela crítica' : 'Parcela más saturada'}</h2>
      <p class="critica-nombre">${e.parcela.id} ${e.parcela.cultivo}
        <span>${esRiego ? `urgencia ${num(e.parcela.urgencia, 1)}` : `humedad ${e.parcela.humedad} %`}</span></p>
      <ol class="rutas">
        <li><span class="ruta-tipo optima">Dijkstra, todo el campo</span>
            <span class="ruta-nodos">${e.optima.nodos.join(' – ')}</span>
            <span class="ruta-costo">${formato(e.optima.costo)}</span></li>
        <li><span class="ruta-tipo">Por la red de Kruskal</span>
            <span class="ruta-nodos">${e.porRed.nodos.join(' – ')}</span>
            <span class="ruta-costo">${formato(e.porRed.costo)}</span></li>
      </ol>
      <p class="conclusion">${conclusion}</p>
    </div>`;
}

// ───────────────────────── Turnos ─────────────────────────
export function pintarTurnos(tabla, explicacion, r, seleccion, alSeleccionar) {
  explicacion.textContent =
    `Merge Sort ordena las parcelas de mayor a menor urgencia. Se riegan en ese orden hasta llenar el turno de ${num(r.escenario.aguaPorTurno)} m³; ` +
    `la siguiente que no entra abre un nuevo turno. Con urgencia menor a ${UMBRAL_RIEGO} no se riega.`;

  const filas = r.orden
    .map((p, i) => {
      const barra = `<span class="barra"><span style="width:${p.urgencia}%;background:${colorUrgencia(p.urgencia)}"></span></span>`;
      const riego = p.necesitaRiego
        ? `<td class="n">${num(p.demanda)}</td><td class="n">${num(p.perdidaRuta, 1)} %</td><td class="n">${num(p.requerido)}</td><td><span class="chip">Turno ${p.turno}</span></td>`
        : '<td colspan="4" class="sin-riego">No necesita riego</td>';
      return `<tr data-id="${p.id}" class="${seleccion === p.id ? 'seleccionada' : ''}${p.necesitaRiego ? '' : ' apagada'}" tabindex="0">
          <td class="n">${i + 1}</td>
          <td><strong>${p.id}</strong> ${p.cultivo}</td>
          <td class="n">${p.humedad} %</td>
          <td class="urg">${barra}<span class="n">${num(p.urgencia, 1)}</span></td>
          ${riego}
        </tr>`;
    })
    .join('');

  tabla.innerHTML = `
    <thead><tr>
      <th class="n">#</th><th>Parcela</th><th class="n">Humedad</th><th>Urgencia</th>
      <th class="n">Necesita (m³)</th><th class="n">Pérdida en la ruta</th><th class="n">Liberar (m³)</th><th>Turno</th>
    </tr></thead>
    <tbody>${filas}</tbody>`;

  tabla.querySelectorAll('tbody tr').forEach((tr) => {
    const elegir = () => alSeleccionar(tr.dataset.id);
    tr.addEventListener('click', elegir);
    tr.addEventListener('keydown', (e) => e.key === 'Enter' && elegir());
  });
}

// ───────────────────────── Detalle difuso ─────────────────────────
export function pintarDetalle(contenedor, r, id) {
  const p = r.parcelas.find((x) => x.id === id) ?? r.orden[0];
  const { inferencia } = p;

  const variables = SISTEMA_URGENCIA.entradas
    .map((v) => {
      const grados = inferencia.grados[v.nombre];
      const conjuntos = Object.entries(grados)
        .map(
          ([c, g]) => `<li class="${g > 0 ? 'activo' : ''}"><span>${c.replace('_', ' ')}</span>
            <span class="barra fina"><span style="width:${g * 100}%"></span></span><span class="n">${num(g, 2)}</span></li>`,
        )
        .join('');
      return `<div class="variable"><h4>${NOMBRES_VARIABLE[v.nombre]} <span class="n">${v.unidad === '0–10' ? `${p.entradas[v.nombre]} de 10` : `${p.entradas[v.nombre]} ${v.unidad}`}</span></h4><ul>${conjuntos}</ul></div>`;
    })
    .join('');

  const disparadas = inferencia.activaciones
    .filter((a) => a.fuerza > 0)
    .sort((a, b) => b.fuerza - a.fuerza)
    .map(
      (a) => `<li><span class="n fuerza">${num(a.fuerza, 2)}</span>
        <span>R${a.numero}: ${describirRegla(a.regla, 'urgencia').replaceAll('_', ' ')}</span></li>`,
    )
    .join('');

  // Curva agregada + centroide
  const W = 420;
  const H = 120;
  const puntos = inferencia.curva.map(({ x, y }) => `${(x / 100) * W},${H - y * (H - 10)}`).join(' ');
  const cx = (p.urgencia / 100) * W;

  contenedor.innerHTML = `
    <div class="bloque-cabecera">
      <h2>Cómo decidió la lógica difusa para ${p.id} (${p.cultivo})</h2>
      <p>Toca una parcela en el mapa o en la tabla para ver su razonamiento. Cada entrada pertenece en cierto grado a varios conjuntos; las reglas se activan con el mínimo de sus condiciones y el resultado sale del centroide.</p>
    </div>
    <div class="detalle">
      <div class="variables">${variables}</div>
      <div class="reglas">
        <h3>Reglas que se activaron</h3>
        <ol>${disparadas || '<li>Ninguna regla se activó.</li>'}</ol>
        <h3>Salida agregada y centroide</h3>
        <svg viewBox="0 0 ${W} ${H + 22}" class="curva" role="img" aria-label="Curva de salida, centroide en ${num(p.urgencia, 1)}">
          <polygon points="0,${H} ${puntos} ${W},${H}" class="area"/>
          <line x1="${cx}" y1="0" x2="${cx}" y2="${H}" class="centroide"/>
          <text x="${cx > W / 2 ? cx - 8 : cx + 8}" y="14" class="centroide-texto" text-anchor="${cx > W / 2 ? 'end' : 'start'}">centroide = ${num(p.urgencia, 1)}</text>
          <text x="0" y="${H + 18}" class="eje">0</text><text x="${W}" y="${H + 18}" class="eje fin">100</text>
        </svg>
      </div>
    </div>`;
}
