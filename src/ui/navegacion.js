/** Barra de navegación, tema claro/oscuro y animación de la portada. */

const GRUPOS = {
  inicio: 'inicio',
  algoritmos: 'inicio',
  introduccion: 'fundamentos',
  problema: 'fundamentos',
  objetivos: 'fundamentos',
  marco: 'fundamentos',
  'como-funciona': 'aplicacion',
  aplicacion: 'aplicacion',
  conclusiones: 'conclusiones',
  referencias: 'conclusiones',
  quienes: 'quienes',
};

export function iniciarNavegacion() {
  const barra = document.getElementById('barra');
  const menu = document.getElementById('menu');
  const hamburguesa = document.getElementById('hamburguesa');
  const desplegable = menu.querySelector('.desplegable');
  const botonFund = desplegable.querySelector('button');

  // Desplegable "Fundamentos"
  const abrirSub = (abrir) => {
    botonFund.setAttribute('aria-expanded', String(abrir));
    desplegable.classList.toggle('abierto', abrir);
  };
  botonFund.addEventListener('click', () => abrirSub(botonFund.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('click', (e) => {
    if (!desplegable.contains(e.target)) abrirSub(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      abrirSub(false);
      cerrarMenu();
    }
  });

  // Menú en móvil
  const cerrarMenu = () => {
    hamburguesa.setAttribute('aria-expanded', 'false');
    hamburguesa.setAttribute('aria-label', 'Abrir menú');
    menu.classList.remove('abierto');
  };
  hamburguesa.addEventListener('click', () => {
    const abrir = hamburguesa.getAttribute('aria-expanded') !== 'true';
    hamburguesa.setAttribute('aria-expanded', String(abrir));
    hamburguesa.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('abierto', abrir);
  });
  menu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      abrirSub(false);
      cerrarMenu();
    }),
  );

  // Barra sólida al bajar
  const alDesplazar = () => barra.classList.toggle('solida', window.scrollY > 40);
  window.addEventListener('scroll', alDesplazar, { passive: true });
  alDesplazar();

  // Enlace activo según la sección visible
  const marcar = (grupo) => {
    menu.querySelectorAll('[data-grupo]').forEach((el) => el.classList.toggle('activo', el.dataset.grupo === grupo));
  };
  const observador = new IntersectionObserver(
    (entradas) => entradas.forEach((e) => e.isIntersecting && marcar(GRUPOS[e.target.id])),
    { rootMargin: '-40% 0px -55% 0px' },
  );
  Object.keys(GRUPOS).forEach((id) => {
    const s = document.getElementById(id);
    if (s) observador.observe(s);
  });
  marcar('inicio');
}

export function iniciarTema(alCambiar) {
  const raiz = document.documentElement;
  const boton = document.getElementById('tema');
  const actualizar = () => {
    const oscuro = raiz.dataset.tema !== 'claro';
    boton.setAttribute('aria-label', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  };
  boton.addEventListener('click', () => {
    raiz.dataset.tema = raiz.dataset.tema === 'claro' ? 'oscuro' : 'claro';
    try {
      localStorage.setItem('tema', raiz.dataset.tema);
    } catch {
      /* almacenamiento no disponible: el tema dura solo esta visita */
    }
    actualizar();
    alCambiar?.();
  });
  actualizar();
}
