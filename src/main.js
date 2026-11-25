import './styles.css';
import { planificar } from './sistema/planificador.js';
import { ESCENARIOS } from './sistema/granja.js';
import { dibujarGrafo, textoLeyenda } from './ui/grafo.js';
import { pintarResumen, pintarEmergencia, pintarTurnos } from './ui/paneles.js';
import { pintarAnalisis } from './ui/analisis.js';
import { dibujarFiguraPertenencia, pintarTablaResultados } from './ui/documento.js';
import { iniciarNavegacion, iniciarTema } from './ui/navegacion.js';
import { crearPizarras } from './ui/pizarras/index.js';

const estado = { escenario: 'seca', seleccion: null, resultado: null };
const $ = (id) => document.getElementById(id);
const pizarras = crearPizarras($('pz-pestanas'), $('pz-area'));

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
  estado.resultado = planificar(estado.escenario);
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
