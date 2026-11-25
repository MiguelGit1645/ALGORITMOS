import { dijkstra, reconstruirRuta } from '../../algoritmos/dijkstra.js';
import { FUENTE, DESAGUE } from '../../sistema/granja.js';
import { num } from '../formato.js';
import { crearReproductor } from './reproductor.js';
import { cabeceraPizarra, pintarContadores, dibujarGrafoPizarra, dist, explicacionPizarra, pintarExplicacion } from './comun.js';

const REDES = {
  riego: { nombre: 'Riego', peso: (a) => a.perdida, unidad: '% de pérdida', excluir: DESAGUE, formato: (v) => `${num(v, 1)}%` },
  drenaje: { nombre: 'Drenaje', peso: (a) => a.tiempo, unidad: 'de tiempo', excluir: FUENTE, formato: (v) => num(v, 1) },
};

/**
 * Pizarra de Dijkstra: ejecuta el mismo dijkstra() del proyecto y muestra cada
 * extracción del montículo y cada relajación de aristas.
 */
export function crearPizarraDijkstra(contenedor) {
  contenedor.innerHTML = `
    ${cabeceraPizarra({ titulo: 'Pizarra de Dijkstra', subtitulo: 'Camino de menor costo con montículo de mínimos' })}
    ${explicacionPizarra()}
    <div class="pz-opciones">
      <label class="pz-campo"><span>Red</span>
        <select data-red><option value="riego">Riego · peso = pérdida de agua</option><option value="drenaje">Drenaje · peso = tiempo de evacuación</option></select></label>
      <label class="pz-campo"><span>Origen</span><select data-origen></select></label>
      <label class="pz-campo"><span>Destino</span><select data-destino></select></label>
    </div>
    <div data-reproductor></div>
    <div class="pz-cuerpo">
      <div class="pz-lienzo"><svg viewBox="0 0 860 540" data-grafo role="img" aria-label="Grafo de canales para Dijkstra"></svg></div>
      <aside class="pz-panel">
        <p class="pz-paso" data-paso aria-live="polite"></p>
        <h5>Tabla de distancias</h5>
        <table class="pz-tabla" data-tabla><thead><tr><th>Nodo</th><th class="n">dist</th><th>previo</th><th>Estado</th></tr></thead><tbody></tbody></table>
      </aside>
    </div>
    <ul class="pz-leyenda">
      <li><i class="lg nodo-actual"></i>Nodo extraído</li><li><i class="lg nodo-visitado"></i>Visitado (distancia definitiva)</li>
      <li><i class="lg linea-actual"></i>Relajando</li><li><i class="lg linea-ruta"></i>Ruta óptima</li>
    </ul>`;

  const svg = contenedor.querySelector('[data-grafo]');
  const cuerpoTabla = contenedor.querySelector('[data-tabla] tbody');
  const texto = contenedor.querySelector('[data-paso]');
  const selRed = contenedor.querySelector('[data-red]');
  const selOrigen = contenedor.querySelector('[data-origen]');
  const selDestino = contenedor.querySelector('[data-destino]');
  let resultado = null;
  let red = REDES.riego;
  let nodos = [];
  let aristas = [];
  let pasos = [];

  const reproductor = crearReproductor(contenedor.querySelector('[data-reproductor]'), { alMostrar: mostrar });

  function llenarSelects(origen, destino) {
    const opciones = nodos.map((n) => `<option value="${n}">${n}</option>`).join('');
    selOrigen.innerHTML = opciones;
    selDestino.innerHTML = opciones;
    selOrigen.value = origen;
    selDestino.value = destino;
  }

  function cambiarRed(origen, destino) {
    red = REDES[selRed.value];
    aristas = resultado.canales.filter((c) => c.desde !== red.excluir && c.hasta !== red.excluir);
    nodos = [...new Set(aristas.flatMap((c) => [c.desde, c.hasta]))].sort((a, b) => orden(a) - orden(b));
    llenarSelects(origen, destino);
    preparar();
  }
  const orden = (id) => (id === FUENTE ? -1 : id === DESAGUE ? 99 : Number(id.slice(1)));

  function explicar() {
    const riego = selRed.value === 'riego';
    pintarExplicacion(contenedor, {
      datos: riego
        ? `<p><strong>Red de riego:</strong> la represa R y las parcelas. El peso de cada canal es el <strong>% de agua que se pierde</strong> en él (longitud × tasa de pérdida de la lógica difusa).</p>
           <p>Por defecto va de la represa a la parcela más urgente de la época, pero puedes elegir cualquier origen y destino.</p>`
        : `<p><strong>Red de drenaje:</strong> las parcelas y el desagüe D. El peso de cada canal es el <strong>tiempo de evacuación</strong> = longitud ÷ capacidad: un canal largo y angosto tarda más.</p>
           <p>Por defecto va de la parcela más saturada al río, pero puedes elegir otro origen y destino.</p>`,
      como: `<ol>
          <li>El origen empieza con distancia 0 y el resto con ∞.</li>
          <li>Saca del <strong>montículo</strong> el nodo más cercano todavía no visitado: su distancia ya es definitiva.</li>
          <li><strong>Relaja</strong> sus vecinos: si llegar por este nodo cuesta menos que lo anotado, actualiza la distancia y el «previo».</li>
          <li>Al terminar, la ruta se reconstruye siguiendo «previo» desde el destino.</li>
        </ol>`,
      porque: `<p><strong>¿Por qué riego y drenaje?</strong> Porque el agua cambia de sentido según la época. En época seca hay que <em>llevar</em> agua de la represa a las parcelas perdiendo lo menos posible, así que el costo es la pérdida. En época de lluvias hay que <em>sacar</em> el exceso de las parcelas hacia el río lo más rápido posible, así que el costo es el tiempo. Es el mismo algoritmo con otro peso.</p>
        <p>Dijkstra sirve en los dos casos porque <strong>ningún peso es negativo</strong>. Busca en <strong>todo el campo</strong>, no solo en la red de Kruskal: en una emergencia se puede abrir un canal que normalmente está cerrado.</p>`,
    });
  }

  function preparar() {
    explicar();
    const origen = selOrigen.value;
    const destino = selDestino.value;
    const distancias = new Map(nodos.map((n) => [n, Infinity]));
    const previos = new Map();
    const visitados = new Set();
    distancias.set(origen, 0);
    let relajaciones = 0;
    pasos = [{
      distancias: new Map(distancias), previos: new Map(previos), visitados: new Set(), relajaciones,
      texto: `Inicio: dist[${origen}] = 0 y el resto = ∞. Se inserta (0, ${origen}) en el montículo.`,
    }];

    const r = dijkstra(nodos, aristas, origen, {
      peso: red.peso,
      alPaso: (p) => {
        if (p.tipo === 'extraer') {
          visitados.add(p.nodo);
          pasos.push({ distancias: new Map(distancias), previos: new Map(previos), visitados: new Set(visitados), actual: p.nodo, relajaciones,
            texto: `Extraer del montículo el nodo más cercano: ${p.nodo} (dist = ${dist(p.distancia)}). Su distancia ya es definitiva.` });
        } else {
          relajaciones++;
          if (p.mejora) {
            distancias.set(p.hacia, p.nueva);
            previos.set(p.hacia, p.desde);
          }
          pasos.push({ distancias: new Map(distancias), previos: new Map(previos), visitados: new Set(visitados), actual: p.desde, relajando: p.arista.id, objetivo: p.hacia, relajaciones,
            texto: `Relajar ${p.desde}→${p.hacia}: ${dist(p.nueva - red.peso(p.arista))} + ${red.formato(red.peso(p.arista))} = ${dist(p.nueva)} ` +
              (p.mejora ? `< ${dist(p.anterior)}. Se actualiza dist[${p.hacia}] y previo = ${p.desde}.` : `≥ ${dist(p.anterior)}. No mejora.`) });
        }
      },
    });
    const ruta = reconstruirRuta(r, destino);
    pasos.push({
      distancias: r.distancia, previos: new Map([...r.previo].map(([k, v]) => [k, v.nodo])), visitados: new Set(nodos), ruta: ruta?.nodos, relajaciones, final: true,
      texto: ruta
        ? `Ruta óptima ${origen} → ${destino}: ${ruta.nodos.join(' – ')}, con ${dist(ruta.costo)} ${red.unidad}. Se reconstruye siguiendo «previo» desde el destino.`
        : `No hay camino entre ${origen} y ${destino}.`,
    });
    reproductor.cargar(pasos.length);
  }

  function mostrar(i) {
    const paso = i < 0
      ? { distancias: new Map(), previos: new Map(), visitados: new Set(), relajaciones: 0, texto: `Busca la ruta de menor ${red.nombre === 'Riego' ? 'pérdida' : 'tiempo'} entre ${selOrigen.value} y ${selDestino.value}. Presiona Reproducir.` }
      : pasos[i];
    const enRuta = new Set();
    if (paso.ruta) for (let k = 1; k < paso.ruta.length; k++) enRuta.add([paso.ruta[k - 1], paso.ruta[k]].sort().join('|'));

    dibujarGrafoPizarra(svg, nodos, aristas, {
      claseArista: (a) => {
        if (enRuta.has([a.desde, a.hasta].sort().join('|'))) return 'ruta';
        if (paso.relajando === a.id) return 'actual';
        const arbol = paso.previos.get(a.hasta) === a.desde || paso.previos.get(a.desde) === a.hasta;
        return arbol ? 'arbol' : 'pendiente';
      },
      claseNodo: (id) => [
        paso.actual === id ? 'actual' : paso.visitados.has(id) ? 'visitado' : '',
        paso.objetivo === id ? 'objetivo' : '',
        id === selOrigen.value ? 'origen' : '',
        id === selDestino.value ? 'destino' : '',
      ].join(' '),
      peso: (a) => red.formato(red.peso(a)),
      nota: (id) => (i < 0 ? '' : dist(paso.distancias.get(id))),
      ruta: paso.ruta,
    });

    cuerpoTabla.innerHTML = nodos
      .map((n) => {
        const estado = paso.actual === n ? 'Extraído' : paso.visitados.has(n) ? 'Visitado' : paso.distancias.get(n) < Infinity ? 'En montículo' : '—';
        const clase = paso.actual === n ? 'actual' : paso.objetivo === n ? 'objetivo' : paso.visitados.has(n) ? 'visitado' : '';
        return `<tr class="${clase}"><td><strong>${n}</strong></td><td class="n">${i < 0 ? (n === selOrigen.value ? '0' : '∞') : dist(paso.distancias.get(n))}</td><td>${paso.previos.get(n) ?? '—'}</td><td>${estado}</td></tr>`;
      })
      .join('');

    texto.textContent = paso.texto;
    const alDestino = paso.distancias.get(selDestino.value);
    pintarContadores(contenedor, [
      ['Visitados', `${paso.visitados.size} / ${nodos.length}`],
      ['Relajaciones', paso.relajaciones],
      [`Distancia a ${selDestino.value}`, i < 0 ? '∞' : dist(alDestino), true],
    ]);
  }

  selRed.addEventListener('change', () => {
    const porDefecto = selRed.value === 'riego' ? [FUENTE, resultado.orden[0].id] : [resultado.emergencia?.origen ?? 'P4', DESAGUE];
    cambiarRed(...porDefecto);
  });
  selOrigen.addEventListener('change', preparar);
  selDestino.addEventListener('change', preparar);

  return {
    actualizar(nuevo) {
      resultado = nuevo;
      selRed.value = nuevo.escenario.modo;
      const e = nuevo.emergencia;
      cambiarRed(e?.origen ?? FUENTE, e?.destino ?? nuevo.orden[0].id);
    },
    detener: () => reproductor.detener(),
  };
}
