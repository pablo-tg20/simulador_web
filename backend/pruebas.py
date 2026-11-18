"""pruebas.py — Casos de prueba de la rúbrica + casos de validación. Se puede correr con: python pruebas.py"""

from conversion_numeros import convertir_numero
from conversion_texto import convertir
from logica_binaria import ErrorBinario, calcular

ERROR = "Error (se rechaza)"

# (grupo, operación, modo, entrada, resultado esperado)
CASOS = [
    # Pruebas sugeridas en la rúbrica
    ("rubrica", "Decimal a binario", "decimal_a_binario", "25", "00011001"),
    ("rubrica", "Binario a decimal", "binario_a_decimal", "00001010", "10"),
    ("rubrica", "Texto a ASCII", "texto_a_ascii", "A", "65"),
    ("rubrica", "Texto a binario", "texto_a_binario", "A", "01000001"),
    ("rubrica", "Texto a ASCII", "texto_a_ascii", "HOLA", "72, 79, 76, 65"),
    ("rubrica", "Texto a binario", "texto_a_binario", "HOLA", "01001000 01001111 01001100 01000001"),
    # Pruebas extra
    ("extra", "Decimal a binario", "decimal_a_binario", "255", "11111111"),
    ("extra", "Decimal a binario", "decimal_a_binario", "0", "00000000"),
    ("extra", "Binario a decimal", "binario_a_decimal", "11111111", "255"),
    ("extra", "Binario a texto", "binario_a_texto", "01001000 01001111 01001100 01000001", "HOLA"),
    ("extra", "Texto a binario", "texto_a_binario", "ñ", "11110001"),
    # Validación: datos incorrectos (se rechazan) o incompletos (se completan)
    ("validacion", "Binario a decimal", "binario_a_decimal", "10201", ERROR),
    ("validacion", "Decimal a binario", "decimal_a_binario", "-5", ERROR),
    ("validacion", "Decimal a binario", "decimal_a_binario", "12a", ERROR),
    ("validacion", "Decimal a binario", "decimal_a_binario", "3.5", ERROR),
    ("validacion", "Binario a texto", "binario_a_texto", "0100100", "$"),          # se completa a 00100100 = 36
    ("validacion", "Binario a texto", "binario_a_texto", "010010001", ERROR),
    ("validacion", "Texto a binario", "texto_a_binario", "😀", ERROR),
    # Aritmética con varios números (se resuelve de izquierda a derecha)
    ("aritmetica", "Suma de 3", "suma", "1011 + 110 + 11", "10100"),
    ("aritmetica", "Resta de 3", "resta", "1111 − 11 − 101", "111"),
    ("aritmetica", "Resta con negativo", "resta", "11 − 110 − 1", "-100"),
    ("aritmetica", "Multiplicación de 3", "multiplicacion", "11 × 10 × 101", "11110"),
    ("aritmetica", "División de 3", "division", "110000 ÷ 10 ÷ 11", "1000"),
    ("aritmetica", "Suma de 4", "suma", "1 + 10 + 11 + 100", "1010"),
    ("validacion", "División entre 0", "division", "101 ÷ 1 ÷ 0", ERROR),
]

OPERADORES = "+−×÷"


def numeros_de(entrada: str) -> list:
    """'1011 + 110 + 11' → ['1011', '110', '11']."""
    for op in OPERADORES:
        entrada = entrada.replace(op, " ")
    return entrada.split()


def _obtener(modo: str, entrada: str) -> str:
    """Ejecuta la conversión y devuelve el resultado como texto."""
    if modo in ("suma", "resta", "multiplicacion", "division"):
        return calcular(numeros_de(entrada), modo).resultado
    if modo == "decimal_a_binario":
        return convertir_numero(modo, entrada).binario
    if modo == "binario_a_decimal":
        return convertir_numero(modo, entrada).decimal
    if modo == "texto_a_ascii":
        return convertir("texto_a_binario", entrada).ascii
    if modo == "texto_a_binario":
        return convertir(modo, entrada).binario
    return convertir(modo, entrada).texto


def ejecutar_pruebas() -> list:
    """Corre todos los casos y devuelve una fila por caso."""
    filas = []
    for grupo, operacion, modo, entrada, esperado in CASOS:
        try:
            obtenido = _obtener(modo, entrada)
            mensaje = ""
        except ErrorBinario as e:
            obtenido = ERROR
            mensaje = str(e)
        filas.append({
            "grupo": grupo, "operacion": operacion, "modo": modo, "entrada": entrada,
            "esperado": esperado, "obtenido": obtenido, "mensaje": mensaje,
            "ok": obtenido == esperado,
        })
    return filas


if __name__ == "__main__":
    filas = ejecutar_pruebas()
    for f in filas:
        marca = "OK " if f["ok"] else "MAL"
        print(f"[{marca}] {f['operacion']:<18} {f['entrada']!r:<40} → {f['obtenido']}")
        if f["mensaje"]:
            print(f"       motivo: {f['mensaje']}")
    aprobadas = sum(f["ok"] for f in filas)
    print(f"\n{aprobadas}/{len(filas)} pruebas correctas")
    raise SystemExit(0 if aprobadas == len(filas) else 1)   # código de salida ≠ 0 si alguna falla
