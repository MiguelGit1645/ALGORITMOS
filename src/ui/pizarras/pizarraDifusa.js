import { pertenencia } from '../../algoritmos/logicaDifusa.js';
import { SISTEMA_URGENCIA, SISTEMA_PERDIDA } from '../../sistema/reglasDifusas.js';
import { num } from '../formato.js';
import { crearReproductor } from './reproductor.js';
import { cabeceraPizarra, pintarContadores } from './comun.js';

const NOMBRES = {
  lluvia: 'Lluvia', temperatura: 'Temperatura', humedad_suelo: 'Humedad del suelo', sensibilidad: 'Sensibilidad',
  revestimiento: 'Revestimiento', urgencia: 'Urgencia', tasa_perdida: 'Tasa de pérdida',
};
const COLORES = ['#8e6cff', '#22c1a6', '#f0a429', '#e0694a', '#4fa3f0'];
const bonito = (t) => t.replace('_', ' ');

/**
 * Pizarra de lógica difusa: recorre la inferencia Mamdani que ya calculó el
 * sistema para una parcela (urgencia) o un canal (pérdida), paso por paso.
 */
export function crearPizarraDifusa(contenedor) {
  contenedor.innerHTML = `
    ${cabeceraPizarra({ titulo: 'Pizarra de lógica difusa', subtitulo: 'Sistema Mamdani · misma configuración que MATLAB' })}
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
        <h5>Reglas</h5>
        <ol class="pz-lista fz-reglas" data-reglas></ol>
      </aside>
    </div>`;

  const selSistema = contenedor.querySelector('[data-sistema]');
  const selCaso = contenedor.querySelector('[data-caso]');
  const etiquetaCaso = contenedor.querySelector('[data-etiqueta-caso]');
  const diagrama = contenedor.querySelector('[data-diagrama]');
  const svgVariable = contenedor.querySelector('[data-variable]');
  const svgSalida = contenedor.querySelector('[data-salida]');
  const listaReglas = contenedor.querySelector('[data-reglas]');
  const texto = contenedor.querySelector('[data-paso]');
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

  function preparar() {
    const casos = selSistema.value === 'urgencia' ? resultado.parcelas : resultado.canales;
    caso = casos.find((c) => c.id === selCaso.value) ?? casos[0];
    const inf = caso.inferencia;
    const entradas = selSistema.value === 'urgencia' ? caso.entradas : { temperatura: resultado.escenario.temperatura, revestimiento: caso.revestimiento };

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
        return `<li class="${clase}"><span class="pz-num">R${a.numero}</span><span>SI ${condiciones} → ${bonito(a.regla.entonces)}</span><span class="n">${evaluada || actual ? num(a.fuerza, 2) : ''}</span></li>`;
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

  return {
    actualizar(nuevo, { parcela } = {}) {
      resultado = nuevo;
      if (parcela) selSistema.value = 'urgencia';
      llenarCasos(parcela ?? selCaso.value);
    },
    detener: () => reproductor.detener(),
  };
}
