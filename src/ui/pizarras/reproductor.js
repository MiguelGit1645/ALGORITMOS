/**
 * Reproductor de pasos compartido por las pizarras
 * (mismos controles que las pizarras de Graphix).
 *
 * El paso -1 es el estado inicial, antes de ejecutar el algoritmo.
 */
const ICONOS = {
  atras: '<path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" />',
  play: '<path d="M7 4v16l13-8z" />',
  pausa: '<path d="M8 5v14M16 5v14" />',
  siguiente: '<path d="M5 4v16l11-8z" /><path d="M19 5v14" />',
  todo: '<path d="M4 5v14l8-7zM12 5v14l8-7z" />',
  reiniciar: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />',
};
const icono = (nombre) => `<svg class="pz-ico" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre]}</svg>`;

export function crearReproductor(contenedor, { alMostrar }) {
  contenedor.innerHTML = `
    <div class="pz-controles" role="group" aria-label="Controles de la pizarra">
      <button type="button" class="pz-btn" data-accion="atras" aria-label="Atrás">${icono('atras')}<span>Atrás</span></button>
      <button type="button" class="pz-btn pz-btn-principal" data-accion="play" aria-label="Reproducir">${icono('play')}<span>Reproducir</span></button>
      <button type="button" class="pz-btn" data-accion="siguiente" aria-label="Siguiente paso">${icono('siguiente')}<span>Siguiente paso</span></button>
      <button type="button" class="pz-btn" data-accion="todo" aria-label="Ejecutar todo">${icono('todo')}<span>Ejecutar todo</span></button>
      <button type="button" class="pz-btn" data-accion="reiniciar" aria-label="Reiniciar">${icono('reiniciar')}<span>Reiniciar</span></button>
      <label class="pz-campo">
        <span>Velocidad</span>
        <select data-accion="velocidad">
          <option value="1100">Lenta</option>
          <option value="600" selected>Normal</option>
          <option value="250">Rápida</option>
        </select>
      </label>
      <span class="pz-progreso" aria-live="polite"></span>
    </div>`;

  const $ = (accion) => contenedor.querySelector(`[data-accion="${accion}"]`);
  const progreso = contenedor.querySelector('.pz-progreso');
  let total = 0;
  let indice = -1;
  let temporizador = null;

  const reproduciendo = () => temporizador !== null;

  function pintarBotones() {
    const final = indice >= total - 1;
    $('atras').disabled = indice < 0;
    $('siguiente').disabled = final;
    $('todo').disabled = final;
    $('play').disabled = final && !reproduciendo();
    $('play').setAttribute('aria-label', reproduciendo() ? 'Pausar' : 'Reproducir');
    $('play').innerHTML = reproduciendo() ? `${icono('pausa')}<span>Pausar</span>` : `${icono('play')}<span>Reproducir</span>`;
    progreso.textContent = indice < 0 ? `${total} pasos` : `Paso ${indice + 1} de ${total}`;
  }

  function ir(nuevo) {
    indice = Math.max(-1, Math.min(total - 1, nuevo));
    alMostrar(indice);
    if (indice >= total - 1) detener();
    pintarBotones();
  }

  function detener() {
    clearInterval(temporizador);
    temporizador = null;
  }

  function reproducir() {
    if (indice >= total - 1) return;
    temporizador = setInterval(() => ir(indice + 1), Number($('velocidad').value));
    pintarBotones();
  }

  $('atras').addEventListener('click', () => { detener(); ir(indice - 1); });
  $('siguiente').addEventListener('click', () => { detener(); ir(indice + 1); });
  $('todo').addEventListener('click', () => { detener(); ir(total - 1); });
  $('reiniciar').addEventListener('click', () => { detener(); ir(-1); });
  $('play').addEventListener('click', () => {
    if (reproduciendo()) { detener(); pintarBotones(); } else reproducir();
  });
  $('velocidad').addEventListener('change', () => {
    if (reproduciendo()) { detener(); reproducir(); }
  });

  return {
    /** Carga una nueva lista de pasos y vuelve al estado inicial. */
    cargar(cantidad) {
      detener();
      total = cantidad;
      ir(-1);
    },
    detener() {
      detener();
      pintarBotones();
    },
    get indice() {
      return indice;
    },
  };
}
