import { kruskal, podarArbol } from '../../algoritmos/kruskal.js';
import { FUENTE, DESAGUE } from '../../sistema/granja.js';
import { num } from '../formato.js';
import { crearReproductor } from './reproductor.js';
import { cabeceraPizarra, pintarContadores, dibujarGrafoPizarra } from './comun.js';

const CRITERIOS = {
  riego: { nombre: 'Árbol de expansión mínimo', peso: (a) => a.perdida, unidad: '%', maximo: false, excluir: DESAGUE },
  drenaje: { nombre: 'Árbol de expansión máximo', peso: (a) => a.capacidad, unidad: 'L/s', maximo: true, excluir: FUENTE },
};

/**
 * Pizarra de Kruskal: ejecuta el mismo kruskal() del proyecto sobre los canales
 * de la época elegida y muestra, arista por arista, si se acepta o forma ciclo.
 */
export function crearPizarraKruskal(contenedor) {
  contenedor.innerHTML = `
    ${cabeceraPizarra({ titulo: 'Pizarra de Kruskal', subtitulo: 'Árbol de expansión sobre los canales de la granja' })}
    <div class="pz-opciones">
      <label class="pz-campo"><span>Objetivo</span>
        <select data-criterio>
          <option value="riego">Mínimo · pérdida de agua (riego)</option>
          <option value="drenaje">Máximo · capacidad (drenaje)</option>
        </select></label>
    </div>
    <div data-reproductor></div>
    <div class="pz-cuerpo">
      <div class="pz-lienzo"><svg viewBox="0 0 860 540" data-grafo role="img" aria-label="Grafo de canales para Kruskal"></svg></div>
      <aside class="pz-panel">
        <p class="pz-paso" data-paso aria-live="polite"></p>
        <h5>Aristas ordenadas por peso</h5>
        <ol class="pz-lista" data-lista></ol>
      </aside>
    </div>
    <ul class="pz-leyenda">
      <li><i class="lg linea-actual"></i>Arista evaluada</li><li><i class="lg linea-aceptada"></i>Aceptada</li>
      <li><i class="lg linea-rechazada"></i>Rechazada (forma ciclo)</li><li><i class="lg linea-podada"></i>Podada</li>
    </ul>`;

  const svg = contenedor.querySelector('[data-grafo]');
  const lista = contenedor.querySelector('[data-lista]');
  const texto = contenedor.querySelector('[data-paso]');
  const selCriterio = contenedor.querySelector('[data-criterio]');
  let resultado = null;
  let nodos = [];
  let aristas = [];
  let ordenadas = [];
  let pasos = [];
  let criterio = CRITERIOS.riego;

  const reproductor = crearReproductor(contenedor.querySelector('[data-reproductor]'), { alMostrar: mostrar });

  function preparar() {
    criterio = CRITERIOS[selCriterio.value];
    nodos = [...new Set(resultado.canales.flatMap((c) => [c.desde, c.hasta]))].filter((n) => n !== criterio.excluir);
    aristas = resultado.canales.filter((c) => c.desde !== criterio.excluir && c.hasta !== criterio.excluir);

    pasos = [];
    const estados = new Map();
    let aceptadas = 0;
    let rechazadas = 0;
    const r = kruskal(nodos, aristas, {
      peso: criterio.peso,
      maximo: criterio.maximo,
      alPaso: ({ arista, aceptada, total }) => {
        estados.set(arista.id, aceptada ? 'aceptada' : 'rechazada');
        aceptada ? aceptadas++ : rechazadas++;
        pasos.push({
          actual: arista.id, estados: new Map(estados), total, aceptadas, rechazadas,
          texto: aceptada
            ? `${arista.desde}–${arista.hasta} (${formato(arista)}) une dos componentes distintas: se acepta. Peso acumulado: ${formatoValor(total)}.`
            : `${arista.desde}–${arista.hasta} (${formato(arista)}) formaría un ciclo: Union-Find ya tiene ${arista.desde} y ${arista.hasta} en el mismo conjunto. Se rechaza.`,
        });
      },
    });
    ordenadas = r.ordenadas;
    pasos.unshift({
      estados: new Map(), total: 0, aceptadas: 0, rechazadas: 0,
      texto: `Ordenar los ${aristas.length} canales de ${criterio.maximo ? 'mayor a menor' : 'menor a mayor'} peso con Merge Sort (${r.comparaciones} comparaciones). Cada nodo empieza en su propio conjunto.`,
    });
    const ultimo = pasos.at(-1);
    pasos.push({
      estados: ultimo.estados, total: r.total, aceptadas, rechazadas, final: true,
      texto: `Árbol completo: ${r.arbol.length} aristas para ${nodos.length} nodos (V − 1). ${criterio.maximo ? 'Capacidad' : 'Pérdida'} total: ${formatoValor(r.total)}. ${aristas.length - r.arbol.length - rechazadas > 0 ? `Los ${aristas.length - r.arbol.length - rechazadas} canales restantes no se evalúan: el árbol ya estaba completo.` : ''}`,
    });

    if (!criterio.maximo) {
      const terminales = [FUENTE, ...resultado.parcelas.filter((p) => p.necesitaRiego).map((p) => p.id)];
      const activa = new Set(podarArbol(r.arbol, terminales).map((a) => a.id));
      const podadas = r.arbol.filter((a) => !activa.has(a.id));
      if (podadas.length) {
        const estados2 = new Map(ultimo.estados);
        podadas.forEach((a) => estados2.set(a.id, 'podada'));
        pasos.push({
          estados: estados2, total: r.total - podadas.reduce((s, a) => s + a.perdida, 0), aceptadas: aceptadas - podadas.length, rechazadas, final: true,
          texto: `Poda: se quitan ${podadas.map((a) => `${a.desde}–${a.hasta}`).join(', ')} porque solo llevan a parcelas que no necesitan riego en esta época.`,
        });
      }
    }

    lista.innerHTML = ordenadas
      .map((a, i) => `<li data-id="${a.id}"><span class="pz-num">${i + 1}</span><span>${a.desde}–${a.hasta}</span><span class="n">${formato(a)}</span><span class="pz-estado"></span></li>`)
      .join('');
    reproductor.cargar(pasos.length);
  }

  const formatoValor = (v) => (criterio.maximo ? `${num(v)} L/s` : `${num(v, 1)} %`);
  const formato = (a) => formatoValor(criterio.peso(a));

  function mostrar(i) {
    const paso = i < 0
      ? { estados: new Map(), total: 0, aceptadas: 0, rechazadas: 0, texto: `Grafo de la época: ${nodos.length} nodos y ${aristas.length} canales. Objetivo: ${criterio.nombre.toLowerCase()}.` }
      : pasos[i];

    dibujarGrafoPizarra(svg, nodos, aristas, {
      claseArista: (a) => (paso.actual === a.id ? 'actual' : paso.estados.get(a.id) ?? 'pendiente'),
      claseNodo: () => '',
      peso: formato,
    });

    lista.querySelectorAll('li').forEach((li) => {
      const estado = li.dataset.id === paso.actual ? 'actual' : paso.estados.get(li.dataset.id) ?? '';
      li.className = estado;
      li.querySelector('.pz-estado').textContent =
        { aceptada: 'Aceptada', rechazada: 'Ciclo', podada: 'Podada', actual: paso.estados.get(li.dataset.id) === 'aceptada' ? 'Aceptada' : 'Ciclo' }[estado] ?? '';
    });
    lista.querySelector('li.actual')?.scrollIntoView({ block: 'nearest' });

    texto.textContent = paso.texto;
    pintarContadores(contenedor, [
      [criterio.maximo ? 'Capacidad acumulada' : 'Pérdida acumulada', formatoValor(paso.total), true],
      ['Aristas aceptadas', `${paso.aceptadas} / ${nodos.length - 1}`],
      ['Rechazadas', paso.rechazadas],
    ]);
  }

  selCriterio.addEventListener('change', preparar);

  return {
    actualizar(nuevo) {
      resultado = nuevo;
      selCriterio.value = nuevo.escenario.modo;
      preparar();
    },
    detener: () => reproductor.detener(),
  };
}
