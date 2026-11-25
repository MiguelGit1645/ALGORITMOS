/**
 * Motor de inferencia difusa tipo MAMDANI.
 *
 * Usa la misma configuración por defecto que `mamfis` de MATLAB:
 *   - Operador Y (AND) ........ mínimo
 *   - Implicación ............. mínimo
 *   - Agregación .............. máximo
 *   - Defuzzificación ......... centroide con 101 puntos de muestreo
 * Así los resultados se pueden comparar con el script de /matlab.
 *
 * Complejidad de una evaluación:  O(r·k + r·m)
 *   r = número de reglas, k = antecedentes por regla,
 *   m = puntos de muestreo de la salida (101).
 */

/** Función de pertenencia trapezoidal [a b c d] (igual que trapmf de MATLAB). */
export function trapmf(x, [a, b, c, d]) {
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

/** Función de pertenencia triangular [a b c] (igual que trimf de MATLAB). */
export function trimf(x, [a, b, c]) {
  return trapmf(x, [a, b, b, c]);
}

const FUNCIONES = { trapmf, trimf };

/** Grado de pertenencia de x a un conjunto ['tipo', [parámetros]]. */
export function pertenencia([tipo, parametros], x) {
  const f = FUNCIONES[tipo];
  if (!f) throw new Error(`Función de pertenencia desconocida: ${tipo}`);
  return f(x, parametros);
}

/** Fuzzificación: grado de pertenencia del valor a cada conjunto de la variable. */
export function fuzzificar(variable, x) {
  const [min, max] = variable.rango;
  const valor = Math.min(max, Math.max(min, x)); // se recorta al rango, como MATLAB
  const grados = {};
  for (const [nombre, conjunto] of Object.entries(variable.conjuntos)) {
    grados[nombre] = pertenencia(conjunto, valor);
  }
  return grados;
}

/**
 * Evalúa el sistema difuso.
 * @param sistema  { entradas: Variable[], salida: Variable, reglas: Regla[] }
 * @param valores  { nombreEntrada: número }
 * @returns { valor, grados, activaciones, curva }
 */
export function evaluar(sistema, valores, { puntos = 101 } = {}) {
  // 1) Fuzzificación de cada entrada
  const grados = {};
  for (const variable of sistema.entradas) {
    if (!(variable.nombre in valores)) {
      throw new Error(`Falta la entrada "${variable.nombre}"`);
    }
    grados[variable.nombre] = fuzzificar(variable, valores[variable.nombre]);
  }

  // 2) Fuerza de disparo de cada regla (AND = mínimo)
  const activaciones = sistema.reglas.map((regla, i) => {
    let fuerza = 1;
    for (const [variable, conjunto] of Object.entries(regla.si)) {
      const g = grados[variable]?.[conjunto];
      if (g === undefined) {
        throw new Error(`Regla ${i + 1}: "${variable}" no tiene el conjunto "${conjunto}"`);
      }
      fuerza = Math.min(fuerza, g);
    }
    return { numero: i + 1, regla, fuerza: fuerza * (regla.peso ?? 1) };
  });

  // 3) Implicación (mínimo) + agregación (máximo) sobre la salida muestreada
  const { salida } = sistema;
  const [min, max] = salida.rango;
  const paso = (max - min) / (puntos - 1);
  const curva = new Array(puntos);
  let numerador = 0;
  let denominador = 0;

  for (let i = 0; i < puntos; i++) {
    const x = min + i * paso;
    let y = 0;
    for (const { regla, fuerza } of activaciones) {
      if (fuerza === 0) continue;
      const conjunto = salida.conjuntos[regla.entonces];
      if (!conjunto) throw new Error(`La salida no tiene el conjunto "${regla.entonces}"`);
      y = Math.max(y, Math.min(fuerza, pertenencia(conjunto, x)));
    }
    curva[i] = { x, y };
    numerador += x * y;
    denominador += y;
  }

  // 4) Defuzzificación por centroide (si ninguna regla se activa, MATLAB devuelve el punto medio)
  const valor = denominador === 0 ? (min + max) / 2 : numerador / denominador;
  return { valor, grados, activaciones, curva };
}

/** Texto legible de una regla: "SI lluvia es baja Y ... ENTONCES urgencia es alta". */
export function describirRegla(regla, nombreSalida) {
  const antecedentes = Object.entries(regla.si).map(([v, c]) => `${v} es ${c}`);
  return `SI ${antecedentes.join(' Y ')} ENTONCES ${nombreSalida} es ${regla.entonces}`;
}
