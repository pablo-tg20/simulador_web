# main.py
# Punto de entrada del backend. Aquí se crea la aplicación de FastAPI
# y se definen las rutas (direcciones) a las que el servidor responde.
#
# En la versión 6 este trabajo lo hacía puente.py dentro del navegador (Pyodide).
# Ahora es un servidor de verdad: el frontend (React) manda peticiones HTTP
# a http://127.0.0.1:8000 y aquí se llama a la lógica de los otros archivos .py.
#
#   Navegador (React)  ──POST /api/calcular {json}──►  FastAPI (este archivo)
#                      ◄──────── {json} ────────────   └─► logica_binaria.calcular()

from dataclasses import asdict  # Convierte las dataclasses de la lógica en diccionarios

from fastapi import FastAPI, Request  # Clase principal del framework y la petición
from fastapi.exceptions import RequestValidationError  # Error cuando el JSON no tiene la forma esperada
from fastapi.middleware.cors import CORSMiddleware  # Middleware para permitir CORS
from fastapi.responses import JSONResponse  # Para devolver JSON con un código de estado propio
from pydantic import BaseModel  # Clase base para definir la forma de los datos
from starlette.exceptions import HTTPException as StarletteHTTPException  # Errores HTTP (404, 405...)

# Lógica del simulador (la misma de la versión 6, sin cambios)
from conversion_numeros import convertir_numero
from conversion_texto import MAX_CARACTERES, convertir, tabla_ascii
from logica_binaria import MAX_BITS, MAX_NUMEROS, OPERACIONES, ErrorBinario, calcular
from pruebas import ejecutar_pruebas

# Creamos la aplicación. "app" es el objeto que representa todo el servidor.
# Uvicorn buscará esta variable para ejecutarla (uvicorn main:app).
app = FastAPI(
    title="Simulador Binario — API",
    description="Conversiones decimal ↔ binario, texto ↔ ASCII y aritmética binaria bit por bit.",
    version="7.0.0",
)

# Orígenes (direcciones del frontend) que pueden hacer peticiones a este servidor.
# 5173 = Vite en modo desarrollo (npm run dev) · 4173 = vista previa (npm run preview)
ORIGENES_PERMITIDOS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


# ---------------------------------------------------------------------
# FORMA DE LOS ERRORES
# Todas las respuestas de error tienen la misma forma (igual que en la v6):
#   {"ok": false, "error": {"tipo": "EntradaInvalida", "mensaje": "..."}}
# Así el frontend solo tiene que leer error.mensaje.
# ---------------------------------------------------------------------
def respuesta_error(tipo: str, mensaje: str, estado: int) -> JSONResponse:
    """Crea una respuesta JSON de error con el código HTTP indicado."""
    return JSONResponse(
        status_code=estado,
        content={"ok": False, "error": {"tipo": tipo, "mensaje": mensaje}},
    )


# Un MIDDLEWARE es código que se ejecuta en TODAS las peticiones,
# antes y después de llegar a tus rutas.
# Este atrapa cualquier error INESPERADO (un bug) y responde 500 en JSON,
# en lugar de cortar la conexión. Se registra ANTES que CORS para que CORS
# lo envuelva y también estas respuestas lleven los permisos del navegador.
@app.middleware("http")
async def atrapar_errores_inesperados(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:  # noqa: BLE001  (error inesperado: no mostramos detalles internos)
        return respuesta_error("ErrorInterno", "Ocurrió un error interno en el servidor.", 500)


# CORSMiddleware agrega a las respuestas los permisos que el navegador necesita
# para que una página en el puerto 5173 pueda leer respuestas del puerto 8000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES_PERMITIDOS,  # Quién puede hacer peticiones (el frontend)
    allow_methods=["*"],                # Qué métodos se permiten (GET, POST, ...)
    allow_headers=["*"],                # Qué cabeceras se permiten (como Content-Type)
)


# ---------------------------------------------------------------------
# MANEJADORES DE EXCEPCIONES
# Cuando una ruta lanza una excepción, FastAPI busca aquí cómo responder.
# ---------------------------------------------------------------------
@app.exception_handler(ErrorBinario)
async def manejar_error_binario(request: Request, error: ErrorBinario):
    """Errores ESPERADOS de la lógica: dato inválido, división entre 0, modo desconocido..."""
    # type(error).__name__ da el nombre de la clase: "EntradaInvalida", "DivisionPorCero"...
    return respuesta_error(type(error).__name__, str(error), 422)


@app.exception_handler(RequestValidationError)
async def manejar_peticion_invalida(request: Request, error: RequestValidationError):
    """El JSON no tiene la forma que piden los modelos de Pydantic (falta un campo, tipo incorrecto...)."""
    primero = error.errors()[0] if error.errors() else {}
    # loc es la "ubicación" del problema, ej. ("body", "numeros", 0)
    campo = ".".join(str(parte) for parte in primero.get("loc", ()) if parte != "body")
    tipo = primero.get("type", "")
    if tipo == "json_invalid":
        mensaje = "El cuerpo de la petición no es un JSON válido."
    elif tipo == "missing":
        mensaje = f"Falta el campo '{campo}'."
    elif campo:
        mensaje = f"El campo '{campo}' no tiene el tipo correcto."
    else:
        mensaje = "Se esperaba un objeto JSON."
    return respuesta_error("PeticionInvalida", mensaje, 422)


@app.exception_handler(StarletteHTTPException)
async def manejar_error_http(request: Request, error: StarletteHTTPException):
    """Rutas que no existen (404) o método equivocado (405), con la misma forma de error."""
    if error.status_code == 404:
        return respuesta_error("NoEncontrado", f"La ruta {request.url.path} no existe.", 404)
    return respuesta_error("ErrorHTTP", str(error.detail), error.status_code)


# ---------------------------------------------------------------------
# MODELOS: el "molde" de los datos que el frontend envía.
# FastAPI revisa el JSON contra estas clases ANTES de entrar a la ruta.
# ---------------------------------------------------------------------
class PeticionCalculo(BaseModel):
    """
    Ejemplo válido: {"operacion": "suma", "numeros": ["1011", "110", "11"]}
    """
    operacion: str        # "suma", "resta", "multiplicacion" o "division"
    numeros: list[str]    # de 2 a 6 números binarios (la lógica valida cada uno)


class PeticionTexto(BaseModel):
    """
    Ejemplo válido: {"modo": "texto_a_binario", "texto": "HOLA"}
    """
    modo: str             # "texto_a_binario" o "binario_a_texto"
    texto: str


class PeticionNumero(BaseModel):
    """
    Ejemplo válido: {"modo": "decimal_a_binario", "valor": "25"}
    """
    modo: str             # "decimal_a_binario" o "binario_a_decimal"
    valor: str


# ---------------------------------------------------------------------
# RUTAS
# @app.get / @app.post son DECORADORES: le dicen a FastAPI
# "cuando llegue una petición a esta ruta, ejecuta la función de abajo".
# Lo que devuelve la función (un diccionario) FastAPI lo convierte a JSON.
# ---------------------------------------------------------------------
@app.get("/")
def inicio():
    """Ruta raíz: sirve para comprobar que el servidor está funcionando."""
    return {"mensaje": "El servidor del Simulador Binario está funcionando", "documentacion": "/docs"}


@app.get("/health")
def health_check():
    """Chequeo de salud (lo usan los scripts y el indicador de la interfaz)."""
    return {"status": "ok"}


@app.get("/api/operaciones")
def operaciones():
    """Lista de operaciones disponibles y límites del simulador."""
    return {
        "operaciones": [
            {"clave": clave, "nombre": nombre, "simbolo": simbolo}
            for clave, (nombre, simbolo) in OPERACIONES.items()
        ],
        "max_bits": MAX_BITS,
        "max_numeros": MAX_NUMEROS,
        "max_caracteres": MAX_CARACTERES,
    }


@app.get("/api/tabla-ascii")
def tabla_de_referencia():
    """Tabla ASCII de referencia agrupada (mayúsculas, minúsculas, números, signos, acentos)."""
    return {"grupos": tabla_ascii()}


@app.get("/api/pruebas")
def pruebas():
    """Ejecuta los casos de prueba de la rúbrica (pruebas.py) y devuelve una fila por caso."""
    return {"ok": True, "pruebas": ejecutar_pruebas()}


@app.post("/api/calcular")
def calcular_operacion(peticion: PeticionCalculo):
    """
    Suma, resta, multiplicación o división binaria de 2 a 6 números,
    resuelta de izquierda a derecha por etapas (con los datos para animarla).
    """
    resultado = calcular(peticion.numeros, peticion.operacion)  # puede lanzar ErrorBinario
    return {"ok": True, "resultado": asdict(resultado)}


@app.post("/api/convertir")
def convertir_texto(peticion: PeticionTexto):
    """Texto → código ASCII → binario de 8 bits, o al revés."""
    conversion = convertir(peticion.modo, peticion.texto)
    return {"ok": True, "conversion": asdict(conversion)}


@app.post("/api/convertir-numero")
def convertir_numero_decimal(peticion: PeticionNumero):
    """Decimal → binario (divisiones entre 2) o binario → decimal (suma de potencias de 2)."""
    conversion = convertir_numero(peticion.modo, peticion.valor)
    return {"ok": True, "conversion": asdict(conversion)}
