import { evaluar } from '../algoritmos/logicaDifusa.js';
import { mergeSort } from '../algoritmos/mergeSort.js';
import { kruskal, podarArbol } from '../algoritmos/kruskal.js';
import { dijkstra, reconstruirRuta } from '../algoritmos/dijkstra.js';
import { SISTEMA_URGENCIA, SISTEMA_PERDIDA } from './reglasDifusas.js';
import { PARCELAS, CANALES, ESCENARIOS, FUENTE, DESAGUE } from './granja.js';

/** Urgencia mínima (0–100) para que una parcela necesite riego. */
export const UMBRAL_RIEGO = 30;
/** Lámina de riego máxima por turno, en m³ por hectárea. */
export const LAMINA_M3_HA = 450;
/** Tope de pérdida acumulada en una ruta (%). */
const PERDIDA_MAXIMA = 90;

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Ejecuta las 3 capas del sistema para un escenario.
 *
 *  Capa 1  Lógica difusa → urgencia de cada parcela y pérdida de cada canal
 *  Capa 2  Merge Sort    → orden de atención y turnos de riego
 *  Capa 3  Kruskal       → red activa (riego mínima o drenaje máxima)
 *          Dijkstra      → ruta óptima de emergencia
 */
export function planificar(escenarioId, { parcelas = PARCELAS, canales = CANALES } = {}) {
  const escenario = ESCENARIOS[escenarioId];
  if (!escenario) throw new Error(`Escenario desconocido: ${escenarioId}`);
  const tiempos = {};
  const medir = (nombre, fn) => {
    const t0 = performance.now();
    const r = fn();
    tiempos[nombre] = performance.now() - t0;
    return r;
  };

  // ─────────────── CAPA 1: Lógica difusa ───────────────
  const evaluadas = medir('difusa', () => {
    const ps = parcelas.map((p) => {
      const humedad = p.cubierta ? p.humedadBase : limitar(p.humedadBase + escenario.ajusteHumedad, 5, 100);
      const entradas = {
        lluvia: p.cubierta ? 0 : escenario.lluvia, // el invernadero no recibe lluvia
        temperatura: escenario.temperatura,
        humedad_suelo: humedad,
        sensibilidad: p.sensibilidad,
      };
      const inferencia = evaluar(SISTEMA_URGENCIA, entradas);
      const urgencia = inferencia.valor;
      const necesitaRiego = urgencia >= UMBRAL_RIEGO;
      return {
        ...p,
        humedad,
        entradas,
        inferencia,
        urgencia,
        necesitaRiego,
        demanda: necesitaRiego ? p.area * (urgencia / 100) * LAMINA_M3_HA : 0,
      };
    });

    const cs = canales.map((c) => {
      const inferencia = evaluar(SISTEMA_PERDIDA, {
        temperatura: escenario.temperatura,
        revestimiento: c.revestimiento,
      });
      const tasa = inferencia.valor; // % por cada 100 m
      return {
        ...c,
        inferencia,
        tasa,
        perdida: (c.longitud / 100) * tasa, // % del caudal que se pierde en el tramo
        tiempo: c.longitud / c.capacidad, // tiempo relativo de evacuación (drenaje)
      };
    });
    return { parcelas: ps, canales: cs };
  });

  const idsParcelas = evaluadas.parcelas.map((p) => p.id);
  const grafoRiego = {
    nodos: [FUENTE, ...idsParcelas],
    aristas: evaluadas.canales.filter((c) => c.desde !== DESAGUE && c.hasta !== DESAGUE),
  };
  const grafoDrenaje = {
    nodos: [...idsParcelas, DESAGUE],
    aristas: evaluadas.canales.filter((c) => c.desde !== FUENTE && c.hasta !== FUENTE),
  };

  // ─────────────── CAPA 2: Merge Sort (orden de atención) ───────────────
  const statsOrden = { comparaciones: 0 };
  const orden = medir('mergeSort', () =>
    mergeSort(evaluadas.parcelas, (a, b) => b.urgencia - a.urgencia, statsOrden),
  );
  const pendientes = orden.filter((p) => p.necesitaRiego);

  // ─────────────── CAPA 3a: Kruskal (red activa) ───────────────
  const red = medir('kruskal', () => {
    if (escenario.modo === 'riego') {
      const k = kruskal(grafoRiego.nodos, grafoRiego.aristas, { peso: (a) => a.perdida });
      const terminales = [FUENTE, ...pendientes.map((p) => p.id)];
      const activa = podarArbol(k.arbol, terminales);
      return {
        tipo: 'riego',
        criterio: 'mínimo',
        ...k,
        activa,
        perdidaTotal: activa.reduce((s, a) => s + a.perdida, 0),
        longitudTotal: activa.reduce((s, a) => s + a.longitud, 0),
      };
    }
    const k = kruskal(grafoDrenaje.nodos, grafoDrenaje.aristas, { peso: (a) => a.capacidad, maximo: true });
    return {
      tipo: 'drenaje',
      criterio: 'máximo',
      ...k,
      activa: k.arbol,
      capacidadTotal: k.total,
      longitudTotal: k.arbol.reduce((s, a) => s + a.longitud, 0),
    };
  });

  // Rutas de abastecimiento para los turnos:
  //  - riego:   por la red activa de Kruskal (en un árbol hay un solo camino)
  //  - drenaje: la red de riego está apagada; las pocas parcelas que necesitan
  //             agua (p. ej. invernadero) se atienden por su ruta de Dijkstra.
  //             (Para 2 terminales, el árbol de Steiner óptimo ES el camino más corto.)
  const redAbastecimiento =
    escenario.modo === 'riego' ? red.activa : grafoRiego.aristas;
  const rutasDesdeFuente = dijkstra(grafoRiego.nodos, redAbastecimiento, FUENTE, { peso: (a) => a.perdida });

  // Turnos (asignación voraz respetando el orden de Merge Sort)
  let turno = 1;
  let disponible = escenario.aguaPorTurno;
  const rutasRiegoLluvias = [];
  for (const p of orden) {
    if (!p.necesitaRiego) {
      p.turno = null;
      continue;
    }
    const ruta = reconstruirRuta(rutasDesdeFuente, p.id);
    p.ruta = ruta;
    p.perdidaRuta = Math.min(ruta ? ruta.costo : PERDIDA_MAXIMA, PERDIDA_MAXIMA);
    p.eficiencia = 1 - p.perdidaRuta / 100;
    p.requerido = p.demanda / p.eficiencia; // agua que debe salir de la represa
    if (p.requerido > disponible && disponible < escenario.aguaPorTurno) {
      turno++;
      disponible = escenario.aguaPorTurno;
    }
    p.turno = turno;
    disponible -= p.requerido;
    if (escenario.modo === 'drenaje' && ruta) rutasRiegoLluvias.push(...ruta.aristas);
  }
  if (escenario.modo === 'drenaje') red.riegoPuntual = [...new Set(rutasRiegoLluvias)];

  // ─────────────── CAPA 3b: Dijkstra (emergencia) ───────────────
  const emergencia = medir('dijkstra', () => {
    if (escenario.modo === 'riego') {
      const critica = pendientes[0];
      if (!critica) return null;
      const optimo = dijkstra(grafoRiego.nodos, grafoRiego.aristas, FUENTE, { peso: (a) => a.perdida });
      return {
        tipo: 'riego',
        parcela: critica,
        origen: FUENTE,
        destino: critica.id,
        optima: reconstruirRuta(optimo, critica.id),
        porRed: critica.ruta,
        unidad: '% de pérdida',
        visitados: optimo.visitados,
      };
    }
    // Drenaje: la parcela más saturada (al aire libre) evacúa hacia el río
    const expuestas = evaluadas.parcelas.filter((p) => !p.cubierta);
    const critica = mergeSort(expuestas, (a, b) => b.humedad - a.humedad)[0];
    const optimo = dijkstra(grafoDrenaje.nodos, grafoDrenaje.aristas, critica.id, { peso: (a) => a.tiempo });
    const enArbol = dijkstra(grafoDrenaje.nodos, red.activa, critica.id, { peso: (a) => a.tiempo });
    return {
      tipo: 'drenaje',
      parcela: critica,
      origen: critica.id,
      destino: DESAGUE,
      optima: reconstruirRuta(optimo, DESAGUE),
      porRed: reconstruirRuta(enArbol, DESAGUE),
      unidad: 'tiempo de evacuación',
      visitados: optimo.visitados,
    };
  });

  const aguaRequerida = pendientes.reduce((s, p) => s + p.requerido, 0);

  return {
    escenario,
    parcelas: evaluadas.parcelas,
    canales: evaluadas.canales,
    orden,
    comparacionesOrden: statsOrden.comparaciones,
    red,
    emergencia,
    resumen: {
      parcelasConRiego: pendientes.length,
      turnos: pendientes.length ? turno : 0,
      aguaRequerida,
      demandaNeta: pendientes.reduce((s, p) => s + p.demanda, 0),
    },
    tiempos,
  };
}
