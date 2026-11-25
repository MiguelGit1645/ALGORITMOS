/**
 * MONTÍCULO BINARIO DE MÍNIMOS (cola de prioridad).
 * insertar y extraer: O(log n). Lo usa Dijkstra.
 */
export class MinHeap {
  constructor() {
    this.datos = [];
  }

  get tamano() {
    return this.datos.length;
  }

  insertar(prioridad, valor) {
    this.datos.push({ prioridad, valor });
    let i = this.datos.length - 1;
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (this.datos[padre].prioridad <= this.datos[i].prioridad) break;
      [this.datos[padre], this.datos[i]] = [this.datos[i], this.datos[padre]];
      i = padre;
    }
  }

  extraer() {
    if (this.datos.length === 0) return undefined;
    const minimo = this.datos[0];
    const ultimo = this.datos.pop();
    if (this.datos.length > 0) {
      this.datos[0] = ultimo;
      let i = 0;
      for (;;) {
        const izq = 2 * i + 1;
        const der = izq + 1;
        let menor = i;
        if (izq < this.datos.length && this.datos[izq].prioridad < this.datos[menor].prioridad) menor = izq;
        if (der < this.datos.length && this.datos[der].prioridad < this.datos[menor].prioridad) menor = der;
        if (menor === i) break;
        [this.datos[menor], this.datos[i]] = [this.datos[i], this.datos[menor]];
        i = menor;
      }
    }
    return minimo;
  }
}
