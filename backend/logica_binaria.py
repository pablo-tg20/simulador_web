"""logica_binaria.py — Suma, resta, multiplicación y división binarias, bit por bit (como una ALU)."""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

MAX_BITS = 64           # máximo de bits por número

# clave -> (nombre, símbolo)
OPERACIONES = {
    "suma": ("Suma", "+"),
    "resta": ("Resta", "−"),
    "multiplicacion": ("Multiplicación", "×"),
    "division": ("División", "÷"),
}


# ---------- 1. Errores propios (todos heredan de ErrorBinario) ----------

class ErrorBinario(Exception):
    """Error base del simulador."""


class EntradaInvalida(ErrorBinario):
    """El dato escrito no es válido."""


class DivisionPorCero(ErrorBinario):
    """Se intentó dividir entre 0."""


class OperacionDesconocida(ErrorBinario):
    """Se pidió una operación que no existe."""


# ---------- 2. Utilidades ----------

def validar_binario(texto) -> str:
    """Devuelve el binario limpio o lanza EntradaInvalida."""
    if texto is None:
        raise EntradaInvalida("No se recibió ningún valor.")

    limpio = str(texto).strip().replace(" ", "")

    if limpio == "":
        raise EntradaInvalida("El campo está vacío.")
    if limpio.startswith("-"):
        raise EntradaInvalida(
            "No se ingresan negativos: escribe solo 0 y 1. "
            "(La resta ya muestra el signo si el resultado es negativo.)"
        )
    for caracter in limpio:
        if caracter not in "01":
            raise EntradaInvalida(f"'{caracter}' no es válido. Un número binario solo tiene 0 y 1.")
    if len(limpio) > MAX_BITS:
        raise EntradaInvalida(f"Máximo {MAX_BITS} bits por número.")
    return limpio


def normalizar(bits: str) -> str:
    """Quita ceros a la izquierda: '00101' → '101'."""
    return bits.lstrip("0") or "0"


def comparar(a: str, b: str) -> int:
    """-1 si a<b, 0 si a==b, 1 si a>b."""
    a, b = normalizar(a), normalizar(b)
    if len(a) != len(b):                # más bits = número más grande
        return -1 if len(a) < len(b) else 1
    if a == b:
        return 0
    return -1 if a < b else 1           # misma longitud: se compara como texto


# ---------- 3. Las cuatro operaciones ----------
# `pasos` guarda la explicación en texto y `detalle` los datos para animar (ambos opcionales).

def sumar(a: str, b: str, pasos: Optional[List[str]] = None,
          detalle: Optional[dict] = None) -> str:
    """Suma con acarreo, columna por columna (sumador completo)."""
    a, b = normalizar(a), normalizar(b)
    n = max(len(a), len(b))
    a, b = a.zfill(n), b.zfill(n)       # misma longitud

    if detalle is not None:
        detalle.update({"tipo": "suma", "fila_a": a, "fila_b": b, "columnas": []})

    acarreo = 0
    bits_resultado = []

    # De derecha a izquierda
    for i in range(n - 1, -1, -1):
        bit_a, bit_b = int(a[i]), int(b[i])
        bit_suma = bit_a ^ bit_b ^ acarreo                              # resultado = XOR de los tres
        nuevo_acarreo = (bit_a & bit_b) | (acarreo & (bit_a ^ bit_b))   # acarreo de salida

        if pasos is not None:
            pasos.append(f"Columna {n - i}: {bit_a} + {bit_b} + acarreo {acarreo}"
                         f"  →  escribo {bit_suma}, llevo {nuevo_acarreo}")
        if detalle is not None:
            detalle["columnas"].append({"pos": n - 1 - i, "a": bit_a, "b": bit_b,
                                        "entra": acarreo, "bit": bit_suma, "sale": nuevo_acarreo})
        bits_resultado.append(str(bit_suma))
        acarreo = nuevo_acarreo

    if detalle is not None:
        detalle["acarreo_final"] = bool(acarreo)
    if acarreo:                         # el acarreo sobrante es un bit extra
        bits_resultado.append("1")
        if pasos is not None:
            pasos.append("Sobró acarreo 1: se escribe al inicio del resultado.")

    return normalizar("".join(reversed(bits_resultado)))


def restar(a: str, b: str, pasos: Optional[List[str]] = None,
           detalle: Optional[dict] = None) -> Tuple[str, bool]:
    """Resta con préstamo. Devuelve (resultado, es_negativo)."""
    a, b = normalizar(a), normalizar(b)
    negativo = False

    if comparar(a, b) < 0:              # si a < b se calcula b − a y se pone signo
        a, b = b, a
        negativo = True
        if pasos is not None:
            pasos.append("El minuendo es menor: calculo (B − A) y pongo signo negativo.")

    n = len(a)
    b = b.zfill(n)

    if detalle is not None:
        detalle.update({"tipo": "resta", "fila_a": a, "fila_b": b, "negativo": negativo, "columnas": []})

    prestamo = 0
    bits_resultado = []

    for i in range(n - 1, -1, -1):
        x, y = int(a[i]), int(b[i])
        a_restar = y + prestamo

        if x >= a_restar:
            diferencia, nuevo_prestamo = x - a_restar, 0
        else:
            diferencia, nuevo_prestamo = x + 2 - a_restar, 1     # pedir prestado vale 2

        if pasos is not None:
            pasos.append(f"Columna {n - i}: {x} − {y} − préstamo {prestamo}"
                         f"  →  escribo {diferencia}, préstamo {nuevo_prestamo}")
        if detalle is not None:
            detalle["columnas"].append({"pos": n - 1 - i, "a": x, "b": y,
                                        "entra": prestamo, "bit": diferencia, "sale": nuevo_prestamo})
        bits_resultado.append(str(diferencia))
        prestamo = nuevo_prestamo

    resultado = normalizar("".join(reversed(bits_resultado)))
    if resultado == "0":
        negativo = False                # el cero no lleva signo
    return resultado, negativo


def multiplicar(a: str, b: str, pasos: Optional[List[str]] = None,
                detalle: Optional[dict] = None) -> str:
    """Multiplicación por desplazamiento y suma."""
    a, b = normalizar(a), normalizar(b)
    total = "0"

    if detalle is not None:
        detalle.update({"tipo": "multiplicacion", "a": a, "b": b, "parciales": []})

    # Por cada bit de B (de derecha a izquierda): si es 1, sumar A desplazado
    for posicion, bit in enumerate(reversed(b)):
        parcial = None
        if bit == "1":
            parcial = a + "0" * posicion        # desplazar = agregar ceros a la derecha
            nuevo_total = sumar(total, parcial)
            if pasos is not None:
                pasos.append(f"Bit {posicion} de B = 1 → producto parcial {parcial}; "
                             f"acumulado: {total} + {parcial} = {nuevo_total}")
            total = nuevo_total
        elif pasos is not None:
            pasos.append(f"Bit {posicion} de B = 0 → no se suma nada.")

        if detalle is not None:
            detalle["parciales"].append({"pos": posicion, "bit": bit, "parcial": parcial,
                                         "acumulado": normalizar(total)})

    return normalizar(total)


def dividir(a: str, b: str, pasos: Optional[List[str]] = None,
            detalle: Optional[dict] = None) -> Tuple[str, str]:
    """División larga. Devuelve (cociente, residuo)."""
    a, b = normalizar(a), normalizar(b)
    if b == "0":
        raise DivisionPorCero("No se puede dividir entre 0.")

    residuo = "0"
    bits_cociente = []

    if detalle is not None:
        detalle.update({"tipo": "division", "a": a, "b": b, "pasos": []})

    # Se "baja" un bit a la vez; si el parcial ≥ B, el cociente lleva 1 y se resta
    for bit in a:
        residuo = normalizar(residuo + bit)
        parcial = residuo
        if comparar(residuo, b) >= 0:
            nuevo_residuo, _ = restar(residuo, b)
            if pasos is not None:
                pasos.append(f"Bajo {bit}: parcial {residuo} ≥ {b} → cociente 1; "
                             f"{residuo} − {b} = {nuevo_residuo}")
            residuo = nuevo_residuo
            bits_cociente.append("1")
        else:
            if pasos is not None:
                pasos.append(f"Bajo {bit}: parcial {residuo} < {b} → cociente 0; no se resta.")
            bits_cociente.append("0")

        if detalle is not None:
            detalle["pasos"].append({"bit": bit, "parcial": parcial, "resta": bits_cociente[-1] == "1",
                                     "residuo": residuo, "bit_cociente": bits_cociente[-1]})

    return normalizar("".join(bits_cociente)), residuo


# ---------- 4. Operación encadenada (2 a MAX_NUMEROS números) ----------
# Se resuelve de izquierda a derecha, de dos en dos:  A + B + C  →  (A + B) + C

MAX_NUMEROS = 6
LETRAS = "ABCDEF"


@dataclass
class Etapa:
    """Una operación de dos números dentro de la cadena."""
    numero: int                     # 1, 2, 3...
    a: str                          # acumulado (puede llevar "-")
    b: str                          # siguiente número
    resultado: str                  # con "-" si es negativo
    residuo: Optional[str] = None   # solo en división
    a_dec: str = "0"
    b_dec: str = "0"
    res_dec: str = "0"
    residuo_dec: Optional[str] = None
    nota: str = ""                  # aclaración (signo negativo, residuo que se descarta...)
    pasos: List[str] = field(default_factory=list)
    detalle: dict = field(default_factory=dict)


@dataclass
class Resultado:
    """Lo que la interfaz muestra de una operación."""
    operacion: str
    simbolo: str
    numeros: List[str]              # binarios normalizados
    numeros_dec: List[str]          # sus equivalentes decimales (texto)
    resultado: str                  # resultado final (con "-" si es negativo)
    res_dec: str
    residuo: Optional[str] = None   # residuo de la última división
    residuo_dec: Optional[str] = None
    verificado: bool = False
    etapas: List[Etapa] = field(default_factory=list)


def _con_signo(bits: str, negativo: bool) -> str:
    return ("-" if negativo and bits != "0" else "") + bits


def _etapa(n: int, acum: str, neg: bool, b: str, operacion: str) -> Tuple[Etapa, str, bool]:
    """Opera el acumulado con el siguiente número. Devuelve (etapa, nuevo acumulado, ¿negativo?)."""
    pasos: List[str] = []
    detalle: dict = {}
    residuo = None
    nota = ""

    if operacion == "suma":
        res, res_neg = sumar(acum, b, pasos, detalle), False
    elif operacion == "resta":
        if not neg:
            res, res_neg = restar(acum, b, pasos, detalle)
        else:
            # −X − Y = −(X + Y): se suman las magnitudes y se conserva el signo
            res, res_neg = sumar(acum, b, pasos, detalle), True
            detalle["acumulado_negativo"] = True
            nota = (f"El acumulado ya es negativo (−{acum}). Restarle {b} lo hace más negativo: "
                    f"−{acum} − {b} = −({acum} + {b}). Se suman las magnitudes y se conserva el signo −.")
    elif operacion == "multiplicacion":
        res, res_neg = multiplicar(acum, b, pasos, detalle), False
    else:
        res, residuo = dividir(acum, b, pasos, detalle)
        res_neg = False

    etapa = Etapa(
        numero=n, a=_con_signo(acum, neg), b=b, resultado=_con_signo(res, res_neg), residuo=residuo,
        a_dec=str(int(_con_signo(acum, neg), 2)), b_dec=str(int(b, 2)),
        res_dec=str(int(_con_signo(res, res_neg), 2)),
        residuo_dec=str(int(residuo, 2)) if residuo is not None else None,
        nota=nota, pasos=pasos, detalle=detalle,
    )
    return etapa, res, res_neg and res != "0"


def calcular(textos: List[str], operacion: str) -> Resultado:
    """Punto de entrada: valida la lista de números y resuelve la cadena por etapas."""
    if operacion not in OPERACIONES:
        raise OperacionDesconocida(f"Operación desconocida: '{operacion}'.")
    if not isinstance(textos, list) or len(textos) < 2:
        raise EntradaInvalida("Se necesitan al menos 2 números.")
    if len(textos) > MAX_NUMEROS:
        raise EntradaInvalida(f"Máximo {MAX_NUMEROS} números por operación.")

    # Paso 1: validar cada número (el mensaje dice cuál falló)
    numeros = []
    for letra, texto in zip(LETRAS, textos):
        try:
            numeros.append(normalizar(validar_binario(texto)))
        except EntradaInvalida as e:
            raise EntradaInvalida(f"Número {letra}: {e}") from None

    # Paso 2: operar de izquierda a derecha, de dos en dos
    acum, neg = numeros[0], False
    etapas = []
    for i, b in enumerate(numeros[1:], start=1):
        if operacion == "division" and b == "0":
            raise DivisionPorCero(f"Número {LETRAS[i]}: no se puede dividir entre 0.")
        etapa, acum, neg = _etapa(i, acum, neg, b, operacion)
        etapas.append(etapa)

    # En división encadenada, el residuo de las etapas intermedias se descarta
    if operacion == "division":
        for e in etapas[:-1]:
            if e.residuo != "0":
                e.nota = f"Sobra residuo {e.residuo}; se descarta y se sigue dividiendo solo el cociente {e.resultado}."

    resultado = _con_signo(acum, neg)
    ultima = etapas[-1]

    # Paso 3: comprobar en decimal con Python (solo verificación)
    dec = [int(x, 2) for x in numeros]
    if operacion == "suma":
        esperado = sum(dec)
    elif operacion == "resta":
        esperado = dec[0] - sum(dec[1:])
    elif operacion == "multiplicacion":
        esperado = 1
        for x in dec:
            esperado *= x
    else:
        esperado = dec[0]
        for x in dec[1:]:
            esperado //= x
    verificado = int(resultado, 2) == esperado

    return Resultado(
        operacion=operacion, simbolo=OPERACIONES[operacion][1],
        numeros=numeros, numeros_dec=[str(x) for x in dec],
        resultado=resultado, res_dec=str(int(resultado, 2)),
        residuo=ultima.residuo, residuo_dec=ultima.residuo_dec,
        verificado=verificado, etapas=etapas,
    )
