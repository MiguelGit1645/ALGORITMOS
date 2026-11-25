# Riego inteligente — Valle Alto de Cochabamba

Proyecto de **Análisis de Algoritmos**. Sistema que, según la época del año, decide **a qué parcelas regar primero** y **por qué canales llevar el agua** con la menor pérdida posible.

Combina cuatro algoritmos implementados desde cero (sin librerías):

| Capa | Algoritmo | Qué resuelve | Complejidad |
|---|---|---|---|
| 1. Diagnóstico | **Lógica difusa (Mamdani)** | Urgencia de riego de cada parcela y pérdida de agua de cada canal | O(n · r · m) |
| 2. Turnos | **Merge Sort** | Orden de atención por urgencia y reparto en turnos | O(n log n) |
| 3. Red | **Kruskal** (+ Union-Find) | Red de canales a habilitar: mínima en riego, máxima en drenaje | O(E log E) |
| 3. Emergencia | **Dijkstra** (+ montículo) | Ruta óptima hacia la parcela crítica | O((V + E) log V) |

> n = parcelas, r = reglas difusas, m = 101 puntos de muestreo, V = nodos, E = canales.

## Contexto

En Bolivia, la mayoría de los sistemas de riego son canales tradicionales con eficiencias del 18–30 %, y las sequías asociadas a El Niño afectan cada vez más a los valles y al Altiplano. El caso de estudio es una granja ficticia de 12 parcelas en el Valle Alto de Cochabamba. Los valores climáticos son **ilustrativos** (dentro de rangos típicos de la zona); para datos reales se pueden usar los resúmenes climáticos del SENAMHI.

## Cómo funciona

```
Clima + granja ─► [Lógica difusa] ─► urgencias ─► [Merge Sort] ─► orden y turnos
                                  └► pérdidas  ─► [Kruskal] ─► red activa ─► [Dijkstra] ─► ruta de emergencia
```

**Tres escenarios** (los mismos que se simulan en MATLAB):

| Escenario | Lluvia | Temp. | Red | Dijkstra |
|---|---|---|---|---|
| Época seca con El Niño | 8 mm | 29 °C | Kruskal **mínimo** sobre la pérdida | Represa → parcela más urgente |
| Época de transición | 45 mm | 21 °C | Kruskal **mínimo** + poda | Represa → parcela más urgente |
| Época de lluvias | 130 mm | 24 °C | Kruskal **máximo** sobre la capacidad (drenaje) | Parcela más saturada → río |

Detalles de diseño que vale la pena explicar en la defensa:

- **Poda después de Kruskal.** Kruskal conecta *todos* los nodos. Si una parcela no necesita agua, la rama que solo lleva a ella se elimina (aproximación clásica del árbol de Steiner).
- **Kruskal máximo = mejor cuello de botella.** En el árbol de expansión máximo, el camino entre dos nodos es el de mayor capacidad mínima: ideal para drenar.
- **Dijkstra sobre todo el campo, no sobre el árbol.** En un árbol hay un solo camino; la comparación interesante es *ruta por la red de Kruskal* vs. *ruta óptima abriendo cualquier canal*. Kruskal minimiza el costo **total** de la red, no la distancia desde la represa, y la app muestra cuándo esas dos cosas no coinciden.
- **Merge Sort es estable.** Si dos parcelas empatan en urgencia, conservan su orden original (se ve en la época de transición con P3, P7 y P11).
- **Invernadero.** Al estar cubierto no recibe lluvia; por eso sigue necesitando riego en la época de lluvias y se atiende con una ruta puntual de Dijkstra (para dos terminales, el árbol de Steiner óptimo es el camino más corto).

## Estructura

```
ALGORITMOS/
├── index.html
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── algoritmos/            ← algoritmos genéricos (no saben nada de riego)
│   │   ├── logicaDifusa.js
│   │   ├── mergeSort.js
│   │   ├── ordenamientosComparativa.js   (Selección, Inserción, Shell)
│   │   ├── kruskal.js
│   │   ├── unionFind.js
│   │   ├── dijkstra.js
│   │   └── minHeap.js
│   ├── sistema/               ← el problema de riego
│   │   ├── granja.js          (parcelas, canales y escenarios)
│   │   ├── reglasDifusas.js   (variables y reglas)
│   │   └── planificador.js    (ejecuta las 3 capas)
│   └── ui/                    ← interfaz
├── tests/                     ← pruebas de cada algoritmo
└── matlab/sistema_riego.m     ← los mismos sistemas difusos para MATLAB
```

## Ejecutar en tu computadora

Requisitos: [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install      # instala Vite
npm run dev      # abre la app en http://localhost:5173
npm test         # corre las pruebas de los algoritmos
npm run build    # genera la versión de producción en dist/
```

## Subir a GitHub y desplegar en Vercel

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

En [vercel.com](https://vercel.com): **Add New → Project → Import** el repositorio. Vercel detecta Vite solo (build `npm run build`, salida `dist`). Cada `git push` vuelve a desplegar.

## Análisis empírico

La sección "Análisis de los algoritmos" de la app compara Merge Sort con Selección, Inserción y Shell para n = 100, 1 000 y 5 000, con listas aleatorias y casi ordenadas, contando comparaciones y midiendo tiempo.
