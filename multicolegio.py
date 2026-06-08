"""Esquema, migración y utilidades multicolegio."""
import os
import re
import bcrypt

DEFAULT_ESCUDO = '/static/branding/default/escudo.png'
DEFAULT_ENCABEZADO = '/static/branding/default/encabezado.png'
DEFAULT_MARCA_AGUA = '/static/branding/default/marca_agua.png'
DEFAULT_COLOR_PRIMARIO = '#003366'
DEFAULT_COLOR_SECUNDARIO = '#3182ce'

_multicolegio_ready = False
MAX_ADMIN_LIDERES = 2


def _column_exists(cur, table, column):
    cur.execute("""
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s AND column_name = %s
    """, (table, column))
    return cur.fetchone() is not None


def _table_exists(cur, table):
    cur.execute("""
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = %s
    """, (table,))
    return cur.fetchone() is not None


def _next_codigo_colegio(cur):
    cur.execute("""
        SELECT codigo_colegio FROM colegios
        WHERE codigo_colegio ~ '^COL-[0-9]+$'
        ORDER BY CAST(SUBSTRING(codigo_colegio FROM 5) AS INTEGER) DESC
        LIMIT 1
    """)
    row = cur.fetchone()
    n = int(row[0].split('-')[1]) + 1 if row else 1
    return f'COL-{n:03d}'


def ensure_multicolegio_schema(get_db_connection, superadmin_email=None, superadmin_password=None):
    """Crea tablas/columnas multicolegio y migra datos existentes al colegio por defecto."""
    global _multicolegio_ready
    if _multicolegio_ready:
        return

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS colegios (
            id_colegio SERIAL PRIMARY KEY,
            codigo_colegio VARCHAR(20) UNIQUE NOT NULL,
            nombre_oficial VARCHAR(200) NOT NULL,
            lema VARCHAR(300),
            escudo_url VARCHAR(500),
            encabezado_pdf_url VARCHAR(500),
            marca_agua_url VARCHAR(500),
            color_primario VARCHAR(20) DEFAULT '#003366',
            color_secundario VARCHAR(20) DEFAULT '#3182ce',
            estado VARCHAR(20) DEFAULT 'activo',
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    if not _column_exists(cur, 'administradores', 'rol'):
        cur.execute("ALTER TABLE administradores ADD COLUMN rol VARCHAR(20) DEFAULT 'admin_colegio'")
    if not _column_exists(cur, 'administradores', 'id_colegio'):
        cur.execute("ALTER TABLE administradores ADD COLUMN id_colegio INTEGER REFERENCES colegios(id_colegio) ON DELETE SET NULL")

    for table in ('estudiantes', 'profesores', 'grupos', 'materia', 'periodo_academico'):
        if not _column_exists(cur, table, 'id_colegio'):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN id_colegio INTEGER REFERENCES colegios(id_colegio) ON DELETE CASCADE")

    conn.commit()

    cur.execute("SELECT id_colegio FROM colegios WHERE codigo_colegio = 'COL-001'")
    default_row = cur.fetchone()
    if not default_row:
        cur.execute("""
            INSERT INTO colegios (
                codigo_colegio, nombre_oficial, lema,
                escudo_url, encabezado_pdf_url, marca_agua_url,
                color_primario, color_secundario, estado
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'activo')
            RETURNING id_colegio
        """, (
            'COL-001', 'Colegio Principal', 'Educación con excelencia',
            DEFAULT_ESCUDO, DEFAULT_ENCABEZADO, DEFAULT_MARCA_AGUA,
            DEFAULT_COLOR_PRIMARIO, DEFAULT_COLOR_SECUNDARIO,
        ))
        default_id = cur.fetchone()[0]
    else:
        default_id = default_row[0]

    for table in ('estudiantes', 'profesores', 'grupos', 'materia', 'periodo_academico'):
        cur.execute(f"UPDATE {table} SET id_colegio = %s WHERE id_colegio IS NULL", (default_id,))

    cur.execute("""
        UPDATE administradores SET id_colegio = %s
        WHERE id_colegio IS NULL AND rol IS DISTINCT FROM 'superadmin'
    """, (default_id,))

    if superadmin_email:
        hashed = None
        if superadmin_password:
            hashed = bcrypt.hashpw(superadmin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cur.execute("SELECT id_admin FROM administradores WHERE correo_electronico = %s", (superadmin_email,))
        admin_row = cur.fetchone()
        if admin_row:
            if hashed:
                cur.execute("""
                    UPDATE administradores
                    SET rol = 'superadmin', id_colegio = NULL, contrasena = %s, email_verified = TRUE
                    WHERE id_admin = %s
                """, (hashed, admin_row[0]))
            else:
                cur.execute("""
                    UPDATE administradores SET rol = 'superadmin', id_colegio = NULL, email_verified = TRUE
                    WHERE id_admin = %s
                """, (admin_row[0],))
        elif superadmin_password and hashed:
            cur.execute("""
                INSERT INTO administradores (
                    nombre_completo, correo_electronico, contrasena,
                    email_verified, rol, id_colegio
                ) VALUES (%s, %s, %s, TRUE, 'superadmin', NULL)
            """, ('Super Administrador', superadmin_email, hashed))

    conn.commit()
    cur.close()
    conn.close()
    _multicolegio_ready = True


def ensure_profile_schema(get_db_connection):
    """Columnas extendidas de perfiles y tabla acudientes."""
    conn = get_db_connection()
    cur = conn.cursor()

    estudiante_cols = {
        'fecha_nacimiento': 'DATE',
        'lugar_nacimiento': 'VARCHAR(150)',
        'genero': 'VARCHAR(20)',
        'direccion_residencia': 'TEXT',
        'eps': 'VARCHAR(100)',
        'grupo_sanguineo': 'VARCHAR(10)',
        'alergias': 'TEXT',
        'ultimo_grado': 'VARCHAR(50)',
        'colegio_procedencia': 'VARCHAR(200)',
    }
    for col, col_type in estudiante_cols.items():
        if not _column_exists(cur, 'estudiantes', col):
            cur.execute(f'ALTER TABLE estudiantes ADD COLUMN {col} {col_type}')

    profesor_cols = {
        'titulos_academicos': 'TEXT',
        'area_especialidad': 'VARCHAR(200)',
        'anios_experiencia': 'INTEGER',
        'registro_escalafon': 'VARCHAR(100)',
        'entidad_salud': 'VARCHAR(100)',
        'entidad_pension': 'VARCHAR(100)',
    }
    for col, col_type in profesor_cols.items():
        if not _column_exists(cur, 'profesores', col):
            cur.execute(f'ALTER TABLE profesores ADD COLUMN {col} {col_type}')

    for table in ('estudiantes', 'profesores', 'administradores'):
        if not _column_exists(cur, table, 'foto_perfil'):
            cur.execute(f'ALTER TABLE {table} ADD COLUMN foto_perfil VARCHAR(500)')

    admin_cols = {
        'telefono': 'VARCHAR(20)',
        'cargo': 'VARCHAR(100)',
    }
    for col, col_type in admin_cols.items():
        if not _column_exists(cur, 'administradores', col):
            cur.execute(f'ALTER TABLE administradores ADD COLUMN {col} {col_type}')

    if not _table_exists(cur, 'acudientes'):
        cur.execute("""
            CREATE TABLE acudientes (
                id_acudiente SERIAL PRIMARY KEY,
                id_estudiante INTEGER NOT NULL REFERENCES estudiantes(id_estudiante) ON DELETE CASCADE,
                id_colegio INTEGER NOT NULL REFERENCES colegios(id_colegio) ON DELETE CASCADE,
                nombre_completo VARCHAR(100) NOT NULL,
                tipo_documento VARCHAR(20) NOT NULL,
                numero_documento VARCHAR(50) NOT NULL,
                parentesco VARCHAR(50) NOT NULL,
                telefono VARCHAR(20),
                correo_electronico VARCHAR(100),
                direccion TEXT,
                ocupacion VARCHAR(100),
                estrato_socioeconomico SMALLINT,
                es_principal BOOLEAN DEFAULT TRUE,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

    conn.commit()
    cur.close()
    conn.close()


def get_admin_from_session(session):
    if 'user_id' not in session:
        return None
    return {
        'id': session['user_id'],
        'rol': session.get('admin_rol', 'admin_colegio'),
        'id_colegio': session.get('id_colegio'),
        'nombre': session.get('user_name'),
        'email': session.get('user_email'),
    }


def is_superadmin(admin):
    return admin and admin.get('rol') == 'superadmin'


def is_admin_lider(admin):
    return admin and admin.get('rol') == 'admin_lider'


def colegio_filter_sql(admin, column='id_colegio', alias=''):
    """Devuelve (fragmento SQL AND ..., params) según rol del admin."""
    if not admin:
        return '', []
    if is_superadmin(admin):
        return '', []
    col = f"{alias}.{column}" if alias else column
    if admin.get('id_colegio'):
        return f" AND {col} = %s", [admin['id_colegio']]
    return ' AND 1=0', []


def slug_codigo(nombre):
    base = re.sub(r'[^A-Za-z0-9]', '', nombre.upper())[:6] or 'COL'
    return base


def crear_colegio_con_admin(cur, nombre_oficial, lema, admin_nombre, admin_email, admin_password,
                            codigo_colegio=None, crear_superadmin=False):
    """Inserta colegio y su admin. Retorna dict con ids y código."""
    if not codigo_colegio:
        codigo_colegio = _next_codigo_colegio(cur)

    cur.execute("""
        INSERT INTO colegios (
            codigo_colegio, nombre_oficial, lema,
            escudo_url, encabezado_pdf_url, marca_agua_url,
            color_primario, color_secundario
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id_colegio, codigo_colegio
    """, (
        codigo_colegio, nombre_oficial, lema or '',
        DEFAULT_ESCUDO, DEFAULT_ENCABEZADO, DEFAULT_MARCA_AGUA,
        DEFAULT_COLOR_PRIMARIO, DEFAULT_COLOR_SECUNDARIO,
    ))
    id_colegio, codigo = cur.fetchone()

    rol = 'superadmin' if crear_superadmin else 'admin_colegio'
    id_colegio_admin = None if crear_superadmin else id_colegio
    hashed = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    cur.execute("""
        INSERT INTO administradores (
            nombre_completo, correo_electronico, contrasena,
            email_verified, rol, id_colegio
        ) VALUES (%s, %s, %s, TRUE, %s, %s)
        RETURNING id_admin
    """, (admin_nombre, admin_email, hashed, rol, id_colegio_admin))

    return {
        'id_colegio': id_colegio,
        'codigo_colegio': codigo,
        'id_admin': cur.fetchone()[0],
        'rol_admin': rol,
    }


def branding_static_path(app_root, url):
    """Convierte URL /static/... en ruta local del servidor."""
    if not url or not url.startswith('/static/'):
        return None
    return os.path.join(app_root, url.lstrip('/'))


def fetch_colegio_branding_row(cur, id_colegio):
    cur.execute("""
        SELECT id_colegio, codigo_colegio, nombre_oficial, lema,
               escudo_url, encabezado_pdf_url, marca_agua_url,
               color_primario, color_secundario
        FROM colegios WHERE id_colegio = %s AND estado = 'activo'
    """, (id_colegio,))
    row = cur.fetchone()
    if not row:
        return None
    if hasattr(row, 'keys'):
        return dict(row)
    cols = ('id_colegio', 'codigo_colegio', 'nombre_oficial', 'lema',
            'escudo_url', 'encabezado_pdf_url', 'marca_agua_url',
            'color_primario', 'color_secundario')
    return dict(zip(cols, row))
