/** Barra de navegación, tema claro/oscuro y animación de la portada. */

const GRUPOS = {
  inicio: 'inicio',
  introduccion: 'fundamentos',
  problema: 'fundamentos',
  objetivos: 'fundamentos',
  marco: 'fundamentos',
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

/** Gotas de lluvia cayendo en diagonal sobre la portada. */
export function iniciarLluvia(canvas) {
  const ctx = canvas.getContext('2d');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let gotas = [];
  let ancho = 0;
  let alto = 0;

  const color = () => getComputedStyle(document.documentElement).getPropertyValue('--particula').trim() || '#ffffff';

  function redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ancho = canvas.clientWidth;
    alto = canvas.clientHeight;
    canvas.width = ancho * dpr;
    canvas.height = alto * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cantidad = Math.round((ancho * alto) / 9000);
    gotas = Array.from({ length: cantidad }, () => ({
      x: Math.random() * ancho,
      y: Math.random() * alto,
      largo: 2 + Math.random() * 6,
      velocidad: 0.15 + Math.random() * 0.5,
      alfa: 0.25 + Math.random() * 0.65,
    }));
  }

  function dibujar() {
    ctx.clearRect(0, 0, ancho, alto);
    ctx.strokeStyle = color();
    ctx.lineCap = 'round';
    for (const g of gotas) {
      ctx.globalAlpha = g.alfa;
      ctx.lineWidth = g.largo > 6 ? 1.6 : 1.1;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x - g.largo * 0.45, g.y + g.largo);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function animar() {
    for (const g of gotas) {
      g.y += g.velocidad;
      g.x -= g.velocidad * 0.45;
      if (g.y > alto + 10 || g.x < -10) {
        g.y = -10;
        g.x = Math.random() * (ancho + alto * 0.45);
      }
    }
    dibujar();
    requestAnimationFrame(animar);
  }

  redimensionar();
  window.addEventListener('resize', () => {
    redimensionar();
    if (quieto) dibujar();
  });
  if (quieto) dibujar();
  else requestAnimationFrame(animar);
  return { redibujar: dibujar };
}
