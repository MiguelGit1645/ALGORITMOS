import { UMBRAL_RIEGO } from '../sistema/planificador.js';
import { num, colorUrgencia } from './formato.js';


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
      <p class="clima-meses">${escenario.meses ?? escenario.nombre}</p>
      <p class="clima-datos"><span>${escenario.lluvia} mm de lluvia</span><span>${escenario.temperatura} °C</span></p>
    </div>
    <p class="cifra-principal"><strong>${resumen.parcelasConRiego}</strong> de ${r.parcelas.length} parcelas necesitan riego</p>
    <dl class="datos">
      <dt>Turnos necesarios</dt><dd>${resumen.turnos} <small>(${num(escenario.aguaPorTurno)} m³ por turno)</small></dd>
      <dt>Agua a liberar de la represa</dt><dd>${num(resumen.aguaRequerida)} m³</dd>
      <dt>Se pierde en los canales</dt><dd>${num(resumen.aguaRequerida - resumen.demandaNeta)} m³</dd>
      ${datosRed}
      ${resumen.sinConexion ? `<dt class="alerta">Sin canal a la represa</dt><dd class="alerta">${resumen.sinConexion} parcela${resumen.sinConexion > 1 ? 's' : ''}</dd>` : ''}
      <dt>Comparaciones de Merge Sort</dt><dd>${r.comparacionesOrden} <small>(n = ${r.parcelas.length})</small></dd>
    </dl>`;
}

// ───────────────────────── Emergencia ─────────────────────────
export function pintarEmergencia(contenedor, r) {
  const e = r.emergencia;
  if (!e) {
    contenedor.innerHTML = '<div class="emergencia"><p class="etiqueta">Emergencia</p><p>Ninguna parcela necesita agua.</p></div>';
    return;
  }
  const esRiego = e.tipo === 'riego';
  if (!e.optima) {
    contenedor.innerHTML = `<div class="emergencia"><p class="etiqueta">${esRiego ? 'Parcela crítica' : 'Parcela más saturada'}</p>
      <p class="critica-nombre">${e.parcela.id} ${e.parcela.cultivo}</p>
      <p class="conclusion alerta">No hay ningún camino de canales entre ${e.origen} y ${e.destino}. Conéctala con un canal para calcular la ruta.</p></div>`;
    return;
  }
  const formato = (c) => (esRiego ? `${num(c, 1)} % de pérdida` : `${num(c, 1)} de tiempo`);
  const ahorro = e.porRed ? e.porRed.costo - e.optima.costo : 0;
  const conclusion =
    ahorro < 0.05
      ? 'La red de Kruskal ya usa el mejor camino para esta parcela.'
      : esRiego
        ? `Abrir los canales de la ruta de Dijkstra pierde ${num(ahorro, 1)} puntos menos que ir por la red habilitada.`
        : `La ruta de Dijkstra evacúa ${num((ahorro / e.porRed.costo) * 100)} % más rápido que la red de drenaje.`;

  contenedor.innerHTML = `
    <div class="emergencia">
      <p class="etiqueta">${esRiego ? 'Parcela crítica' : 'Parcela más saturada'}</p>
      <p class="critica-nombre">${e.parcela.id} ${e.parcela.cultivo}
        <span>${esRiego ? `urgencia ${num(e.parcela.urgencia, 1)}` : `humedad ${e.parcela.humedad} %`}</span></p>
      <ol class="rutas">
        <li><span class="ruta-tipo optima">Dijkstra, todo el campo</span>
            <span class="ruta-nodos">${e.optima.nodos.join(' – ')}</span>
            <span class="ruta-costo">${formato(e.optima.costo)}</span></li>
        <li><span class="ruta-tipo">Por la red de Kruskal</span>
            <span class="ruta-nodos">${e.porRed ? e.porRed.nodos.join(' – ') : 'Sin camino dentro de la red'}</span>
            <span class="ruta-costo">${e.porRed ? formato(e.porRed.costo) : ''}</span></li>
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
      let riego = '<td colspan="4" class="sin-riego">No necesita riego</td>';
      if (p.necesitaRiego && p.sinRuta) {
        riego = `<td class="n">${num(p.demanda)}</td><td colspan="3" class="sin-riego alerta">Sin canal que la una a la represa</td>`;
      } else if (p.necesitaRiego) {
        riego = `<td class="n">${num(p.demanda)}</td><td class="n">${num(p.perdidaRuta, 1)} %</td><td class="n">${num(p.requerido)}</td>
          <td><span class="chip${p.excede ? ' chip-alerta' : ''}" ${p.excede ? 'title="Necesita más agua que un turno completo"' : ''}>Turno ${p.turno}${p.excede ? ' ⚠' : ''}</span></td>`;
      }
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
