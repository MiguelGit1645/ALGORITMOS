import './styles.css';
import { planificar } from './sistema/planificador.js';
import { ESCENARIOS } from './sistema/granja.js';
import { dibujarGrafo, textoLeyenda } from './ui/grafo.js';
import { pintarResumen, pintarEmergencia, pintarTurnos, pintarDetalle } from './ui/paneles.js';
import { pintarAnalisis } from './ui/analisis.js';
import { dibujarFiguraPertenencia, pintarTablaResultados } from './ui/documento.js';
import { iniciarNavegacion, iniciarTema, iniciarLluvia } from './ui/navegacion.js';

const estado = { escenario: 'seca', seleccion: null, resultado: null };
const $ = (id) => document.getElementById(id);

function pintarEpocas() {
  $('epocas').innerHTML = Object.values(ESCENARIOS)
    .map(
      (e) => `<button type="button" class="epoca epoca-${e.id}" data-id="${e.id}" aria-pressed="${e.id === estado.escenario}">
        <span class="epoca-nombre">${e.nombre}</span>
        <span class="epoca-meses">${e.meses}</span>
      </button>`,
    )
    .join('');
  $('epocas').querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      estado.escenario = b.dataset.id;
      estado.seleccion = null;
      dibujarFiguraPertenencia($('figura-pertenencia'));
pintarTablaResultados($('tabla-resultados'));
iniciarNavegacion();
const lluvia = iniciarLluvia($('lluvia'));
iniciarTema(() => lluvia.redibujar());
calcular();
    }),
  );
}

function seleccionar(id) {
  estado.seleccion = id;
  pintarVista();
  $('detalle').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function pintarVista() {
  const r = estado.resultado;
  const sel = estado.seleccion ?? r.emergencia?.parcela.id ?? r.orden[0].id;
  dibujarGrafo($('grafo'), r, { seleccion: sel, alSeleccionar: seleccionar });
  $('leyenda').innerHTML = textoLeyenda(r);
  pintarTurnos($('turnos'), $('explicacion-turnos'), r, sel, seleccionar);
  pintarDetalle($('detalle'), r, sel);
}

function calcular() {
  estado.resultado = planificar(estado.escenario);
  document.body.dataset.modo = estado.resultado.escenario.modo;
  pintarEpocas();
  pintarResumen($('resumen'), estado.resultado);
  pintarEmergencia($('emergencia'), estado.resultado);
  pintarAnalisis($('analisis'), estado.resultado);
  pintarVista();
}

dibujarFiguraPertenencia($('figura-pertenencia'));
pintarTablaResultados($('tabla-resultados'));
iniciarNavegacion();
const lluvia = iniciarLluvia($('lluvia'));
iniciarTema(() => lluvia.redibujar());
calcular();
