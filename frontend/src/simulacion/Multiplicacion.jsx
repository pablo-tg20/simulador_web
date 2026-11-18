// =====================================================================
// simulacion/Multiplicacion.jsx — MULTIPLICACIÓN: DESPLAZAR Y SUMAR
// Por cada bit del multiplicador (de derecha a izquierda): si es 1 se copia
// el multiplicando desplazado y se suma al total; si es 0 no se suma nada.
// Datos: etapa.detalle de logica_binaria.multiplicar().
// =====================================================================

import { claseBit } from '../components/Bit'
import { Fila, HUECO, Pizarra, Regla, calcularAncho } from './Pizarra'

/** Prepara lo que no cambia entre pasos. @param {object} datos - { detalle, resultado } */
export function prepararMultiplicacion({ detalle: d, resultado }) {
  const { a, b } = d
  return {
    tipo: 'multiplicacion',
    a,
    b,
    cols: Math.max(resultado.length, a.length + b.length - 1, a.length, b.length),
    pasos: d.parciales,
    total: d.parciales.length,
  }
}

/** Celdas de un número alineado a la derecha. estilo(i) da clases extra por columna. */
function alineada(texto, cols, estilo) {
  const desde = cols - texto.length
  return Array.from({ length: cols }, (_, i) =>
    i < desde ? HUECO : { valor: texto[i - desde], clase: claseBit(texto[i - desde], estilo ? estilo(i) : '') },
  )
}

/** Dibuja la pizarra en el paso k */
export function PizarraMultiplicacion({ modelo, k, anchoEscenario }) {
  const { a, b, cols, pasos } = modelo

  // Multiplicador con el bit del paso actual resaltado
  const multiplicador = alineada(b, cols, (i) => (i === cols - 1 - k ? 'activa' : ''))

  // Total acumulado hasta este paso
  const total = alineada(pasos[k].acumulado, cols)

  return (
    <Pizarra ancho={calcularAncho(anchoEscenario, cols)}>
      <Fila etiqueta="multiplicando" celdas={alineada(a, cols)} />
      <Fila etiqueta="× multiplicador" celdas={multiplicador} />
      <Regla />

      {/* Un producto parcial por bit del multiplicador; aparecen uno por paso */}
      {pasos.map((p, i) => {
        let celdas = p.parcial === null
          ? Array.from({ length: cols }, (_, c) => (c === cols - 1 ? { valor: '0', clase: 'bit relleno' } : HUECO))
          : alineada(p.parcial, cols, (c) => (c >= cols - p.pos ? 'relleno' : '')) // ceros agregados = relleno
        if (i === k) {
          // los 1 del parcial recién agregado aparecen con animación
          celdas = celdas.map((c) => (c.clase.includes(' uno') ? { ...c, clase: `${c.clase} nuevo` } : c))
        }
        return (
          <Fila key={i} etiqueta={`bit ${p.pos} = ${p.parcial === null ? 0 : 1}`} celdas={celdas} oculta={i > k} />
        )
      })}

      <Regla />
      <Fila etiqueta="total" celdas={total} />
    </Pizarra>
  )
}

/** Explicación en palabras del paso k */
export function leyendaMultiplicacion(modelo, k) {
  const p = modelo.pasos[k]
  const fin = k === modelo.pasos.length - 1 ? ' Este es el resultado final.' : ''

  if (p.parcial === null) {
    return (
      <>
        El bit <b>{p.pos}</b> del multiplicador es <b>0</b>: no se suma nada. Acumulado: <b>{p.acumulado}</b>.{fin}
      </>
    )
  }
  const ceros = p.pos === 0 ? 'sin ceros' : `${p.pos} cero${p.pos > 1 ? 's' : ''}`
  return (
    <>
      El bit <b>{p.pos}</b> del multiplicador es <b>1</b>: copio el multiplicando y le agrego {ceros} a la derecha →{' '}
      <b>{p.parcial}</b>. Se suma al acumulado: <b>{p.acumulado}</b>.{fin}
    </>
  )
}
