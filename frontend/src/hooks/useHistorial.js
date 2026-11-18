// =====================================================================
// hooks/useHistorial.js — HISTORIAL GUARDADO EN EL NAVEGADOR
// Un "hook" es una función que agrupa estado + efectos para reutilizarlos.
// Este guarda las últimas operaciones en localStorage (sobrevive a recargar).
// =====================================================================

import { useCallback, useEffect, useState } from 'react'

/**
 * @param {string} clave - nombre con el que se guarda en localStorage
 * @param {number} maximo - cuántas operaciones se conservan
 */
export function useHistorial(clave, maximo = 20) {
  // El valor inicial se lee UNA vez de localStorage (función en useState)
  const [historial, setHistorial] = useState(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(clave) || '[]')
      return Array.isArray(guardado) ? guardado.slice(0, maximo) : []
    } catch {
      return [] // sin localStorage (modo privado): no se guarda nada
    }
  })

  // Cada vez que cambia el historial, se guarda
  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(historial))
    } catch {
      /* modo privado: se ignora */
    }
  }, [clave, historial])

  // useCallback: la función no cambia entre dibujados
  const agregar = useCallback(
    (entrada) => setHistorial((anterior) => [entrada, ...anterior].slice(0, maximo)),
    [maximo],
  )
  const borrar = useCallback(() => setHistorial([]), [])

  return { historial, agregar, borrar }
}
