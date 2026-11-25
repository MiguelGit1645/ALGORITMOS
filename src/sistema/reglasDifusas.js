/**
 * Definición de los DOS sistemas difusos Mamdani del proyecto.
 * (Las mismas variables y reglas están en matlab/sistema_riego.m)
 *
 * Sistema 1 — URGENCIA DE RIEGO de cada parcela (0 a 100)
 * Sistema 2 — TASA DE PÉRDIDA de agua de cada canal (% por cada 100 m)
 */

// ───────────────────────── Sistema 1: urgencia de riego ─────────────────────────

const lluvia = {
  nombre: 'lluvia',
  explicacion: 'Lluvia del mes. En Cochabamba las normales climatológicas van de casi 0 mm en junio y julio a unos 159 mm en enero; por eso el rango es de 0 a 150 mm (lo que pasa de 150 se toma como 150).',
  unidad: 'mm/mes',
  rango: [0, 150],
  conjuntos: {
    baja: ['trapmf', [0, 0, 20, 50]],
    media: ['trimf', [30, 70, 110]],
    alta: ['trapmf', [90, 120, 150, 150]],
  },
};

const temperatura = {
  nombre: 'temperatura',
  explicacion: 'Temperatura máxima del día. En el valle las máximas normales rondan 24 °C en enero y 27,5 °C en diciembre, con días récord por encima de 35 °C; el rango de 5 a 35 °C cubre del invierno a una ola de calor.',
  unidad: '°C',
  rango: [5, 35],
  conjuntos: {
    fria: ['trapmf', [5, 5, 10, 16]],
    templada: ['trimf', [12, 19, 26]],
    calida: ['trapmf', [22, 28, 35, 35]],
  },
};

const humedadSuelo = {
  nombre: 'humedad_suelo',
  explicacion: 'Porcentaje del agua útil del suelo: 0 % es el punto de marchitez (la planta ya no puede sacar agua) y 100 % es suelo saturado. Las guías de riego de la FAO (estudio 56) explican que la planta solo toma agua sin esfuerzo mientras no se agota una parte del agua disponible; por eso por debajo de 20 % el suelo es totalmente «seco» y desde 60 % empieza a estar «saturado».',
  unidad: '%',
  rango: [0, 100],
  conjuntos: {
    seca: ['trapmf', [0, 0, 20, 40]],
    adecuada: ['trimf', [30, 50, 70]],
    saturada: ['trapmf', [60, 80, 100, 100]],
  },
};

const sensibilidad = {
  nombre: 'sensibilidad',
  explicacion: 'Escala propia de 0 a 10: qué tan rápido pierde rendimiento el cultivo cuando le falta agua. Hortalizas, cebolla y papa (raíces poco profundas) tienen valores altos; la alfalfa (raíces profundas) tiene un valor bajo; el invernadero tiene 9 porque no recibe lluvia.',
  unidad: '0–10',
  rango: [0, 10],
  conjuntos: {
    baja: ['trapmf', [0, 0, 2, 5]],
    media: ['trimf', [3, 5, 7]],
    alta: ['trapmf', [5, 8, 10, 10]],
  },
};

const urgencia = {
  nombre: 'urgencia',
  explicacion: 'Salida del sistema: qué tan urgente es regar la parcela, de 0 a 100. Desde 30 la parcela entra a los turnos, y la cantidad de agua que recibe es proporcional a su urgencia.',
  unidad: 'puntos',
  rango: [0, 100],
  conjuntos: {
    muy_baja: ['trapmf', [0, 0, 10, 25]],
    baja: ['trimf', [15, 30, 45]],
    media: ['trimf', [35, 50, 65]],
    alta: ['trimf', [55, 70, 85]],
    muy_alta: ['trapmf', [75, 90, 100, 100]],
  },
};

export const SISTEMA_URGENCIA = {
  nombre: 'Urgencia de riego',
  entradas: [lluvia, temperatura, humedadSuelo, sensibilidad],
  salida: urgencia,
  reglas: [
    // Suelo saturado: no se riega
    { si: { humedad_suelo: 'saturada' }, entonces: 'muy_baja', porque: 'Si el suelo ya está saturado, regar solo encharca y puede pudrir las raíces: no se riega, haga el clima que haga.' },
    // Suelo seco
    { si: { humedad_suelo: 'seca', lluvia: 'baja', temperatura: 'calida' }, entonces: 'muy_alta', porque: 'El peor caso: el suelo ya está seco, no llega agua de lluvia y el calor hace que la planta pierda agua más rápido.' },
    { si: { humedad_suelo: 'seca', lluvia: 'baja', temperatura: 'templada' }, entonces: 'alta', porque: 'Suelo seco y sin lluvia, pero con menos calor la planta pierde agua más despacio: urgente, un nivel por debajo del peor caso.' },
    { si: { humedad_suelo: 'seca', lluvia: 'baja', temperatura: 'fria' }, entonces: 'media', porque: 'Con frío la planta transpira poco; aunque el suelo esté seco, puede esperar un turno.' },
    { si: { humedad_suelo: 'seca', lluvia: 'media' }, entonces: 'alta', porque: 'La lluvia media repone algo de agua, pero no alcanza para recuperar un suelo que ya está seco.' },
    { si: { humedad_suelo: 'seca', lluvia: 'alta' }, entonces: 'media', porque: 'Si llueve mucho, el suelo seco se recuperará pronto por sí solo; conviene no gastar agua de la represa todavía.' },
    // Suelo con humedad adecuada
    { si: { humedad_suelo: 'adecuada', lluvia: 'baja', temperatura: 'calida' }, entonces: 'alta', porque: 'Hoy la humedad es buena, pero sin lluvia y con calor se agotará rápido: se adelanta el riego antes de que la planta sufra.' },
    { si: { humedad_suelo: 'adecuada', lluvia: 'baja', temperatura: 'templada' }, entonces: 'media', porque: 'Humedad buena y sin lluvia, con un clima moderado: el suelo se seca a ritmo normal, riego a mediano plazo.' },
    { si: { humedad_suelo: 'adecuada', lluvia: 'baja', temperatura: 'fria' }, entonces: 'baja', porque: 'Con humedad buena y frío casi no se pierde agua; aunque no llueva, el riego puede esperar.' },
    { si: { humedad_suelo: 'adecuada', lluvia: 'media' }, entonces: 'baja', porque: 'La humedad es buena y la lluvia la va reponiendo: casi no hace falta regar.' },
    { si: { humedad_suelo: 'adecuada', lluvia: 'alta' }, entonces: 'muy_baja', porque: 'Humedad buena y mucha lluvia: regar sería desperdiciar agua.' },
    // Sensibilidad del cultivo al estrés hídrico
    { si: { sensibilidad: 'alta', humedad_suelo: 'seca' }, entonces: 'muy_alta', porque: 'Los cultivos sensibles (hortalizas, cebolla, invernadero) pierden rendimiento muy rápido si les falta agua: con suelo seco van primero.' },
    { si: { sensibilidad: 'alta', humedad_suelo: 'adecuada', temperatura: 'calida' }, entonces: 'alta', porque: 'Un cultivo sensible con calor se acerca al estrés aunque hoy esté bien: conviene regarlo pronto.' },
    { si: { sensibilidad: 'alta', humedad_suelo: 'adecuada' }, entonces: 'media', porque: 'Un cultivo sensible no debe acercarse al estrés; aunque hoy esté bien, se le da algo de prioridad.' },
    { si: { sensibilidad: 'media', humedad_suelo: 'seca' }, entonces: 'alta', porque: 'Un cultivo de sensibilidad media con suelo seco necesita agua pronto, aunque no sea el más delicado.' },
    { si: { sensibilidad: 'baja', humedad_suelo: 'adecuada' }, entonces: 'muy_baja', porque: 'Los cultivos de raíz profunda, como la alfalfa, aguantan bien con humedad adecuada: pueden esperar.' },
    { si: { sensibilidad: 'baja', humedad_suelo: 'seca', lluvia: 'baja' }, entonces: 'media', porque: 'Incluso un cultivo tolerante necesita agua si el suelo está seco y no llueve, pero no es el primero de la fila.' },
  ],
};

// ───────────────────────── Sistema 2: pérdida en canales ─────────────────────────

const revestimiento = {
  nombre: 'revestimiento',
  explicacion: 'Material del canal en una escala de 0 a 10: tierra = 2, mampostería = 5, tubería = 9. Mientras más cerrado e impermeable, menos agua se filtra o se evapora.',
  unidad: '0–10',
  rango: [0, 10],
  conjuntos: {
    tierra: ['trapmf', [0, 0, 2, 4]],
    mamposteria: ['trimf', [3, 5, 7]],
    tuberia: ['trapmf', [6, 8, 10, 10]],
  },
};

const tasaPerdida = {
  nombre: 'tasa_perdida',
  explicacion: 'Porcentaje del caudal que se pierde por cada 100 m de canal. El rango de 0 a 6 se eligió para que una ruta larga por canales de tierra pierda del orden de 30 a 40 %, coherente con la baja eficiencia de los sistemas de riego tradicionales (18 a 30 %).',
  unidad: '% cada 100 m',
  rango: [0, 6],
  conjuntos: {
    minima: ['trapmf', [0, 0, 0.2, 0.6]],
    baja: ['trimf', [0.4, 1.2, 2]],
    media: ['trimf', [1.5, 2.5, 3.5]],
    alta: ['trimf', [3, 4, 5]],
    muy_alta: ['trapmf', [4.5, 5.5, 6, 6]],
  },
};

export const SISTEMA_PERDIDA = {
  nombre: 'Pérdida en canales',
  entradas: [temperatura, revestimiento],
  salida: tasaPerdida,
  reglas: [
    { si: { revestimiento: 'tuberia' }, entonces: 'minima', porque: 'Una tubería cerrada no filtra ni deja evaporar el agua: la pérdida es casi nula a cualquier temperatura.' },
    { si: { revestimiento: 'mamposteria', temperatura: 'fria' }, entonces: 'baja', porque: 'El revestimiento evita casi toda la filtración y con frío se evapora poco.' },
    { si: { revestimiento: 'mamposteria', temperatura: 'templada' }, entonces: 'baja', porque: 'Sin filtración y con un clima moderado, la evaporación del canal abierto sigue siendo pequeña.' },
    { si: { revestimiento: 'mamposteria', temperatura: 'calida' }, entonces: 'media', porque: 'No filtra, pero el canal está abierto: con calor la evaporación aumenta.' },
    { si: { revestimiento: 'tierra', temperatura: 'fria' }, entonces: 'media', porque: 'Un canal de tierra filtra agua hacia el suelo aunque haga frío.' },
    { si: { revestimiento: 'tierra', temperatura: 'templada' }, entonces: 'alta', porque: 'Filtración del canal de tierra más una evaporación moderada.' },
    { si: { revestimiento: 'tierra', temperatura: 'calida' }, entonces: 'muy_alta', porque: 'El peor caso: el agua se filtra por el fondo de tierra y además se evapora por el calor.' },
  ],
};
