// =====================================================================
// data/constantes.js — TEXTOS Y DATOS FIJOS DE LA INTERFAZ
// Aquí no se calcula nada: solo títulos, ayudas y ejemplos de cada sección.
// =====================================================================

// Secciones del menú principal (el orden es el de los botones)
export const VISTAS = [
  { clave: 'numeros', icono: '10↔01', nombre: 'Decimal ↔ Binario' },
  { clave: 'texto', icono: 'Aa↔01', nombre: 'Texto ↔ ASCII' },
  { clave: 'aritmetica', icono: '± × ÷', nombre: 'Aritmética' },
  { clave: 'pruebas', icono: '✔', nombre: 'Pruebas' },
]

// Copia local de las operaciones para dibujar sin esperar al servidor.
// Cuando el backend responde, se reemplaza por la lista de /api/operaciones.
export const OPERACIONES_RESPALDO = [
  { clave: 'suma', nombre: 'Suma', simbolo: '+' },
  { clave: 'resta', nombre: 'Resta', simbolo: '−' },
  { clave: 'multiplicacion', nombre: 'Multiplicación', simbolo: '×' },
  { clave: 'division', nombre: 'División', simbolo: '÷' },
]

// Límites por defecto (el backend manda los reales en /api/operaciones)
export const LIMITES_RESPALDO = { maxBits: 64, maxNumeros: 6, maxCaracteres: 100 }

export const LETRAS = 'ABCDEF' // nombre de cada número en Aritmética
export const PLACEHOLDERS_ARITMETICA = ['1011', '110', '11', '101', '10', '1']

// Colores del sello de cada operación en el historial
export const COLORES_OPERACION = {
  suma: 'linear-gradient(135deg,#059669,#84cc16)',
  resta: 'linear-gradient(135deg,#e11d48,#f472b6)',
  multiplicacion: 'linear-gradient(135deg,#6d28d9,#3b82f6)',
  division: 'linear-gradient(135deg,#d97706,#f97316)',
}

// Ejemplos de Aritmética (botones "Prueba con")
export const EJEMPLOS_ARITMETICA = [
  { operacion: 'suma', numeros: ['1011', '110'] },
  { operacion: 'suma', numeros: ['1011', '110', '11'] },
  { operacion: 'resta', numeros: ['1111', '11', '101'] },
  { operacion: 'multiplicacion', numeros: ['11', '10', '101'] },
  { operacion: 'division', numeros: ['110000', '10', '11'] },
  { operacion: 'suma', numeros: ['1', '10', '11', '100'] },
]

// ---------- Sección Decimal ↔ Binario ----------
export const MODOS_NUM = {
  decimal_a_binario: {
    simbolo: '10→01',
    nombre: 'Decimal a binario',
    titulo: 'Escribe un número decimal (entero positivo)',
    placeholder: '25',
    ayuda: 'Solo dígitos 0–9, sin signo ni punto decimal. Máximo 64 bits (18446744073709551615).',
    salida: 'Binario',
    maxLength: 24,
    ejemplos: ['25', '10', '255', '2026'],
  },
  binario_a_decimal: {
    simbolo: '01→10',
    nombre: 'Binario a decimal',
    titulo: 'Escribe un número binario',
    placeholder: '00001010',
    ayuda: 'Solo 0 y 1. Puedes separar los bytes con espacios. Máximo 64 bits.',
    salida: 'Decimal',
    maxLength: 80,
    ejemplos: ['00001010', '00011001', '11111111', '00000001 00000000'],
  },
}

// ---------- Sección Texto ↔ ASCII ----------
export const MODOS_CONV = {
  texto_a_binario: {
    simbolo: 'Aa→01',
    nombre: 'Texto a ASCII y binario',
    titulo: 'Escribe una letra, palabra o frase',
    placeholder: 'Hola mundo',
    ayuda: 'Los espacios también cuentan: cada espacio es un carácter más (código 32).',
    salida: 'Binario',
    ejemplos: [
      { etiqueta: 'A', valor: 'A' },
      { etiqueta: 'HOLA', valor: 'HOLA' },
      { etiqueta: 'Hola mundo', valor: 'Hola mundo' },
      { etiqueta: 'México 2026', valor: 'México 2026' },
      { etiqueta: '¡Qué tal!', valor: '¡Qué tal!' },
    ],
  },
  binario_a_texto: {
    simbolo: '01→Aa',
    nombre: 'Binario a texto',
    titulo: 'Escribe los bytes en binario',
    placeholder: '01001000 01101111 01101100 01100001',
    ayuda: '8 bits por letra, separados con espacios (o pegados). Ejemplo: 00100000 es un espacio.',
    salida: 'Texto',
    ejemplos: [
      { etiqueta: '«Hola»', valor: '01001000 01101111 01101100 01100001' },
      {
        etiqueta: '«Hola mundo»',
        valor: '01001000 01101111 01101100 01100001 00100000 01101101 01110101 01101110 01100100 01101111',
      },
      { etiqueta: '«ASCII»', valor: '01000001 01010011 01000011 01001001 01001001' },
    ],
  },
}

// Nombre de cada tipo de carácter (viene de conversion_texto.py → _tipo)
export const TIPOS_CARACTER = {
  mayuscula: 'letra mayúscula',
  minuscula: 'letra minúscula',
  numero: 'dígito',
  espacio: 'espacio',
  signo: 'signo',
  extendido: 'ASCII extendido',
}

// ---------- Sección Pruebas ----------
export const GRUPOS_PRUEBA = {
  rubrica: 'Rúbrica',
  extra: 'Extra',
  validacion: 'Validación',
  aritmetica: 'Aritmética',
}

/**
 * Nombre y ayuda de cada número según la operación y cuántos hay.
 * Ej. resta con 3 números → Minuendo, Sustraendo 1, Sustraendo 2.
 */
export function rolesPara(operacion, cantidad) {
  const roles = []
  const varios = cantidad > 2
  for (let i = 0; i < cantidad; i++) {
    let rol
    if (operacion === 'suma') {
      rol = {
        nombre: `Sumando ${i + 1}`,
        ayuda: i === 0 ? 'Los números se van juntando de izquierda a derecha.' : 'Se suma al resultado anterior.',
      }
    } else if (operacion === 'resta') {
      rol = i === 0
        ? { nombre: 'Minuendo', ayuda: 'El número AL QUE le quitas.' }
        : {
            nombre: varios ? `Sustraendo ${i}` : 'Sustraendo',
            ayuda: i === 1 ? 'Lo que LE QUITAS al primero.' : 'Se le quita al resultado anterior.',
          }
    } else if (operacion === 'multiplicacion') {
      if (varios) {
        rol = {
          nombre: `Factor ${i + 1}`,
          ayuda: i === 0 ? 'Se multiplica por cada número siguiente.' : 'Multiplica al resultado anterior.',
        }
      } else {
        rol = i === 0
          ? { nombre: 'Multiplicando', ayuda: 'El número que se repite.' }
          : { nombre: 'Multiplicador', ayuda: 'Cuántas veces se repite.' }
      }
    } else {
      rol = i === 0
        ? { nombre: 'Dividendo', ayuda: 'Lo que se reparte.' }
        : {
            nombre: varios ? `Divisor ${i}` : 'Divisor',
            ayuda: i === 1 ? 'Entre cuántos se reparte.' : 'Divide al cociente anterior.',
          }
    }
    roles.push(rol)
  }
  return roles
}

/** "carácter" / "caracteres" según la cantidad */
export const plural = (n, singular, pluralTexto = `${singular}s`) => (n === 1 ? singular : pluralTexto)
