#Importa las funciones principales de Flask para crear la app, manejar rutas, sesiones, peticiones y respuestas.
#
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
from fpdf import FPDF
import io
import psycopg2
import psycopg2.extras
from psycopg2 import sql
import bcrypt
import random
import string
from datetime import datetime, timedelta
import smtplib
import base64
import requests as _requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import re
import json
import csv
import secrets
import urllib.request
import urllib.error
from dotenv import load_dotenv
load_dotenv()

from multicolegio import (
    ensure_multicolegio_schema,
    ensure_profile_schema,
    get_admin_from_session,
    is_superadmin,
    colegio_filter_sql,
    crear_colegio_con_admin,
    branding_static_path,
    fetch_colegio_branding_row,
    DEFAULT_ESCUDO,
    DEFAULT_ENCABEZADO,
    DEFAULT_MARCA_AGUA,
    DEFAULT_COLOR_PRIMARIO,
    DEFAULT_COLOR_SECUNDARIO,
)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads_material')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg', 'zip'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _require_secret_key():
    key = os.environ.get("SECRET_KEY")
    if not key:
        raise RuntimeError(
            "Falta SECRET_KEY. Configúrala en el archivo .env (consulta .env.example)."
        )
    return key


def _api_error_response(exc, public_message="Error en el servidor. Intenta más tarde."):
    """Registra la excepción y devuelve un mensaje seguro al cliente."""
    print(f"Error API: {exc!r}")
    return jsonify({"status": "error", "message": public_message})


def _pdf_to_bytesio(pdf):
    """Convierte la salida de FPDF a BytesIO (compatible con fpdf2 que devuelve bytearray)."""
    raw = pdf.output()
    if isinstance(raw, (bytes, bytearray)):
        pdf_bytes = bytes(raw)
    else:
        pdf_bytes = raw.encode('latin-1')
    buffer = io.BytesIO(pdf_bytes)
    buffer.seek(0)
    return buffer




app = Flask(__name__)
app.secret_key = _require_secret_key()


#  CONFIGURACIÓN EMAIL (GMAIL) — desde variables de entorno

EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 465
EMAIL_USER = os.environ.get("GMAIL_USER", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM") or (
    f"MiBoletín <{EMAIL_USER}>" if EMAIL_USER else ""
)
GMAIL_CLIENT_ID = os.environ.get("GMAIL_CLIENT_ID", "")
GMAIL_CLIENT_SECRET = os.environ.get("GMAIL_CLIENT_SECRET", "")
GMAIL_REFRESH_TOKEN = os.environ.get("GMAIL_REFRESH_TOKEN", "")
SMTP_TIMEOUT = int(os.environ.get("SMTP_TIMEOUT", "15"))
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://127.0.0.1:5005").rstrip("/")


def _smtp_config_ok():
    return bool(EMAIL_USER and GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN)


# CONFIGURACIÓN DATABASE

#Define una función para conectarse a la base de datos PostgreSQL.Esta función se usa cada vez que la aplicación necesita consultar o guardar información
#
def get_db_connection():
    DATABASE_URL = os.environ.get("DATABASE_URL")
    return psycopg2.connect(DATABASE_URL, sslmode='require')


def _init_multicolegio():
    try:
        ensure_multicolegio_schema(
            get_db_connection,
            superadmin_email=os.environ.get('SUPERADMIN_EMAIL'),
            superadmin_password=os.environ.get('SUPERADMIN_PASSWORD'),
        )
        ensure_profile_schema(get_db_connection)
    except Exception as exc:
        print(f'Aviso: migración multicolegio — {exc!r}')


_init_multicolegio()


def _require_admin_api():
    admin = get_admin_from_session(session)
    if not admin:
        return None, (jsonify({"status": "error", "message": "No autorizado"}), 401)
    return admin, None


def _require_superadmin_api():
    admin, err = _require_admin_api()
    if err:
        return None, err
    if not is_superadmin(admin):
        return None, (jsonify({"status": "error", "message": "Solo super administrador."}), 403)
    return admin, None


def _admin_colegio_id(admin):
    if is_superadmin(admin):
        return None
    return admin.get('id_colegio')


APP_ROOT = os.path.dirname(__file__)
BRANDING_UPLOAD_FOLDER = os.path.join(APP_ROOT, 'static', 'uploads_branding')
os.makedirs(BRANDING_UPLOAD_FOLDER, exist_ok=True)
ALLOW_PUBLIC_ADMIN_REGISTER = os.environ.get('ALLOW_PUBLIC_ADMIN_REGISTER', 'false').lower() in ('1', 'true', 'yes')
BRANDING_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_BRANDING_UPLOAD_BYTES = 2 * 1024 * 1024


def _allowed_branding_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in BRANDING_IMAGE_EXTENSIONS


def _pdf_sanitize(text):
    """Texto seguro para fuentes core de FPDF (latin-1, sin em-dash, etc.)."""
    if text is None:
        return ''
    import unicodedata
    s = unicodedata.normalize('NFKD', str(text))
    out = []
    for c in s:
        if unicodedata.category(c) == 'Mn':
            continue
        if c in ('—', '–'):
            out.append('-')
        elif ord(c) < 256:
            out.append(c)
    return ''.join(out)


def _hex_to_rgb(hex_color, default=(0, 51, 102)):
    if not hex_color:
        return default
    h = str(hex_color).strip().lstrip('#')
    if len(h) != 6:
        return default
    try:
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return default


def _branding_file_path(url):
    return branding_static_path(APP_ROOT, url)


def _fetch_colegio_branding(id_colegio):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    row = fetch_colegio_branding_row(cur, id_colegio)
    cur.close()
    conn.close()
    return row


def _require_colegio_admin_api():
    admin, err = _require_admin_api()
    if err:
        return None, None, err
    if is_superadmin(admin):
        return None, None, (jsonify({"status": "error", "message": "Solo admin de colegio."}), 403)
    id_colegio = admin.get('id_colegio')
    if not id_colegio:
        return None, None, (jsonify({"status": "error", "message": "Sin colegio asignado."}), 403)
    return admin, id_colegio, None


def _require_colegio_admin_pdf():
    if 'user_id' not in session:
        return None, (jsonify({"status": "error", "message": "Debes iniciar sesión primero."}), 401)
    admin = get_admin_from_session(session)
    if is_superadmin(admin):
        return None, (jsonify({"status": "error", "message": "El super admin no genera reportes de colegio."}), 403)
    id_colegio = admin.get('id_colegio')
    if not id_colegio:
        return None, (jsonify({"status": "error", "message": "Sin colegio en sesión."}), 403)
    return id_colegio, None


def _save_branding_upload(id_colegio, tipo, file_storage):
    if tipo not in ('escudo', 'encabezado', 'marca_agua'):
        return None, 'Tipo de archivo no válido.'
    if not file_storage or not file_storage.filename:
        return None, 'No se envió archivo.'
    if not _allowed_branding_file(file_storage.filename):
        return None, 'Formato no permitido. Use PNG, JPG o WEBP.'
    file_storage.seek(0, os.SEEK_END)
    size = file_storage.tell()
    file_storage.seek(0)
    if size > MAX_BRANDING_UPLOAD_BYTES:
        return None, 'El archivo supera 2 MB.'
    ext = file_storage.filename.rsplit('.', 1)[1].lower()
    if ext == 'jpeg':
        ext = 'jpg'
    folder = os.path.join(BRANDING_UPLOAD_FOLDER, str(id_colegio))
    os.makedirs(folder, exist_ok=True)
    filename = f'{tipo}.{ext}'
    path = os.path.join(folder, filename)
    file_storage.save(path)
    return f'/static/uploads_branding/{id_colegio}/{filename}', None


_agenda_grupos_ready = False


def ensure_agenda_grupos_table():
    """Crea agenda_grupos si aún no existe (compartir eventos con grupos)."""
    global _agenda_grupos_ready
    if _agenda_grupos_ready:
        return
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS agenda_grupos (
            id_agenda INTEGER NOT NULL REFERENCES agenda(id_agenda) ON DELETE CASCADE,
            id_grupo INTEGER NOT NULL REFERENCES grupos(id_grupo) ON DELETE CASCADE,
            PRIMARY KEY (id_agenda, id_grupo)
        )
    """)
    conn.commit()
    cur.close()
    conn.close()
    _agenda_grupos_ready = True


def _profesor_puede_grupo(cur, id_docente, id_grupo):
    cur.execute(
        "SELECT 1 FROM grupo_materias WHERE id_docente = %s AND id_grupo = %s LIMIT 1",
        (id_docente, id_grupo),
    )
    return cur.fetchone() is not None


def _pdf_agregar_estudiante(pdf, cur, est, profesor, id_docente):
    """Añade al PDF una página con notas y observaciones de un estudiante."""
    pdf.add_page()
    pdf.set_font('helvetica', 'B', 14)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, f"Reporte del Estudiante: {est['nombre_completo']}", 0, 1, 'C')
    pdf.set_font('helvetica', '', 10)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 7, _pdf_sanitize(f"Codigo: {est['codigo_estudiante']}  |  Grado: {est['grado']}  |  Grupo: {est['grupo']}"), 0, 1, 'C')
    pdf.cell(0, 7, _pdf_sanitize(f"Docente: {profesor['nombre_completo']} ({profesor['codigo_profesor']})"), 0, 1, 'C')
    pdf.ln(5)

    cur.execute("""
        SELECT n.valor, n.descripcion, TO_CHAR(n.fecha_registro,'DD/MM/YYYY') as fecha,
               tn.nombre_tipo, m.nombre as materia
        FROM notas n
        JOIN tipos_nota tn ON n.id_tipo = tn.id_tipo
        JOIN grupo_materias gm ON n.id_grupo_materia = gm.id_grupo_materia
        JOIN materia m ON gm.id_materia = m.id_materia
        WHERE n.id_estudiante = %s AND gm.id_docente = %s
        ORDER BY m.nombre, n.fecha_registro DESC
    """, (est['id_estudiante'], id_docente))
    notas = [dict(n) for n in cur.fetchall()]

    pdf.set_font('helvetica', 'B', 11)
    pdf.set_fill_color(0, 51, 102)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 9, ' Notas Academicas', 1, 1, 'L', fill=True)
    if notas:
        pdf.set_font('helvetica', 'B', 9)
        pdf.set_fill_color(220, 230, 242)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(55, 8, 'Materia', 1, 0, 'C', fill=True)
        pdf.cell(35, 8, 'Tipo', 1, 0, 'C', fill=True)
        pdf.cell(20, 8, 'Valor', 1, 0, 'C', fill=True)
        pdf.cell(55, 8, 'Descripción', 1, 0, 'C', fill=True)
        pdf.cell(25, 8, 'Fecha', 1, 1, 'C', fill=True)
        pdf.set_font('helvetica', '', 9)
        fill = False
        pdf.set_fill_color(240, 248, 255)
        valores = []
        for n in notas:
            v = float(n['valor'])
            valores.append(v)
            color = (56, 161, 105) if v >= 3 else (229, 62, 62)
            pdf.cell(55, 7, _pdf_sanitize(n['materia'])[:28], 1, 0, 'L', fill=fill)
            pdf.cell(35, 7, _pdf_sanitize(n['nombre_tipo'])[:18], 1, 0, 'C', fill=fill)
            pdf.set_text_color(*color)
            pdf.cell(20, 7, str(v), 1, 0, 'C', fill=fill)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(55, 7, _pdf_sanitize(n['descripcion'] or '-')[:28], 1, 0, 'L', fill=fill)
            pdf.cell(25, 7, n['fecha'], 1, 1, 'C', fill=fill)
            fill = not fill
        promedio = round(sum(valores) / len(valores), 2)
        color = (56, 161, 105) if promedio >= 3 else (229, 62, 62)
        pdf.set_font('helvetica', 'B', 10)
        pdf.set_text_color(*color)
        pdf.cell(0, 9, f"  Promedio General: {promedio}", 0, 1, 'R')
        pdf.set_text_color(0, 0, 0)
    else:
        pdf.set_font('helvetica', 'I', 9)
        pdf.cell(0, 8, '  No hay notas registradas.', 0, 1)

    pdf.ln(4)

    cur.execute("""
        SELECT tipo, descripcion, TO_CHAR(fecha_registro,'DD/MM/YYYY') as fecha
        FROM observador WHERE id_estudiante = %s AND id_profesor = %s
        ORDER BY fecha_registro DESC
    """, (est['id_estudiante'], id_docente))
    obs = [dict(o) for o in cur.fetchall()]

    pdf.set_font('helvetica', 'B', 11)
    pdf.set_fill_color(0, 51, 102)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 9, ' Observaciones del Observador', 1, 1, 'L', fill=True)
    if obs:
        pdf.set_font('helvetica', '', 9)
        pdf.set_text_color(0, 0, 0)
        fill = False
        fills = {'positivo': (198, 246, 213), 'negativo': (254, 215, 215), 'neutro': (226, 232, 240)}
        for o in obs:
            r, g, b = fills.get(o['tipo'], (226, 232, 240))
            pdf.set_fill_color(r, g, b)
            pdf.cell(25, 7, o['tipo'].capitalize(), 1, 0, 'C', fill=True)
            pdf.cell(140, 7, _pdf_sanitize(o['descripcion'] or '')[:70], 1, 0, 'L', fill=fill)
            pdf.cell(25, 7, o['fecha'], 1, 1, 'C', fill=fill)
            fill = not fill
    else:
        pdf.set_font('helvetica', 'I', 9)
        pdf.cell(0, 8, '  No hay observaciones registradas.', 0, 1)


def _realign_pk_sequence(cur, table: str, id_column: str):
    """Si la secuencia SERIAL quedó atrás del MAX(id) (importaciones manuales, restores), el INSERT falla con duplicate pkey."""
    allowed = {("estudiantes", "id_estudiante"), ("profesores", "id_profesor")}
    if (table, id_column) not in allowed:
        raise ValueError("unsupported table for PK sequence realignment")
    q = sql.SQL(
        "SELECT setval(pg_get_serial_sequence({t}, {c}), "
        "(SELECT COALESCE(MAX({ic}), 0) + 1 FROM {ti}), false)"
    ).format(
        t=sql.Literal(table),
        c=sql.Literal(id_column),
        ic=sql.Identifier(id_column),
        ti=sql.Identifier(table),
    )
    cur.execute(q)


ESTUDIANTE_EXTRA_COLS = (
    'fecha_nacimiento', 'lugar_nacimiento', 'genero', 'direccion_residencia',
    'eps', 'grupo_sanguineo', 'alergias', 'ultimo_grado', 'colegio_procedencia',
)
PROFESOR_EXTRA_COLS = (
    'titulos_academicos', 'area_especialidad', 'anios_experiencia',
    'registro_escalafon', 'entidad_salud', 'entidad_pension',
)


def _clean_str(value):
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


def _estudiante_extra_from_request(data):
    extra = {}
    fn = data.get('fecha_nacimiento')
    extra['fecha_nacimiento'] = fn if fn else None
    for key in ESTUDIANTE_EXTRA_COLS:
        if key == 'fecha_nacimiento':
            continue
        extra[key] = _clean_str(data.get(key))
    return extra


def _profesor_extra_from_request(data):
    extra = {}
    for key in PROFESOR_EXTRA_COLS:
        if key == 'anios_experiencia':
            raw = data.get(key)
            if raw in (None, ''):
                extra[key] = None
            else:
                try:
                    extra[key] = int(raw)
                except (TypeError, ValueError):
                    extra[key] = None
        else:
            extra[key] = _clean_str(data.get(key))
    return extra


def _acudiente_from_request(data):
    ac = data.get('acudiente') or {}
    nombre = _clean_str(ac.get('nombre_completo'))
    if not nombre:
        return None
    estrato = ac.get('estrato_socioeconomico')
    if estrato not in (None, ''):
        try:
            estrato = int(estrato)
            if estrato < 1 or estrato > 6:
                estrato = None
        except (TypeError, ValueError):
            estrato = None
    else:
        estrato = None
    return {
        'nombre_completo': nombre,
        'tipo_documento': _clean_str(ac.get('tipo_documento')) or 'cc',
        'numero_documento': _clean_str(ac.get('numero_documento')) or '',
        'parentesco': _clean_str(ac.get('parentesco')) or '',
        'telefono': _clean_str(ac.get('telefono')),
        'correo_electronico': _clean_str(ac.get('correo_electronico')),
        'direccion': _clean_str(ac.get('direccion')),
        'ocupacion': _clean_str(ac.get('ocupacion')),
        'estrato_socioeconomico': estrato,
    }


def _upsert_acudiente_principal(cur, id_estudiante, id_colegio, acudiente):
    if not acudiente or not acudiente.get('numero_documento') or not acudiente.get('parentesco'):
        return
    cur.execute(
        "SELECT id_acudiente FROM acudientes WHERE id_estudiante = %s AND es_principal = TRUE",
        (id_estudiante,),
    )
    row = cur.fetchone()
    values = (
        acudiente['nombre_completo'], acudiente['tipo_documento'], acudiente['numero_documento'],
        acudiente['parentesco'], acudiente['telefono'], acudiente['correo_electronico'],
        acudiente['direccion'], acudiente['ocupacion'], acudiente['estrato_socioeconomico'],
    )
    if row:
        cur.execute(
            """UPDATE acudientes SET nombre_completo=%s, tipo_documento=%s, numero_documento=%s,
               parentesco=%s, telefono=%s, correo_electronico=%s, direccion=%s, ocupacion=%s,
               estrato_socioeconomico=%s WHERE id_acudiente=%s""",
            (*values, row[0]),
        )
    else:
        cur.execute(
            """INSERT INTO acudientes (
                   id_estudiante, id_colegio, nombre_completo, tipo_documento, numero_documento,
                   parentesco, telefono, correo_electronico, direccion, ocupacion,
                   estrato_socioeconomico, es_principal
               ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE)""",
            (id_estudiante, id_colegio, *values),
        )


def _fetch_acudiente_principal(cur, id_estudiante):
    cur.execute(
        """SELECT nombre_completo, tipo_documento, numero_documento, parentesco, telefono,
                  correo_electronico, direccion, ocupacion, estrato_socioeconomico
           FROM acudientes WHERE id_estudiante = %s AND es_principal = TRUE LIMIT 1""",
        (id_estudiante,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        'nombre_completo': row[0],
        'tipo_documento': row[1],
        'numero_documento': row[2],
        'parentesco': row[3],
        'telefono': row[4],
        'correo_electronico': row[5],
        'direccion': row[6],
        'ocupacion': row[7],
        'estrato_socioeconomico': row[8],
    }


MAX_IMPORT_ROWS = 300

ESTUDIANTES_CSV_HEADERS = [
    'nombre_completo', 'tipo_documento', 'numero_documento', 'correo_electronico',
    'grado', 'grupo', 'contrasena', 'fecha_nacimiento', 'lugar_nacimiento', 'genero',
    'direccion_residencia', 'eps', 'grupo_sanguineo', 'alergias', 'ultimo_grado',
    'colegio_procedencia', 'acudiente_nombre', 'acudiente_tipo_documento',
    'acudiente_numero_documento', 'acudiente_parentesco', 'acudiente_telefono',
    'acudiente_correo', 'acudiente_direccion', 'acudiente_ocupacion', 'acudiente_estrato',
]

PROFESORES_CSV_HEADERS = [
    'nombre_completo', 'tipo_documento', 'numero_documento', 'correo_electronico',
    'telefono', 'asignaturas', 'contrasena', 'titulos_academicos', 'area_especialidad',
    'anios_experiencia', 'registro_escalafon', 'entidad_salud', 'entidad_pension',
]

ESTUDIANTES_CSV_EJEMPLO = [
    'Juan Pérez', 'ti', '1234567890', 'juan.perez@est.edu.co', '8° Secundaria', 'A',
    'MiBoletin123', '2010-05-15', 'Bogotá', 'Masculino', 'Calle 10 #5-20', 'Sanitas',
    'O+', 'Ninguna', '7° Secundaria', 'Colegio ABC', 'María Pérez', 'cc', '9876543210',
    'Madre', '3101234567', 'maria.perez@email.com', 'Calle 10 #5-20', 'Comerciante', '3',
]

PROFESORES_CSV_EJEMPLO = [
    'Ana García', 'cc', '52123456', 'ana.garcia@colegio.edu.co', '3109876543',
    'Matemáticas,Lenguaje', 'MiBoletin123', 'Lic. Matemáticas', 'Matemáticas', '5',
    'REG-001', 'Sanitas', 'Porvenir',
]


def _default_import_password(numero_documento):
    base = f"MiBoletin{numero_documento or ''}"
    if len(base) >= 8:
        return base[:50]
    return (base + secrets.token_hex(4))[:12]


def _normalize_csv_row(row):
    return {
        (k or '').strip().lower(): (v or '').strip()
        for k, v in row.items()
        if k is not None
    }


def _read_csv_rows(file_storage):
    raw = file_storage.read()
    text = None
    for enc in ('utf-8-sig', 'utf-8', 'latin-1'):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if not text:
        raise ValueError('No se pudo leer el archivo. Guárdalo como CSV UTF-8.')
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if len(lines) < 2:
        raise ValueError('El archivo debe tener encabezados y al menos una fila de datos.')
    delimiter = ';' if lines[0].count(';') > lines[0].count(',') else ','
    reader = csv.DictReader(lines, delimiter=delimiter)
    rows = []
    for row in reader:
        normalized = _normalize_csv_row(row)
        if any(normalized.values()):
            rows.append(normalized)
    if not rows:
        raise ValueError('No se encontraron filas de datos en el CSV.')
    if len(rows) > MAX_IMPORT_ROWS:
        raise ValueError(f'Máximo {MAX_IMPORT_ROWS} filas por importación.')
    return rows


def _estudiante_payload_from_row(row):
    data = {
        'nombre_completo': row.get('nombre_completo'),
        'tipo_documento': row.get('tipo_documento'),
        'numero_documento': row.get('numero_documento'),
        'correo_electronico': row.get('correo_electronico'),
        'grado': row.get('grado'),
        'grupo': row.get('grupo'),
        'contrasena': row.get('contrasena') or _default_import_password(row.get('numero_documento')),
    }
    for key in ESTUDIANTE_EXTRA_COLS:
        if key in row and row[key]:
            data[key] = row[key]
    ac_nombre = row.get('acudiente_nombre')
    if ac_nombre:
        estrato = row.get('acudiente_estrato')
        data['acudiente'] = {
            'nombre_completo': ac_nombre,
            'tipo_documento': row.get('acudiente_tipo_documento') or 'cc',
            'numero_documento': row.get('acudiente_numero_documento', ''),
            'parentesco': row.get('acudiente_parentesco', ''),
            'telefono': row.get('acudiente_telefono'),
            'correo_electronico': row.get('acudiente_correo'),
            'direccion': row.get('acudiente_direccion'),
            'ocupacion': row.get('acudiente_ocupacion'),
            'estrato_socioeconomico': estrato or None,
        }
    return data


def _profesor_payload_from_row(row):
    asignaturas = row.get('asignaturas', '')
    return {
        'nombre_completo': row.get('nombre_completo'),
        'tipo_documento': row.get('tipo_documento'),
        'numero_documento': row.get('numero_documento'),
        'correo_electronico': row.get('correo_electronico'),
        'telefono': row.get('telefono'),
        'asignaturas': [a.strip() for a in asignaturas.split(',') if a.strip()] if asignaturas else [],
        'contrasena': row.get('contrasena') or _default_import_password(row.get('numero_documento')),
        'titulos_academicos': row.get('titulos_academicos'),
        'area_especialidad': row.get('area_especialidad'),
        'anios_experiencia': row.get('anios_experiencia'),
        'registro_escalafon': row.get('registro_escalafon'),
        'entidad_salud': row.get('entidad_salud'),
        'entidad_pension': row.get('entidad_pension'),
    }


def _insert_estudiante_db(cur, id_colegio, data, codigo_estudiante):
    nombre_completo = _clean_str(data.get('nombre_completo'))
    tipo_documento = _clean_str(data.get('tipo_documento'))
    numero_documento = _clean_str(data.get('numero_documento'))
    correo_electronico = _clean_str(data.get('correo_electronico'))
    grado = _clean_str(data.get('grado'))
    grupo = _clean_str(data.get('grupo'))
    contrasena = _clean_str(data.get('contrasena'))

    if not all([nombre_completo, tipo_documento, numero_documento, correo_electronico, grado, grupo]):
        return False, 'Faltan campos obligatorios.', None, None
    if not contrasena:
        contrasena = _default_import_password(numero_documento)
    if len(contrasena) < 8:
        return False, 'La contraseña debe tener al menos 8 caracteres.', None, None

    cur.execute(
        "SELECT id_estudiante FROM estudiantes WHERE id_colegio = %s AND (correo_electronico = %s OR numero_documento = %s)",
        (id_colegio, correo_electronico, numero_documento),
    )
    if cur.fetchone():
        return False, 'Correo o documento ya registrado en este colegio.', None, None

    hashed_password = bcrypt.hashpw(contrasena.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    extra = _estudiante_extra_from_request(data)
    cols = [
        'codigo_estudiante', 'nombre_completo', 'tipo_documento', 'numero_documento',
        'correo_electronico', 'grado', 'grupo', 'contrasena', 'id_admin',
        'nombre_completo_admin', 'correo_electronico_admin', 'id_colegio',
    ] + list(ESTUDIANTE_EXTRA_COLS)
    vals = [
        codigo_estudiante, nombre_completo, tipo_documento, numero_documento,
        correo_electronico, grado, grupo, hashed_password, session.get('user_id'),
        session.get('user_name'), session.get('user_email'), id_colegio,
    ] + [extra[k] for k in ESTUDIANTE_EXTRA_COLS]
    placeholders = ', '.join(['%s'] * len(cols))
    cur.execute(
        f"INSERT INTO estudiantes ({', '.join(cols)}) VALUES ({placeholders}) RETURNING id_estudiante, codigo_estudiante;",
        tuple(vals),
    )
    new_student = cur.fetchone()
    acudiente = _acudiente_from_request(data)
    if acudiente and acudiente.get('numero_documento') and acudiente.get('parentesco'):
        _upsert_acudiente_principal(cur, new_student[0], id_colegio, acudiente)
    return True, None, new_student[0], new_student[1]


def _insert_profesor_db(cur, id_colegio, data, codigo_profesor):
    nombre_completo = _clean_str(data.get('nombre_completo'))
    tipo_documento = _clean_str(data.get('tipo_documento'))
    numero_documento = _clean_str(data.get('numero_documento'))
    correo_electronico = _clean_str(data.get('correo_electronico'))
    telefono = _clean_str(data.get('telefono'))
    asignaturas = data.get('asignaturas')
    contrasena = _clean_str(data.get('contrasena'))

    if not all([nombre_completo, tipo_documento, numero_documento, correo_electronico, telefono]):
        return False, 'Faltan campos obligatorios.', None, None
    asignaturas_str = ','.join(asignaturas) if isinstance(asignaturas, list) else (_clean_str(asignaturas) or '')
    if not asignaturas_str:
        return False, 'Debes indicar al menos una asignatura.', None, None
    if not contrasena:
        contrasena = _default_import_password(numero_documento)
    if len(contrasena) < 8:
        return False, 'La contraseña debe tener al menos 8 caracteres.', None, None

    cur.execute(
        "SELECT id_profesor FROM profesores WHERE id_colegio = %s AND (correo_electronico = %s OR numero_documento = %s)",
        (id_colegio, correo_electronico, numero_documento),
    )
    if cur.fetchone():
        return False, 'Correo o documento ya registrado en este colegio.', None, None

    hashed_password = bcrypt.hashpw(contrasena.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    extra = _profesor_extra_from_request(data)
    cols = [
        'codigo_profesor', 'nombre_completo', 'tipo_documento', 'numero_documento',
        'correo_electronico', 'telefono', 'asignaturas', 'contrasena', 'id_admin',
        'nombre_completo_admin', 'correo_electronico_admin', 'id_colegio',
    ] + list(PROFESOR_EXTRA_COLS)
    vals = [
        codigo_profesor, nombre_completo, tipo_documento, numero_documento,
        correo_electronico, telefono, asignaturas_str, hashed_password,
        session.get('user_id'), session.get('user_name'), session.get('user_email'), id_colegio,
    ] + [extra[k] for k in PROFESOR_EXTRA_COLS]
    placeholders = ', '.join(['%s'] * len(cols))
    cur.execute(
        f"INSERT INTO profesores ({', '.join(cols)}) VALUES ({placeholders}) RETURNING id_profesor, codigo_profesor;",
        tuple(vals),
    )
    new_prof = cur.fetchone()
    return True, None, new_prof[0], new_prof[1]


def _make_csv_response(headers, example_row, filename):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    writer.writerow(example_row)
    payload = buf.getvalue().encode('utf-8-sig')
    return send_file(
        io.BytesIO(payload),
        mimetype='text/csv',
        as_attachment=True,
        download_name=filename,
    )


# FUNCIONES DE EMAIL

def _email_config_ok():
    return bool(RESEND_API_KEY) or _smtp_config_ok()


# DESPUÉS
def _get_gmail_access_token():
    r = _requests.post('https://oauth2.googleapis.com/token', data={
        'grant_type': 'refresh_token',
        'refresh_token': GMAIL_REFRESH_TOKEN,
        'client_id': GMAIL_CLIENT_ID,
        'client_secret': GMAIL_CLIENT_SECRET,
    }, timeout=10)
    r.raise_for_status()
    return r.json()['access_token']

def _send_via_smtp(to_email, subject, html_content, text_content=""):
    access_token = _get_gmail_access_token()
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = EMAIL_FROM or EMAIL_USER
    msg['To'] = to_email
    if text_content:
        msg.attach(MIMEText(text_content, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))
    auth_string = base64.b64encode(
        f'user={EMAIL_USER}\x01auth=Bearer {access_token}\x01\x01'.encode()
    ).decode()
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=SMTP_TIMEOUT) as server:
        server.ehlo()
        server.docmd('AUTH', 'XOAUTH2 ' + auth_string)
        server.send_message(msg)

def _send_via_resend(to_email, subject, html_content, text_content=""):
    from_addr = EMAIL_FROM or (
        f"MiBoletín <{EMAIL_USER}>" if EMAIL_USER else "MiBoletín <onboarding@resend.dev>"
    )
    payload = {
        "from": from_addr,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }
    if text_content:
        payload["text"] = text_content
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=SMTP_TIMEOUT) as resp:
        if resp.status >= 300:
            raise RuntimeError(f"Resend respondió HTTP {resp.status}")


def _send_html_email(to_email, subject, html_content, text_content=""):
    print(f"DEBUG EMAIL_USER={EMAIL_USER!r} CLIENT_ID={GMAIL_CLIENT_ID!r} SECRET={GMAIL_CLIENT_SECRET!r} TOKEN={GMAIL_REFRESH_TOKEN!r}")
    if not _email_config_ok():
        print("Email no configurado: define RESEND_API_KEY o EMAIL_USER + EMAIL_PASSWORD")
        return False
    try:
        if RESEND_API_KEY:
            _send_via_resend(to_email, subject, html_content, text_content)
        else:
            _send_via_smtp(to_email, subject, html_content, text_content)
        print(f"Email enviado exitosamente a {to_email}")
        return True
    except Exception as e:
            import traceback
            print(f"ERROR EMAIL COMPLETO: {traceback.format_exc()}")
            return False

######Esta función construye un correo visual y personalizado con un código de verificación que el usuario debe usar para completar su registro en el sistema.#######
#
def send_verification_email(to_email, verification_code):
    """Envía un email con el código de verificación (para administradores)"""
    if not _email_config_ok():
        print("Email no configurado: define RESEND_API_KEY o EMAIL_USER y EMAIL_PASSWORD en .env")
        return False
    try:
        subject = "Verifica tu cuenta en MiBoletín.com"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', sans-serif; background: #f0f7ff; padding: 20px; }}
                .email-container {{ max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,51,102,0.15); }}
                .email-header {{ background-color: #003366; color: #fff; padding: 30px; text-align: center; }}
                .email-content {{ padding: 2.5rem; }}
                .code-display {{ display: inline-block; padding: 20px 40px; background-color: #003366; color: #fff; font-size: 28px; font-weight: 700; letter-spacing: 8px; border-radius: 6px; margin: 15px 0; font-family: monospace; }}
                .email-footer {{ background-color: #003366; color: #fff; padding: 2rem; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-header"><h1>MiBoletín.com</h1></div>
                <div class="email-content">
                    <h2 style="color:#003366;">¡Bienvenido a MiBoletín.com! 👋</h2>
                    <p>Usa este código para completar tu registro:</p>
                    <div style="text-align:center;"><div class="code-display">{verification_code}</div></div>
                    <p style="color:#666;font-size:0.9rem;">Este código es válido por 5 minutos.</p>
                    <p style="background:#fff8e1;border-left:4px solid #ffb900;padding:1rem;border-radius:4px;">
                        <strong>⚠️ Importante:</strong> Si no solicitaste este registro, ignora este email.
                    </p>
                </div>
                <div class="email-footer">
                    <p>© {datetime.now().year} MiBoletín.com. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return _send_html_email(to_email, subject, html_content)
    except Exception as e:
        print(f"Error enviando email a {to_email}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

########Esta función crea un correo visual con un enlace seguro que permite al usuario restablecer su contraseña en el sistema.#########
#
def send_recovery_email(to_email, recovery_link, user_name):
    """Envía un email con el enlace de recuperación de contraseña"""
    subject = "Restablece tu contraseña en MiBoletín.com"
    html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background: #f0f7ff; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; }}
            .header {{ background-color: #003366; color: #fff; padding: 30px; text-align: center; }}
            .content {{ padding: 2rem; }}
            .btn {{ display:inline-block; background:#4A90E2; color:#fff; text-decoration:none; padding:14px 28px; border-radius:6px; font-weight:600; }}
            .footer {{ background:#003366; color:#ccc; padding:1.5rem; text-align:center; font-size:0.85rem; }}
        </style>
        </head>
        <body>
        <div class="container">
            <div class="header"><h1>MiBoletín.com</h1></div>
            <div class="content">
                <h2 style="color:#003366;">Hola, {user_name} 👋</h2>
                <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo:</p>
                <p style="text-align:center;margin:2rem 0;"><a href="{recovery_link}" class="btn">Restablecer Contraseña</a></p>
                <p style="background:#fff8e1;border-left:4px solid #ffb900;padding:1rem;border-radius:4px;">
                    <strong>⚠️</strong> Este enlace expira en 24 horas. Si no solicitaste este cambio, ignora este email.
                </p>
            </div>
            <div class="footer"><p>© {datetime.now().year} MiBoletín.com. Todos los derechos reservados.</p></div>
        </div>
        </body></html>
        """
    return _send_html_email(to_email, subject, html_content)

##########Esta función es una forma general de enviar correos dentro del sistema (notificaciones a estudiantes o profesores).#########
#
def enviar_correo_admin(destinatario, asunto, cuerpo_html, cuerpo_texto=""):
    """Envía correos electrónicos desde el módulo de usuarios (estudiantes/profesores)"""
    return _send_html_email(destinatario, asunto, cuerpo_html, cuerpo_texto)


# 🔑 FUNCIÓN PARA GENERAR CÓDIGO
######Esta función crea códigos de verificación que pueden ser numéricos o alfanuméricos según su longitud.########
#
def generate_verification_code(length=6):
    """Genera un código de verificación aleatorio"""
    if length > 10:
        characters = string.ascii_letters + string.digits
        return ''.join(random.choices(characters, k=length))
    else:
        return ''.join(random.choices(string.digits, k=length))


# =========================================================
# 📌 RUTAS PRINCIPALES
# =========================================================
########Esta ruta hace que, al entrar al sistema, el usuario vaya directamente al login del sistema de calificaciones.#######
@app.route('/debug-email')
def debug_email():
    import requests as req
    r = req.post('https://oauth2.googleapis.com/token', data={
        'grant_type': 'refresh_token',
        'refresh_token': GMAIL_REFRESH_TOKEN,
        'client_id': GMAIL_CLIENT_ID,
        'client_secret': GMAIL_CLIENT_SECRET,
    })
    return jsonify({"status": r.status_code, "response": r.json(), "user": EMAIL_USER})


#
@app.route("/")
def index():
    """
    Ruta raíz → redirige al login de usuarios (estudiantes/profesores).
    En la página loginuser.html se mostrará el botón para ir al admin.
    """
    return redirect(url_for('loginuser'))


# =========================================================
# 📌 RUTAS DE USUARIOS (estudiantes y profesores) — inicio.py
# =========================================================
###########Este bloque permite que estudiantes y profesores inicien sesión, validando sus datos y redirigiéndolos a su respectivo panel.###########
#
@app.route('/loginuser', methods=['GET', 'POST'])
def loginuser():
    if request.method == 'GET':
        return render_template('general/loginuser.html')

    elif request.method == 'POST':
        user_identifier = request.form.get('userIdentifier')
        user_email = request.form.get('correo')
        password = request.form.get('contraseña')

        if not all([user_identifier, user_email, password]):
            return render_template('general/loginuser.html',
                                   error='Todos los campos son requeridos')

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            id_colegio = request.form.get('id_colegio', type=int)
            if not id_colegio:
                return render_template('general/loginuser.html',
                                       error='Debes seleccionar tu colegio.')

            # Buscar como estudiante
            cur.execute(
                'SELECT id_estudiante, nombre_completo, codigo_estudiante, contrasena '
                'FROM estudiantes WHERE codigo_estudiante = %s AND correo_electronico = %s AND id_colegio = %s;',
                (user_identifier, user_email, id_colegio)
            )
            estudiante = cur.fetchone()

            if estudiante:
                if bcrypt.checkpw(password.encode('utf-8'), estudiante[3].encode('utf-8')):
                    session['user_info'] = {
                        'tipo': 'estudiante',
                        'id': estudiante[0],
                        'nombre': estudiante[1],
                        'codigo': estudiante[2],
                        'id_colegio': id_colegio,
                    }
                    return redirect(url_for('estudiante_dashboard'))
                else:
                    return render_template('general/loginuser.html', error='Contraseña incorrecta')

            # Buscar como profesor
            cur.execute(
                'SELECT id_profesor, nombre_completo, codigo_profesor, contrasena '
                'FROM profesores WHERE codigo_profesor = %s AND correo_electronico = %s AND id_colegio = %s;',
                (user_identifier, user_email, id_colegio)
            )
            profesor = cur.fetchone()

            if profesor:
                if bcrypt.checkpw(password.encode('utf-8'), profesor[3].encode('utf-8')):
                    session['user_info'] = {
                        'tipo': 'profesor',
                        'id': profesor[0],
                        'nombre': profesor[1],
                        'codigo': profesor[2],
                        'id_colegio': id_colegio,
                    }
                    return redirect(url_for('profesor_dashboard'))
                else:
                    return render_template('general/loginuser.html', error='Contraseña incorrecta')

            return render_template('general/loginuser.html',
                                   error='Usuario no encontrado. Verifica tu identificador y correo electrónico.')

        except Exception as e:
            print(f"Error en login: {str(e)}")
            return render_template('general/loginuser.html', error='Error en el servidor. Intenta más tarde.')
        finally:
            cur.close()
            conn.close()

########Esta ruta muestra el panel del estudiante, solo si ha iniciado sesión correctamente.##########
#
@app.route('/estudiante')
def estudiante_dashboard():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'estudiante':
        return redirect(url_for('loginuser'))
    return render_template('estudiantes/estudiante.html',
                           nombre=user_info['nombre'],
                           codigo=user_info['codigo'])

########Esta ruta permite el acceso al panel del profesor, solo si ha iniciado sesión correctamente.##########
#
@app.route('/profesor')
def profesor_dashboard():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return redirect(url_for('loginuser'))
    return render_template('profesor/profesor.html',
                           nombre=user_info['nombre'],
                           codigo=user_info['codigo'])

def _get_admin_for_colegio(id_colegio):
    """Devuelve (id_admin, nombre, correo) del administrador del colegio."""
    conn = get_db_connection()
    cur = conn.cursor()
    admin = None
    if id_colegio:
        cur.execute(
            """SELECT id_admin, nombre_completo, correo_electronico FROM administradores
               WHERE id_colegio = %s AND rol = 'admin_colegio' ORDER BY id_admin LIMIT 1""",
            (id_colegio,),
        )
        admin = cur.fetchone()
    if not admin:
        cur.execute(
            """SELECT id_admin, nombre_completo, correo_electronico FROM administradores
               WHERE rol = 'admin_colegio' AND id_colegio IS NOT NULL ORDER BY id_admin LIMIT 1"""
        )
        admin = cur.fetchone()
    cur.close()
    conn.close()
    if admin:
        return admin
    return ('ADM001', 'Administrador del Sistema', 'admin@sistema.com')


########Esta ruta muestra una página donde los usuarios pueden solicitar acceso, incluyendo la información de contacto del administrador.############
#
@app.route('/solicitud_user')
def solicitud_user():
    id_colegio = request.args.get('id_colegio', type=int)
    user_info = session.get('user_info')
    if not id_colegio and user_info:
        id_colegio = user_info.get('id_colegio')

    colegio_nombre = ''
    colegio_codigo = ''
    if id_colegio:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT nombre_oficial, codigo_colegio FROM colegios WHERE id_colegio = %s",
            (id_colegio,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            colegio_nombre, colegio_codigo = row

    admin_id, admin_name, admin_email = _get_admin_for_colegio(id_colegio)

    return render_template('general/solicitud.html',
                           admin_id=admin_id,
                           admin_name=admin_name,
                           admin_email=admin_email,
                           id_colegio=id_colegio or '',
                           colegio_nombre=colegio_nombre,
                           colegio_codigo=colegio_codigo)


@app.route('/api/colegio/admin', methods=['GET'])
def api_colegio_admin():
    """Administrador de un colegio (público, para solicitud de cambio de contraseña)."""
    id_colegio = request.args.get('id_colegio', type=int)
    if not id_colegio:
        return jsonify({'status': 'error', 'message': 'id_colegio requerido'}), 400
    admin_id, admin_name, admin_email = _get_admin_for_colegio(id_colegio)
    return jsonify({
        'status': 'success',
        'admin_id': admin_id,
        'admin_name': admin_name,
        'admin_email': admin_email,
    })

######Esta ruta verifica si un usuario existe (estudiante o profesor) y devuelve la información en formato JSON.#########
#
@app.route('/verificar_usuario', methods=['POST'])
def verificar_usuario():
    data = request.json
    user_identifier = data.get('userIdentifier')
    user_email = data.get('userEmail')
    id_colegio = data.get('id_colegio')
    if id_colegio is not None:
        try:
            id_colegio = int(id_colegio)
        except (TypeError, ValueError):
            id_colegio = None
    if not id_colegio:
        return jsonify({'status': 'error', 'message': 'Debes seleccionar tu colegio.'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        'SELECT id_estudiante, nombre_completo, codigo_estudiante FROM estudiantes '
        'WHERE codigo_estudiante = %s AND correo_electronico = %s AND id_colegio = %s;',
        (user_identifier, user_email, id_colegio)
    )
    estudiante = cur.fetchone()

    if estudiante:
        session['user_info'] = {
            'tipo': 'estudiante',
            'id': estudiante[0],
            'nombre': estudiante[1],
            'codigo': estudiante[2],
            'id_colegio': id_colegio,
        }
        cur.close()
        conn.close()
        return jsonify({'status': 'success', 'tipo': 'estudiante',
                        'id': estudiante[0], 'nombre': estudiante[1], 'codigo': estudiante[2]})

    cur.execute(
        'SELECT id_profesor, nombre_completo, codigo_profesor FROM profesores '
        'WHERE codigo_profesor = %s AND correo_electronico = %s AND id_colegio = %s;',
        (user_identifier, user_email, id_colegio)
    )
    profesor = cur.fetchone()

    if profesor:
        session['user_info'] = {
            'tipo': 'profesor',
            'id': profesor[0],
            'nombre': profesor[1],
            'codigo': profesor[2],
            'id_colegio': id_colegio,
        }
        cur.close()
        conn.close()
        return jsonify({'status': 'success', 'tipo': 'profesor',
                        'id': profesor[0], 'nombre': profesor[1], 'codigo': profesor[2]})

    cur.close()
    conn.close()
    return jsonify({'status': 'error',
                    'message': 'Usuario no encontrado. Verifica tu identificador y correo electrónico.'}), 404

#########Este bloque permite que un usuario solicite cambio de contraseña, guarda la solicitud en la base de datos y notifica al administrador por correo.###########
#
@app.route('/guardar_solicitud', methods=['POST'])
def guardar_solicitud():
    data = request.json
    user_info = session.get('user_info')

    if not user_info:
        return jsonify({'status': 'error',
                        'message': 'Información de usuario no encontrada. Por favor, verifica tu identidad primero.'}), 400

    motivo = data.get('requestReason')
    admin_id = data.get('adminId')
    user_email = data.get('userEmail')

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO solicitudes_cambio_contrasena
            (tipo_usuario, id_usuario, codigo_usuario, correo_usuario, motivo, id_admin, estado)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id_solicitud, fecha_solicitud;
            """,
            (user_info['tipo'], user_info['id'], user_info['codigo'],
             user_email, motivo, admin_id, 'pendiente')
        )
        resultado = cur.fetchone()
        id_solicitud = resultado[0]
        fecha_solicitud = resultado[1]

        cur.execute('SELECT nombre_completo, correo_electronico FROM administradores WHERE id_admin = %s;', (admin_id,))
        admin_info = cur.fetchone()
        conn.commit()

        admin_email = admin_info[1] if admin_info else 'admin@sistema.com'
        admin_name = admin_info[0] if admin_info else 'Administrador del Sistema'

        try:
            asunto = f"Solicitud de Cambio de Contraseña - #{id_solicitud}"
            cuerpo_html = f"""
            <html><body style="font-family:Arial,sans-serif;color:#333;">
            <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:10px;">
                <div style="background:#003366;color:#fff;padding:15px;border-radius:10px 10px 0 0;text-align:center;">
                    <h2 style="margin:0;">Sistema de Gestión de Contraseñas</h2>
                </div>
                <div style="padding:20px;">
                    <h3 style="color:#003366;">Nueva Solicitud de Cambio de Contraseña</h3>
                    <p><strong>ID:</strong> {id_solicitud} &nbsp;|&nbsp; <strong>Fecha:</strong> {fecha_solicitud.strftime('%d/%m/%Y %H:%M:%S')}</p>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr><td style="padding:8px;border-bottom:1px solid #ddd;"><strong>Tipo:</strong></td><td style="padding:8px;border-bottom:1px solid #ddd;">{user_info['tipo'].capitalize()}</td></tr>
                        <tr><td style="padding:8px;border-bottom:1px solid #ddd;"><strong>Código:</strong></td><td style="padding:8px;border-bottom:1px solid #ddd;">{user_info['codigo']}</td></tr>
                        <tr><td style="padding:8px;border-bottom:1px solid #ddd;"><strong>Nombre:</strong></td><td style="padding:8px;border-bottom:1px solid #ddd;">{user_info['nombre']}</td></tr>
                        <tr><td style="padding:8px;border-bottom:1px solid #ddd;"><strong>Correo:</strong></td><td style="padding:8px;border-bottom:1px solid #ddd;">{user_email}</td></tr>
                    </table>
                    <h4 style="color:#003366;">Motivo:</h4>
                    <div style="background:#f9f9f9;padding:15px;border-left:4px solid #003366;"><p style="margin:0;font-style:italic;">{motivo}</p></div>
                </div>
            </div>
            </body></html>
            """
            cuerpo_texto = f"Solicitud #{id_solicitud}\nUsuario: {user_info['nombre']} ({user_info['tipo']})\nMotivo: {motivo}"
            enviar_correo_admin(admin_email, asunto, cuerpo_html, cuerpo_texto)
        except Exception as email_error:
            print(f"Error al enviar correo (continuando): {str(email_error)}")

        cur.close()
        conn.close()
        session.pop('user_info', None)

        return jsonify({
            'status': 'success',
            'message': 'Solicitud guardada correctamente',
            'id_solicitud': id_solicitud,
            'fecha_solicitud': fecha_solicitud.strftime('%d/%m/%Y %H:%M:%S'),
            'tipo_usuario': user_info['tipo'],
            'nombre_usuario': user_info['nombre'],
            'admin_name': admin_name,
            'admin_email': admin_email
        })

    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        print(f"Error al guardar solicitud: {e!r}")
        return jsonify({'status': 'error', 'message': 'Error al guardar la solicitud. Intenta más tarde.'}), 500

#####Esta ruta se usa para cerrar sesión o limpiar datos temporales del usuario.########
#
@app.route('/limpiar_sesion', methods=['POST'])
def limpiar_sesion():
    session.pop('user_info', None)
    return jsonify({'status': 'success'})


# =========================================================
# 📌 RUTAS DE ADMINISTRADORES — app.py (panel admin)
# =========================================================
########Estas rutas solo sirven para mostrar páginas del sistema de administración (login, registro y recuperación de contraseña).########
#
@app.route("/admin")
def admin_login():                               #Muestra la página de inicio de sesión para administradores.
    """Página de login para administradores"""
    return render_template('administrador/loginadmin.html')


@app.route("/register")
def register():                                                  #Muestra la página para registrar un nuevo administrador.
    if not ALLOW_PUBLIC_ADMIN_REGISTER:
        return redirect(url_for('admin_login'))
    return render_template('administrador/registeradmin.html')


@app.route("/forgot-password")
def forgot_password():                                         #Muestra la página para recuperar contraseña (cuando el admin la olvida).
    token = request.args.get('token', '')
    return render_template('administrador/f-password.html', token=token)


@app.route("/reset-password", methods=["POST"])
def reset_password():
    """Procesa el cambio de contraseña con el token de recuperación"""
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    
    if not token or not new_password:
        return jsonify({"status": "error", "message": "Token o contraseña no proporcionados."}), 400
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Buscar administrador con el token válido y no expirado
        cur.execute(
            "SELECT id_admin, nombre_completo, correo_electronico FROM administradores "
            "WHERE recovery_token = %s AND recovery_token_expires > %s",
            (token, datetime.now())
        )
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "El enlace de recuperación es inválido o ha expirado."}), 400
        
        # Encriptar la nueva contraseña
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Actualizar la contraseña y limpiar el token
        cur.execute(
            "UPDATE administradores SET contrasena = %s, recovery_token = NULL, recovery_token_expires = NULL "
            "WHERE id_admin = %s",
            (hashed_password, user['id_admin'])
        )
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión.",
            "redirect": "/admin"
        })
        
    except Exception as e:
        print(f"Error al restablecer contraseña: {str(e)}")
        return jsonify({"status": "error", "message": "Error al procesar la solicitud. Intenta más tarde."}), 500


@app.route("/email-verification")
def email_verification():                                        #Muestra la página donde el administrador ingresa el código de verificación enviado por correo.
    return render_template('administrador/e-verification.html')


@app.route("/request-password")
def request_password():                                           #Muestra la página para solicitar el cambio o restablecimiento de contraseña.
    return render_template('administrador/r-password.html')

#######Esta ruta muestra el panel del administrador, verificando que haya iniciado sesión y cargando sus datos desde la base de datos.########
#
@app.route("/dashboard")
def dashboard():
    """Dashboard del administrador (protegido)"""
    if 'user_id' not in session:
        return redirect(url_for('admin_login'))

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            "SELECT id_admin, nombre_completo, correo_electronico, rol, id_colegio FROM administradores WHERE id_admin = %s",
            (session['user_id'],)
        )
        user = cur.fetchone()
        cur.close()
        conn.close()

        admin_rol = user['rol'] if user else session.get('admin_rol', 'admin_colegio')
        id_colegio = user['id_colegio'] if user else session.get('id_colegio')
        session['admin_rol'] = admin_rol
        session['id_colegio'] = id_colegio

        colegio_nombre = ''
        if id_colegio:
            conn2 = get_db_connection()
            cur2 = conn2.cursor()
            cur2.execute("SELECT nombre_oficial FROM colegios WHERE id_colegio = %s", (id_colegio,))
            row = cur2.fetchone()
            colegio_nombre = row[0] if row else ''
            cur2.close()
            conn2.close()

        if user:
            return render_template('administrador/dashboard.html',
                                   user_name=user['nombre_completo'],
                                   user_email=user['correo_electronico'],
                                   admin_rol=admin_rol,
                                   id_colegio=id_colegio or '',
                                   colegio_nombre=colegio_nombre,
                                   is_superadmin=(admin_rol == 'superadmin'))
        else:
            return render_template('administrador/dashboard.html',
                                   user_name=session.get('user_name', 'Usuario'),
                                   user_email=session.get('user_email', 'usuario@ejemplo.com'),
                                   admin_rol=admin_rol,
                                   id_colegio=id_colegio or '',
                                   colegio_nombre=colegio_nombre,
                                   is_superadmin=(admin_rol == 'superadmin'))
    except Exception as e:
        print(f"Error al obtener datos del usuario: {e}")
        return render_template('administrador/dashboard.html',
                               user_name=session.get('user_name', 'Usuario'),
                               user_email=session.get('user_email', 'usuario@ejemplo.com'))

#######Esta ruta permite cerrar sesión completamente y volver al login del sistema.########
#
@app.route("/logout")
def logout():
    """Cierra sesión tanto de usuarios como de administradores"""
    session.clear()
    return redirect(url_for('loginuser'))


# -------------------------
# 📌 APIs DE ADMINISTRADORES (POST)
# -------------------------
########Este bloque permite registrar administradores, guardar sus datos de forma segura y enviar un código de verificación por correo.########
#
@app.route("/register", methods=["POST"])
def register_user():
    if not ALLOW_PUBLIC_ADMIN_REGISTER:
        return jsonify({"status": "error", "message": "El registro público de administradores está deshabilitado."}), 403
    data = request.get_json()
    fullname = data.get("fullname")
    email = data.get("email")
    password = data.get("password")

    if not all([fullname, email, password]):
        return jsonify({"status": "error", "message": "All fields are required."})

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    verification_code = generate_verification_code()
    verification_expires = datetime.now() + timedelta(minutes=5)

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO administradores
               (nombre_completo, correo_electronico, contrasena, verification_code, verification_code_expires)
               VALUES (%s, %s, %s, %s, %s) RETURNING id_admin;""",
            (fullname, email, hashed_password, verification_code, verification_expires)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        email_sent = send_verification_email(email, verification_code)
        if not email_sent:
            return jsonify({"status": "warning",
                            "message": "Usuario registrado pero el email de verificación no pudo enviarse.",
                            "id": new_id, "redirect": "/email-verification"})
        return jsonify({"status": "success",
                        "message": "Usuario registrado exitosamente. Email de verificación enviado.",
                        "id": new_id, "redirect": "/email-verification"})

    except psycopg2.Error as e:
        error_message = str(e).lower()
        if "unique constraint" in error_message:
            return jsonify({"status": "error", "message": "Email ya registrado."})
        return jsonify({"status": "error", "message": "Error en la base de datos. Intenta más tarde."})
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"status": "error", "message": "Error inesperado. Intenta más tarde."})

#######Este bloque permite que el administrador inicie sesión, validando usuario, correo verificado y contraseña, y luego lo redirige al dashboard.##########
#
@app.route("/login", methods=["POST"])
def login_user():
    """Login de administradores (POST)"""
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"status": "error", "message": "Todos los campos son requeridos.", "field": "general"})

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            "SELECT id_admin, nombre_completo, correo_electronico, contrasena, email_verified, rol, id_colegio "
            "FROM administradores WHERE nombre_completo = %s OR correo_electronico = %s",
            (username, username)
        )
        user = cur.fetchone()
        cur.close()
        conn.close()

        if not user:
            return jsonify({"status": "error",
                            "message": "Nombre de usuario o correo electrónico no encontrado.",
                            "field": "username"})
        if not user['email_verified']:
            return jsonify({"status": "error",
                            "message": "Por favor, verifica tu email antes de iniciar sesión.",
                            "field": "email"})
        if bcrypt.checkpw(password.encode('utf-8'), user['contrasena'].encode('utf-8')):
            session['user_id'] = user['id_admin']
            session['user_name'] = user['nombre_completo']
            session['user_email'] = user['correo_electronico']
            session['admin_rol'] = user.get('rol') or 'admin_colegio'
            session['id_colegio'] = user.get('id_colegio')
            return jsonify({"status": "success", "message": "Inicio de sesión exitoso.",
                            "redirect": "/dashboard",
                            "user": {"id": user['id_admin'], "name": user['nombre_completo'],
                                     "email": user['correo_electronico'],
                                     "rol": session['admin_rol']}})
        else:
            return jsonify({"status": "error", "message": "Contraseña incorrecta.", "field": "password"})

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"status": "error", "message": "Error al iniciar sesión. Intenta nuevamente.",
                        "field": "general"})

######Este bloque valida el código de verificación enviado por correo, activa la cuenta del administrador y guarda su sesión.########
#
@app.route("/verify-code", methods=["POST"])
def verify_code():
    data = request.get_json()
    email = data.get("email")
    code = data.get("code")

    if not email or not code:
        return jsonify({"status": "error", "message": "Email and code are required."})

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id_admin, verification_code, verification_code_expires "
            "FROM administradores WHERE correo_electronico = %s",
            (email,)
        )
        result = cur.fetchone()

        if not result:
            return jsonify({"status": "error", "message": "Email not found."})

        user_id, stored_code, expires = result

        if datetime.now() > expires:
            return jsonify({"status": "error", "message": "Verification code has expired. Please request a new one."})
        if stored_code != code:
            return jsonify({"status": "error", "message": "Invalid verification code."})

        cur.execute(
            "UPDATE administradores SET email_verified = TRUE, verification_code = NULL, "
            "verification_code_expires = NULL WHERE correo_electronico = %s",
            (email,)
        )
        conn.commit()

        session['user_id'] = user_id
        session['user_email'] = email

        cur.execute("SELECT nombre_completo FROM administradores WHERE id_admin = %s", (user_id,))
        user_name = cur.fetchone()[0]
        session['user_name'] = user_name

        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": "Email verified successfully!",
                        "user_id": user_id, "user_email": email, "user_name": user_name})

    except Exception as e:
        print(f"Verification error: {e}")
        return jsonify({"status": "error", "message": "Verification failed. Please try again."})

########Este bloque permite reenviar un nuevo código de verificación al correo del administrador en caso de que el anterior expire o se pierda.#########
#
@app.route("/resend-code", methods=["POST"])
def resend_code():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"status": "error", "message": "Email is required."})

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_admin FROM administradores WHERE correo_electronico = %s", (email,))
        if not cur.fetchone():
            return jsonify({"status": "error", "message": "Email not found."})

        new_code = generate_verification_code()
        new_expires = datetime.now() + timedelta(minutes=5)

        cur.execute(
            "UPDATE administradores SET verification_code = %s, verification_code_expires = %s "
            "WHERE correo_electronico = %s",
            (new_code, new_expires, email)
        )
        conn.commit()
        cur.close()
        conn.close()

        email_sent = send_verification_email(email, new_code)
        if email_sent:
            return jsonify({"status": "success", "message": f"New verification code sent to {email}"})
        else:
            return jsonify({"status": "error", "message": "Failed to send verification email."})

    except Exception as e:
        print(f"Resend error: {e}")
        return jsonify({"status": "error", "message": "Failed to resend code. Please try again."})

########Este bloque permite cambiar el correo del administrador, generar un nuevo código y volver a verificar el email.#########
#
@app.route("/update-email", methods=["POST"])
def update_email():
    data = request.get_json()
    old_email = data.get("old_email")
    new_email = data.get("new_email")

    if not old_email or not new_email:
        return jsonify({"status": "error", "message": "Both old and new email are required."})

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id_admin FROM administradores WHERE correo_electronico = %s", (new_email,))
        if cur.fetchone():
            return jsonify({"status": "error", "message": "New email is already registered."})

        cur.execute("SELECT id_admin FROM administradores WHERE correo_electronico = %s", (old_email,))
        if not cur.fetchone():
            return jsonify({"status": "error", "message": "Old email not found."})

        new_code = generate_verification_code()
        new_expires = datetime.now() + timedelta(minutes=5)

        cur.execute(
            "UPDATE administradores SET correo_electronico = %s, verification_code = %s, "
            "verification_code_expires = %s, email_verified = FALSE WHERE correo_electronico = %s",
            (new_email, new_code, new_expires, old_email)
        )
        conn.commit()
        cur.close()
        conn.close()

        email_sent = send_verification_email(new_email, new_code)
        if email_sent:
            return jsonify({"status": "success",
                            "message": f"Email updated. New verification code sent to {new_email}"})
        else:
            return jsonify({"status": "error",
                            "message": "Email updated but failed to send verification email."})

    except Exception as e:
        print(f"Update email error: {e}")
        return jsonify({"status": "error", "message": "Failed to update email. Please try again."})

#######Permite solicitar la recuperación de contraseña generando un token y enviando un enlace al correo del usuario.#########
#
@app.route("/request-password", methods=["POST"])
def request_password_post():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"status": "error", "message": "Email is required."})

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_admin, nombre_completo FROM administradores WHERE correo_electronico = %s", (email,))
        user = cur.fetchone()

        if not user:
            return jsonify({"status": "success",
                            "message": "Si el email está registrado, recibirás un enlace para restablecer tu contraseña."})

        recovery_code = generate_verification_code(32)
        recovery_expires = datetime.now() + timedelta(hours=24)

        cur.execute(
            "UPDATE administradores SET recovery_token = %s, recovery_token_expires = %s "
            "WHERE correo_electronico = %s",
            (recovery_code, recovery_expires, email)
        )
        conn.commit()
        cur.close()
        conn.close()

        recovery_link = f"{PUBLIC_BASE_URL}/forgot-password?token={recovery_code}"
        email_sent = send_recovery_email(email, recovery_link, user[1])

        if email_sent:
            return jsonify({"status": "success", "message": f"Enlace de recuperación enviado a {email}"})
        msg = (
            "Error al enviar el email. Intenta nuevamente."
            if _smtp_config_ok() or RESEND_API_KEY
            else "Servicio de correo no configurado en el servidor."
        )
        if not RESEND_API_KEY and _smtp_config_ok():
            return jsonify({"status": "error", "message": msg})

    except Exception as e:
        print(f"Request password error: {e}")
        return jsonify({"status": "error", "message": "Error en el servidor. Intenta más tarde."})



#  RUTAS DEL PANEL ADMIN (gestión de estudiantes/profesores)

######Permite acceder a la vista de gestión de estudiantes solo si el administrador ha iniciado sesión.########
#
@app.route("/admin/estudiantes")
def admin_estudiantes():
    if 'user_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template('administrador/estudiantes.html')

#######Permite acceder a la vista de gestión de profesores solo si el administrador ha iniciado sesión.########
#
@app.route("/admin/profesores")
def admin_profesores():
    if 'user_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template('administrador/profesores.html')

########Busca y devuelve los datos de un estudiante por su código, validando que el administrador esté autenticado.########
#
@app.route("/obtener-estudiante/<codigo>", methods=["GET"])
def obtener_estudiante(codigo):
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "error", "message": "No disponible para super admin."}), 403
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(
            f"""SELECT id_estudiante, codigo_estudiante as id, nombre_completo, tipo_documento,
                      numero_documento, correo_electronico as email, grado, grupo,
                      fecha_nacimiento, lugar_nacimiento, genero, direccion_residencia,
                      eps, grupo_sanguineo, alergias, ultimo_grado, colegio_procedencia
               FROM estudiantes WHERE codigo_estudiante = %s {filt}""",
            (codigo, *params)
        )
        estudiante = cur.fetchone()
        if estudiante:
            data = dict(estudiante)
            if data.get('fecha_nacimiento'):
                data['fecha_nacimiento'] = data['fecha_nacimiento'].isoformat()
            data['acudiente'] = _fetch_acudiente_principal(cur, data.pop('id_estudiante'))
            cur.close()
            conn.close()
            return jsonify({"status": "success", "data": data})
        cur.close()
        conn.close()
        return jsonify({"status": "error", "message": "Estudiante no encontrado."})
    except Exception as e:
        print(f"Error obteniendo estudiante: {e}")
        return jsonify({"status": "error", "message": "Error al obtener los datos."})

########Obtiene los datos de un profesor por su código, valida la sesión del administrador y convierte las asignaturas en una lista antes de enviarlas.#######
#
@app.route("/obtener-profesor/<codigo>", methods=["GET"])
def obtener_profesor(codigo):
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "error", "message": "No disponible para super admin."}), 403
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(
            f"""SELECT codigo_profesor as id, nombre_completo, tipo_documento,
                      numero_documento, correo_electronico as email, telefono, asignaturas,
                      titulos_academicos, area_especialidad, anios_experiencia,
                      registro_escalafon, entidad_salud, entidad_pension
               FROM profesores WHERE codigo_profesor = %s {filt}""",
            (codigo, *params)
        )
        profesor = cur.fetchone()
        cur.close()
        conn.close()

        if profesor:
            profesor_dict = dict(profesor)
            if profesor_dict['asignaturas']:
                profesor_dict['asignaturas'] = profesor_dict['asignaturas'].split(',')
            return jsonify({"status": "success", "data": profesor_dict})
        else:
            return jsonify({"status": "error", "message": "Profesor no encontrado."})
    except Exception as e:
        print(f"Error obteniendo profesor: {e}")
        return jsonify({"status": "error", "message": "Error al obtener los datos."})

########Permite al administrador actualizar los datos de un estudiante, incluyendo opcionalmente su contraseña, validando la sesión, los campos y evitando correos duplicados.########
#
@app.route("/actualizar-estudiante", methods=["POST"])
def actualizar_estudiante():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err

    data = request.get_json()
    estudiante_id = data.get("id")
    nombre_completo = data.get("nombre_completo")
    tipo_documento = data.get("tipo_documento")
    numero_documento = data.get("numero_documento")
    correo_electronico = data.get("correo_electronico")
    grado = data.get("grado")
    grupo = data.get("grupo")
    nueva_contrasena = data.get("nueva_contrasena")

    if not all([estudiante_id, nombre_completo, tipo_documento, numero_documento, correo_electronico, grado, grupo]):
        return jsonify({"status": "error", "message": "Todos los campos obligatorios son requeridos."})

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute(
            "SELECT id_estudiante FROM estudiantes WHERE codigo_estudiante = %s AND id_colegio = %s",
            (estudiante_id, id_colegio),
        )
        est_row = cur.fetchone()
        if not est_row:
            return jsonify({"status": "error", "message": "Estudiante no encontrado."})
        id_est_db = est_row['id_estudiante'] if hasattr(est_row, 'keys') else est_row[0]

        if correo_electronico:
            cur.execute(
                """SELECT id_estudiante FROM estudiantes
                   WHERE id_colegio = %s AND correo_electronico = %s AND codigo_estudiante != %s""",
                (id_colegio, correo_electronico, estudiante_id),
            )
            if cur.fetchone():
                return jsonify({"status": "error", "message": "Este correo ya está registrado en este colegio."})
        cur.execute(
            """SELECT id_estudiante FROM estudiantes
               WHERE id_colegio = %s AND numero_documento = %s AND codigo_estudiante != %s""",
            (id_colegio, numero_documento, estudiante_id),
        )
        if cur.fetchone():
            return jsonify({"status": "error", "message": "Este documento ya está registrado en este colegio."})

        update_fields = ["nombre_completo=%s", "tipo_documento=%s", "numero_documento=%s",
                         "correo_electronico=%s", "grado=%s", "grupo=%s"]
        update_values = [nombre_completo, tipo_documento, numero_documento, correo_electronico, grado, grupo]
        extra = _estudiante_extra_from_request(data)
        for key in ESTUDIANTE_EXTRA_COLS:
            update_fields.append(f"{key}=%s")
            update_values.append(extra[key])

        if nueva_contrasena:
            if len(nueva_contrasena) < 8:
                return jsonify({"status": "error", "message": "La nueva contraseña debe tener al menos 8 caracteres."})
            hashed = bcrypt.hashpw(nueva_contrasena.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            update_fields.append("contrasena=%s")
            update_values.append(hashed)

        update_values.extend([estudiante_id, id_colegio])
        cur.execute(
            f"UPDATE estudiantes SET {', '.join(update_fields)} WHERE codigo_estudiante = %s AND id_colegio = %s "
            f"RETURNING codigo_estudiante, nombre_completo, correo_electronico, grado, grupo",
            tuple(update_values)
        )
        updated = cur.fetchone()
        acudiente = _acudiente_from_request(data)
        if acudiente:
            _upsert_acudiente_principal(cur, id_est_db, id_colegio, acudiente)
        conn.commit()
        cur.close()
        conn.close()

        if updated:
            return jsonify({"status": "success", "message": "Estudiante actualizado exitosamente!", "data": dict(updated)})
        else:
            return jsonify({"status": "error", "message": "Error al actualizar el estudiante."})

    except psycopg2.Error as e:
        print(f"Database error actualizando estudiante: {e}")
        return jsonify({"status": "error", "message": "Error en la base de datos. Intenta nuevamente."})
    except Exception as e:
        print(f"Error actualizando estudiante: {e}")
        return jsonify({"status": "error", "message": "Error inesperado. Intenta nuevamente."})

#######Permite al administrador actualizar los datos de un profesor, incluyendo asignaturas y contraseña opcional, validando sesión y evitando datos duplicados.#######
#
@app.route("/actualizar-profesor", methods=["POST"])
def actualizar_profesor():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err

    data = request.get_json()
    profesor_id = data.get("id")
    nombre_completo = data.get("nombre_completo")
    tipo_documento = data.get("tipo_documento")
    numero_documento = data.get("numero_documento")
    correo_electronico = data.get("correo_electronico")
    telefono = data.get("telefono")
    asignaturas = data.get("asignaturas")
    nueva_contrasena = data.get("nueva_contrasena")

    if not all([profesor_id, nombre_completo, tipo_documento, numero_documento, correo_electronico, telefono]):
        return jsonify({"status": "error", "message": "Todos los campos obligatorios son requeridos."})

    if not asignaturas or len(asignaturas) == 0:
        return jsonify({"status": "error", "message": "Debes seleccionar al menos una asignatura."})

    asignaturas_str = ','.join(asignaturas) if isinstance(asignaturas, list) else asignaturas

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute(
            "SELECT id_profesor FROM profesores WHERE codigo_profesor = %s AND id_colegio = %s",
            (profesor_id, id_colegio),
        )
        if not cur.fetchone():
            return jsonify({"status": "error", "message": "Profesor no encontrado."})

        if correo_electronico:
            cur.execute(
                """SELECT id_profesor FROM profesores
                   WHERE id_colegio = %s AND correo_electronico = %s AND codigo_profesor != %s""",
                (id_colegio, correo_electronico, profesor_id),
            )
            if cur.fetchone():
                return jsonify({"status": "error", "message": "Este correo ya está registrado en este colegio."})

        cur.execute(
            """SELECT id_profesor FROM profesores
               WHERE id_colegio = %s AND numero_documento = %s AND codigo_profesor != %s""",
            (id_colegio, numero_documento, profesor_id),
        )
        if cur.fetchone():
            return jsonify({"status": "error", "message": "Este documento ya está registrado en este colegio."})

        update_fields = ["nombre_completo=%s", "tipo_documento=%s", "numero_documento=%s",
                         "correo_electronico=%s", "telefono=%s", "asignaturas=%s"]
        update_values = [nombre_completo, tipo_documento, numero_documento,
                         correo_electronico, telefono, asignaturas_str]
        extra = _profesor_extra_from_request(data)
        for key in PROFESOR_EXTRA_COLS:
            update_fields.append(f"{key}=%s")
            update_values.append(extra[key])

        if nueva_contrasena:
            if len(nueva_contrasena) < 8:
                return jsonify({"status": "error", "message": "La nueva contraseña debe tener al menos 8 caracteres."})
            hashed = bcrypt.hashpw(nueva_contrasena.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            update_fields.append("contrasena=%s")
            update_values.append(hashed)

        update_values.extend([profesor_id, id_colegio])
        cur.execute(
            f"UPDATE profesores SET {', '.join(update_fields)} WHERE codigo_profesor = %s AND id_colegio = %s "
            f"RETURNING codigo_profesor, nombre_completo, correo_electronico, telefono, asignaturas",
            tuple(update_values)
        )
        updated = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if updated:
            prof_data = dict(updated)
            if prof_data['asignaturas']:
                prof_data['asignaturas'] = prof_data['asignaturas'].split(',')
            return jsonify({"status": "success", "message": "Profesor actualizado exitosamente!", "data": prof_data})
        else:
            return jsonify({"status": "error", "message": "Error al actualizar el profesor."})

    except psycopg2.Error as e:
        print(f"Database error actualizando profesor: {e}")
        return jsonify({"status": "error", "message": "Error en la base de datos. Intenta nuevamente."})
    except Exception as e:
        print(f"Error actualizando profesor: {e}")
        return jsonify({"status": "error", "message": "Error inesperado. Intenta nuevamente."})




# 📌 RUTAS FALTANTES

#######Devuelve los IDs y datos básicos de los profesores para usarlos en listas o selects, validando sesión.#######
#
@app.route("/obtener-profesores-ids", methods=["GET"])
def obtener_profesores_ids():
    """Devuelve id_profesor (entero) para los selects de asignaciones"""
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(
            f"SELECT id_profesor, nombre_completo, codigo_profesor FROM profesores WHERE 1=1 {filt} ORDER BY nombre_completo",
            params,
        )
        data = [dict(p) for p in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)

########Devuelve los IDs y datos básicos de los estudiantes para usarlos en listas o selects, validando sesión.#######
#
@app.route("/obtener-estudiantes-ids", methods=["GET"])
def obtener_estudiantes_ids():
    """Devuelve id_estudiante (entero) para los selects de asignaciones"""
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(
            f"SELECT id_estudiante, nombre_completo, codigo_estudiante FROM estudiantes WHERE 1=1 {filt} ORDER BY nombre_completo",
            params,
        )
        data = [dict(e) for e in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)

#######Devuelve los IDs y nombres de los grupos para usarlos en listas o selects, validando sesión.#######
#
@app.route("/obtener-grupos-ids", methods=["GET"])
def obtener_grupos_ids():
    """Devuelve id_grupo (entero) para los selects de asignaciones"""
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(f"SELECT id_grupo, nombre FROM grupos WHERE 1=1 {filt} ORDER BY nombre", params)
        data = [dict(g) for g in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)

########Devuelve los IDs y nombres de las materias para usarlos en listas o selects, validando sesión.######
#
@app.route("/obtener-materias-ids", methods=["GET"])
def obtener_materias_ids():
    """Devuelve id_materia (entero) para los selects de asignaciones"""
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(f"SELECT id_materia, nombre FROM materia WHERE 1=1 {filt} ORDER BY nombre", params)
        data = [dict(m) for m in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)

#######Obtiene la cantidad de estudiantes y profesores activos para mostrar estadísticas en el dashboard del administrador.#######
#
@app.route("/dashboard-stats", methods=["GET"])
def dashboard_stats():
    admin, err = _require_admin_api()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if is_superadmin(admin):
            cur.execute("SELECT COUNT(*) FROM colegios WHERE estado = 'activo'")
            colegios_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM administradores WHERE rol = 'superadmin'")
            superadmins_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM administradores WHERE rol = 'admin_colegio'")
            admins_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM estudiantes WHERE estado = 'activo'")
            estudiantes_count = cur.fetchone()[0]
            cur.close()
            conn.close()
            return jsonify({
                "status": "success",
                "data": {
                    "colegios": colegios_count,
                    "superadmins": superadmins_count,
                    "admins_colegio": admins_count,
                    "estudiantes": estudiantes_count,
                },
            })
        filt, params = colegio_filter_sql(admin)
        cur.execute(f"SELECT COUNT(*) FROM estudiantes WHERE estado = 'activo' {filt}", params)
        estudiantes_count = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM profesores WHERE estado = 'activo' {filt}", params)
        profesores_count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": {"estudiantes": estudiantes_count, "profesores": profesores_count}})
    except Exception as e:
        print(f"Error stats: {e}")
        return jsonify({"status": "error", "message": "Error al obtener estadísticas."})
    
#######Obtiene y devuelve la lista de estudiantes con sus datos principales, ordenados por fecha de registro, validando sesión.#######
#
@app.route("/obtener-estudiantes", methods=["GET"])
def obtener_estudiantes():
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(
            f"SELECT codigo_estudiante as id, nombre_completo as nombre, correo_electronico as email, grado, grupo, "
            f"TO_CHAR(fecha_registro, 'DD/MM/YYYY') as fecha_registro, estado FROM estudiantes WHERE 1=1 {filt} "
            f"ORDER BY fecha_registro DESC",
            params,
        )
        estudiantes = [dict(e) for e in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": estudiantes})
    except Exception as e:
        print(f"Error obteniendo estudiantes: {e}")
        return jsonify({"status": "error", "message": "Error al obtener los datos."})
    
########Obtiene y devuelve la lista de profesores con sus datos principales, convirtiendo las asignaturas en lista y validando sesión.#######
#
@app.route("/obtener-profesores", methods=["GET"])
def obtener_profesores():
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(
            f"SELECT codigo_profesor as id, nombre_completo as nombre, correo_electronico as email, telefono, "
            f"asignaturas, TO_CHAR(fecha_registro, 'DD/MM/YYYY') as fecha_registro, estado FROM profesores "
            f"WHERE 1=1 {filt} ORDER BY fecha_registro DESC",
            params,
        )
        profesores_list = []
        for p in cur.fetchall():
            p_dict = dict(p)
            p_dict['asignaturas'] = p_dict['asignaturas'].split(',') if p_dict['asignaturas'] else []
            profesores_list.append(p_dict)
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": profesores_list})
    except Exception as e:
        print(f"Error obteniendo profesores: {e}")
        return jsonify({"status": "error", "message": "Error al obtener los datos."})
    
########Permite al administrador registrar un nuevo estudiante, validando datos, evitando duplicados y guardando la contraseña de forma segura.######
#
@app.route("/registrar-estudiante", methods=["POST"])
def registrar_estudiante():
    admin, err = _require_admin_api()
    if err:
        return err
    id_colegio = _admin_colegio_id(admin)
    if not id_colegio:
        return jsonify({"status": "error", "message": "El super admin no registra estudiantes. Usa un admin de colegio."})
    data = request.get_json()
    nombre_completo = data.get("nombre_completo")
    tipo_documento = data.get("tipo_documento")
    numero_documento = data.get("numero_documento")
    correo_electronico = data.get("correo_electronico")
    grado = data.get("grado")
    grupo = data.get("grupo")
    contrasena = data.get("contrasena")
    if not all([nombre_completo, tipo_documento, numero_documento, correo_electronico, grado, grupo, contrasena]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    if len(contrasena) < 8:
        return jsonify({"status": "error", "message": "La contraseña debe tener al menos 8 caracteres."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT codigo_estudiante FROM estudiantes WHERE id_colegio = %s ORDER BY id_estudiante DESC LIMIT 1",
            (id_colegio,),
        )
        last = cur.fetchone()
        new_number = int(last[0][3:]) + 1 if last else 1
        codigo_estudiante = f"EST{new_number:03d}"
        _realign_pk_sequence(cur, "estudiantes", "id_estudiante")
        ok, err, id_est, codigo = _insert_estudiante_db(cur, id_colegio, data, codigo_estudiante)
        if not ok:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": err})
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Estudiante registrado exitosamente!", "data": {"id": id_est, "codigo": codigo}})
    except Exception as e:
        print(f"Error registrando estudiante: {e}")
        return jsonify({"status": "error", "message": "Error en la base de datos."})
    
#########Permite al administrador registrar un nuevo profesor, validando datos, evitando duplicados, guardando asignaturas y cifrando la contraseña.#######
#
@app.route("/registrar-profesor", methods=["POST"])
def registrar_profesor():
    admin, err = _require_admin_api()
    if err:
        return err
    id_colegio = _admin_colegio_id(admin)
    if not id_colegio:
        return jsonify({"status": "error", "message": "El super admin no registra profesores. Usa un admin de colegio."})
    data = request.get_json()
    nombre_completo = data.get("nombre_completo")
    tipo_documento = data.get("tipo_documento")
    numero_documento = data.get("numero_documento")
    correo_electronico = data.get("correo_electronico")
    telefono = data.get("telefono")
    asignaturas = data.get("asignaturas")
    contrasena = data.get("contrasena")
    if not all([nombre_completo, tipo_documento, numero_documento, correo_electronico, telefono, contrasena]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    if len(contrasena) < 8:
        return jsonify({"status": "error", "message": "La contraseña debe tener al menos 8 caracteres."})
    if not asignaturas or (isinstance(asignaturas, list) and len(asignaturas) == 0):
        return jsonify({"status": "error", "message": "Debes seleccionar al menos una asignatura."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT codigo_profesor FROM profesores WHERE id_colegio = %s ORDER BY id_profesor DESC LIMIT 1",
            (id_colegio,),
        )
        last = cur.fetchone()
        new_number = int(last[0][4:]) + 1 if last else 1
        codigo_profesor = f"PROF{new_number:03d}"
        _realign_pk_sequence(cur, "profesores", "id_profesor")
        ok, err, id_prof, codigo = _insert_profesor_db(cur, id_colegio, data, codigo_profesor)
        if not ok:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": err})
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Profesor registrado exitosamente!", "data": {"id": id_prof, "codigo": codigo}})
    except Exception as e:
        print(f"Error registrando profesor: {e}")
        return jsonify({"status": "error", "message": "Error en la base de datos."})
    
#######Permite al administrador eliminar un estudiante por su código, validando sesión.######
#
@app.route("/eliminar-estudiante", methods=["POST"])
def eliminar_estudiante():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    data = request.get_json()
    codigo = data.get("codigo")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM estudiantes WHERE codigo_estudiante = %s AND id_colegio = %s",
            (codigo, id_colegio),
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Estudiante eliminado exitosamente!"})
    except Exception as e:
        print(f"Error eliminando estudiante: {e}")
        return jsonify({"status": "error", "message": "Error al eliminar."})
    
#######Permite al administrador eliminar un profesor por su código, validando sesión.#######
#
@app.route("/eliminar-profesor", methods=["POST"])
def eliminar_profesor():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    data = request.get_json()
    codigo = data.get("codigo")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM profesores WHERE codigo_profesor = %s AND id_colegio = %s",
            (codigo, id_colegio),
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Profesor eliminado exitosamente!"})
    except Exception as e:
        print(f"Error eliminando profesor: {e}")
        return jsonify({"status": "error", "message": "Error al eliminar."})


@app.route('/admin/plantilla/estudiantes.csv', methods=['GET'])
def plantilla_estudiantes_csv():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    return _make_csv_response(ESTUDIANTES_CSV_HEADERS, ESTUDIANTES_CSV_EJEMPLO, 'plantilla_estudiantes.csv')


@app.route('/admin/plantilla/profesores.csv', methods=['GET'])
def plantilla_profesores_csv():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    return _make_csv_response(PROFESORES_CSV_HEADERS, PROFESORES_CSV_EJEMPLO, 'plantilla_profesores.csv')


@app.route('/admin/importar/estudiantes', methods=['POST'])
def importar_estudiantes_csv():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    archivo = request.files.get('archivo')
    if not archivo or not archivo.filename:
        return jsonify({'status': 'error', 'message': 'Selecciona un archivo CSV.'}), 400
    try:
        rows = _read_csv_rows(archivo)
    except ValueError as exc:
        return jsonify({'status': 'error', 'message': str(exc)}), 400

    registrados = []
    errores = []
    vistos = set()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT codigo_estudiante FROM estudiantes WHERE id_colegio = %s ORDER BY id_estudiante DESC LIMIT 1",
            (id_colegio,),
        )
        last = cur.fetchone()
        next_num = int(last[0][3:]) + 1 if last else 1
        _realign_pk_sequence(cur, 'estudiantes', 'id_estudiante')

        for idx, row in enumerate(rows, start=2):
            clave = (row.get('correo_electronico', ''), row.get('numero_documento', ''))
            if clave in vistos:
                errores.append({'fila': idx, 'mensaje': 'Correo o documento repetido en el archivo.'})
                continue
            vistos.add(clave)
            payload = _estudiante_payload_from_row(row)
            codigo = f"EST{next_num:03d}"
            ok, msg, _, cod = _insert_estudiante_db(cur, id_colegio, payload, codigo)
            if ok:
                registrados.append({'fila': idx, 'codigo': cod, 'nombre': payload.get('nombre_completo')})
                next_num += 1
            else:
                errores.append({'fila': idx, 'mensaje': msg})

        conn.commit()
        cur.close()
        conn.close()
    except Exception as exc:
        print(f'Error importando estudiantes: {exc}')
        return jsonify({'status': 'error', 'message': 'Error en la base de datos al importar.'}), 500

    return jsonify({
        'status': 'success',
        'message': f'{len(registrados)} estudiante(s) registrados, {len(errores)} con error.',
        'data': {'registrados': registrados, 'errores': errores},
    })


@app.route('/admin/importar/profesores', methods=['POST'])
def importar_profesores_csv():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    archivo = request.files.get('archivo')
    if not archivo or not archivo.filename:
        return jsonify({'status': 'error', 'message': 'Selecciona un archivo CSV.'}), 400
    try:
        rows = _read_csv_rows(archivo)
    except ValueError as exc:
        return jsonify({'status': 'error', 'message': str(exc)}), 400

    registrados = []
    errores = []
    vistos = set()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT codigo_profesor FROM profesores WHERE id_colegio = %s ORDER BY id_profesor DESC LIMIT 1",
            (id_colegio,),
        )
        last = cur.fetchone()
        next_num = int(last[0][4:]) + 1 if last else 1
        _realign_pk_sequence(cur, 'profesores', 'id_profesor')

        for idx, row in enumerate(rows, start=2):
            clave = (row.get('correo_electronico', ''), row.get('numero_documento', ''))
            if clave in vistos:
                errores.append({'fila': idx, 'mensaje': 'Correo o documento repetido en el archivo.'})
                continue
            vistos.add(clave)
            payload = _profesor_payload_from_row(row)
            codigo = f"PROF{next_num:03d}"
            ok, msg, _, cod = _insert_profesor_db(cur, id_colegio, payload, codigo)
            if ok:
                registrados.append({'fila': idx, 'codigo': cod, 'nombre': payload.get('nombre_completo')})
                next_num += 1
            else:
                errores.append({'fila': idx, 'mensaje': msg})

        conn.commit()
        cur.close()
        conn.close()
    except Exception as exc:
        print(f'Error importando profesores: {exc}')
        return jsonify({'status': 'error', 'message': 'Error en la base de datos al importar.'}), 500

    return jsonify({
        'status': 'success',
        'message': f'{len(registrados)} profesor(es) registrados, {len(errores)} con error.',
        'data': {'registrados': registrados, 'errores': errores},
    })

    
###### PDF con branding del colegio (encabezado, escudo, marca de agua). ######
#
class ColegioBrandedPDF(FPDF):
    def __init__(self, branding=None):
        super().__init__()
        branding = branding or {}
        self._nombre = _pdf_sanitize(branding.get('nombre_oficial') or 'MiBoletin')
        self._lema = _pdf_sanitize(branding.get('lema') or '')
        self._primary = _hex_to_rgb(branding.get('color_primario'), (0, 51, 102))
        self._escudo_path = _branding_file_path(branding.get('escudo_url'))
        self._encabezado_path = _branding_file_path(branding.get('encabezado_pdf_url'))
        self._marca_path = _branding_file_path(branding.get('marca_agua_url'))

    def _draw_watermark(self):
        if not self._marca_path or not os.path.isfile(self._marca_path):
            return
        try:
            if hasattr(self, 'set_alpha'):
                self.set_alpha(0.08)
            w, h = 90, 90
            self.image(self._marca_path, x=(self.w - w) / 2, y=(self.h - h) / 2, w=w)
            if hasattr(self, 'set_alpha'):
                self.set_alpha(1)
        except Exception:
            pass

    def header(self):
        self._draw_watermark()
        y0 = self.get_y()
        if self._encabezado_path and os.path.isfile(self._encabezado_path):
            try:
                self.image(self._encabezado_path, x=10, y=8, w=190)
                self.ln(28)
            except Exception:
                self.set_y(y0)
        if self._escudo_path and os.path.isfile(self._escudo_path):
            try:
                self.image(self._escudo_path, x=12, y=10, h=14)
            except Exception:
                pass
        r, g, b = self._primary
        self.set_font('helvetica', 'B', 14)
        self.set_text_color(r, g, b)
        self.cell(0, 8, _pdf_sanitize(self._nombre[:80]), 0, 1, 'C')
        if self._lema:
            self.set_font('helvetica', 'I', 9)
            self.set_text_color(100, 100, 100)
            self.cell(0, 6, _pdf_sanitize(self._lema[:120]), 0, 1, 'C')
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(130, 130, 130)
        self.cell(0, 5, f'Generado: {datetime.now().strftime("%d/%m/%Y %H:%M")}', 0, 1, 'C')
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, _pdf_sanitize(f'{self._nombre[:40]} - Pagina {self.page_no()}'), 0, 0, 'C')


def _pdf_for_colegio(id_colegio):
    branding = _fetch_colegio_branding(id_colegio) if id_colegio else None
    return ColegioBrandedPDF(branding)


MiBoletinPDF = ColegioBrandedPDF
        
#########Genera y descarga un PDF con la lista de estudiantes, permitiendo filtrar por grado y grupo, y mostrando la información en formato de tabla.######
#
@app.route("/reporte/estudiantes/pdf", methods=["GET"])
def reporte_estudiantes_pdf():
    id_colegio, err = _require_colegio_admin_pdf()
    if err:
        return err

    grado = request.args.get('grado', '')
    grupo = request.args.get('grupo', '')

    query = "SELECT codigo_estudiante, nombre_completo, correo_electronico, grado, grupo, estado FROM estudiantes WHERE id_colegio = %s"
    params = [id_colegio]

    if grado:
        query += " AND grado = %s"
        params.append(grado)
    if grupo:
        query += " AND grupo = %s"
        params.append(grupo)

    query += " ORDER BY grado, grupo, nombre_completo"

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(query, tuple(params))
        estudiantes = cur.fetchall()
        cur.close()
        conn.close()

        pdf = _pdf_for_colegio(id_colegio)
        pdf.add_page()
        
        pdf.set_font('helvetica', 'B', 14)
        pdf.set_text_color(0, 0, 0)
        titulo = "Reporte de Estudiantes"
        if grado: titulo += f" - Grado: {grado}"
        if grupo: titulo += f" Grupo: {grupo}"
        pdf.cell(0, 10, titulo, 0, 1, 'C')
        pdf.ln(5)
        
        # Tabla Header
        pdf.set_font('helvetica', 'B', 10)
        pdf.set_fill_color(0, 51, 102)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(30, 10, 'Código', 1, 0, 'C', fill=True)
        pdf.cell(70, 10, 'Nombre Completo', 1, 0, 'C', fill=True)
        pdf.cell(50, 10, 'Email', 1, 0, 'C', fill=True)
        pdf.cell(20, 10, 'Grado/Grupo', 1, 0, 'C', fill=True)
        pdf.cell(20, 10, 'Estado', 1, 1, 'C', fill=True)
        
        # Tabla Body
        pdf.set_font('helvetica', '', 9)
        pdf.set_text_color(0, 0, 0)
        fill = False
        pdf.set_fill_color(240, 248, 255)
        
        for e in estudiantes:
            pdf.cell(30, 8, str(e['codigo_estudiante']), 1, 0, 'L', fill=fill)
            # Truncate text if it's too long
            nombre = e['nombre_completo'][:35] + '...' if len(e['nombre_completo']) > 38 else e['nombre_completo']
            pdf.cell(70, 8, nombre, 1, 0, 'L', fill=fill)
            email = e['correo_electronico'][:25] + '...' if len(e['correo_electronico']) > 28 else e['correo_electronico']
            pdf.cell(50, 8, email, 1, 0, 'L', fill=fill)
            pdf.cell(20, 8, f"{e['grado']}-{e['grupo']}", 1, 0, 'C', fill=fill)
            pdf.cell(20, 8, str(e['estado']).capitalize(), 1, 1, 'C', fill=fill)
            fill = not fill
            
        pdf.ln(10)
        pdf.set_font('helvetica', 'B', 10)
        pdf.cell(0, 10, f"Total Estudiantes: {len(estudiantes)}", 0, 1, 'R')

        # Output to memory
        return send_file(
            _pdf_to_bytesio(pdf),
            as_attachment=True,
            download_name='reporte_estudiantes.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error generando PDF de estudiantes: {e}")
        return jsonify({"status": "error", "message": "Error generando el reporte PDF."})
    
##########Genera y descarga un PDF con el listado de profesores, mostrando sus datos en formato de tabla.########
#
@app.route("/reporte/profesores/pdf", methods=["GET"])
def reporte_profesores_pdf():
    id_colegio, err = _require_colegio_admin_pdf()
    if err:
        return err

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            "SELECT codigo_profesor, nombre_completo, correo_electronico, telefono, estado "
            "FROM profesores WHERE id_colegio = %s ORDER BY nombre_completo",
            (id_colegio,),
        )
        profesores = cur.fetchall()
        cur.close()
        conn.close()

        pdf = _pdf_for_colegio(id_colegio)
        pdf.add_page()
        
        pdf.set_font('helvetica', 'B', 14)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 10, "Directorio de Profesores", 0, 1, 'C')
        pdf.ln(5)
        
        # Tabla Header
        pdf.set_font('helvetica', 'B', 10)
        pdf.set_fill_color(0, 51, 102)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(30, 10, 'Código', 1, 0, 'C', fill=True)
        pdf.cell(70, 10, 'Nombre Completo', 1, 0, 'C', fill=True)
        pdf.cell(50, 10, 'Email', 1, 0, 'C', fill=True)
        pdf.cell(25, 10, 'Teléfono', 1, 0, 'C', fill=True)
        pdf.cell(15, 10, 'Estado', 1, 1, 'C', fill=True)
        
        # Tabla Body
        pdf.set_font('helvetica', '', 9)
        pdf.set_text_color(0, 0, 0)
        fill = False
        pdf.set_fill_color(240, 248, 255)
        
        for p in profesores:
            pdf.cell(30, 8, str(p['codigo_profesor']), 1, 0, 'L', fill=fill)
            nombre = p['nombre_completo'][:35] + '...' if len(p['nombre_completo']) > 38 else p['nombre_completo']
            pdf.cell(70, 8, nombre, 1, 0, 'L', fill=fill)
            email = p['correo_electronico'][:25] + '...' if len(p['correo_electronico']) > 28 else p['correo_electronico']
            pdf.cell(50, 8, email, 1, 0, 'L', fill=fill)
            telefono = str(p['telefono']) if p['telefono'] else 'N/A'
            pdf.cell(25, 8, telefono, 1, 0, 'C', fill=fill)
            pdf.cell(15, 8, str(p['estado']).capitalize(), 1, 1, 'C', fill=fill)
            fill = not fill
            
        pdf.ln(10)
        pdf.set_font('helvetica', 'B', 10)
        pdf.cell(0, 10, f"Total Profesores: {len(profesores)}", 0, 1, 'R')

        return send_file(
            _pdf_to_bytesio(pdf),
            as_attachment=True,
            download_name='directorio_profesores.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error generando PDF de profesores: {e}")
        return jsonify({"status": "error", "message": "Error generando el reporte PDF."})
    
########Genera y descarga un PDF con estadísticas generales del sistema, incluyendo estudiantes, profesores y solicitudes.########
#
@app.route("/reporte/resumen/pdf", methods=["GET"])
def reporte_resumen_pdf():
    id_colegio, err = _require_colegio_admin_pdf()
    if err:
        return err

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT COUNT(*) FROM estudiantes WHERE estado = 'activo' AND id_colegio = %s",
            (id_colegio,),
        )
        estudiantes_activos = cur.fetchone()[0]
        cur.execute(
            "SELECT COUNT(*) FROM estudiantes WHERE estado != 'activo' AND id_colegio = %s",
            (id_colegio,),
        )
        estudiantes_inactivos = cur.fetchone()[0]
        cur.execute(
            "SELECT COUNT(*) FROM profesores WHERE estado = 'activo' AND id_colegio = %s",
            (id_colegio,),
        )
        profesores_activos = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(*) FROM solicitudes_cambio_contrasena s
            JOIN estudiantes e ON s.tipo_usuario = 'estudiante' AND s.id_usuario = e.id_estudiante
            WHERE e.id_colegio = %s
        """, (id_colegio,))
        sol_est = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(*) FROM solicitudes_cambio_contrasena s
            JOIN profesores p ON s.tipo_usuario = 'profesor' AND s.id_usuario = p.id_profesor
            WHERE p.id_colegio = %s
        """, (id_colegio,))
        sol_prof = cur.fetchone()[0]
        total_solicitudes = sol_est + sol_prof

        cur.close()
        conn.close()

        pdf = _pdf_for_colegio(id_colegio)
        pdf.add_page()
        
        pdf.set_font('helvetica', 'B', 16)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 10, "Resumen General del Sistema", 0, 1, 'C')
        pdf.ln(10)
        
        # Bloques de resumen
        pdf.set_font('helvetica', 'B', 12)
        pdf.set_fill_color(240, 248, 255)
        pdf.cell(0, 10, ' Estadísticas de Estudiantes', 1, 1, 'L', fill=True)
        pdf.set_font('helvetica', '', 11)
        pdf.cell(0, 10, f' Estudiantes Activos: {estudiantes_activos}', 'LR', 1, 'L')
        pdf.cell(0, 10, f' Estudiantes Inactivos: {estudiantes_inactivos}', 'LRB', 1, 'L')
        pdf.ln(5)
        
        pdf.set_font('helvetica', 'B', 12)
        pdf.cell(0, 10, ' Estadísticas de Profesores', 1, 1, 'L', fill=True)
        pdf.set_font('helvetica', '', 11)
        pdf.cell(0, 10, f' Profesores Activos: {profesores_activos}', 'LRB', 1, 'L')
        pdf.ln(5)
        
        pdf.set_font('helvetica', 'B', 12)
        pdf.cell(0, 10, ' Soporte y Sistema', 1, 1, 'L', fill=True)
        pdf.set_font('helvetica', '', 11)
        pdf.cell(0, 10, f' Total de solicitudes de cambio de contraseña: {total_solicitudes}', 'LRB', 1, 'L')
        pdf.ln(10)
        
        # Admin info
        pdf.set_font('helvetica', 'I', 10)
        pdf.cell(0, 10, f"Reporte generado por: {session.get('user_name', 'Administrador')}", 0, 1, 'L')

        return send_file(
            _pdf_to_bytesio(pdf),
            as_attachment=True,
            download_name='resumen_sistema.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error generando PDF de estadisticas: {e}")
        return jsonify({"status": "error", "message": "Error generando el reporte PDF."})

##########Genera y descarga un PDF con el listado de administradores, mostrando ID, nombre, correo y estado de verificación.########
#
@app.route("/reporte/administradores/pdf", methods=["GET"])
def reporte_administradores_pdf():
    id_colegio, err = _require_colegio_admin_pdf()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            """SELECT id_admin, nombre_completo, correo_electronico, email_verified, rol
               FROM administradores WHERE id_colegio = %s ORDER BY id_admin""",
            (id_colegio,),
        )
        admins = cur.fetchall()
        cur.close()
        conn.close()

        pdf = _pdf_for_colegio(id_colegio)
        pdf.add_page()

        pdf.set_font('helvetica', 'B', 14)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 10, "Directorio de Administradores", 0, 1, 'C')
        pdf.ln(5)

        pdf.set_font('helvetica', 'B', 10)
        pdf.set_fill_color(0, 51, 102)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(15, 10, 'ID', 1, 0, 'C', fill=True)
        pdf.cell(75, 10, 'Nombre Completo', 1, 0, 'C', fill=True)
        pdf.cell(75, 10, 'Correo Electrónico', 1, 0, 'C', fill=True)
        pdf.cell(25, 10, 'Verificado', 1, 1, 'C', fill=True)

        pdf.set_font('helvetica', '', 9)
        pdf.set_text_color(0, 0, 0)
        fill = False
        pdf.set_fill_color(240, 248, 255)

        for a in admins:
            pdf.cell(15, 8, str(a['id_admin']), 1, 0, 'C', fill=fill)
            nombre = a['nombre_completo'][:38] + '...' if len(a['nombre_completo']) > 40 else a['nombre_completo']
            pdf.cell(75, 8, nombre, 1, 0, 'L', fill=fill)
            email = a['correo_electronico'][:35] + '...' if len(a['correo_electronico']) > 38 else a['correo_electronico']
            pdf.cell(75, 8, email, 1, 0, 'L', fill=fill)
            pdf.cell(25, 8, 'Sí' if a['email_verified'] else 'No', 1, 1, 'C', fill=fill)
            fill = not fill

        pdf.ln(10)
        pdf.set_font('helvetica', 'B', 10)
        pdf.cell(0, 10, f"Total Administradores: {len(admins)}", 0, 1, 'R')
        pdf.set_font('helvetica', 'I', 9)
        pdf.cell(0, 8, f"Reporte generado por: {session.get('user_name', 'Administrador')}", 0, 1, 'L')

        return send_file(
            _pdf_to_bytesio(pdf),
            as_attachment=True,
            download_name='directorio_administradores.pdf',
            mimetype='application/pdf',
        )

    except Exception as e:
        print(f"Error generando PDF de administradores: {e}")
        return jsonify({"status": "error", "message": "Error generando el reporte PDF."})


# RUTAS DEL PROFESOR

#######Obtiene los estudiantes activos asignados al profesor según sus grupos.########
#
@app.route('/profesor/grupos')
def profesor_grupos():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT DISTINCT g.id_grupo, g.nombre
            FROM grupos g
            JOIN grupo_materias gm ON g.id_grupo = gm.id_grupo
            WHERE gm.id_docente = %s
            ORDER BY g.nombre
        """, (user_info['id'],))
        grupos = [dict(g) for g in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": grupos})
    except Exception as e:
        return _api_error_response(e)


@app.route('/profesor/estudiantes')
def profesor_estudiantes():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    id_grupo = request.args.get('id_grupo', type=int)
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        query = """
            SELECT DISTINCT e.id_estudiante, e.nombre_completo, e.codigo_estudiante,
                   e.grado, e.grupo, g.nombre as nombre_grupo, g.id_grupo
            FROM estudiantes e
            JOIN grupo_estudiantes ge ON e.id_estudiante = ge.id_estudiante
            JOIN grupos g ON ge.id_grupo = g.id_grupo
            JOIN grupo_materias gm ON g.id_grupo = gm.id_grupo
            WHERE gm.id_docente = %s AND e.estado = 'activo'
        """
        params = [user_info['id']]
        if id_grupo:
            if not _profesor_puede_grupo(cur, user_info['id'], id_grupo):
                cur.close()
                conn.close()
                return jsonify({"status": "error", "message": "Grupo no asignado."}), 403
            query += " AND g.id_grupo = %s"
            params.append(id_grupo)
        query += " ORDER BY e.nombre_completo"
        cur.execute(query, tuple(params))
        estudiantes = [dict(e) for e in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": estudiantes})
    except Exception as e:
        print(f"Error obteniendo estudiantes del profesor: {e}")
        return _api_error_response(e)

############Lista los tipos de notas disponibles (ej: tareas, exámenes, etc.).###########
#
@app.route('/profesor/tipos-nota')
def profesor_tipos_nota():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id_tipo, nombre_tipo FROM tipos_nota ORDER BY nombre_tipo")
        tipos = [dict(t) for t in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": tipos})
    except Exception as e:
        return _api_error_response(e)

#########obtiene las materias y grupos asignados al profesor#######
#
@app.route('/profesor/materias')
def profesor_materias():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT gm.id_grupo_materia, m.nombre as materia, g.nombre as grupo
            FROM grupo_materias gm
            JOIN materia m ON gm.id_materia = m.id_materia
            JOIN grupos g ON gm.id_grupo = g.id_grupo
            WHERE gm.id_docente = %s
            ORDER BY m.nombre
        """, (user_info['id'],))
        materias = [dict(m) for m in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": materias})
    except Exception as e:
        return _api_error_response(e)

##########crea un nuevo tipo de nota o devuelve uno existente#######
#
@app.route('/profesor/tipos-nota', methods=['POST'])
def crear_tipo_nota():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    nombre_tipo = data.get('nombre_tipo', '').strip()
    if not nombre_tipo:
        return jsonify({"status": "error", "message": "El nombre es requerido."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO tipos_nota (nombre_tipo) VALUES (%s) ON CONFLICT (nombre_tipo) DO NOTHING RETURNING id_tipo",
            (nombre_tipo,)
        )
        row = cur.fetchone()
        if not row:
            # Ya existía — devolver el id existente
            cur.execute("SELECT id_tipo FROM tipos_nota WHERE nombre_tipo = %s", (nombre_tipo,))
            row = cur.fetchone()
            conn.commit(); cur.close(); conn.close()
            return jsonify({"status": "success", "message": "Tipo ya existía, seleccionado.", "id_tipo": row[0]})
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": f"Tipo '{nombre_tipo}' creado.", "id_tipo": row[0]})
    except Exception as e:
        return _api_error_response(e)

##########registra una nueva nota para un estudiante, incluyendo valor, descripción, tipo de nota y la materia/grupo asignado por el profesor#########
#
@app.route('/profesor/subir-nota', methods=['POST'])
def subir_nota():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    id_estudiante = data.get('id_estudiante')
    valor = data.get('valor')
    descripcion = data.get('descripcion')
    id_tipo = data.get('id_tipo')
    id_grupo_materia = data.get('id_grupo_materia')
    if not all([id_estudiante, valor, id_tipo, id_grupo_materia]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO notas (id_estudiante, valor, descripcion, id_tipo, id_grupo_materia)
            VALUES (%s, %s, %s, %s, %s) RETURNING id_nota
        """, (id_estudiante, valor, descripcion, id_tipo, id_grupo_materia))
        id_nota = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Nota registrada exitosamente!", "id_nota": id_nota})
    except Exception as e:
        print(f"Error subiendo nota: {e}")
        return _api_error_response(e)

######obtiene todas las notas de un estudiante registradas por el profesor, incluyendo valor, descripción, fecha, tipo de nota y materia correspondiente#######
#
@app.route('/profesor/notas/<int:id_estudiante>')
def ver_notas_estudiante(id_estudiante):
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT n.id_nota, n.valor, n.descripcion, n.fecha_registro,
                   tn.nombre_tipo, m.nombre as materia
            FROM notas n
            JOIN tipos_nota tn ON n.id_tipo = tn.id_tipo
            JOIN grupo_materias gm ON n.id_grupo_materia = gm.id_grupo_materia
            JOIN materia m ON gm.id_materia = m.id_materia
            WHERE n.id_estudiante = %s AND gm.id_docente = %s
            ORDER BY n.fecha_registro DESC
        """, (id_estudiante, user_info['id']))
        notas = [dict(n) for n in cur.fetchall()]
        for n in notas:
            n['fecha_registro'] = str(n['fecha_registro'])
            n['valor'] = float(n['valor'])
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": notas})
    except Exception as e:
        return _api_error_response(e)

#########registra una observación para un estudiante con tipo y descripción########
#
@app.route('/profesor/observador', methods=['POST'])
def agregar_observacion():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    id_estudiante = data.get('id_estudiante')
    tipo = data.get('tipo')
    descripcion = data.get('descripcion')
    if not all([id_estudiante, tipo, descripcion]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO observador (id_estudiante, id_profesor, tipo, descripcion)
            VALUES (%s, %s, %s, %s) RETURNING id_observacion
        """, (id_estudiante, user_info['id'], tipo, descripcion))
        id_obs = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Observación registrada!", "id_observacion": id_obs})
    except Exception as e:
        return _api_error_response(e)

########consulta las observaciones del estudiante hechas por el profesor, con fecha, tipo y detalle##########
#
@app.route('/profesor/observador/<int:id_estudiante>') 
def ver_observaciones(id_estudiante):
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT id_observacion, tipo, descripcion, fecha_registro
            FROM observador
            WHERE id_estudiante = %s AND id_profesor = %s
            ORDER BY fecha_registro DESC
        """, (id_estudiante, user_info['id']))
        obs = [dict(o) for o in cur.fetchall()]
        for o in obs:
            o['fecha_registro'] = str(o['fecha_registro'])
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": obs})
    except Exception as e:
        return _api_error_response(e)

############obtiene los eventos del profesor con fecha, hora y estado###########
#
@app.route('/profesor/agenda', methods=['GET'])
def ver_agenda():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        ensure_agenda_grupos_table()
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT a.id_agenda, a.titulo, a.descripcion, a.fecha_evento,
                   a.hora_inicio, a.hora_fin, a.estado,
                   COALESCE(
                       array_agg(g.nombre ORDER BY g.nombre)
                       FILTER (WHERE g.id_grupo IS NOT NULL),
                       ARRAY[]::varchar[]
                   ) AS grupos,
                   COALESCE(
                       array_agg(g.id_grupo ORDER BY g.nombre)
                       FILTER (WHERE g.id_grupo IS NOT NULL),
                       ARRAY[]::integer[]
                   ) AS id_grupos
            FROM agenda a
            LEFT JOIN agenda_grupos ag ON a.id_agenda = ag.id_agenda
            LEFT JOIN grupos g ON ag.id_grupo = g.id_grupo
            WHERE a.id_profesor = %s
            GROUP BY a.id_agenda
            ORDER BY a.fecha_evento ASC
        """, (user_info['id'],))
        eventos = [dict(e) for e in cur.fetchall()]
        for e in eventos:
            e['fecha_evento'] = str(e['fecha_evento'])
            e['hora_inicio'] = str(e['hora_inicio']) if e['hora_inicio'] else None
            e['hora_fin'] = str(e['hora_fin']) if e['hora_fin'] else None
            e['grupos'] = list(e.get('grupos') or [])
            e['id_grupos'] = [int(x) for x in (e.get('id_grupos') or []) if x is not None]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": eventos})
    except Exception as e:
        return _api_error_response(e)

########crea un nuevo evento en la agenda con título, descripción, fecha y horario######
#
@app.route('/profesor/agenda', methods=['POST'])
def agregar_agenda():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    titulo = data.get('titulo')
    descripcion = data.get('descripcion')
    fecha_evento = data.get('fecha_evento')
    hora_inicio = data.get('hora_inicio') or None
    hora_fin = data.get('hora_fin') or None
    id_grupos = data.get('id_grupos') or []
    if not all([titulo, fecha_evento]):
        return jsonify({"status": "error", "message": "Título y fecha son requeridos."})
    if not isinstance(id_grupos, list):
        id_grupos = []
    try:
        id_grupos = [int(g) for g in id_grupos]
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Lista de grupos inválida."})
    try:
        ensure_agenda_grupos_table()
        conn = get_db_connection()
        cur = conn.cursor()
        for id_grupo in id_grupos:
            if not _profesor_puede_grupo(cur, user_info['id'], id_grupo):
                cur.close()
                conn.close()
                return jsonify({"status": "error", "message": "Uno o más grupos no están asignados a ti."}), 403
        cur.execute("""
            INSERT INTO agenda (id_profesor, titulo, descripcion, fecha_evento, hora_inicio, hora_fin)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id_agenda
        """, (user_info['id'], titulo, descripcion, fecha_evento, hora_inicio, hora_fin))
        id_agenda = cur.fetchone()[0]
        for id_grupo in id_grupos:
            cur.execute(
                "INSERT INTO agenda_grupos (id_agenda, id_grupo) VALUES (%s, %s)",
                (id_agenda, id_grupo),
            )
        conn.commit()
        cur.close()
        conn.close()
        msg = "Evento agregado!"
        if id_grupos:
            msg += f" Compartido con {len(id_grupos)} grupo(s)."
        return jsonify({"status": "success", "message": msg, "id_agenda": id_agenda})
    except Exception as e:
        return _api_error_response(e)

#######actualiza el estado de un evento de la agenda del profesor (ej: pendiente, realizado, cancelado)########
#
@app.route('/profesor/agenda/<int:id_agenda>', methods=['PUT'])
def actualizar_estado_agenda(id_agenda):
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    estado = data.get('estado')
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE agenda SET estado = %s
            WHERE id_agenda = %s AND id_profesor = %s
        """, (estado, id_agenda, user_info['id']))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Estado actualizado!"})
    except Exception as e:
        return _api_error_response(e)

########obtiene el reporte completo de un estudiante con datos personales, notas por materia, observaciones del profesor y promedio general########
#
@app.route('/profesor/reporte/<int:id_estudiante>')
def reporte_estudiante(id_estudiante):
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT nombre_completo, codigo_estudiante, grado, grupo FROM estudiantes WHERE id_estudiante = %s", (id_estudiante,))
        estudiante = dict(cur.fetchone())
        cur.execute("""
            SELECT n.valor, n.descripcion, n.fecha_registro,
                   tn.nombre_tipo, m.nombre as materia
            FROM notas n
            JOIN tipos_nota tn ON n.id_tipo = tn.id_tipo
            JOIN grupo_materias gm ON n.id_grupo_materia = gm.id_grupo_materia
            JOIN materia m ON gm.id_materia = m.id_materia
            WHERE n.id_estudiante = %s AND gm.id_docente = %s
            ORDER BY m.nombre, n.fecha_registro DESC
        """, (id_estudiante, user_info['id']))
        notas = [dict(n) for n in cur.fetchall()]
        for n in notas:
            n['fecha_registro'] = str(n['fecha_registro'])
            n['valor'] = float(n['valor'])
        cur.execute("""
            SELECT tipo, descripcion, fecha_registro
            FROM observador
            WHERE id_estudiante = %s AND id_profesor = %s
            ORDER BY fecha_registro DESC
        """, (id_estudiante, user_info['id']))
        observaciones = [dict(o) for o in cur.fetchall()]
        for o in observaciones:
            o['fecha_registro'] = str(o['fecha_registro'])
        promedio = round(sum(n['valor'] for n in notas) / len(notas), 2) if notas else 0
        cur.close()
        conn.close()
        return jsonify({
            "status": "success",
            "data": {
                "estudiante": estudiante,
                "notas": notas,
                "observaciones": observaciones,
                "promedio": promedio
            }
        })
    except Exception as e:
        return _api_error_response(e)



#######genera y descarga un PDF con el reporte completo de todos los estudiantes del profesor, incluyendo datos personales, notas por materia con promedio y observaciones registradas#######
#
def _profesor_estudiantes_para_reporte(cur, id_docente, id_grupo=None, id_estudiante=None):
    """Lista estudiantes del profesor, opcionalmente filtrados por grupo o uno solo."""
    if id_estudiante:
        cur.execute("""
            SELECT DISTINCT e.id_estudiante, e.nombre_completo, e.codigo_estudiante, e.grado, e.grupo
            FROM estudiantes e
            JOIN grupo_estudiantes ge ON e.id_estudiante = ge.id_estudiante
            JOIN grupos g ON ge.id_grupo = g.id_grupo
            JOIN grupo_materias gm ON g.id_grupo = gm.id_grupo
            WHERE gm.id_docente = %s AND e.id_estudiante = %s AND e.estado = 'activo'
        """, (id_docente, id_estudiante))
        return [dict(e) for e in cur.fetchall()]

    query = """
        SELECT DISTINCT e.id_estudiante, e.nombre_completo, e.codigo_estudiante, e.grado, e.grupo
        FROM estudiantes e
        JOIN grupo_estudiantes ge ON e.id_estudiante = ge.id_estudiante
        JOIN grupos g ON ge.id_grupo = g.id_grupo
        JOIN grupo_materias gm ON g.id_grupo = gm.id_grupo
        WHERE gm.id_docente = %s AND e.estado = 'activo'
    """
    params = [id_docente]
    if id_grupo:
        if not _profesor_puede_grupo(cur, id_docente, id_grupo):
            return None
        query += " AND g.id_grupo = %s"
        params.append(id_grupo)
    query += " ORDER BY e.grado, e.grupo, e.nombre_completo"
    cur.execute(query, tuple(params))
    return [dict(e) for e in cur.fetchall()]


@app.route('/profesor/reporte/pdf')
def profesor_reporte_pdf():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    id_grupo = request.args.get('id_grupo', type=int)
    id_estudiante = request.args.get('id_estudiante', type=int)
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute("SELECT nombre_completo, codigo_profesor FROM profesores WHERE id_profesor = %s", (user_info['id'],))
        profesor = dict(cur.fetchone())

        estudiantes = _profesor_estudiantes_para_reporte(
            cur, user_info['id'], id_grupo=id_grupo, id_estudiante=id_estudiante
        )
        if estudiantes is None:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "Grupo no asignado."}), 403

        if not estudiantes:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "No hay estudiantes para el filtro seleccionado."}), 404

        pdf = _pdf_for_colegio(user_info.get('id_colegio'))
        for est in estudiantes:
            _pdf_agregar_estudiante(pdf, cur, est, profesor, user_info['id'])

        cur.close()
        conn.close()

        nombre_prof = profesor['nombre_completo'].replace(' ', '_')
        sufijo = ''
        if id_estudiante and len(estudiantes) == 1:
            sufijo = f"_{estudiantes[0]['codigo_estudiante']}"
        elif id_grupo:
            sufijo = '_grupo'
        return send_file(
            _pdf_to_bytesio(pdf),
            as_attachment=True,
            download_name=f'reporte{sufijo}_{nombre_prof}.pdf',
            mimetype='application/pdf',
        )
    except Exception as e:
        print(f"Error generando PDF profesor: {e}")
        return _api_error_response(e)


@app.route('/profesor/reporte/<int:id_estudiante>/pdf')
def profesor_reporte_estudiante_pdf(id_estudiante):
    """PDF del reporte de un solo estudiante asignado al profesor."""
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT nombre_completo, codigo_profesor FROM profesores WHERE id_profesor = %s", (user_info['id'],))
        profesor = dict(cur.fetchone())
        estudiantes = _profesor_estudiantes_para_reporte(
            cur, user_info['id'], id_estudiante=id_estudiante
        )
        if not estudiantes:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "Estudiante no encontrado o no asignado."}), 404
        est = estudiantes[0]
        pdf = _pdf_for_colegio(user_info.get('id_colegio'))
        _pdf_agregar_estudiante(pdf, cur, est, profesor, user_info['id'])
        cur.close()
        conn.close()
        codigo = str(est['codigo_estudiante']).replace(' ', '_')
        return send_file(
            _pdf_to_bytesio(pdf),
            as_attachment=True,
            download_name=f'reporte_{codigo}.pdf',
            mimetype='application/pdf',
        )
    except Exception as e:
        print(f"Error generando PDF estudiante profesor: {e}")
        return _api_error_response(e)

#########obtiene el listado de estudiantes activos asociados a una materia y grupo específico del profesor, incluyendo id, código, nombre, grado y grupo#####
#
@app.route('/profesor/estudiantes-por-materia/<int:id_grupo_materia>')
def estudiantes_por_materia(id_grupo_materia):
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT DISTINCT e.id_estudiante, e.nombre_completo, e.codigo_estudiante, e.grado, e.grupo
            FROM estudiantes e
            JOIN grupo_estudiantes ge ON e.id_estudiante = ge.id_estudiante
            JOIN grupos g ON ge.id_grupo = g.id_grupo
            JOIN grupo_materias gm ON g.id_grupo = gm.id_grupo
            WHERE gm.id_grupo_materia = %s AND gm.id_docente = %s AND e.estado = 'activo'
            ORDER BY e.nombre_completo
        """, (id_grupo_materia, user_info['id']))
        estudiantes = [dict(e) for e in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": estudiantes})
    except Exception as e:
        return _api_error_response(e)

###########permite registrar múltiples notas en lote para varios estudiantes, guardando valor, descripción, tipo de nota y relación con la materia/grupo correspondiente en una sola operación######
#
@app.route('/profesor/subir-notas-masivo', methods=['POST'])
def subir_notas_masivo():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    notas = data.get('notas', [])
    if not notas:
        return jsonify({"status": "error", "message": "No hay notas para guardar."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        guardadas = 0
        for n in notas:
            if not n.get('valor') or not n.get('id_estudiante'):
                continue
            cur.execute("""
                INSERT INTO notas (id_estudiante, valor, descripcion, id_tipo, id_grupo_materia)
                VALUES (%s, %s, %s, %s, %s)
            """, (n['id_estudiante'], n['valor'], n.get('descripcion',''), n['id_tipo'], n['id_grupo_materia']))
            guardadas += 1
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": f"{guardadas} nota(s) guardadas exitosamente."})
    except Exception as e:
        return _api_error_response(e)


# ── ASISTENCIA ──

########consulta la asistencia de los estudiantes para una fecha y materia/grupo específico del profesor, devolviendo el estado (presente, ausente, etc.) por estudiante######
#
@app.route('/profesor/asistencia', methods=['GET'])
def ver_asistencia():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    id_grupo_materia = request.args.get('id_grupo_materia')
    fecha = request.args.get('fecha')
    if not id_grupo_materia or not fecha:
        return jsonify({"status": "error", "message": "Faltan parámetros."})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT a.id_estudiante, a.estado
            FROM asistencia a
            WHERE a.id_grupo_materia = %s AND a.fecha = %s AND a.id_profesor = %s
        """, (id_grupo_materia, fecha, user_info['id']))
        registros = {r['id_estudiante']: r['estado'] for r in cur.fetchall()}
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": registros})
    except Exception as e:
        return _api_error_response(e)

###########registra o actualiza la asistencia de múltiples estudiantes en una fecha determinada, guardando el estado de cada uno mediante inserción o actualización automática en la base de datos######
#
@app.route('/profesor/asistencia', methods=['POST'])
def guardar_asistencia():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    id_grupo_materia = data.get('id_grupo_materia')
    fecha = data.get('fecha')
    registros = data.get('registros', [])
    if not id_grupo_materia or not fecha or not registros:
        return jsonify({"status": "error", "message": "Faltan datos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        for r in registros:
            cur.execute("""
                INSERT INTO asistencia (id_estudiante, id_grupo_materia, id_profesor, fecha, estado)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id_estudiante, id_grupo_materia, fecha)
                DO UPDATE SET estado = EXCLUDED.estado
            """, (r['id_estudiante'], id_grupo_materia, user_info['id'], fecha, r['estado']))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": f"Asistencia del {fecha} guardada."})
    except Exception as e:
        return _api_error_response(e)


# ── MATERIAL DE CLASE ──

#obtiene el listado de materiales de clase subidos por el profesor, con título, descripción, tipo, archivo o enlace, fecha de subida y opción de filtrar por materia/grupo específico######
#
@app.route('/profesor/material', methods=['GET'])
def ver_material():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    id_grupo_materia = request.args.get('id_grupo_materia')
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        query = """
            SELECT id_material, titulo, descripcion, tipo, url_o_nombre,
                   TO_CHAR(fecha_subida, 'DD/MM/YYYY') as fecha_subida,
                   id_grupo_materia
            FROM material_clase
            WHERE id_profesor = %s
        """
        params = [user_info['id']]
        if id_grupo_materia:
            query += " AND id_grupo_materia = %s"
            params.append(id_grupo_materia)
        query += " ORDER BY fecha_subida DESC"
        cur.execute(query, params)
        materiales = [dict(m) for m in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": materiales})
    except Exception as e:
        return _api_error_response(e)

########permite al profesor subir material de clase registrando título, descripción, tipo (archivo o enlace), recurso (URL o nombre) y la materia/grupo al que pertenece, guardándolo en el sistema para su posterior consulta########
#
@app.route('/profesor/material', methods=['POST'])
def subir_material():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401

    titulo          = request.form.get('titulo') or (request.get_json() or {}).get('titulo')
    descripcion     = request.form.get('descripcion', '')
    tipo            = request.form.get('tipo', 'enlace')
    url_o_nombre    = request.form.get('url_o_nombre', '')
    id_grupo_materia= request.form.get('id_grupo_materia')

    # Si viene como JSON (enlace/video/otro)
    if request.is_json:
        data         = request.get_json()
        titulo       = data.get('titulo')
        descripcion  = data.get('descripcion', '')
        tipo         = data.get('tipo', 'enlace')
        url_o_nombre = data.get('url_o_nombre')
        id_grupo_materia = data.get('id_grupo_materia')

    # Si vino archivo
    archivo = request.files.get('archivo')
    if archivo and archivo.filename:
        if not allowed_file(archivo.filename):
            return jsonify({"status": "error", "message": "Tipo de archivo no permitido."})
        filename = secure_filename(archivo.filename)
        # Nombre único para evitar colisiones
        import uuid
        filename = f"{uuid.uuid4().hex}_{filename}"
        archivo.save(os.path.join(UPLOAD_FOLDER, filename))
        url_o_nombre = f"/material/archivo/{filename}"
        tipo = 'archivo'

    if not all([titulo, url_o_nombre, id_grupo_materia]):
        return jsonify({"status": "error", "message": "Título, recurso y materia son requeridos."})

    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO material_clase (id_profesor, id_grupo_materia, titulo, descripcion, tipo, url_o_nombre)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id_material
        """, (user_info['id'], id_grupo_materia, titulo, descripcion, tipo, url_o_nombre))
        id_mat = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Material agregado.", "id_material": id_mat})
    except Exception as e:
        return _api_error_response(e)

@app.route('/material/archivo/<path:filename>')
def servir_material(filename):
    return send_file(os.path.join(UPLOAD_FOLDER, filename), as_attachment=True)

##########elimina un material de clase específico del profesor, validando que le pertenezca antes de borrarlo del sistema##########
#
@app.route('/profesor/material/<int:id_material>', methods=['DELETE'])
def eliminar_material(id_material):
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("SELECT tipo, url_o_nombre FROM material_clase WHERE id_material = %s AND id_profesor = %s",
                    (id_material, user_info['id']))
        row = cur.fetchone()
        if row and row[0] == 'archivo':
            filename = row[1].split('/')[-1]
            path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(path):
                os.remove(path)
        cur.execute("DELETE FROM material_clase WHERE id_material = %s AND id_profesor = %s",
                    (id_material, user_info['id']))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Material eliminado."})
    except Exception as e:
        return _api_error_response(e)

#  RUTAS ADMIN — Períodos, Grupos, Materias, Asignaciones
# Pega este bloque en app.py antes del if __name__



# ══════════════════════════════════════════════════════
#  RUTAS DEL ESTUDIANTE
# ══════════════════════════════════════════════════════

def get_estudiante_info():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'estudiante':
        return None
    return user_info

##########obtiene todas las notas del estudiante con valor, descripción, fecha, tipo, materia y profeso#########
#
@app.route('/estudiante/notas')
def estudiante_notas():
    u = get_estudiante_info()
    if not u: return jsonify({"status":"error","message":"No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT n.id_nota, n.valor, n.descripcion,
                   TO_CHAR(n.fecha_registro,'DD/MM/YYYY') as fecha,
                   tn.nombre_tipo,
                   m.nombre as materia,
                   p.nombre_completo as profesor
            FROM notas n
            JOIN tipos_nota tn ON n.id_tipo = tn.id_tipo
            JOIN grupo_materias gm ON n.id_grupo_materia = gm.id_grupo_materia
            JOIN materia m ON gm.id_materia = m.id_materia
            JOIN profesores p ON gm.id_docente = p.id_profesor
            WHERE n.id_estudiante = %s
            ORDER BY m.nombre, n.fecha_registro DESC
        """, (u['id'],))
        notas = [dict(n) for n in cur.fetchall()]
        for n in notas: n['valor'] = float(n['valor'])
        cur.close(); conn.close()
        return jsonify({"status":"success","data":notas})
    except Exception as e:
        return _api_error_response(e)

#############muestra el rendimiento por materia incluyendo promedio, cantidad de notas, nota máxima y mínima ordenado por mejor desempeño######
#
@app.route('/estudiante/desempeno')
def estudiante_desempeno():
    u = get_estudiante_info()
    if not u: return jsonify({"status":"error","message":"No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT m.nombre as materia,
                   ROUND(AVG(n.valor)::numeric, 2) as promedio,
                   COUNT(n.id_nota) as total_notas,
                   MAX(n.valor) as nota_max,
                   MIN(n.valor) as nota_min
            FROM notas n
            JOIN grupo_materias gm ON n.id_grupo_materia = gm.id_grupo_materia
            JOIN materia m ON gm.id_materia = m.id_materia
            WHERE n.id_estudiante = %s
            GROUP BY m.nombre
            ORDER BY promedio DESC
        """, (u['id'],))
        data = [dict(r) for r in cur.fetchall()]
        for r in data:
            r['promedio'] = float(r['promedio'])
            r['nota_max'] = float(r['nota_max'])
            r['nota_min'] = float(r['nota_min'])
        cur.close(); conn.close()
        return jsonify({"status":"success","data":data})
    except Exception as e:
        return _api_error_response(e)

###########obtiene el historial de asistencia del estudiante con fecha, estado, materia y profesor, además de un resumen por materia (presentes, ausentes, tardanzas y justificados)##########
#
@app.route('/estudiante/asistencia')
def estudiante_asistencia():
    u = get_estudiante_info()
    if not u: return jsonify({"status":"error","message":"No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT a.estado,
                   TO_CHAR(a.fecha,'DD/MM/YYYY') as fecha,
                   a.fecha as fecha_raw,
                   m.nombre as materia,
                   p.nombre_completo as profesor
            FROM asistencia a
            JOIN grupo_materias gm ON a.id_grupo_materia = gm.id_grupo_materia
            JOIN materia m ON gm.id_materia = m.id_materia
            JOIN profesores p ON gm.id_docente = p.id_profesor
            WHERE a.id_estudiante = %s
            ORDER BY a.fecha DESC, m.nombre
        """, (u['id'],))
        registros = [dict(r) for r in cur.fetchall()]
        for r in registros: r.pop('fecha_raw', None)

        # Resumen por materia
        cur.execute("""
            SELECT m.nombre as materia,
                   COUNT(*) as total,
                   COUNT(CASE WHEN a.estado='presente' THEN 1 END) as presentes,
                   COUNT(CASE WHEN a.estado='ausente' THEN 1 END) as ausentes,
                   COUNT(CASE WHEN a.estado='tardanza' THEN 1 END) as tardanzas,
                   COUNT(CASE WHEN a.estado='justificado' THEN 1 END) as justificados
            FROM asistencia a
            JOIN grupo_materias gm ON a.id_grupo_materia = gm.id_grupo_materia
            JOIN materia m ON gm.id_materia = m.id_materia
            WHERE a.id_estudiante = %s
            GROUP BY m.nombre ORDER BY m.nombre
        """, (u['id'],))
        resumen = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status":"success","data":registros,"resumen":resumen})
    except Exception as e:
        return _api_error_response(e)

########muestra los materiales de clase disponibles para el estudiante con título, descripción, tipo, recurso, fecha, materia y profesor#
#
@app.route('/estudiante/material')
def estudiante_material():
    u = get_estudiante_info()
    if not u: return jsonify({"status":"error","message":"No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT mc.id_material, mc.titulo, mc.descripcion, mc.tipo,
                   mc.url_o_nombre,
                   TO_CHAR(mc.fecha_subida,'DD/MM/YYYY') as fecha_subida,
                   m.nombre as materia,
                   p.nombre_completo as profesor
            FROM material_clase mc
            JOIN grupo_materias gm ON mc.id_grupo_materia = gm.id_grupo_materia
            JOIN materia m ON gm.id_materia = m.id_materia
            JOIN profesores p ON gm.id_docente = p.id_profesor
            JOIN grupos g ON gm.id_grupo = g.id_grupo
            JOIN grupo_estudiantes ge ON g.id_grupo = ge.id_grupo
            WHERE ge.id_estudiante = %s
            ORDER BY mc.fecha_subida DESC
        """, (u['id'],))
        materiales = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status":"success","data":materiales})
    except Exception as e:
        return _api_error_response(e)

######obtiene las observaciones del estudiante con tipo, descripción, fecha y profesor que la registró#########
#
@app.route('/estudiante/observador')
def estudiante_observador():
    u = get_estudiante_info()
    if not u: return jsonify({"status":"error","message":"No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT o.tipo, o.descripcion,
                   TO_CHAR(o.fecha_registro,'DD/MM/YYYY') as fecha,
                   p.nombre_completo as profesor
            FROM observador o
            JOIN profesores p ON o.id_profesor = p.id_profesor
            WHERE o.id_estudiante = %s
            ORDER BY o.fecha_registro DESC
        """, (u['id'],))
        obs = [dict(o) for o in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status":"success","data":obs})
    except Exception as e:
        return _api_error_response(e)

########eventos de agenda compartidos por profesores con los grupos del estudiante#########
#
@app.route('/estudiante/agenda')
def estudiante_agenda():
    u = get_estudiante_info()
    if not u:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        ensure_agenda_grupos_table()
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT DISTINCT a.id_agenda, a.titulo, a.descripcion, a.fecha_evento,
                   a.hora_inicio, a.hora_fin, a.estado,
                   p.nombre_completo AS profesor
            FROM agenda a
            JOIN agenda_grupos ag ON a.id_agenda = ag.id_agenda
            JOIN grupo_estudiantes ge ON ag.id_grupo = ge.id_grupo
            JOIN profesores p ON a.id_profesor = p.id_profesor
            WHERE ge.id_estudiante = %s
              AND a.estado IN ('pendiente', 'completado')
            ORDER BY a.fecha_evento ASC, a.hora_inicio ASC NULLS LAST
        """, (u['id'],))
        eventos = [dict(e) for e in cur.fetchall()]
        for e in eventos:
            e['fecha_evento'] = str(e['fecha_evento'])
            e['hora_inicio'] = str(e['hora_inicio']) if e['hora_inicio'] else None
            e['hora_fin'] = str(e['hora_fin']) if e['hora_fin'] else None
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": eventos})
    except Exception as e:
        return _api_error_response(e)

##########permite a estudiantes o profesores cambiar su contraseña validando la actual y guardando la nueva de forma segura en el sistema############
#
@app.route('/change-password', methods=['POST'])
def change_password():
    user_info = session.get('user_info')
    if not user_info:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    if not current_password or not new_password:
        return jsonify({"status": "error", "message": "Faltan campos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        tipo = user_info.get('tipo')
        if tipo == 'estudiante':
            cur.execute("SELECT contrasena FROM estudiantes WHERE id_estudiante = %s", (user_info['id'],))
        elif tipo == 'profesor':
            cur.execute("SELECT contrasena FROM profesores WHERE id_profesor = %s", (user_info['id'],))
        else:
            return jsonify({"status": "error", "message": "Tipo no válido."})
        row = cur.fetchone()
        if not row or not bcrypt.checkpw(current_password.encode(), row[0].encode()):
            return jsonify({"status": "error", "message": "Contraseña actual incorrecta."})
        hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        if tipo == 'estudiante':
            cur.execute("UPDATE estudiantes SET contrasena=%s WHERE id_estudiante=%s", (hashed, user_info['id']))
        else:
            cur.execute("UPDATE profesores SET contrasena=%s WHERE id_profesor=%s", (hashed, user_info['id']))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Contraseña actualizada exitosamente."})
    except Exception as e:
        return _api_error_response(e)

###########permite a estudiantes o profesores actualizar su nombre completo y correo electrónico, guardando los cambios en la base de datos y actualizando la sesión activa########
#
@app.route('/update-profile', methods=['POST'])
def update_profile():
    data = request.get_json()
    fullname = data.get('fullname', '').strip()
    email = data.get('email', '').strip()
    if not fullname:
        return jsonify({"status": "error", "message": "El nombre es requerido."})

    user_info = session.get('user_info')
    user_id   = session.get('user_id')

    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        if user_info:
            tipo = user_info.get('tipo')
            if tipo == 'estudiante':
                cur.execute("UPDATE estudiantes SET nombre_completo=%s, correo_electronico=%s WHERE id_estudiante=%s",
                            (fullname, email, user_info['id']))
            elif tipo == 'profesor':
                cur.execute("UPDATE profesores SET nombre_completo=%s, correo_electronico=%s WHERE id_profesor=%s",
                            (fullname, email, user_info['id']))
            session['user_info']['nombre'] = fullname
        elif user_id:
            cur.execute("UPDATE administradores SET nombre_completo=%s, correo_electronico=%s WHERE id_admin=%s",
                        (fullname, email, user_id))
            session['user_name'] = fullname
        else:
            return jsonify({"status": "error", "message": "No autorizado"}), 401

        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Perfil actualizado."})
    except Exception as e:
        return _api_error_response(e)

# ── FIN RUTAS ESTUDIANTE ──

##########obtiene el listado de períodos académicos registrados en el sistema, incluyendo id, nombre, fecha de inicio y fecha de finalización formateadas, ordenados de forma descendente según la fecha de inicio#######
#
@app.route('/admin/periodos', methods=['GET'])
def get_periodos():
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(
            f"SELECT id_periodo, nombre, TO_CHAR(fecha_inicio,'DD/MM/YYYY') as fecha_inicio, "
            f"TO_CHAR(fecha_fin,'DD/MM/YYYY') as fecha_fin FROM periodo_academico WHERE 1=1 {filt} "
            f"ORDER BY fecha_inicio DESC",
            params,
        )
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        print(f"Error periodos: {e}")
        return _api_error_response(e)

###########permite crear un nuevo período académico validando los campos requeridos (nombre, fecha_inicio, fecha_fin) y almacenándolo en la base de datos, retornando el id del período creado junto con un mensaje de confirmación#########
#
@app.route('/admin/periodos', methods=['POST'])
def crear_periodo():
    admin, err = _require_admin_api()
    if err:
        return err
    id_colegio = _admin_colegio_id(admin)
    if not id_colegio:
        return jsonify({"status": "error", "message": "Solo admin de colegio puede crear períodos."})
    data = request.get_json()
    nombre = data.get('nombre')
    fecha_inicio = data.get('fecha_inicio')
    fecha_fin = data.get('fecha_fin')
    if not all([nombre, fecha_inicio, fecha_fin]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO periodo_academico (nombre, fecha_inicio, fecha_fin, id_colegio) VALUES (%s,%s,%s,%s) RETURNING id_periodo",
            (nombre, fecha_inicio, fecha_fin, id_colegio),
        )
        id_periodo = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Período creado exitosamente!", "id_periodo": id_periodo})
    except Exception as e:
        print(f"Error creando período: {e}")
        return _api_error_response(e)

###########obtiene todos los grupos registrados junto con su período académico asociado mediante un LEFT JOIN, retornando id del grupo, nombre y nombre del período, ordenados de forma descendente######
#
@app.route('/admin/grupos', methods=['GET'])
def get_grupos():
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin, alias='g')
        cur.execute(f"""
            SELECT g.id_grupo, g.nombre, p.nombre as periodo
            FROM grupos g
            LEFT JOIN periodo_academico p ON g.id_periodo = p.id_periodo
            WHERE 1=1 {filt}
            ORDER BY g.id_grupo DESC
        """, params)
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)

########permite crear un nuevo grupo validando los campos obligatorios (nombre e id_periodo), insertándolo en la base de datos y devolviendo el id del grupo creado junto con un mensaje de confirmación########
#
@app.route('/admin/grupos', methods=['POST'])
def crear_grupo():
    admin, err = _require_admin_api()
    if err:
        return err
    id_colegio = _admin_colegio_id(admin)
    if not id_colegio:
        return jsonify({"status": "error", "message": "Solo admin de colegio puede crear grupos."})
    data = request.get_json()
    nombre = data.get('nombre')
    id_periodo = data.get('id_periodo')
    if not all([nombre, id_periodo]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM periodo_academico WHERE id_periodo = %s AND id_colegio = %s",
            (id_periodo, id_colegio),
        )
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "Período no pertenece a tu colegio."})
        cur.execute(
            "INSERT INTO grupos (nombre, id_periodo, id_colegio) VALUES (%s,%s,%s) RETURNING id_grupo",
            (nombre, id_periodo, id_colegio),
        )
        id_grupo = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Grupo creado exitosamente!", "id_grupo": id_grupo})
    except Exception as e:
        return _api_error_response(e)

#########obtiene el total de grupos registrados en el sistema mediante una consulta COUNT(*) sobre la tabla grupos, retornando la cantidad como dato numérico########
#
@app.route('/admin/grupos-count', methods=['GET'])
def grupos_count():
    admin, err = _require_admin_api()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        filt, params = colegio_filter_sql(admin)
        cur.execute(f"SELECT COUNT(*) FROM grupos WHERE 1=1 {filt}", params)
        count = cur.fetchone()[0]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": count})
    except Exception as e:
        return _api_error_response(e)

###########lista todas las materias registradas mostrando id, nombre y código, ordenadas alfabéticamente por nombre para facilitar su visualización y selección######
#
@app.route('/admin/materias', methods=['GET'])
def get_materias():
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(f"SELECT id_materia, nombre, codigo FROM materia WHERE 1=1 {filt} ORDER BY nombre", params)
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)

#############permite crear una nueva materia validando el campo obligatorio nombre y un código opcional, insertándola en la base de datos y retornando el id generado, manejando además errores de duplicidad en el código#######
#
@app.route('/admin/materias', methods=['POST'])
def crear_materia():
    admin, err = _require_admin_api()
    if err:
        return err
    id_colegio = _admin_colegio_id(admin)
    if not id_colegio:
        return jsonify({"status": "error", "message": "Solo admin de colegio puede crear materias."})
    data = request.get_json()
    nombre = data.get('nombre')
    codigo = data.get('codigo') or None
    if not nombre:
        return jsonify({"status": "error", "message": "El nombre es requerido."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if codigo:
            cur.execute(
                "SELECT 1 FROM materia WHERE id_colegio = %s AND codigo = %s",
                (id_colegio, codigo),
            )
            if cur.fetchone():
                cur.close()
                conn.close()
                return jsonify({"status": "error", "message": "El código ya existe en este colegio."})
        cur.execute(
            "INSERT INTO materia (nombre, codigo, id_colegio) VALUES (%s,%s,%s) RETURNING id_materia",
            (nombre, codigo, id_colegio),
        )
        id_materia = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Materia creada exitosamente!", "id_materia": id_materia})
    except psycopg2.Error as e:
        if "unique" in str(e).lower():
            return jsonify({"status": "error", "message": "El código ya existe."})
        return _api_error_response(e)
    except Exception as e:
        return _api_error_response(e)

##########obtiene el total de materias registradas mediante una consulta COUNT(*) sobre la tabla materia, retornando la cantidad como dato numérico##########
#
@app.route('/admin/materias-count', methods=['GET'])
def materias_count():
    admin, err = _require_admin_api()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        filt, params = colegio_filter_sql(admin)
        cur.execute(f"SELECT COUNT(*) FROM materia WHERE 1=1 {filt}", params)
        count = cur.fetchone()[0]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": count})
    except Exception as e:
        return _api_error_response(e)

###obtiene todas las asignaciones de materias a grupos y profesores mediante múltiples JOINs, retornando id de la asignación, nombre del profesor, grupo y materia, organizados por grupo y materia para una mejor visualización###
#
@app.route('/admin/asignaciones', methods=['GET'])
def get_asignaciones():
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin, alias='g')
        cur.execute(f"""
            SELECT gm.id_grupo_materia, p.nombre_completo as profesor,
                   g.nombre as grupo, m.nombre as materia
            FROM grupo_materias gm
            JOIN profesores p ON gm.id_docente = p.id_profesor
            JOIN grupos g ON gm.id_grupo = g.id_grupo
            JOIN materia m ON gm.id_materia = m.id_materia
            WHERE 1=1 {filt}
            ORDER BY g.nombre, m.nombre
        """, params)
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)

####permite crear una nueva asignación validando los campos obligatorios (id_docente, id_grupo, id_materia), insertándola en la tabla grupo_materias y retornando el id generado, incluyendo manejo de errores en caso de asignaciones duplicadas####
#
@app.route('/admin/asignaciones', methods=['POST'])
def crear_asignacion():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    data = request.get_json()
    id_docente = data.get('id_docente')
    id_grupo = data.get('id_grupo')
    id_materia = data.get('id_materia')
    if not all([id_docente, id_grupo, id_materia]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT 1 FROM profesores p
            JOIN grupos g ON g.id_colegio = p.id_colegio
            JOIN materia m ON m.id_colegio = p.id_colegio
            WHERE p.id_profesor = %s AND g.id_grupo = %s AND m.id_materia = %s AND p.id_colegio = %s
        """, (id_docente, id_grupo, id_materia, id_colegio))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "Profesor, grupo o materia no pertenecen a tu colegio."})
        cur.execute(
            "INSERT INTO grupo_materias (id_grupo, id_materia, id_docente) VALUES (%s,%s,%s) RETURNING id_grupo_materia",
            (id_grupo, id_materia, id_docente)
        )
        id_gm = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Asignación creada exitosamente!", "id_grupo_materia": id_gm})
    except psycopg2.Error as e:
        if "unique" in str(e).lower():
            return jsonify({"status": "error", "message": "Esta asignación ya existe."})
        return _api_error_response(e)
    except Exception as e:
        return _api_error_response(e)

#####permite eliminar una asignación específica entre grupo, materia y profesor mediante su id, ejecutando una eliminación directa en la tabla grupo_materias y retornando un mensaje de confirmación#####
#
@app.route('/admin/asignaciones/<int:id_grupo_materia>', methods=['DELETE'])
def eliminar_asignacion(id_grupo_materia):
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM grupo_materias gm
            USING grupos g
            WHERE gm.id_grupo_materia = %s AND gm.id_grupo = g.id_grupo AND g.id_colegio = %s
        """, (id_grupo_materia, id_colegio))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Asignación eliminada."})
    except Exception as e:
        return _api_error_response(e)

#####asigna un estudiante a un grupo validando los campos requeridos (id_estudiante, id_grupo), insertándolo en la tabla grupo_estudiantes con control de duplicados mediante ON CONFLICT DO NOTHING para evitar registros repetidos####
#
@app.route('/admin/asignar-estudiante', methods=['POST'])
def asignar_estudiante_grupo():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    data = request.get_json()
    id_estudiante = data.get('id_estudiante')
    id_grupo = data.get('id_grupo')
    if not all([id_estudiante, id_grupo]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT 1 FROM estudiantes e JOIN grupos g ON g.id_colegio = e.id_colegio
            WHERE e.id_estudiante = %s AND g.id_grupo = %s AND e.id_colegio = %s
        """, (id_estudiante, id_grupo, id_colegio))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "Estudiante o grupo no pertenecen a tu colegio."})
        cur.execute(
            "INSERT INTO grupo_estudiantes (id_grupo, id_estudiante) VALUES (%s,%s) ON CONFLICT DO NOTHING",
            (id_grupo, id_estudiante)
        )
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Estudiante asignado al grupo exitosamente!"})
    except Exception as e:
        return _api_error_response(e)

####permite eliminar la relación entre un estudiante y un grupo específico validando id_estudiante e id_grupo, eliminando el registro correspondiente en la tabla grupo_estudiantes y retornando un mensaje de confirmación#####
#
@app.route('/admin/quitar-estudiante', methods=['POST'])
def quitar_estudiante_grupo():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    data = request.get_json()
    id_estudiante = data.get('id_estudiante')
    id_grupo = data.get('id_grupo')
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM grupo_estudiantes ge
            USING grupos g, estudiantes e
            WHERE ge.id_grupo = %s AND ge.id_estudiante = %s
              AND ge.id_grupo = g.id_grupo AND ge.id_estudiante = e.id_estudiante
              AND g.id_colegio = %s AND e.id_colegio = %s
        """, (id_grupo, id_estudiante, id_colegio, id_colegio))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Estudiante quitado del grupo."})
    except Exception as e:
        return _api_error_response(e)

####obtiene el listado de estudiantes pertenecientes a un grupo específico mediante un JOIN entre estudiantes y grupo_estudiantes, retornando id, código y nombre completo, ordenados alfabéticamente para facilitar su visualización####
#
@app.route('/admin/grupo/<int:id_grupo>/estudiantes', methods=['GET'])
def get_estudiantes_grupo(id_grupo):
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin, alias='e')
        cur.execute(f"""
            SELECT e.id_estudiante, e.codigo_estudiante, e.nombre_completo
            FROM estudiantes e
            JOIN grupo_estudiantes ge ON e.id_estudiante = ge.id_estudiante
            JOIN grupos g ON ge.id_grupo = g.id_grupo
            WHERE ge.id_grupo = %s {filt}
            ORDER BY e.nombre_completo
        """, (id_grupo, *params))
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)

#######obtiene el listado de administradores registrados en el sistema mostrando id, nombre completo, correo electrónico y estado de verificación de email, ordenados por id para una gestión organizada####
#

@app.route('/admin/administradores', methods=['GET'])
def get_administradores():
    admin, err = _require_admin_api()
    if err:
        return err
    if is_superadmin(admin):
        return jsonify({"status": "success", "data": []})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        filt, params = colegio_filter_sql(admin)
        cur.execute(
            f"SELECT id_admin, nombre_completo, correo_electronico, email_verified, rol "
            f"FROM administradores WHERE 1=1 {filt} ORDER BY id_admin",
            params,
        )
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)

###permite eliminar un administrador específico mediante su id, validando previamente que no sea el mismo usuario en sesión para evitar auto-eliminación, y ejecutando la eliminación en la base de datos con confirmación de éxito######
#
@app.route('/admin/administradores/<int:id_admin>', methods=['DELETE'])
def eliminar_administrador(id_admin):
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    if id_admin == session['user_id']:
        return jsonify({"status": "error", "message": "No puedes eliminarte a ti mismo."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id_admin FROM administradores WHERE id_admin = %s AND id_colegio = %s",
            (id_admin, id_colegio),
        )
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "Administrador no encontrado en tu colegio."})
        cur.execute("DELETE FROM solicitudes_cambio_contrasena WHERE id_admin = %s", (id_admin,))
        cur.execute("DELETE FROM administradores WHERE id_admin = %s AND id_colegio = %s", (id_admin, id_colegio))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Administrador eliminado."})
    except Exception as e:
        return _api_error_response(e)


# ── MULTICOLEGIO ──

@app.route('/api/colegios', methods=['GET'])
def api_buscar_colegios():
    """Búsqueda pública de colegios por nombre o código (login estudiante/profesor)."""
    q = (request.args.get('q') or '').strip()
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        if q:
            cur.execute("""
                SELECT id_colegio, codigo_colegio, nombre_oficial, lema, escudo_url
                FROM colegios
                WHERE estado = 'activo'
                  AND (nombre_oficial ILIKE %s OR codigo_colegio ILIKE %s)
                ORDER BY nombre_oficial
                LIMIT 20
            """, (f'%{q}%', f'%{q}%'))
        else:
            cur.execute("""
                SELECT id_colegio, codigo_colegio, nombre_oficial, lema, escudo_url
                FROM colegios WHERE estado = 'activo' ORDER BY nombre_oficial LIMIT 50
            """)
        data = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)


@app.route('/api/colegio/branding', methods=['GET'])
def api_colegio_branding():
    """Branding del colegio del usuario en sesión."""
    id_colegio = None
    user_info = session.get('user_info')
    if user_info:
        id_colegio = user_info.get('id_colegio')
    elif session.get('id_colegio'):
        id_colegio = session.get('id_colegio')
    if not id_colegio:
        return jsonify({"status": "error", "message": "Sin colegio en sesión."}), 400
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT id_colegio, codigo_colegio, nombre_oficial, lema,
                   escudo_url, encabezado_pdf_url, marca_agua_url,
                   color_primario, color_secundario
            FROM colegios WHERE id_colegio = %s AND estado = 'activo'
        """, (id_colegio,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return jsonify({"status": "error", "message": "Colegio no encontrado."}), 404
        return jsonify({"status": "success", "data": dict(row)})
    except Exception as e:
        return _api_error_response(e)


@app.route('/admin/colegios', methods=['GET'])
def admin_listar_colegios():
    admin, err = _require_superadmin_api()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT c.id_colegio, c.codigo_colegio, c.nombre_oficial, c.lema, c.estado,
                   c.color_primario, c.color_secundario, c.escudo_url,
                   (SELECT COUNT(*) FROM estudiantes e WHERE e.id_colegio = c.id_colegio) AS total_estudiantes,
                   (SELECT COUNT(*) FROM profesores p WHERE p.id_colegio = c.id_colegio) AS total_profesores,
                   (SELECT COUNT(*) FROM administradores a WHERE a.id_colegio = c.id_colegio) AS total_admins
            FROM colegios c
            ORDER BY c.id_colegio
        """)
        data = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)


@app.route('/admin/colegios', methods=['POST'])
def admin_crear_colegio():
    admin, err = _require_superadmin_api()
    if err:
        return err
    data = request.get_json() or {}
    nombre = (data.get('nombre_oficial') or '').strip()
    lema = (data.get('lema') or '').strip()
    admin_nombre = (data.get('admin_nombre') or '').strip()
    admin_email = (data.get('admin_email') or '').strip()
    admin_password = data.get('admin_password') or ''
    codigo = (data.get('codigo_colegio') or '').strip() or None
    if not all([nombre, admin_nombre, admin_email, admin_password]):
        return jsonify({"status": "error", "message": "Nombre del colegio, datos y contraseña del admin son requeridos."})
    if len(admin_password) < 8:
        return jsonify({"status": "error", "message": "La contraseña del admin debe tener al menos 8 caracteres."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_admin FROM administradores WHERE correo_electronico = %s", (admin_email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "El correo del admin ya está registrado."})
        result = crear_colegio_con_admin(
            cur, nombre, lema, admin_nombre, admin_email, admin_password, codigo_colegio=codigo,
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({
            "status": "success",
            "message": f"Colegio creado con código {result['codigo_colegio']}.",
            "data": result,
        })
    except psycopg2.Error as e:
        if 'unique' in str(e).lower():
            return jsonify({"status": "error", "message": "El código de colegio ya existe."})
        return _api_error_response(e)
    except Exception as e:
        return _api_error_response(e)


@app.route('/admin/superadmins', methods=['POST'])
def admin_crear_superadmin():
    admin, err = _require_superadmin_api()
    if err:
        return err
    data = request.get_json() or {}
    nombre = (data.get('nombre') or '').strip()
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''
    if not all([nombre, email, password]):
        return jsonify({"status": "error", "message": "Nombre, correo y contraseña son requeridos."})
    if len(password) < 8:
        return jsonify({"status": "error", "message": "La contraseña debe tener al menos 8 caracteres."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_admin FROM administradores WHERE correo_electronico = %s", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "El correo ya está registrado."})
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cur.execute("""
            INSERT INTO administradores (nombre_completo, correo_electronico, contrasena, email_verified, rol, id_colegio)
            VALUES (%s, %s, %s, TRUE, 'superadmin', NULL) RETURNING id_admin
        """, (nombre, email, hashed))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Super administrador creado.", "id_admin": new_id})
    except Exception as e:
        return _api_error_response(e)


@app.route('/admin/colegios/admins', methods=['GET'])
def admin_listar_admins_colegios():
    admin, err = _require_superadmin_api()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT a.id_admin, a.nombre_completo, a.correo_electronico, a.rol, a.email_verified,
                   c.nombre_oficial AS colegio, c.codigo_colegio
            FROM administradores a
            LEFT JOIN colegios c ON a.id_colegio = c.id_colegio
            ORDER BY a.rol, a.nombre_completo
        """)
        data = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return _api_error_response(e)


# ── BRANDING COLEGIO (admin de colegio) ──

@app.route('/admin/colegio/branding', methods=['GET'])
def admin_get_colegio_branding():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    row = _fetch_colegio_branding(id_colegio)
    if not row:
        return jsonify({"status": "error", "message": "Colegio no encontrado."}), 404
    return jsonify({"status": "success", "data": row})


@app.route('/admin/colegio/branding', methods=['PUT'])
def admin_update_colegio_branding():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    data = request.get_json() or {}
    nombre = (data.get('nombre_oficial') or '').strip()
    lema = (data.get('lema') or '').strip()
    color_primario = (data.get('color_primario') or DEFAULT_COLOR_PRIMARIO).strip()
    color_secundario = (data.get('color_secundario') or DEFAULT_COLOR_SECUNDARIO).strip()
    if not nombre:
        return jsonify({"status": "error", "message": "El nombre oficial es requerido."})
    if not re.match(r'^#[0-9A-Fa-f]{6}$', color_primario) or not re.match(r'^#[0-9A-Fa-f]{6}$', color_secundario):
        return jsonify({"status": "error", "message": "Colores inválidos. Use formato #RRGGBB."})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            UPDATE colegios SET nombre_oficial = %s, lema = %s, color_primario = %s, color_secundario = %s
            WHERE id_colegio = %s
            RETURNING id_colegio, codigo_colegio, nombre_oficial, lema,
                      escudo_url, encabezado_pdf_url, marca_agua_url, color_primario, color_secundario
        """, (nombre, lema, color_primario, color_secundario, id_colegio))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Identidad actualizada.", "data": dict(row)})
    except Exception as e:
        return _api_error_response(e)


def _require_superadmin_pdf():
    admin, err = _require_superadmin_api()
    if err:
        return None, err
    return admin, None


@app.route('/admin/reporte/colegios/pdf', methods=['GET'])
def reporte_superadmin_colegios_pdf():
    _, err = _require_superadmin_pdf()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT c.codigo_colegio, c.nombre_oficial, c.lema, c.estado,
                   (SELECT COUNT(*) FROM estudiantes e WHERE e.id_colegio = c.id_colegio) AS estudiantes,
                   (SELECT COUNT(*) FROM profesores p WHERE p.id_colegio = c.id_colegio) AS profesores,
                   (SELECT COUNT(*) FROM administradores a WHERE a.id_colegio = c.id_colegio) AS admins
            FROM colegios c ORDER BY c.id_colegio
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        pdf = ColegioBrandedPDF({'nombre_oficial': 'MiBoletin Plataforma'})
        pdf.add_page()
        pdf.set_font('helvetica', 'B', 14)
        pdf.cell(0, 10, 'Reporte de Colegios', 0, 1, 'C')
        pdf.ln(4)
        pdf.set_font('helvetica', 'B', 9)
        pdf.set_fill_color(0, 51, 102)
        pdf.set_text_color(255, 255, 255)
        for h, w in [('Codigo', 28), ('Nombre', 55), ('Estudiantes', 22), ('Profesores', 22), ('Admins', 18), ('Estado', 20)]:
            pdf.cell(w, 8, h, 1, 0, 'C', fill=True)
        pdf.ln()
        pdf.set_font('helvetica', '', 8)
        pdf.set_text_color(0, 0, 0)
        fill = False
        pdf.set_fill_color(240, 248, 255)
        for r in rows:
            pdf.cell(28, 7, _pdf_sanitize(r['codigo_colegio']), 1, 0, 'L', fill=fill)
            pdf.cell(55, 7, _pdf_sanitize(r['nombre_oficial'])[:32], 1, 0, 'L', fill=fill)
            pdf.cell(22, 7, str(r['estudiantes']), 1, 0, 'C', fill=fill)
            pdf.cell(22, 7, str(r['profesores']), 1, 0, 'C', fill=fill)
            pdf.cell(18, 7, str(r['admins']), 1, 0, 'C', fill=fill)
            pdf.cell(20, 7, _pdf_sanitize(r['estado']), 1, 1, 'C', fill=fill)
            fill = not fill
        return send_file(_pdf_to_bytesio(pdf), as_attachment=True, download_name='reporte_colegios.pdf', mimetype='application/pdf')
    except Exception as e:
        print(f'Error PDF colegios superadmin: {e!r}')
        return _api_error_response(e)


@app.route('/admin/reporte/superadmins/pdf', methods=['GET'])
def reporte_superadmin_superadmins_pdf():
    _, err = _require_superadmin_pdf()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT id_admin, nombre_completo, correo_electronico, email_verified
            FROM administradores WHERE rol = 'superadmin' ORDER BY id_admin
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        pdf = ColegioBrandedPDF({'nombre_oficial': 'MiBoletin Plataforma'})
        pdf.add_page()
        pdf.set_font('helvetica', 'B', 14)
        pdf.cell(0, 10, 'Reporte de Super Administradores', 0, 1, 'C')
        pdf.ln(4)
        pdf.set_font('helvetica', 'B', 9)
        pdf.set_fill_color(0, 51, 102)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(15, 8, 'ID', 1, 0, 'C', fill=True)
        pdf.cell(70, 8, 'Nombre', 1, 0, 'C', fill=True)
        pdf.cell(75, 8, 'Correo', 1, 0, 'C', fill=True)
        pdf.cell(30, 8, 'Verificado', 1, 1, 'C', fill=True)
        pdf.set_font('helvetica', '', 9)
        pdf.set_text_color(0, 0, 0)
        fill = False
        pdf.set_fill_color(240, 248, 255)
        for r in rows:
            pdf.cell(15, 7, str(r['id_admin']), 1, 0, 'C', fill=fill)
            pdf.cell(70, 7, _pdf_sanitize(r['nombre_completo'])[:38], 1, 0, 'L', fill=fill)
            pdf.cell(75, 7, _pdf_sanitize(r['correo_electronico'])[:38], 1, 0, 'L', fill=fill)
            pdf.cell(30, 7, 'Si' if r['email_verified'] else 'No', 1, 1, 'C', fill=fill)
            fill = not fill
        return send_file(_pdf_to_bytesio(pdf), as_attachment=True, download_name='reporte_superadmins.pdf', mimetype='application/pdf')
    except Exception as e:
        print(f'Error PDF superadmins: {e!r}')
        return _api_error_response(e)


@app.route('/admin/reporte/admins-colegio/pdf', methods=['GET'])
def reporte_superadmin_admins_colegio_pdf():
    _, err = _require_superadmin_pdf()
    if err:
        return err
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT a.id_admin, a.nombre_completo, a.correo_electronico, a.email_verified,
                   c.codigo_colegio, c.nombre_oficial AS colegio
            FROM administradores a
            LEFT JOIN colegios c ON a.id_colegio = c.id_colegio
            WHERE a.rol = 'admin_colegio'
            ORDER BY c.nombre_oficial, a.nombre_completo
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        pdf = ColegioBrandedPDF({'nombre_oficial': 'MiBoletin Plataforma'})
        pdf.add_page()
        pdf.set_font('helvetica', 'B', 14)
        pdf.cell(0, 10, 'Reporte de Administradores de Colegio', 0, 1, 'C')
        pdf.ln(4)
        pdf.set_font('helvetica', 'B', 8)
        pdf.set_fill_color(0, 51, 102)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(15, 8, 'ID', 1, 0, 'C', fill=True)
        pdf.cell(50, 8, 'Nombre', 1, 0, 'C', fill=True)
        pdf.cell(55, 8, 'Correo', 1, 0, 'C', fill=True)
        pdf.cell(25, 8, 'Colegio', 1, 0, 'C', fill=True)
        pdf.cell(45, 8, 'Institucion', 1, 0, 'C', fill=True)
        pdf.cell(20, 8, 'Verif.', 1, 1, 'C', fill=True)
        pdf.set_font('helvetica', '', 8)
        pdf.set_text_color(0, 0, 0)
        fill = False
        pdf.set_fill_color(240, 248, 255)
        for r in rows:
            pdf.cell(15, 7, str(r['id_admin']), 1, 0, 'C', fill=fill)
            pdf.cell(50, 7, _pdf_sanitize(r['nombre_completo'])[:28], 1, 0, 'L', fill=fill)
            pdf.cell(55, 7, _pdf_sanitize(r['correo_electronico'])[:30], 1, 0, 'L', fill=fill)
            pdf.cell(25, 7, _pdf_sanitize(r['codigo_colegio'] or '-'), 1, 0, 'C', fill=fill)
            pdf.cell(45, 7, _pdf_sanitize(r['colegio'] or '-')[:26], 1, 0, 'L', fill=fill)
            pdf.cell(20, 7, 'Si' if r['email_verified'] else 'No', 1, 1, 'C', fill=fill)
            fill = not fill
        return send_file(_pdf_to_bytesio(pdf), as_attachment=True, download_name='reporte_admins_colegio.pdf', mimetype='application/pdf')
    except Exception as e:
        print(f'Error PDF admins colegio: {e!r}')
        return _api_error_response(e)


@app.route('/admin/colegio/branding/upload', methods=['POST'])
def admin_upload_colegio_branding():
    admin, id_colegio, err = _require_colegio_admin_api()
    if err:
        return err
    tipo = (request.form.get('tipo') or '').strip()
    file = request.files.get('archivo')
    url, msg = _save_branding_upload(id_colegio, tipo, file)
    if msg:
        return jsonify({"status": "error", "message": msg}), 400
    col_map = {
        'escudo': 'escudo_url',
        'encabezado': 'encabezado_pdf_url',
        'marca_agua': 'marca_agua_url',
    }
    col = col_map[tipo]
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            f"UPDATE colegios SET {col} = %s WHERE id_colegio = %s "
            f"RETURNING id_colegio, codigo_colegio, nombre_oficial, lema, "
            f"escudo_url, encabezado_pdf_url, marca_agua_url, color_primario, color_secundario",
            (url, id_colegio),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Archivo subido.", "data": dict(row)})
    except Exception as e:
        return _api_error_response(e)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5005"))
    app.run(host="0.0.0.0", port=port)
