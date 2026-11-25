import { mergeSort } from '../../algoritmos/mergeSort.js';
import { num } from '../formato.js';
import { crearReproductor } from './reproductor.js';
import { cabeceraPizarra, pintarContadores, explicacionPizarra, pintarExplicacion } from './comun.js';

/**
 * Pizarra de Merge Sort: ordena las urgencias de las parcelas con el mismo
 * mergeSort del proyecto y muestra cada división, comparación y mezcla.
 */
export function crearPizarraMerge(contenedor) {
  contenedor.innerHTML = `
    ${cabeceraPizarra({ titulo: 'Pizarra de Merge Sort', subtitulo: 'Ordena las parcelas por urgencia · divide y vencerás' })}
    ${explicacionPizarra()}
    <div class="pz-opciones">
      <label class="pz-campo"><span>Datos</span>
        <select data-datos><option value="granja">Urgencias de la época</option><option value="aleatorio">Números aleatorios</option></select></label>
      <label class="pz-campo"><span>Orden</span>
        <select data-orden><option value="desc">Mayor urgencia primero</option><option value="asc">Menor primero</option></select></label>
      <button type="button" class="pz-btn" data-aleatorio>Nuevos aleatorios</button>
    </div>
    <div data-reproductor></div>
    <div class="pz-cuerpo pz-cuerpo-ancho">
      <div class="pz-lienzo pz-pista"><div class="pz-columnas" data-columnas></div></div>
      <p class="pz-paso" data-paso aria-live="polite"></p>
      <ul class="pz-leyenda">
        <li><i class="lg rango"></i>Mitad izquierda</li><li><i class="lg rango-der"></i>Mitad derecha</li><li><i class="lg compara"></i>Comparando</li>
        <li><i class="lg gana"></i>Va primero</li><li><i class="lg mezcla"></i>Recién mezclada</li>
      </ul>
    </div>`;

  const columnas = contenedor.querySelector('[data-columnas]');
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

  function explicar() {
    const granja = selDatos.value === 'granja';
    const desc = selOrden.value === 'desc';
    pintarExplicacion(contenedor, {
      datos: granja
        ? `<p>Cada columna es una parcela y su altura es la <strong>urgencia de riego</strong> (0 a 100) que calculó la lógica difusa para la época «${resultado.escenario.nombre}». Las columnas empiezan en el orden de la granja: P1, P2, …, P12.</p>`
        : '<p>Doce números al azar entre 1 y 100, para probar el algoritmo con otros datos. Presiona «Nuevos aleatorios» para cambiarlos.</p>',
      como: `<ol>
          <li><strong>Dividir:</strong> parte la lista por la mitad una y otra vez hasta tener elementos sueltos (log₂ n niveles).</li>
          <li><strong>Comparar:</strong> al volver, mira el primer elemento de cada mitad y pasa al resultado el ${desc ? 'mayor' : 'menor'}.</li>
          <li><strong>Mezclar:</strong> repite hasta vaciar una mitad, copia lo que sobra y esa parte queda ordenada.</li>
        </ol>`,
      porque: `<p>El orden decide los <strong>turnos de riego</strong>: ${desc ? 'primero se riega la parcela más urgente' : 'aquí se ve al revés, de menor a mayor urgencia'}. Se eligió Merge Sort porque <strong>siempre</strong> tarda O(n log n), aunque los datos lleguen en el peor orden, y porque es <strong>estable</strong>: si dos parcelas empatan en urgencia, conservan su orden original y el desempate es justo y predecible.</p>`,
    });
  }

  function preparar() {
    explicar();
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

    // Las columnas se reutilizan por id para que se deslicen a su nueva posición
    const existentes = new Map([...columnas.children].map((el) => [el.dataset.id, el]));
    const vistos = new Set();
    paso.arreglo.forEach((d, pos) => {
      let el = existentes.get(d.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'col';
        el.dataset.id = d.id;
        el.innerHTML = `<span class="col-valor"></span><span class="col-barra"></span><span class="col-etiqueta"></span>`;
        columnas.appendChild(el);
      }
      vistos.add(d.id);
      el.style.left = `${pos * hueco}%`;
      el.style.width = `${hueco}%`;
      el.querySelector('.col-barra').style.height = `${8 + (d.valor / maximo) * 92}%`;
      el.querySelector('.col-valor').textContent = num(d.valor, d.valor % 1 ? 1 : 0);
      el.querySelector('.col-etiqueta').textContent = d.etiqueta;

      const enRango = (r) => r && pos >= r[0] && pos < r[1];
      el.className = 'col';
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

  selDatos.addEventListener('change', () => { columnas.innerHTML = ''; preparar(); });
  selOrden.addEventListener('change', preparar);
  btnAleatorio.addEventListener('click', () => { columnas.innerHTML = ''; preparar(); });

  return {
    actualizar(nuevo) {
      resultado = nuevo;
      if (selDatos.value === 'granja') columnas.innerHTML = '';
      preparar();
    },
    detener: () => reproductor.detener(),
  };
}
