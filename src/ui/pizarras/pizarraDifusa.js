import { pertenencia } from '../../algoritmos/logicaDifusa.js';
import { SISTEMA_URGENCIA, SISTEMA_PERDIDA } from '../../sistema/reglasDifusas.js';
import { num } from '../formato.js';
import { crearReproductor } from './reproductor.js';
import { cabeceraPizarra, pintarContadores, explicacionPizarra, pintarExplicacion } from './comun.js';

const NOMBRES = {
  lluvia: 'Lluvia', temperatura: 'Temperatura', humedad_suelo: 'Humedad del suelo', sensibilidad: 'Sensibilidad',
  revestimiento: 'Revestimiento', urgencia: 'Urgencia', tasa_perdida: 'Tasa de pérdida',
};
const COLORES = ['#8e6cff', '#22c1a6', '#f0a429', '#e0694a', '#4fa3f0'];
const ACENTOS = { calida: 'cálida', fria: 'fría', mamposteria: 'mampostería', tuberia: 'tubería', minima: 'mínima', tasa_perdida: 'tasa de pérdida', humedad_suelo: 'humedad del suelo' };
const bonito = (t) => ACENTOS[t] ?? t.replace('_', ' ');
const decimal = (v) => String(v).replace('.', ',');
const TIPO_CANAL = { 2: 'tierra', 5: 'mampostería', 9: 'tubería' };

/** Explica en palabras las medidas de un conjunto difuso. */
function describirConjunto(variable, nombre) {
  const [tipo, params] = variable.conjuntos[nombre];
  const u = variable.unidad === '0–10' ? '' : ` ${variable.unidad}`;
  const [min, max] = variable.rango;
  const lista = params.map(decimal).join('  ');
  if (tipo === 'trimf') {
    const [a, b, c] = params.map(decimal);
    return `Triangular [${lista}]: pertenece del todo solo en ${b}${u}; empieza a pertenecer en ${a} y deja de hacerlo en ${c}${u}.`;
  }
  const [a, b, c, d] = params;
  if (a === b && a === min) return `Trapezoidal [${lista}]: pertenece del todo desde ${decimal(min)} hasta ${decimal(c)}${u} y deja de pertenecer en ${decimal(d)}${u}.`;
  if (c === d && d === max) return `Trapezoidal [${lista}]: empieza a pertenecer en ${decimal(a)}${u} y pertenece del todo desde ${decimal(b)} hasta ${decimal(max)}${u}.`;
  return `Trapezoidal [${lista}]: pertenece del todo entre ${decimal(b)} y ${decimal(c)}${u}; empieza en ${decimal(a)} y termina en ${decimal(d)}${u}.`;
}

/**
 * Pizarra de lógica difusa: recorre la inferencia Mamdani que ya calculó el
 * sistema para una parcela (urgencia) o un canal (pérdida), paso por paso.
 */
export function crearPizarraDifusa(contenedor) {
  contenedor.innerHTML = `
    ${cabeceraPizarra({ titulo: 'Pizarra de lógica difusa', subtitulo: 'Sistema Mamdani · misma configuración que MATLAB' })}
    ${explicacionPizarra()}
    <div class="pz-opciones">
      <label class="pz-campo"><span>Sistema</span>
        <select data-sistema><option value="urgencia">Urgencia de riego (parcela)</option><option value="perdida">Pérdida de agua (canal)</option></select></label>
      <label class="pz-campo"><span data-etiqueta-caso>Parcela</span><select data-caso></select></label>
    </div>
    <div data-reproductor></div>
    <div class="fz-diagrama" data-diagrama></div>
    <div class="pz-cuerpo">
      <div class="pz-lienzo fz-graficas">
        <svg viewBox="0 0 520 186" data-variable role="img" aria-label="Funciones de pertenencia de la entrada"></svg>
        <svg viewBox="0 0 520 186" data-salida role="img" aria-label="Salida agregada"></svg>
      </div>
      <aside class="pz-panel">
        <p class="pz-paso" data-paso aria-live="polite"></p>
        <h5>Reglas <small>(toca una para explorarla)</small></h5>
        <ol class="pz-lista fz-reglas" data-reglas></ol>
      </aside>
    </div>
    <section class="fz-explorador" data-explorador>
      <div class="fz-exp-cabecera">
        <div><h5>Explorar una regla</h5><p>Elige cualquier regla para ver sus condiciones, las medidas de cada conjunto y cómo calcula su resultado con los datos de la parcela o canal elegido.</p></div>
        <label class="pz-campo"><span>Regla</span><select data-regla></select></label>
      </div>
      <div data-detalle-regla></div>
      <details class="fz-como-reglas">
        <summary>¿De dónde salen las medidas y cómo se pusieron las reglas?</summary>
        <div data-como-reglas></div>
      </details>
    </section>`;

  const selSistema = contenedor.querySelector('[data-sistema]');
  const selCaso = contenedor.querySelector('[data-caso]');
  const etiquetaCaso = contenedor.querySelector('[data-etiqueta-caso]');
  const diagrama = contenedor.querySelector('[data-diagrama]');
  const svgVariable = contenedor.querySelector('[data-variable]');
  const svgSalida = contenedor.querySelector('[data-salida]');
  const listaReglas = contenedor.querySelector('[data-reglas]');
  const texto = contenedor.querySelector('[data-paso]');
  const selRegla = contenedor.querySelector('[data-regla]');
  const detalleRegla = contenedor.querySelector('[data-detalle-regla]');
  const comoReglas = contenedor.querySelector('[data-como-reglas]');
  const explorador = contenedor.querySelector('[data-explorador]');
  let resultado = null;
  let sistema = SISTEMA_URGENCIA;
  let caso = null;
  let pasos = [];

  const reproductor = crearReproductor(contenedor.querySelector('[data-reproductor]'), { alMostrar: mostrar });

  function llenarCasos(seleccion) {
    const esUrgencia = selSistema.value === 'urgencia';
    sistema = esUrgencia ? SISTEMA_URGENCIA : SISTEMA_PERDIDA;
    etiquetaCaso.textContent = esUrgencia ? 'Parcela' : 'Canal';
    const casos = esUrgencia ? resultado.parcelas : resultado.canales;
    selCaso.innerHTML = casos
      .map((c) => `<option value="${c.id}">${esUrgencia ? `${c.id} · ${c.cultivo}` : `${c.desde}–${c.hasta} · ${['', '', 'tierra', '', '', 'mampostería', '', '', '', 'tubería'][c.revestimiento]}`}</option>`)
      .join('');
    if (seleccion && casos.some((c) => c.id === seleccion)) selCaso.value = seleccion;
    preparar();
  }

  /** De dónde sale cada valor de entrada para el caso elegido. */
  function origenDato(nombre) {
    const esc = resultado.escenario;
    if (selSistema.value === 'perdida') {
      if (nombre === 'temperatura') return `${esc.temperatura} °C: temperatura de la época «${esc.nombre}».`;
      return `${caso.revestimiento}: el canal ${caso.desde}–${caso.hasta} es de ${TIPO_CANAL[caso.revestimiento]}.`;
    }
    const p = caso;
    if (nombre === 'lluvia') return p.cubierta ? '0 mm: el invernadero está techado y no recibe lluvia.' : `${esc.lluvia} mm: lluvia de la época «${esc.nombre}».`;
    if (nombre === 'temperatura') return `${esc.temperatura} °C: temperatura de la época «${esc.nombre}».`;
    if (nombre === 'humedad_suelo') {
      if (p.cubierta) return `${p.humedad} %: humedad controlada del invernadero (no cambia con la época).`;
      const ajuste = esc.ajusteHumedad;
      return `${p.humedad} % = humedad base de ${p.id} (${p.humedadBase} %) ${ajuste < 0 ? '−' : '+'} ${Math.abs(ajuste)} por la época${p.humedad !== p.humedadBase + ajuste ? ', limitada entre 5 y 100 %' : ''}.`;
    }
    return `${p.sensibilidad} de 10: sensibilidad asignada al cultivo de ${p.cultivo.toLowerCase()}.`;
  }

  function explicar() {
    const urgencia = selSistema.value === 'urgencia';
    const esc = resultado.escenario;
    pintarExplicacion(contenedor, {
      datos: urgencia
        ? `<p><strong>Lluvia y temperatura</strong> vienen de la época elegida («${esc.nombre}»: ${esc.lluvia} mm y ${esc.temperatura} °C). La <strong>humedad del suelo</strong> es la humedad base de cada parcela ajustada por la época (${esc.ajusteHumedad > 0 ? '+' : ''}${esc.ajusteHumedad} puntos), y la <strong>sensibilidad</strong> depende del cultivo.</p>
           <p>Son valores ilustrativos dentro de rangos reales del valle: en Cochabamba casi no llueve en junio y julio, y en enero caen unos 159 mm.</p>`
        : `<p>La <strong>temperatura</strong> es la de la época elegida (${esc.temperatura} °C) y el <strong>revestimiento</strong> es el material de cada canal: tierra, mampostería o tubería.</p>`,
      como: `<ol>
          <li><strong>Fuzzificar:</strong> cada entrada pertenece en cierto grado (0 a 1) a cada conjunto.</li>
          <li><strong>Evaluar reglas:</strong> la fuerza de una regla es el mínimo de los grados de sus condiciones.</li>
          <li><strong>Recortar y agregar:</strong> cada regla recorta su conjunto de salida a su fuerza y se unen con el máximo.</li>
          <li><strong>Centroide:</strong> el centro de esa figura es el número final.</li>
        </ol>`,
      porque: urgencia
        ? `<p>La granja no tiene años de mediciones, pero sí hay <strong>criterio de riego</strong>. La lógica difusa permite escribir ese criterio como reglas («si el suelo está seco y hace calor, regar ya») y evita los saltos bruscos de un umbral fijo: con 39 % o 41 % de humedad la urgencia cambia poco, no de golpe.</p>`
        : `<p>La pérdida de un canal depende de dos causas que no se miden con exactitud: la <strong>filtración</strong> (según el material) y la <strong>evaporación</strong> (según el calor). Las reglas combinan ambas y dan una tasa que luego se multiplica por la longitud del canal.</p>`,
    });

    // Cómo se pusieron las medidas y las reglas
    const filas = [...sistema.entradas, sistema.salida]
      .map((v) => `<tr><td><strong>${NOMBRES[v.nombre]}</strong><small>${decimal(v.rango[0])} a ${decimal(v.rango[1])} ${v.unidad === '0–10' ? '' : v.unidad}</small></td>
        <td>${Object.keys(v.conjuntos).map((c) => `<div class="fz-conj"><b>${bonito(c)}</b> ${describirConjunto(v, c)}</div>`).join('')}</td>
        <td>${v.explicacion}</td></tr>`)
      .join('');
    comoReglas.innerHTML = `
      <p>${urgencia
        ? 'Las reglas se escribieron con el razonamiento de un regante: cuánta agua le falta a la planta depende de la humedad del suelo, de la lluvia que llega y del calor que la hace perder agua (la misma idea del balance hídrico de la FAO), y qué tan grave es depende de la sensibilidad del cultivo. Se cubrió cada combinación de humedad y lluvia para que siempre se active al menos una regla, y se agregaron reglas de sensibilidad para dar prioridad a los cultivos delicados.'
        : 'Las reglas combinan las dos formas en que un canal pierde agua: por filtración (depende del material) y por evaporación (depende del calor). Hay una regla para cada material y temperatura, así que siempre se activa al menos una.'}</p>
      <p>No se calibraron con mediciones de una granja real: son un criterio inicial que un agrónomo podría ajustar moviendo las medidas de la tabla.</p>
      <div class="tabla-scroll"><table class="tabla compacta fz-tabla-medidas"><thead><tr><th>Variable</th><th>Conjuntos y medidas</th><th>De dónde sale el rango</th></tr></thead><tbody>${filas}</tbody></table></div>`;

    selRegla.innerHTML = sistema.reglas
      .map((r, i) => `<option value="${i + 1}">R${i + 1} · SI ${Object.entries(r.si).map(([v, c]) => `${bonito(v)} es ${bonito(c)}`).join(' Y ')} → ${bonito(r.entonces)}</option>`)
      .join('');
    const primeraActiva = caso.inferencia.activaciones.find((a) => a.fuerza > 0);
    selRegla.value = String(primeraActiva?.numero ?? 1);
    explorarRegla();
  }

  /** Mini gráfica de una variable resaltando un conjunto. */
  function miniGrafica(variable, resaltado, valor, altura) {
    const [min, max] = variable.rango;
    const X0 = 14, X1 = 266, Y0 = 96, Y1 = 14;
    const sx = (x) => X0 + ((x - min) / (max - min)) * (X1 - X0);
    const sy = (y) => Y0 - y * (Y0 - Y1);
    let html = `<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" class="eje-linea"/>
      <text x="${X0}" y="${Y0 + 15}" class="eje-texto">${decimal(min)}</text><text x="${X1}" y="${Y0 + 15}" class="eje-texto" text-anchor="end">${decimal(max)} ${variable.unidad === '0–10' ? '' : variable.unidad}</text>`;
    Object.entries(variable.conjuntos).forEach(([nombre, conjunto], k) => {
      const puntos = [];
      for (let i = 0; i <= 120; i++) {
        const x = min + ((max - min) * i) / 120;
        puntos.push(`${sx(x).toFixed(1)},${sy(pertenencia(conjunto, x)).toFixed(1)}`);
      }
      const activo = nombre === resaltado;
      if (activo) html += `<polygon points="${sx(min)},${Y0} ${puntos.join(' ')} ${sx(max)},${Y0}" fill="${COLORES[k]}" opacity="0.18"/>`;
      html += `<polyline points="${puntos.join(' ')}" fill="none" stroke="${COLORES[k]}" stroke-width="${activo ? 2.6 : 1.2}" opacity="${activo ? 1 : 0.3}"/>`;
    });
    if (altura !== undefined) {
      // salida: área recortada a la fuerza de la regla
      const conjunto = variable.conjuntos[resaltado];
      const puntos = [];
      for (let i = 0; i <= 120; i++) {
        const x = min + ((max - min) * i) / 120;
        puntos.push(`${sx(x).toFixed(1)},${sy(Math.min(altura, pertenencia(conjunto, x))).toFixed(1)}`);
      }
      html += `<polygon points="${sx(min)},${Y0} ${puntos.join(' ')} ${sx(max)},${Y0}" class="fz-area completa"/>`;
      if (altura > 0) html += `<line x1="${X0}" y1="${sy(altura)}" x2="${X1}" y2="${sy(altura)}" class="fz-valor"/>`;
    }
    if (valor !== undefined) {
      const v = Math.min(max, Math.max(min, valor));
      const g = pertenencia(variable.conjuntos[resaltado], v);
      html += `<line x1="${sx(v)}" y1="${Y0}" x2="${sx(v)}" y2="${Y1 - 4}" class="fz-valor"/><circle cx="${sx(v)}" cy="${sy(g)}" r="5" class="fz-punto"/>`;
    }
    return `<svg viewBox="0 0 280 116" class="fz-mini" aria-hidden="true">${html}</svg>`;
  }

  function explorarRegla() {
    const numero = Number(selRegla.value);
    const regla = sistema.reglas[numero - 1];
    const act = caso.inferencia.activaciones[numero - 1];
    const variables = Object.fromEntries(sistema.entradas.map((v) => [v.nombre, v]));
    const entradas = selSistema.value === 'urgencia' ? caso.entradas : { temperatura: resultado.escenario.temperatura, revestimiento: caso.revestimiento };
    const nombreCaso = selSistema.value === 'urgencia' ? `${caso.id} (${caso.cultivo})` : `el canal ${caso.desde}–${caso.hasta}`;

    const condiciones = Object.entries(regla.si).map(([v, c]) => {
      const variable = variables[v];
      const grado = caso.inferencia.grados[v][c];
      return `<article class="fz-condicion">
        <h6>${NOMBRES[v]} es «${bonito(c)}»</h6>
        ${miniGrafica(variable, c, entradas[v])}
        <p class="fz-grado-txt">Grado para ${nombreCaso}: <strong>${num(grado, 2)}</strong></p>
        <p><b>Medidas:</b> ${describirConjunto(variable, c)}</p>
        <p><b>Dato:</b> ${origenDato(v)}</p>
      </article>`;
    });
    const grados = Object.entries(regla.si).map(([v, c]) => num(caso.inferencia.grados[v][c], 2));
    const salida = sistema.salida;

    detalleRegla.innerHTML = `
      <p class="fz-regla-texto"><span class="pz-num">R${numero}</span> SI ${Object.entries(regla.si).map(([v, c]) => `${bonito(v)} es «${bonito(c)}»`).join(' Y ')} ENTONCES ${bonito(salida.nombre)} es «${bonito(regla.entonces)}»</p>
      <p class="fz-porque"><strong>Por qué existe esta regla:</strong> ${regla.porque}</p>
      <div class="fz-condiciones">
        ${condiciones.join('')}
        <article class="fz-condicion fz-consecuencia ${act.fuerza > 0 ? 'activa' : 'inactiva'}">
          <h6>Resultado: ${NOMBRES[salida.nombre].toLowerCase()} «${bonito(regla.entonces)}»</h6>
          ${miniGrafica(salida, regla.entonces, undefined, act.fuerza)}
          <p class="fz-grado-txt">Fuerza = ${grados.length > 1 ? `mín(${grados.join('; ')})` : grados[0]} = <strong>${num(act.fuerza, 2)}</strong></p>
          <p><b>Medidas:</b> ${describirConjunto(salida, regla.entonces)}</p>
          <p>${act.fuerza > 0
            ? `La regla se activa: aporta el conjunto «${bonito(regla.entonces)}» recortado a ${num(act.fuerza, 2)}, que se suma (con el máximo) a lo que aportan las demás reglas.`
            : 'La regla no se activa: al menos una condición tiene grado 0, y como se usa el mínimo, su fuerza es 0 y no aporta nada a la salida.'}</p>
        </article>
      </div>`;
  }

  function preparar() {
    const casos = selSistema.value === 'urgencia' ? resultado.parcelas : resultado.canales;
    caso = casos.find((c) => c.id === selCaso.value) ?? casos[0];
    const inf = caso.inferencia;
    const entradas = selSistema.value === 'urgencia' ? caso.entradas : { temperatura: resultado.escenario.temperatura, revestimiento: caso.revestimiento };
    explicar();

    pasos = [];
    sistema.entradas.forEach((v, k) => {
      const grados = Object.entries(inf.grados[v.nombre]).filter(([, g]) => g > 0);
      pasos.push({ fase: 'entrada', variable: k, entradas,
        texto: `Fuzzificación de ${NOMBRES[v.nombre].toLowerCase()} = ${v.unidad === '0–10' ? `${entradas[v.nombre]} de 10` : `${entradas[v.nombre]} ${v.unidad}`}: pertenece a ${grados.map(([c, g]) => `«${bonito(c)}» con grado ${num(g, 2)}`).join(' y ')}.` });
    });
    const disparadas = inf.activaciones.filter((a) => a.fuerza > 0);
    disparadas.forEach((a, k) => {
      const condiciones = Object.entries(a.regla.si).map(([v, c]) => `${bonito(v)} es ${bonito(c)} (${num(inf.grados[v][c], 2)})`);
      pasos.push({ fase: 'regla', regla: a.numero, hasta: k + 1, entradas,
        texto: `R${a.numero}: SI ${condiciones.join(' Y ')} → fuerza = mínimo = ${num(a.fuerza, 2)}. Se recorta «${bonito(a.regla.entonces)}» a esa altura.` });
    });
    pasos.push({ fase: 'agregacion', hasta: disparadas.length, entradas,
      texto: `Agregación: se unen las ${disparadas.length} salidas recortadas con el máximo. ${sistema.reglas.length - disparadas.length} reglas no se activaron (fuerza 0).` });
    pasos.push({ fase: 'centroide', hasta: disparadas.length, entradas,
      texto: `Defuzzificación por centroide (101 puntos): ${NOMBRES[sistema.salida.nombre].toLowerCase()} = ${num(inf.valor, 2)}${selSistema.value === 'urgencia' ? ` → ${inf.valor >= 30 ? 'necesita riego' : 'no necesita riego'}` : ' % cada 100 m'}.` });
    reproductor.cargar(pasos.length);
  }

  function dibujarDiagrama(paso) {
    const activa = (k) => paso && paso.fase === 'entrada' && paso.variable === k;
    const entradas = sistema.entradas
      .map((v, k) => `<div class="fz-caja fz-entrada ${activa(k) ? 'activa' : ''}"><strong>${NOMBRES[v.nombre]}</strong><span>${paso ? (v.unidad === '0–10' ? `${paso.entradas[v.nombre]} de 10` : `${paso.entradas[v.nombre]} ${v.unidad}`) : v.unidad}</span></div>`)
      .join('');
    const centro = paso && (paso.fase === 'regla' || paso.fase === 'agregacion');
    diagrama.innerHTML = `
      <div class="fz-col">${entradas}</div>
      <div class="fz-flecha" aria-hidden="true"></div>
      <div class="fz-caja fz-centro ${centro ? 'activa' : ''}"><strong>${sistema.nombre}</strong><span>(Mamdani) · ${sistema.reglas.length} reglas</span></div>
      <div class="fz-flecha" aria-hidden="true"></div>
      <div class="fz-caja fz-salida ${paso?.fase === 'centroide' ? 'activa' : ''}"><strong>${NOMBRES[sistema.salida.nombre]}</strong><span>${paso?.fase === 'centroide' ? num(caso.inferencia.valor, 2) : sistema.salida.unidad}</span></div>`;
  }

  /** Dibuja los conjuntos de una variable sobre un eje. */
  function ejes(variable) {
    const [min, max] = variable.rango;
    const X0 = 40, X1 = 505, Y0 = 158, Y1 = 52;
    const sx = (x) => X0 + ((x - min) / (max - min)) * (X1 - X0);
    const sy = (y) => Y0 - y * (Y0 - Y1);
    let html = `<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" class="eje-linea"/><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1 - 4}" class="eje-linea"/>
      <text x="${X0 - 6}" y="${sy(1) + 4}" class="eje-texto" text-anchor="end">1</text><text x="${X0 - 6}" y="${Y0 + 4}" class="eje-texto" text-anchor="end">0</text>
      <text x="${X0}" y="${Y0 + 18}" class="eje-texto">${min}</text><text x="${X1}" y="${Y0 + 18}" class="eje-texto" text-anchor="end">${max} ${variable.unidad}</text>`;
    Object.entries(variable.conjuntos).forEach(([nombre, conjunto], k) => {
      const puntos = [];
      for (let i = 0; i <= 200; i++) {
        const x = min + ((max - min) * i) / 200;
        puntos.push(`${sx(x).toFixed(1)},${sy(pertenencia(conjunto, x)).toFixed(1)}`);
      }
      const params = conjunto[1];
      const pico = conjunto[0] === 'trimf' ? params[1] : (params[1] + params[2]) / 2;
      html += `<polyline points="${puntos.join(' ')}" fill="none" stroke="${COLORES[k]}" stroke-width="2"/>
        <text x="${Math.min(Math.max(sx(pico), X0 + 24), X1 - 24)}" y="${Y1 - 10}" fill="${COLORES[k]}" class="conjunto-texto" text-anchor="middle">${bonito(nombre)}</text>`;
    });
    return { html, sx, sy, min, max, X0, X1, Y0, Y1 };
  }

  function dibujarVariable(paso) {
    const k = paso?.fase === 'entrada' ? paso.variable : 0;
    const variable = sistema.entradas[k];
    const e = ejes(variable);
    let html = `<text x="${e.X0}" y="14" class="fz-titulo-graf">${NOMBRES[variable.nombre]}</text>` + e.html;
    if (paso?.fase === 'entrada') {
      const valor = Math.min(e.max, Math.max(e.min, paso.entradas[variable.nombre]));
      html += `<line x1="${e.sx(valor)}" y1="${e.Y0}" x2="${e.sx(valor)}" y2="${e.Y1 - 4}" class="fz-valor"/>`;
      Object.entries(caso.inferencia.grados[variable.nombre]).forEach(([, g], j) => {
        if (g > 0) html += `<circle cx="${e.sx(valor)}" cy="${e.sy(g)}" r="5" fill="${COLORES[j]}"/><text x="${e.sx(valor) + 9}" y="${e.sy(g) + 4}" class="fz-grado">${num(g, 2)}</text>`;
      });
    }
    svgVariable.innerHTML = html;
  }

  function dibujarSalida(paso) {
    const salida = sistema.salida;
    const e = ejes(salida);
    let html = `<text x="${e.X0}" y="14" class="fz-titulo-graf">${NOMBRES[salida.nombre]} (salida)</text>` + e.html;
    const disparadas = caso.inferencia.activaciones.filter((a) => a.fuerza > 0);
    const hasta = paso && paso.fase !== 'entrada' ? paso.hasta : 0;
    const usadas = disparadas.slice(0, hasta);
    if (usadas.length) {
      const puntos = [];
      for (let i = 0; i <= 200; i++) {
        const x = e.min + ((e.max - e.min) * i) / 200;
        let y = 0;
        for (const a of usadas) y = Math.max(y, Math.min(a.fuerza, pertenencia(salida.conjuntos[a.regla.entonces], x)));
        puntos.push(`${e.sx(x).toFixed(1)},${e.sy(y).toFixed(1)}`);
      }
      html += `<polygon points="${e.sx(e.min)},${e.Y0} ${puntos.join(' ')} ${e.sx(e.max)},${e.Y0}" class="fz-area ${paso.fase === 'regla' ? '' : 'completa'}"/>`;
    }
    if (paso?.fase === 'centroide') {
      const x = e.sx(caso.inferencia.valor);
      html += `<line x1="${x}" y1="${e.Y0}" x2="${x}" y2="${e.Y1 - 4}" class="fz-centroide"/><text x="${x + (x > 300 ? -8 : 8)}" y="${e.Y1 + 14}" text-anchor="${x > 300 ? 'end' : 'start'}" class="fz-centroide-texto">centroide = ${num(caso.inferencia.valor, 2)}</text>`;
    }
    svgSalida.innerHTML = html;
  }

  function dibujarReglas(paso) {
    const inf = caso.inferencia;
    listaReglas.innerHTML = inf.activaciones
      .map((a) => {
        const actual = paso?.fase === 'regla' && paso.regla === a.numero;
        const evaluada = paso && paso.fase !== 'entrada' && (paso.fase !== 'regla' || a.numero <= paso.regla);
        const clase = actual ? 'actual' : evaluada ? (a.fuerza > 0 ? 'aceptada' : 'inactiva') : '';
        const condiciones = Object.entries(a.regla.si).map(([v, c]) => `${bonito(v)} es ${bonito(c)}`).join(' Y ');
        return `<li class="${clase}" data-numero="${a.numero}" tabindex="0" role="button"><span class="pz-num">R${a.numero}</span><span>SI ${condiciones} → ${bonito(a.regla.entonces)}</span><span class="n">${evaluada || actual ? num(a.fuerza, 2) : ''}</span></li>`;
      })
      .join('');
    listaReglas.querySelector('li.actual')?.scrollIntoView({ block: 'nearest' });
  }

  function mostrar(i) {
    const paso = i < 0 ? null : pasos[i];
    dibujarDiagrama(paso);
    dibujarVariable(paso);
    dibujarSalida(paso);
    dibujarReglas(paso);
    texto.textContent = paso
      ? paso.texto
      : `Sistema «${sistema.nombre}»: ${sistema.entradas.length} entradas, ${sistema.reglas.length} reglas y 1 salida. Presiona Reproducir para ver la inferencia paso a paso.`;
    const fuerzas = caso.inferencia.activaciones.filter((a) => a.fuerza > 0).length;
    pintarContadores(contenedor, [
      ['Entradas', sistema.entradas.length],
      ['Reglas', sistema.reglas.length],
      ['Activadas', fuerzas],
      ['Resultado', paso?.fase === 'centroide' ? num(caso.inferencia.valor, 2) : '—', true],
    ]);
  }

  selSistema.addEventListener('change', () => llenarCasos());
  selCaso.addEventListener('change', preparar);
  selRegla.addEventListener('change', explorarRegla);
  const abrirRegla = (li) => {
    selRegla.value = li.dataset.numero;
    explorarRegla();
    explorador.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  listaReglas.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-numero]');
    if (li) abrirRegla(li);
  });
  listaReglas.addEventListener('keydown', (e) => {
    const li = e.target.closest('li[data-numero]');
    if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrirRegla(li); }
  });

  return {
    actualizar(nuevo, { parcela } = {}) {
      resultado = nuevo;
      if (parcela) selSistema.value = 'urgencia';
      llenarCasos(parcela ?? selCaso.value);
    },
    detener: () => reproductor.detener(),
  };
}
