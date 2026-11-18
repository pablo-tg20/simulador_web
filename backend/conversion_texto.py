"""conversion_texto.py — Texto ↔ código ASCII ↔ binario de 8 bits (método de los pesos)."""

import unicodedata
from dataclasses import dataclass, field
from typing import List

from logica_binaria import EntradaInvalida, ErrorBinario

# ---------- 1. Constantes ----------
MAX_CARACTERES = 100
PESOS = (128, 64, 32, 16, 8, 4, 2, 1)   # valor de cada posición de un byte
MODOS = ("texto_a_binario", "binario_a_texto")


class ModoDesconocido(ErrorBinario):
    """Se pidió una conversión que no existe."""


# ---------- 2. Número ↔ byte ----------

def decimal_a_byte(numero: int):
    """Número (0–255) → 8 bits. Devuelve (bits, desglose de cada peso)."""
    queda = numero
    suma = 0
    bits = []
    desglose = []
    # De izquierda a derecha: si el peso cabe en lo que queda → 1 y se resta; si no → 0
    for peso in PESOS:
        if queda >= peso:
            bit = 1
            queda -= peso
            suma += peso
        else:
            bit = 0
        bits.append(str(bit))
        desglose.append({"peso": peso, "bit": bit, "queda": queda, "suma": suma})
    return "".join(bits), desglose


def byte_a_decimal(bits: str) -> int:
    """8 bits → número: suma los pesos donde hay un 1."""
    total = 0
    for bit, peso in zip(bits, PESOS):
        if bit == "1":
            total += peso
    return total


# ---------- 3. Describir un carácter ----------

def es_imprimible(codigo: int) -> bool:
    """32–126 = ASCII estándar; 161–255 = ASCII extendido Latin-1 (á, ñ, ¿...)."""
    return 32 <= codigo <= 126 or (161 <= codigo <= 255 and codigo != 173)


def _tipo(codigo: int) -> str:
    if codigo == 32:
        return "espacio"
    if 65 <= codigo <= 90:
        return "mayuscula"
    if 97 <= codigo <= 122:
        return "minuscula"
    if 48 <= codigo <= 57:
        return "numero"
    if codigo > 127:
        return "extendido"
    return "signo"


@dataclass
class Caracter:
    caracter: str           # "H"
    visible: str            # "␣" para el espacio
    decimal: int            # código ASCII: 72
    binario: str            # "01001000"
    tipo: str
    extendido: bool         # True si está fuera del ASCII estándar (0–127)
    desglose: List[dict] = field(default_factory=list)


def describir(codigo: int) -> Caracter:
    bits, desglose = decimal_a_byte(codigo)
    return Caracter(
        caracter=chr(codigo),
        visible="␣" if codigo == 32 else chr(codigo),
        decimal=codigo,
        binario=bits,
        tipo=_tipo(codigo),
        extendido=codigo > 127,
        desglose=desglose,
    )


@dataclass
class Conversion:
    modo: str
    entrada: str
    texto: str                      # texto completo
    binario: str                    # bytes separados por espacio
    ascii: str                      # códigos ASCII separados por coma: "72, 79, 76, 65"
    caracteres: List[Caracter]
    relleno: bool = False           # ¿se completaron grupos de menos de 8 bits?
    hay_extendidos: bool = False    # ¿hay ñ, á, etc.?


# ---------- 4. Las dos conversiones ----------

def _mostrar(caracter: str) -> str:
    return f"'{caracter}'" if caracter.isprintable() else f"U+{ord(caracter):04X}"


def _motivo_rechazo(c: str, posicion: int) -> str:
    """Mensaje para un carácter que no cabe en 8 bits o no se ve."""
    codigo = ord(c)
    if codigo > 255:
        return (f"El carácter {_mostrar(c)} (posición {posicion}) es Unicode U+{codigo:04X} "
                f"(código {codigo}): no cabe en 8 bits. Usa letras, números, signos, acentos o ñ.")
    return (f"El carácter {_mostrar(c)} (posición {posicion}) es un código de control ({codigo}) "
            "y no se puede mostrar.")


def texto_a_binario(texto) -> Conversion:
    """Texto → código ASCII de cada carácter → 8 bits."""
    if not isinstance(texto, str):
        raise EntradaInvalida("No se recibió ningún texto.")

    # Une "n + tilde" en "ñ" y cambia espacios duros por espacios normales
    texto = unicodedata.normalize("NFC", texto).replace(" ", " ")

    if texto == "":
        raise EntradaInvalida("El campo está vacío. Escribe una letra, una palabra o una frase.")
    if len(texto) > MAX_CARACTERES:
        raise EntradaInvalida(f"Máximo {MAX_CARACTERES} caracteres (escribiste {len(texto)}).")

    caracteres = []
    for posicion, c in enumerate(texto, start=1):
        codigo = ord(c)                         # Paso 1: carácter → código ASCII
        if not es_imprimible(codigo):
            raise EntradaInvalida(_motivo_rechazo(c, posicion))
        caracteres.append(describir(codigo))    # Paso 2: código → 8 bits

    return Conversion(
        modo="texto_a_binario",
        entrada=texto,
        texto=texto,
        binario=" ".join(c.binario for c in caracteres),
        ascii=", ".join(str(c.decimal) for c in caracteres),
        caracteres=caracteres,
        hay_extendidos=any(c.extendido for c in caracteres),
    )


def binario_a_texto(entrada) -> Conversion:
    """Bytes (separados por espacio o pegados) → códigos → texto."""
    if not isinstance(entrada, str):
        raise EntradaInvalida("No se recibió ningún valor.")

    grupos = entrada.split()
    if not grupos:
        raise EntradaInvalida("El campo está vacío. Escribe bytes de 0 y 1, por ejemplo 01001000.")

    # Paso 1: separar en bytes de 8 bits
    bytes_ = []
    relleno = False
    for n, grupo in enumerate(grupos, start=1):
        for c in grupo:
            if c not in "01":
                raise EntradaInvalida(
                    f"{_mostrar(c)} no es válido (grupo {n}). Solo se permiten 0 y 1; "
                    "usa espacios para separar una letra de otra."
                )
        if len(grupo) <= 8:
            if len(grupo) < 8:
                relleno = True
            bytes_.append(grupo.rjust(8, "0"))          # completa con ceros a la izquierda
        elif len(grupo) % 8 == 0:
            bytes_.extend(grupo[i:i + 8] for i in range(0, len(grupo), 8))
        else:
            raise EntradaInvalida(
                f"El grupo {n} tiene {len(grupo)} bits. Cada letra usa 8 bits: "
                "sepáralos con espacios o pega un múltiplo de 8."
            )

    if len(bytes_) > MAX_CARACTERES:
        raise EntradaInvalida(f"Máximo {MAX_CARACTERES} letras (son {len(bytes_)} bytes).")

    # Paso 2: cada byte → número → carácter
    caracteres = []
    for posicion, byte in enumerate(bytes_, start=1):
        codigo = byte_a_decimal(byte)
        if not es_imprimible(codigo):
            raise EntradaInvalida(
                f"El byte {posicion} ({byte}) vale {codigo}, que no es una letra visible. "
                "Los códigos válidos son 32–126 y 161–255."
            )
        caracteres.append(describir(codigo))

    return Conversion(
        modo="binario_a_texto",
        entrada=entrada,
        texto="".join(c.caracter for c in caracteres),
        binario=" ".join(bytes_),
        ascii=", ".join(str(c.decimal) for c in caracteres),
        caracteres=caracteres,
        relleno=relleno,
        hay_extendidos=any(c.extendido for c in caracteres),
    )


def convertir(modo, texto) -> Conversion:
    """Punto de entrada: elige la conversión según `modo`."""
    if modo == "texto_a_binario":
        return texto_a_binario(texto)
    if modo == "binario_a_texto":
        return binario_a_texto(texto)
    raise ModoDesconocido(f"Conversión desconocida: '{modo}'.")


# ---------- 5. Tabla de referencia ----------
_SIGNOS = [32] + list(range(33, 48)) + list(range(58, 65)) + list(range(91, 97)) + list(range(123, 127))

_GRUPOS_TABLA = [
    ("mayusculas", "Mayúsculas A–Z", list(range(65, 91))),
    ("minusculas", "Minúsculas a–z", list(range(97, 123))),
    ("numeros", "Números 0–9", list(range(48, 58))),
    ("signos", "Espacio y signos", _SIGNOS),
    ("espanol", "Acentos y ñ", [ord(c) for c in "áéíóúüñÁÉÍÓÚÜÑ¿¡"]),
]


def tabla_ascii() -> List[dict]:
    grupos = []
    for clave, nombre, codigos in _GRUPOS_TABLA:
        filas = []
        for codigo in codigos:
            c = describir(codigo)
            filas.append({"caracter": c.caracter, "visible": c.visible,
                          "decimal": c.decimal, "binario": c.binario, "tipo": c.tipo})
        grupos.append({"clave": clave, "nombre": nombre, "filas": filas})
    return grupos
