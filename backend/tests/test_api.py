"""
tests/test_api.py — Pruebas automáticas de la API.

Levanta el servidor de verdad (Uvicorn) en un puerto libre y le hace peticiones HTTP,
igual que lo haría el navegador. Solo usa la biblioteca estándar de Python (unittest y
urllib), así que no hay que instalar nada extra.

Cómo correrlas (desde la carpeta backend, con el venv activo):
    python -m unittest discover -s tests -v
O desde la raíz del proyecto:
    npm test
"""

import json
import socket
import sys
import threading
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

# Permite importar main.py aunque las pruebas se ejecuten desde otra carpeta
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn  # noqa: E402

from main import app  # noqa: E402

ORIGEN_FRONTEND = "http://localhost:5173"


# ----------------------------------------------------------------------
# Ruta extra SOLO para las pruebas: provoca un error inesperado (un "bug")
# para comprobar que el servidor responde 500 en JSON y no se cae.
# ----------------------------------------------------------------------
@app.get("/_prueba/error-interno", include_in_schema=False)
def _ruta_que_falla():
    raise RuntimeError("falla a propósito")


def _puerto_libre() -> int:
    """Pide al sistema operativo un puerto que no esté ocupado."""
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Servidor:
    """Arranca Uvicorn en un hilo aparte y lo apaga al terminar."""

    def __init__(self):
        self.puerto = _puerto_libre()
        config = uvicorn.Config(app, host="127.0.0.1", port=self.puerto, log_level="warning")
        self.servidor = uvicorn.Server(config)
        self.hilo = threading.Thread(target=self.servidor.run, daemon=True)

    def iniciar(self):
        self.hilo.start()
        limite = time.time() + 10
        while not self.servidor.started:            # espera a que esté escuchando
            if time.time() > limite:
                raise RuntimeError("El servidor no arrancó a tiempo.")
            time.sleep(0.05)

    def detener(self):
        self.servidor.should_exit = True
        self.hilo.join(timeout=5)


SERVIDOR = Servidor()


def setUpModule():
    SERVIDOR.iniciar()


def tearDownModule():
    SERVIDOR.detener()


def peticion(metodo: str, ruta: str, datos=None, cuerpo_crudo: bytes | None = None, cabeceras=None):
    """
    Hace una petición HTTP al servidor de pruebas.
    Devuelve (código de estado, JSON de la respuesta, cabeceras).
    """
    url = f"http://127.0.0.1:{SERVIDOR.puerto}{ruta}"
    cuerpo = cuerpo_crudo if cuerpo_crudo is not None else (
        json.dumps(datos).encode("utf-8") if datos is not None else None
    )
    req = urllib.request.Request(url, data=cuerpo, method=metodo)
    req.add_header("Content-Type", "application/json")
    for nombre, valor in (cabeceras or {}).items():
        req.add_header(nombre, valor)
    def leer_json(respuesta):
        texto = respuesta.read().decode("utf-8")
        es_json = "application/json" in (respuesta.headers.get("content-type") or "")
        return json.loads(texto) if (texto and es_json) else None

    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, leer_json(r), r.headers
    except urllib.error.HTTPError as e:              # 4xx y 5xx también traen JSON
        return e.code, leer_json(e), e.headers


def post(ruta, datos):
    return peticion("POST", ruta, datos)


def get(ruta):
    return peticion("GET", ruta)


# ======================================================================
# 1. Rutas básicas
# ======================================================================
class TestRutasBasicas(unittest.TestCase):
    def test_raiz(self):
        estado, datos, _ = get("/")
        self.assertEqual(estado, 200)
        self.assertIn("funcionando", datos["mensaje"])

    def test_health(self):
        estado, datos, _ = get("/health")
        self.assertEqual((estado, datos), (200, {"status": "ok"}))

    def test_operaciones_y_limites(self):
        estado, datos, _ = get("/api/operaciones")
        self.assertEqual(estado, 200)
        claves = [op["clave"] for op in datos["operaciones"]]
        self.assertEqual(claves, ["suma", "resta", "multiplicacion", "division"])
        self.assertEqual(datos["max_bits"], 64)
        self.assertEqual(datos["max_numeros"], 6)
        self.assertEqual(datos["max_caracteres"], 100)

    def test_ruta_inexistente_da_404_con_formato_de_error(self):
        estado, datos, _ = get("/api/no-existe")
        self.assertEqual(estado, 404)
        self.assertFalse(datos["ok"])
        self.assertEqual(datos["error"]["tipo"], "NoEncontrado")

    def test_metodo_equivocado_da_405(self):
        estado, datos, _ = get("/api/calcular")            # debería ser POST
        self.assertEqual(estado, 405)
        self.assertFalse(datos["ok"])

    def test_error_inesperado_da_500_en_json(self):
        estado, datos, cab = peticion("GET", "/_prueba/error-interno", cabeceras={"Origin": ORIGEN_FRONTEND})
        self.assertEqual(estado, 500)
        self.assertEqual(datos["error"]["tipo"], "ErrorInterno")
        # Aun con error 500, el navegador debe poder leer la respuesta (CORS)
        self.assertEqual(cab.get("access-control-allow-origin"), ORIGEN_FRONTEND)


# ======================================================================
# 2. Decimal ↔ Binario  (POST /api/convertir-numero)
# ======================================================================
class TestConvertirNumero(unittest.TestCase):
    def convertir(self, modo, valor):
        return post("/api/convertir-numero", {"modo": modo, "valor": valor})

    def test_rubrica_25_a_binario(self):
        estado, datos, _ = self.convertir("decimal_a_binario", "25")
        self.assertEqual(estado, 200)
        c = datos["conversion"]
        self.assertEqual(c["binario"], "00011001")
        self.assertEqual(c["binario_minimo"], "11001")
        self.assertEqual(c["bits_relleno"], 3)
        self.assertTrue(c["verificado"])
        # Divisiones sucesivas: 25, 12, 6, 3, 1
        self.assertEqual([p["dividendo"] for p in c["pasos"]], ["25", "12", "6", "3", "1"])

    def test_rubrica_00001010_a_decimal(self):
        estado, datos, _ = self.convertir("binario_a_decimal", "00001010")
        self.assertEqual(estado, 200)
        self.assertEqual(datos["conversion"]["decimal"], "10")
        self.assertEqual(datos["conversion"]["suma"], "8 + 2 = 10")

    def test_cero_y_maximo_64_bits(self):
        self.assertEqual(self.convertir("decimal_a_binario", "0")[1]["conversion"]["binario"], "00000000")
        estado, datos, _ = self.convertir("decimal_a_binario", str(2 ** 64 - 1))
        self.assertEqual(estado, 200)
        self.assertEqual(datos["conversion"]["binario"], "1" * 64)

    def test_valores_invalidos(self):
        for valor in ["-5", "12a", "3.5", "", str(2 ** 64)]:
            with self.subTest(valor=valor):
                estado, datos, _ = self.convertir("decimal_a_binario", valor)
                self.assertEqual(estado, 422)
                self.assertFalse(datos["ok"])
                self.assertEqual(datos["error"]["tipo"], "EntradaInvalida")
        estado, datos, _ = self.convertir("binario_a_decimal", "10201")
        self.assertEqual((estado, datos["error"]["tipo"]), (422, "EntradaInvalida"))

    def test_modo_desconocido(self):
        estado, datos, _ = self.convertir("octal", "7")
        self.assertEqual((estado, datos["error"]["tipo"]), (422, "ModoNumeroDesconocido"))


# ======================================================================
# 3. Texto ↔ ASCII ↔ Binario  (POST /api/convertir, GET /api/tabla-ascii)
# ======================================================================
class TestConvertirTexto(unittest.TestCase):
    def convertir(self, modo, texto):
        return post("/api/convertir", {"modo": modo, "texto": texto})

    def test_rubrica_hola(self):
        estado, datos, _ = self.convertir("texto_a_binario", "HOLA")
        self.assertEqual(estado, 200)
        c = datos["conversion"]
        self.assertEqual(c["ascii"], "72, 79, 76, 65")
        self.assertEqual(c["binario"], "01001000 01001111 01001100 01000001")
        self.assertEqual(len(c["caracteres"]), 4)
        self.assertEqual(len(c["caracteres"][0]["desglose"]), 8)    # 8 pesos: 128…1

    def test_binario_a_texto(self):
        estado, datos, _ = self.convertir("binario_a_texto", "01001000 01001111 01001100 01000001")
        self.assertEqual((estado, datos["conversion"]["texto"]), (200, "HOLA"))

    def test_grupo_incompleto_se_rellena(self):
        estado, datos, _ = self.convertir("binario_a_texto", "0100100")
        self.assertEqual(estado, 200)
        self.assertEqual(datos["conversion"]["texto"], "$")
        self.assertTrue(datos["conversion"]["relleno"])

    def test_enie_ascii_extendido(self):
        estado, datos, _ = self.convertir("texto_a_binario", "ñ")
        self.assertEqual(estado, 200)
        self.assertEqual(datos["conversion"]["binario"], "11110001")
        self.assertTrue(datos["conversion"]["hay_extendidos"])

    def test_textos_invalidos(self):
        casos = [("texto_a_binario", "😀"), ("texto_a_binario", ""), ("texto_a_binario", "a" * 101),
                 ("binario_a_texto", "010010001"), ("binario_a_texto", "01x")]
        for modo, texto in casos:
            with self.subTest(modo=modo, texto=texto):
                estado, datos, _ = self.convertir(modo, texto)
                self.assertEqual(estado, 422)
                self.assertEqual(datos["error"]["tipo"], "EntradaInvalida")

    def test_tabla_ascii(self):
        estado, datos, _ = get("/api/tabla-ascii")
        self.assertEqual(estado, 200)
        grupos = {g["clave"]: g for g in datos["grupos"]}
        self.assertEqual(list(grupos), ["mayusculas", "minusculas", "numeros", "signos", "espanol"])
        self.assertEqual(len(grupos["mayusculas"]["filas"]), 26)
        self.assertEqual(grupos["mayusculas"]["filas"][0]["binario"], "01000001")    # A = 65


# ======================================================================
# 4. Aritmética binaria  (POST /api/calcular)
# ======================================================================
class TestCalcular(unittest.TestCase):
    def calcular(self, operacion, numeros):
        return post("/api/calcular", {"operacion": operacion, "numeros": numeros})

    def test_suma_de_tres_por_etapas(self):
        estado, datos, _ = self.calcular("suma", ["1011", "110", "11"])
        self.assertEqual(estado, 200)
        r = datos["resultado"]
        self.assertEqual(r["resultado"], "10100")
        self.assertEqual(r["res_dec"], "20")
        self.assertTrue(r["verificado"])
        self.assertEqual(len(r["etapas"]), 2)                      # (A + B) + C
        self.assertEqual(r["etapas"][0]["resultado"], "10001")     # 11 + 6 = 17
        self.assertEqual(r["etapas"][0]["detalle"]["tipo"], "suma")

    def test_resta_con_resultado_negativo(self):
        estado, datos, _ = self.calcular("resta", ["11", "110", "1"])
        self.assertEqual(estado, 200)
        r = datos["resultado"]
        self.assertEqual((r["resultado"], r["res_dec"]), ("-100", "-4"))
        self.assertTrue(r["etapas"][1]["detalle"]["acumulado_negativo"])

    def test_multiplicacion(self):
        estado, datos, _ = self.calcular("multiplicacion", ["11", "10", "101"])
        self.assertEqual((estado, datos["resultado"]["resultado"]), (200, "11110"))

    def test_division_con_residuo(self):
        estado, datos, _ = self.calcular("division", ["1011", "11"])     # 11 ÷ 3 = 3 r 2
        self.assertEqual(estado, 200)
        r = datos["resultado"]
        self.assertEqual((r["resultado"], r["residuo"]), ("11", "10"))
        self.assertEqual(r["residuo_dec"], "2")

    def test_division_entre_cero(self):
        estado, datos, _ = self.calcular("division", ["101", "1", "0"])
        self.assertEqual(estado, 422)
        self.assertEqual(datos["error"]["tipo"], "DivisionPorCero")
        self.assertIn("Número C", datos["error"]["mensaje"])

    def test_numero_invalido_dice_cual_fallo(self):
        estado, datos, _ = self.calcular("suma", ["101", "102"])
        self.assertEqual(estado, 422)
        self.assertTrue(datos["error"]["mensaje"].startswith("Número B:"))

    def test_cantidad_de_numeros(self):
        self.assertEqual(self.calcular("suma", ["1"])[0], 422)               # menos de 2
        self.assertEqual(self.calcular("suma", ["1"] * 7)[0], 422)           # más de 6
        self.assertEqual(self.calcular("suma", ["1"] * 6)[0], 200)           # 6 sí se puede

    def test_operacion_desconocida(self):
        estado, datos, _ = self.calcular("potencia", ["10", "11"])
        self.assertEqual((estado, datos["error"]["tipo"]), (422, "OperacionDesconocida"))


# ======================================================================
# 5. Peticiones mal formadas (las revisa Pydantic antes de llegar a la lógica)
# ======================================================================
class TestPeticionesMalFormadas(unittest.TestCase):
    def test_falta_un_campo(self):
        estado, datos, _ = post("/api/calcular", {"operacion": "suma"})
        self.assertEqual(estado, 422)
        self.assertEqual(datos["error"]["tipo"], "PeticionInvalida")
        self.assertIn("numeros", datos["error"]["mensaje"])

    def test_tipo_incorrecto(self):
        estado, datos, _ = post("/api/convertir-numero", {"modo": "decimal_a_binario", "valor": 25})
        self.assertEqual((estado, datos["error"]["tipo"]), (422, "PeticionInvalida"))
        estado, datos, _ = post("/api/calcular", {"operacion": "suma", "numeros": "101"})
        self.assertEqual((estado, datos["error"]["tipo"]), (422, "PeticionInvalida"))

    def test_json_invalido(self):
        estado, datos, _ = peticion("POST", "/api/convertir", cuerpo_crudo=b"{esto no es json")
        self.assertEqual(estado, 422)
        self.assertEqual(datos["error"]["tipo"], "PeticionInvalida")


# ======================================================================
# 6. CORS: el navegador solo deja leer respuestas a orígenes permitidos
# ======================================================================
class TestCors(unittest.TestCase):
    def test_origen_permitido(self):
        _, _, cab = peticion("GET", "/api/operaciones", cabeceras={"Origin": ORIGEN_FRONTEND})
        self.assertEqual(cab.get("access-control-allow-origin"), ORIGEN_FRONTEND)

    def test_preflight_post(self):
        estado, _, cab = peticion("OPTIONS", "/api/calcular", cabeceras={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        })
        self.assertEqual(estado, 200)
        self.assertEqual(cab.get("access-control-allow-origin"), "http://127.0.0.1:5173")

    def test_origen_no_permitido(self):
        _, _, cab = peticion("GET", "/api/operaciones", cabeceras={"Origin": "http://sitio-ajeno.com"})
        self.assertIsNone(cab.get("access-control-allow-origin"))

    def test_errores_de_logica_tambien_llevan_cors(self):
        _, _, cab = peticion("POST", "/api/calcular", {"operacion": "division", "numeros": ["1", "0"]},
                             cabeceras={"Origin": ORIGEN_FRONTEND})
        self.assertEqual(cab.get("access-control-allow-origin"), ORIGEN_FRONTEND)


# ======================================================================
# 7. Pruebas de la rúbrica (las mismas que se ven en la sección «Pruebas»)
# ======================================================================
class TestRubrica(unittest.TestCase):
    def test_los_25_casos_pasan(self):
        estado, datos, _ = get("/api/pruebas")
        self.assertEqual(estado, 200)
        filas = datos["pruebas"]
        self.assertEqual(len(filas), 25)
        fallidas = [f"{f['operacion']} {f['entrada']!r}: {f['obtenido']}" for f in filas if not f["ok"]]
        self.assertEqual(fallidas, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
