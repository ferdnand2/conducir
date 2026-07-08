# Simulador de Examen de Conducir 🚗

Simulador del examen práctico español (estilo DGT) controlado por **gestos con la webcam**.
Circuito 3D con señales de tráfico reales, coche **manual** (embrague, marchas, calado) o
**automático**, y examinador virtual con faltas leves, deficientes y eliminatorias.

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abre http://localhost:5173 en Chrome o Edge y permite el acceso a la cámara.

## Controles por gestos

| Acción | Gesto |
|---|---|
| Girar el volante | Dos manos abiertas; inclina la línea entre ellas como un volante |
| Acelerar | Acerca las manos a la cámara (empujar); cuanto más cerca, más gas |
| Frenar | Cierra los dos puños (en manual también pisa el embrague… ¡como al parar!) |
| Embrague (manual) | Cierra solo el puño izquierdo |
| Cambiar de marcha | Con el embrague pisado, sube o baja claramente la mano derecha |
| Intermitentes | Extiende solo el índice de la mano de ese lado |

Antes de conducir hay una **calibración**: muestra las dos manos abiertas y quietas 1,5 s.

## Controles por teclado

`←→` volante · `↑` gas · `↓` freno · `C` embrague · `E`/`Q` subir/bajar marcha ·
`Z`/`X` intermitentes · `ESC` volver al menú

## El circuito

Una vuelta de ~4,5 km con **subidas y bajadas** (el coche siente la pendiente: en cuesta
rueda hacia atrás si no frenas): recta a 90, subida con curva señalizada, cima y bajada
al pueblo (VILLAVÍA, 50 → 30 km/h) con **cruce con STOP**, salida hacia una **rotonda**
con ceda el paso, tramo de curvas peligrosas onduladas y **ceda el paso** final.

Hay **tráfico en ambos sentidos**: los coches respetan los límites, frenan en el STOP y
ceden en la rotonda. Chocar con uno es falta eliminatoria; ir pegado detrás, falta leve
por no guardar la distancia de seguridad.

Hay **peatones** en el pueblo: pasean por las aceras, cruzan por el **paso de cebra**
(señalizado con P-20 — si hay alguien sobre el paso hay que detenerse: no ceder es
eliminatoria, atropellar también) y, de vez en cuando, alguno cruza por donde no debe.

21 señales en el recorrido: límites y sus repetidores, STOP, cedas, rotonda (R-402),
paso de peatones (P-20), animales sueltos (P-24), adelantamiento prohibido (R-305) y su
fin (R-500), estacionamiento prohibido (R-308), curvas, pendiente, poblado…

## Consultas (estudio)

Desde el menú, el botón **📚 Consultas** abre dos secciones:

- **Señales de tráfico**: catálogo completo de ~72 señales españolas dibujadas, agrupadas
  en 6 categorías (advertencia de peligro P, prioridad, prohibición/restricción,
  obligación, fin de prohibición e indicación S), cada una con su código oficial y una
  descripción orientada al examen. Incluye un **buscador** que filtra por código, nombre
  o descripción (p. ej. "curva", "R-305", "adelantamiento").
- **Teoría y normativa**: cómo circular por rotondas con ejemplos, nomenclatura de vías
  (AP-, A-, N-, autonómicas), autoridades de tráfico (DGT, Guardia Civil, policías
  locales y autonómicas), orden de prioridad entre señales, límites genéricos y cómo se
  califica el examen.

## Calificación (modo examen)

Igual que la DGT: **no apto** con 1 falta eliminatoria, 2 deficientes o 10 leves.
Se evalúa: velocidad, detención completa en el STOP, moderar en el ceda, mantenerse
en el carril y en la calzada, y calar el motor (3 calados = eliminatoria).

## Coche manual

Para salir: puño izquierdo (embrague) → sube a 1ª (mano derecha arriba) → abre el puño
izquierdo mientras aceleras suavemente. Si sueltas el embrague sin gas, el motor se cala.
Para frenar hasta pararte sin calar, cierra los dos puños (freno + embrague).
