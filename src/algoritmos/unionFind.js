/**
 * UNION-FIND (conjuntos disjuntos) con compresión de caminos y unión por rango.
 * Lo usa Kruskal para detectar en tiempo casi constante si una arista formaría un ciclo.
 * Cada operación cuesta O(α(n)), donde α es la inversa de Ackermann (≤ 4 en la práctica).
 */
export class UnionFind {
  constructor(elementos) {
    this.padre = new Map();
    this.rango = new Map();
    for (const e of elementos) {
      this.padre.set(e, e);
      this.rango.set(e, 0);
    }
  }

  /** Representante del conjunto de x (con compresión de caminos). */
  buscar(x) {
    if (!this.padre.has(x)) throw new Error(`Elemento desconocido: ${x}`);
    let raiz = x;
    while (this.padre.get(raiz) !== raiz) raiz = this.padre.get(raiz);
    // Compresión: todos los nodos del camino apuntan directo a la raíz
    while (this.padre.get(x) !== raiz) {
      const siguiente = this.padre.get(x);
      this.padre.set(x, raiz);
      x = siguiente;
    }
    return raiz;
  }

  /** Une los conjuntos de a y b. Devuelve false si ya estaban juntos (habría ciclo). */
  unir(a, b) {
    const ra = this.buscar(a);
    const rb = this.buscar(b);
    if (ra === rb) return false;

    const rangoA = this.rango.get(ra);
    const rangoB = this.rango.get(rb);
    if (rangoA < rangoB) this.padre.set(ra, rb);
    else if (rangoA > rangoB) this.padre.set(rb, ra);
    else {
      this.padre.set(rb, ra);
      this.rango.set(ra, rangoA + 1);
    }
    return true;
  }
}
