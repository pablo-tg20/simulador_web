"""conversion_numeros.py — Decimal ↔ Binario hecho a mano (sin bin() ni int(x, 2))."""

from dataclasses import dataclass, field
from typing import List

from logica_binaria import MAX_BITS, EntradaInvalida, ErrorBinario

MAX_DECIMAL = 2 ** MAX_BITS - 1         # el número más grande que cabe en 64 bits
MODOS_NUMERO = ("decimal_a_binario", "binario_a_decimal")


class ModoNumeroDesconocido(ErrorBinario):
    """Se pidió una conversión numérica que no existe."""


@dataclass
class ConversionNumero:
    """Lo que la interfaz necesita para dibujar el resultado."""
    modo: str
    entrada: str
    decimal: str                # el número en decimal (texto, para no perder precisión en JS)
    binario: str                # binario completo en bytes de 8 bits: "00011001"
    binario_minimo: str         # sin ceros a la izquierda: "11001"
    binario_bytes: str          # separado por bytes: "00000001 00000000"
    bits_relleno: int           # cuántos ceros se agregaron a la izquierda
    pasos: List[dict] = field(default_factory=list)
    suma: str = ""              # solo binario → decimal: "8 + 2 = 10"
    verificado: bool = False    # ¿coincide con lo que calcula Python por su cuenta?


# ---------- Validación de entradas ----------

def validar_decimal(texto) -> int:
    """Acepta solo enteros positivos (0 a 2^64 − 1)."""
    if not isinstance(texto, str):
        raise EntradaInvalida("No se recibió ningún número.")
    limpio = texto.strip()
    if limpio == "":
        raise EntradaInvalida("El campo está vacío. Escribe un número entero, por ejemplo 25.")
    if limpio.startswith("-"):
        raise EntradaInvalida("Solo números enteros positivos (sin signo −).")
    if "." in limpio or "," in limpio:
        raise EntradaInvalida("Solo números enteros: sin punto decimal ni comas.")

    for posicion, c in enumerate(limpio, start=1):
        if c not in "0123456789":
            raise EntradaInvalida(f"'{c}' (posición {posicion}) no es un dígito decimal. Usa solo 0–9.")

    numero = int(limpio)                # aquí solo se LEE el texto como número decimal
    if numero > MAX_DECIMAL:
        raise EntradaInvalida(f"El número es demasiado grande: el máximo es {MAX_DECIMAL} ({MAX_BITS} bits).")
    return numero


def validar_binario(texto) -> str:
    """Acepta solo 0 y 1 (los espacios se ignoran), máximo MAX_BITS bits."""
    if not isinstance(texto, str):
        raise EntradaInvalida("No se recibió ningún número.")
    limpio = "".join(texto.split())     # quita espacios: "0000 1010" → "00001010"
    if limpio == "":
        raise EntradaInvalida("El campo está vacío. Escribe un número binario, por ejemplo 00001010.")

    for posicion, c in enumerate(limpio, start=1):
        if c not in "01":
            raise EntradaInvalida(
                f"'{c}' (posición {posicion}) no es válido: un número binario solo tiene 0 y 1."
            )

    if len(limpio) > MAX_BITS:
        raise EntradaInvalida(f"Máximo {MAX_BITS} bits (escribiste {len(limpio)}).")
    return limpio


# ---------- Utilidades ----------

def completar_bytes(bits: str) -> str:
    """Rellena con ceros a la izquierda hasta un múltiplo de 8 (mínimo 8 bits)."""
    total = max(8, -(-len(bits) // 8) * 8)          # redondea hacia arriba al múltiplo de 8
    return bits.rjust(total, "0")


def separar_bytes(bits: str) -> str:
    """'0000000100000000' → '00000001 00000000'."""
    return " ".join(bits[i:i + 8] for i in range(0, len(bits), 8))


# ---------- Decimal → Binario (divisiones sucesivas entre 2) ----------

def decimal_a_binario(texto) -> ConversionNumero:
    numero = validar_decimal(texto)
    pasos = []
    residuos = []

    # Paso 1: dividir entre 2 hasta que el cociente sea 0; guardar cada residuo.
    n = numero
    while n > 0:
        cociente, residuo = n // 2, n % 2
        pasos.append({"dividendo": str(n), "cociente": str(cociente), "residuo": str(residuo)})
        residuos.append(str(residuo))
        n = cociente

    # Paso 2: los residuos se leen de ABAJO hacia ARRIBA (el último es el bit más significativo).
    minimo = "".join(reversed(residuos)) or "0"

    # Paso 3: completar a bytes de 8 bits (25 → 11001 → 00011001).
    completo = completar_bytes(minimo)

    return ConversionNumero(
        modo="decimal_a_binario",
        entrada=texto,
        decimal=str(numero),
        binario=completo,
        binario_minimo=minimo,
        binario_bytes=separar_bytes(completo),
        bits_relleno=len(completo) - len(minimo),
        pasos=pasos,
        verificado=minimo == format(numero, "b"),      # comprobación con Python
    )


# ---------- Binario → Decimal (suma de potencias de 2) ----------

def binario_a_decimal(texto) -> ConversionNumero:
    bits = validar_binario(texto)
    n = len(bits)

    # Paso 1: calcular la potencia de 2 de cada posición (de derecha a izquierda: 1, 2, 4, 8...).
    potencias = []
    potencia = 1
    for _ in range(n):
        potencias.append(potencia)
        potencia *= 2
    potencias.reverse()                 # ahora quedan alineadas de izquierda a derecha

    # Paso 2: sumar solo las potencias donde el bit vale 1.
    total = 0
    pasos = []
    for i, bit in enumerate(bits):
        valor = potencias[i] if bit == "1" else 0
        total += valor
        pasos.append({"bit": bit, "posicion": n - 1 - i,
                      "potencia": str(potencias[i]), "valor": str(valor)})

    encendidos = [p["potencia"] for p in pasos if p["bit"] == "1"]
    suma = f"{' + '.join(encendidos) or '0'} = {total}"

    minimo = bits.lstrip("0") or "0"

    return ConversionNumero(
        modo="binario_a_decimal",
        entrada=texto,
        decimal=str(total),
        binario=bits,
        binario_minimo=minimo,
        binario_bytes=separar_bytes(completar_bytes(bits)),
        bits_relleno=0,
        pasos=pasos,
        suma=suma,
        verificado=total == int(bits, 2),               # comprobación con Python
    )


def convertir_numero(modo, texto) -> ConversionNumero:
    """Punto de entrada: elige la conversión según `modo`."""
    if modo == "decimal_a_binario":
        return decimal_a_binario(texto)
    if modo == "binario_a_decimal":
        return binario_a_decimal(texto)
    raise ModoNumeroDesconocido(f"Conversión desconocida: '{modo}'.")
