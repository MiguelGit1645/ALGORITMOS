import { mergeSort } from '../../algoritmos/mergeSort.js';
import { num } from '../formato.js';
import { crearReproductor } from './reproductor.js';
import { cabeceraPizarra, pintarContadores } from './comun.js';

// Silueta de pino de boliche, como en la pizarra de ordenamiento de Graphix
const PINO = 'M20 0C26 0 28 5 28 10C28 16 24 19 23.5 25C23 31 34 40 36 55C38 70 35 85 31 100H9C5 85 2 70 4 55C6 40 17 31 16.5 25C16 19 12 16 12 10C12 5 14 0 20 0Z';

/**
 * Pizarra de Merge Sort: ordena las urgencias de las parcelas con el mismo
 * mergeSort del proyecto y muestra cada división, comparación y mezcla.
 */
export function crearPizarraMerge(contenedor) {
  contenedor.innerHTML = `
    ${cabeceraPizarra({ titulo: 'Pizarra de Merge Sort', subtitulo: 'Ordena las parcelas por urgencia · divide y vencerás' })}
    <div class="pz-opciones">
      <label class="pz-campo"><span>Datos</span>
        <select data-datos><option value="granja">Urgencias de la época</option><option value="aleatorio">Números aleatorios</option></select></label>
      <label class="pz-campo"><span>Orden</span>
        <select data-orden><option value="desc">Mayor urgencia primero</option><option value="asc">Menor primero</option></select></label>
      <button type="button" class="pz-btn" data-aleatorio>Nuevos aleatorios</button>
    </div>
    <div data-reproductor></div>
    <div class="pz-cuerpo pz-cuerpo-ancho">
      <div class="pz-lienzo pz-pista"><div class="pz-pinos" data-pinos></div></div>
      <p class="pz-paso" data-paso aria-live="polite"></p>
      <ul class="pz-leyenda">
        <li><i class="lg rango"></i>Sublista en proceso</li><li><i class="lg compara"></i>Comparando</li>
        <li><i class="lg gana"></i>Va primero</li><li><i class="lg mezcla"></i>Recién mezclada</li>
      </ul>
    </div>`;

  const pinos = contenedor.querySelector('[data-pinos]');
  const texto = contenedor.querySelector('[data-paso]');
  const selDatos = contenedor.querySelector('[data-datos]');
  const selOrden = contenedor.querySelector('[data-orden]');
  const btnAleatorio = contenedor.querySelector('[data-aleatorio]');
  let resultado = null;
  let inicial = [];
  let pasos = [];

  const reproductor = crearReproductor(contenedor.querySelector('[data-reproductor]'), { alMostrar: mostrar });

  function datos() {
    if (selDatos.value === 'granja') {
      return resultado.parcelas.map((p) => ({ id: p.id, etiqueta: p.id, valor: Math.round(p.urgencia * 10) / 10 }));
    }
    return Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, etiqueta: `[${i}]`, valor: Math.round(Math.random() * 99) + 1 }));
  }

  function preparar() {
    btnAleatorio.hidden = selDatos.value !== 'aleatorio';
    inicial = datos();
    const comparar = selOrden.value === 'desc' ? (a, b) => b.valor - a.valor : (a, b) => a.valor - b.valor;
    const arreglo = inicial.slice();
    const stats = { comparaciones: 0 };
    let mezclas = 0;
    pasos = [];
    mergeSort(inicial, comparar, stats, (p) => {
      if (p.tipo === 'dividir') {
        pasos.push({ arreglo: arreglo.slice(), rango: [p.ini, p.fin], medio: p.medio, comparaciones: stats.comparaciones, mezclas,
          texto: `Dividir las posiciones ${p.ini} a ${p.fin - 1} en dos mitades: [${p.ini}…${p.medio - 1}] y [${p.medio}…${p.fin - 1}].` });
      } else if (p.tipo === 'comparar') {
        const primero = p.gana === p.a ? p.a : p.b;
        const segundo = primero === p.a ? p.b : p.a;
        const empate = p.a.valor === p.b.valor;
        pasos.push({ arreglo: arreglo.slice(), comparando: [p.a.id, p.b.id], gana: p.gana.id, comparaciones: stats.comparaciones, mezclas,
          texto: `Comparar ${p.a.etiqueta} (${num(p.a.valor, 1)}) con ${p.b.etiqueta} (${num(p.b.valor, 1)}): va primero ${primero.etiqueta}` +
            (empate ? ' porque están empatadas y estaba a la izquierda (estabilidad).' : `, luego ${segundo.etiqueta}.`) });
      } else {
        arreglo.splice(p.ini, p.fin - p.ini, ...p.resultado);
        mezclas++;
        pasos.push({ arreglo: arreglo.slice(), mezclado: [p.ini, p.fin], comparaciones: stats.comparaciones, mezclas,
          texto: `Mezclar: las posiciones ${p.ini} a ${p.fin - 1} quedan ordenadas.` });
      }
    });
    pasos.push({ arreglo: arreglo.slice(), final: true, comparaciones: stats.comparaciones, mezclas,
      texto: `Lista ordenada con ${stats.comparaciones} comparaciones y ${mezclas} mezclas. Merge Sort garantiza O(n log n): con n = ${inicial.length}, n·log₂n ≈ ${Math.round(inicial.length * Math.log2(inicial.length))}.` });
    reproductor.cargar(pasos.length);
  }

  function mostrar(i) {
    const paso = i < 0 ? { arreglo: inicial, comparaciones: 0, mezclas: 0, texto: 'Estado inicial: las parcelas en su orden original. Presiona Reproducir o Siguiente paso.' } : pasos[i];
    const maximo = Math.max(...inicial.map((d) => d.valor), 1);
    const n = paso.arreglo.length;
    const hueco = 100 / n;

    // Los pinos se reutilizan por id para que se deslicen a su nueva posición
    const existentes = new Map([...pinos.children].map((el) => [el.dataset.id, el]));
    const vistos = new Set();
    paso.arreglo.forEach((d, pos) => {
      let el = existentes.get(d.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'pino';
        el.dataset.id = d.id;
        el.innerHTML = `<span class="pino-valor"></span><svg viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true"><path d="${PINO}" class="pino-cuerpo"/><rect x="0" y="26" width="40" height="4" class="pino-franja"/><rect x="0" y="33" width="40" height="4" class="pino-franja"/></svg><span class="pino-etiqueta"></span>`;
        pinos.appendChild(el);
      }
      vistos.add(d.id);
      el.style.left = `${pos * hueco}%`;
      el.style.width = `${hueco}%`;
      el.querySelector('svg').style.height = `${30 + (d.valor / maximo) * 70}%`;
      el.querySelector('.pino-valor').textContent = num(d.valor, d.valor % 1 ? 1 : 0);
      el.querySelector('.pino-etiqueta').textContent = d.etiqueta;

      const enRango = (r) => r && pos >= r[0] && pos < r[1];
      el.className = 'pino';
      if (paso.rango) el.classList.add(enRango(paso.rango) ? (pos < paso.medio ? 'rango-izq' : 'rango-der') : 'atenuado');
      if (paso.comparando?.includes(d.id)) el.classList.add(paso.gana === d.id ? 'gana' : 'compara');
      if (enRango(paso.mezclado)) el.classList.add('mezcla');
      if (paso.final) el.classList.add('final');
    });
    for (const [id, el] of existentes) if (!vistos.has(id)) el.remove();

    texto.textContent = paso.texto;
    pintarContadores(contenedor, [
      ['n', n],
      ['Pasos', i + 1, true],
      ['Comparaciones', paso.comparaciones],
      ['Mezclas', paso.mezclas],
    ]);
  }

  selDatos.addEventListener('change', () => { pinos.innerHTML = ''; preparar(); });
  selOrden.addEventListener('change', preparar);
  btnAleatorio.addEventListener('click', () => { pinos.innerHTML = ''; preparar(); });

  return {
    actualizar(nuevo) {
      resultado = nuevo;
      if (selDatos.value === 'granja') pinos.innerHTML = '';
      preparar();
    },
    detener: () => reproductor.detener(),
  };
}
