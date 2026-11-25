import './styles.css';
import { planificar, ErrorDeCaso } from './sistema/planificador.js';
import { ESCENARIOS } from './sistema/granja.js';
import { dibujarGrafo, textoLeyenda } from './ui/grafo.js';
import { pintarResumen, pintarEmergencia, pintarTurnos } from './ui/paneles.js';
import { pintarAnalisis } from './ui/analisis.js';
import { dibujarFiguraPertenencia, pintarTablaResultados } from './ui/documento.js';
import { iniciarNavegacion, iniciarTema } from './ui/navegacion.js';
import { crearPizarras } from './ui/pizarras/index.js';
import { crearEditor } from './ui/editor.js';

const estado = { fuente: 'ejemplo', escenario: 'seca', caso: null, seleccion: null, resultado: null };
const $ = (id) => document.getElementById(id);
const pizarras = crearPizarras($('pz-pestanas'), $('pz-area'));
const editor = crearEditor($('editor-area'), {
  alCambiar(caso) {
    if (estado.fuente !== 'propio' || !caso) return; // con errores se mantiene el último caso válido
    estado.caso = caso;
    estado.seleccion = null;
    calcular();
  },
});

// Granja de ejemplo o caso propio
document.querySelector('.fuente-datos').addEventListener('click', (e) => {
  const boton = e.target.closest('[data-fuente]');
  if (!boton || boton.dataset.fuente === estado.fuente) return;
  estado.fuente = boton.dataset.fuente;
  document.querySelectorAll('[data-fuente]').forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
  const propio = estado.fuente === 'propio';
  $('editor').hidden = !propio;
  $('epocas').hidden = propio;
  estado.seleccion = null;
  if (propio) {
    estado.caso = editor.caso() ?? estado.caso;
    if (!estado.caso) return; // el editor muestra qué falta
  }
  calcular();
});

function pintarEpocas() {
  $('epocas').innerHTML = Object.values(ESCENARIOS)
    .map(
      (e) => `<button type="button" class="epoca epoca-${e.id}" data-id="${e.id}" aria-pressed="${e.id === estado.escenario}">
        <span class="epoca-nombre">${e.nombre}</span>
        <span class="epoca-meses">${e.meses}</span>
      </button>`,
    )
    .join('');
}

// Un solo manejador para los botones de época (se registra una vez)
$('epocas').addEventListener('click', (e) => {
  const boton = e.target.closest('.epoca');
  if (!boton || boton.dataset.id === estado.escenario) return;
  estado.escenario = boton.dataset.id;
  estado.seleccion = null;
  calcular();
});

/** Parcela elegida en el mapa o en la tabla: se abre su razonamiento en la pizarra difusa. */
function seleccionar(id) {
  estado.seleccion = id;
  pintarVista();
  pizarras.verParcela(id);
  $('pizarras').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function pintarVista() {
  const r = estado.resultado;
  const sel = estado.seleccion ?? r.emergencia?.parcela.id ?? r.orden[0].id;
  dibujarGrafo($('grafo'), r, { seleccion: sel, alSeleccionar: seleccionar });
  $('leyenda').innerHTML = textoLeyenda(r);
  pintarTurnos($('turnos'), $('explicacion-turnos'), r, sel, seleccionar);
}

function calcular() {
  try {
    estado.resultado = estado.fuente === 'propio'
      ? planificar(estado.caso.escenario, estado.caso)
      : planificar(estado.escenario);
  } catch (error) {
    if (error instanceof ErrorDeCaso) return; // el editor ya muestra el problema
    throw error;
  }
  document.body.dataset.modo = estado.resultado.escenario.modo;
  pintarEpocas();
  pintarResumen($('resumen'), estado.resultado);
  pintarEmergencia($('emergencia'), estado.resultado);
  pintarAnalisis($('analisis'), estado.resultado);
  pintarVista();
  pizarras.actualizar(estado.resultado);
}

// Arranque (una sola vez)
dibujarFiguraPertenencia($('figura-pertenencia'));
pintarTablaResultados($('tabla-resultados'));
iniciarNavegacion();
iniciarTema();
calcular();
