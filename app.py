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
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import json
from dotenv import load_dotenv
load_dotenv()



app = Flask(__name__)                      #Crea la aplicación web usando Flask. __name__ le indica a Flask dónde está el archivo principal.
app.secret_key = 'tu_clave_secreta_aqui'   #Define una clave secreta usada para proteger sesiones, cookies y datos sensibles de la aplicación.

# -------------------------
# 🔧 CONFIGURACIÓN EMAIL (GMAIL)
# -------------------------
##Define los datos necesarios para enviar correos desde la aplicación (por ejemplo: notificaciones o recuperación de contraseña).
#
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587                                            
EMAIL_USER = "miboletinpep@gmail.com"
EMAIL_PASSWORD = "ihpo waip cekq dstv"
EMAIL_FROM = "MiBoletínAdmin.com <miboletinpep@gmail.com>"

# -------------------------
# 🔌 CONFIGURACIÓN DATABASE
# -------------------------
#Define una función para conectarse a la base de datos PostgreSQL.Esta función se usa cada vez que la aplicación necesita consultar o guardar información
#
def get_db_connection():
    DATABASE_URL = os.environ.get("DATABASE_URL")
    return psycopg2.connect(DATABASE_URL, sslmode='require')



# -------------------------
# 📧 FUNCIONES DE EMAIL
# -------------------------
######Esta función construye un correo visual y personalizado con un código de verificación que el usuario debe usar para completar su registro en el sistema.#######
#
def send_verification_email(to_email, verification_code):
    """Envía un email con el código de verificación (para administradores)"""
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
        
        ########Este bloque se encarga de enviar realmente el correo de verificación y manejar errores en caso de fallo.#######
        #
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_FROM
        msg['To'] = to_email
        msg.attach(MIMEText(html_content, 'html'))
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Email enviado exitosamente a {to_email}")
        return True
    except Exception as e:
        print(f"Error enviando email a {to_email}: {str(e)}")
        return False

########Esta función crea un correo visual con un enlace seguro que permite al usuario restablecer su contraseña en el sistema.#########
#
def send_recovery_email(to_email, recovery_link, user_name):
    """Envía un email con el enlace de recuperación de contraseña"""
    try:
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
        ########Este bloque se encarga de enviar el correo con el enlace de recuperación de contraseña y manejar posibles errores.#########
        #
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_FROM
        msg['To'] = to_email
        msg.attach(MIMEText(html_content, 'html'))
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error enviando email de recuperación: {str(e)}")
        return False

##########Esta función es una forma general de enviar correos dentro del sistema (notificaciones a estudiantes o profesores).#########
#
def enviar_correo_admin(destinatario, asunto, cuerpo_html, cuerpo_texto=""):
    """Envía correos electrónicos desde el módulo de usuarios (estudiantes/profesores)"""
    try:
        mensaje = MIMEMultipart('alternative')
        mensaje['Subject'] = asunto
        mensaje['From'] = EMAIL_USER
        mensaje['To'] = destinatario
        mensaje.attach(MIMEText(cuerpo_texto, 'plain'))
        mensaje.attach(MIMEText(cuerpo_html, 'html'))
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(mensaje)
        print(f"Correo enviado exitosamente a {destinatario}")
        return True
    except Exception as e:
        print(f"Error al enviar correo: {str(e)}")
        return False


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
            # Buscar como estudiante
            cur.execute(
                'SELECT id_estudiante, nombre_completo, codigo_estudiante, contrasena '
                'FROM estudiantes WHERE codigo_estudiante = %s AND correo_electronico = %s;',
                (user_identifier, user_email)
            )
            estudiante = cur.fetchone()

            if estudiante:
                if bcrypt.checkpw(password.encode('utf-8'), estudiante[3].encode('utf-8')):
                    session['user_info'] = {
                        'tipo': 'estudiante',
                        'id': estudiante[0],
                        'nombre': estudiante[1],
                        'codigo': estudiante[2]
                    }
                    return redirect(url_for('estudiante_dashboard'))
                else:
                    return render_template('general/loginuser.html', error='Contraseña incorrecta')

            # Buscar como profesor
            cur.execute(
                'SELECT id_profesor, nombre_completo, codigo_profesor, contrasena '
                'FROM profesores WHERE codigo_profesor = %s AND correo_electronico = %s;',
                (user_identifier, user_email)
            )
            profesor = cur.fetchone()

            if profesor:
                if bcrypt.checkpw(password.encode('utf-8'), profesor[3].encode('utf-8')):
                    session['user_info'] = {
                        'tipo': 'profesor',
                        'id': profesor[0],
                        'nombre': profesor[1],
                        'codigo': profesor[2]
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

########Esta ruta muestra una página donde los usuarios pueden solicitar acceso, incluyendo la información de contacto del administrador.############
#
@app.route('/solicitud_user')
def solicitud_user():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT id_admin, nombre_completo, correo_electronico FROM administradores LIMIT 1;')
    admin = cur.fetchone()
    cur.close()
    conn.close()

    if admin:
        admin_id, admin_name, admin_email = admin
    else:
        admin_id, admin_name, admin_email = 'ADM001', 'Administrador del Sistema', 'admin@sistema.com'

    return render_template('general/solicitud.html',
                           admin_id=admin_id,
                           admin_name=admin_name,
                           admin_email=admin_email)

######Esta ruta verifica si un usuario existe (estudiante o profesor) y devuelve la información en formato JSON.#########
#
@app.route('/verificar_usuario', methods=['POST'])
def verificar_usuario():
    data = request.json
    user_identifier = data.get('userIdentifier')
    user_email = data.get('userEmail')

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        'SELECT id_estudiante, nombre_completo, codigo_estudiante FROM estudiantes '
        'WHERE codigo_estudiante = %s AND correo_electronico = %s;',
        (user_identifier, user_email)
    )
    estudiante = cur.fetchone()

    if estudiante:
        session['user_info'] = {
            'tipo': 'estudiante',
            'id': estudiante[0],
            'nombre': estudiante[1],
            'codigo': estudiante[2]
        }
        cur.close()
        conn.close()
        return jsonify({'status': 'success', 'tipo': 'estudiante',
                        'id': estudiante[0], 'nombre': estudiante[1], 'codigo': estudiante[2]})

    cur.execute(
        'SELECT id_profesor, nombre_completo, codigo_profesor FROM profesores '
        'WHERE codigo_profesor = %s AND correo_electronico = %s;',
        (user_identifier, user_email)
    )
    profesor = cur.fetchone()

    if profesor:
        session['user_info'] = {
            'tipo': 'profesor',
            'id': profesor[0],
            'nombre': profesor[1],
            'codigo': profesor[2]
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
        return jsonify({'status': 'error', 'message': f'Error al guardar la solicitud: {str(e)}'}), 500

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
    return render_template('administrador/registeradmin.html')


@app.route("/forgot-password")
def forgot_password():                                         #Muestra la página para recuperar contraseña (cuando el admin la olvida).
    return render_template('administrador/f-password.html')


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
            "SELECT id_admin, nombre_completo, correo_electronico FROM administradores WHERE id_admin = %s",
            (session['user_id'],)
        )
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user:
            return render_template('administrador/dashboard.html',
                                   user_name=user['nombre_completo'],
                                   user_email=user['correo_electronico'])
        else:
            return render_template('administrador/dashboard.html',
                                   user_name=session.get('user_name', 'Usuario'),
                                   user_email=session.get('user_email', 'usuario@ejemplo.com'))
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
            "SELECT id_admin, nombre_completo, correo_electronico, contrasena, email_verified "
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
            return jsonify({"status": "success", "message": "Inicio de sesión exitoso.",
                            "redirect": "/dashboard",
                            "user": {"id": user['id_admin'], "name": user['nombre_completo'],
                                     "email": user['correo_electronico']}})
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

        recovery_link = f"http://localhost:5006/forgot-password?token={recovery_code}"
        email_sent = send_recovery_email(email, recovery_link, user[1])

        if email_sent:
            return jsonify({"status": "success", "message": f"Enlace de recuperación enviado a {email}"})
        else:
            return jsonify({"status": "error", "message": "Error al enviar el email. Intenta nuevamente."})

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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            """SELECT codigo_estudiante as id, nombre_completo, tipo_documento,
                      numero_documento, correo_electronico as email, grado, grupo
               FROM estudiantes WHERE codigo_estudiante = %s""",
            (codigo,)
        )
        estudiante = cur.fetchone()
        cur.close()
        conn.close()

        if estudiante:
            return jsonify({"status": "success", "data": dict(estudiante)})
        else:
            return jsonify({"status": "error", "message": "Estudiante no encontrado."})
    except Exception as e:
        print(f"Error obteniendo estudiante: {e}")
        return jsonify({"status": "error", "message": "Error al obtener los datos."})

########Obtiene los datos de un profesor por su código, valida la sesión del administrador y convierte las asignaturas en una lista antes de enviarlas.#######
#
@app.route("/obtener-profesor/<codigo>", methods=["GET"])
def obtener_profesor(codigo):
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            """SELECT codigo_profesor as id, nombre_completo, tipo_documento,
                      numero_documento, correo_electronico as email, telefono, asignaturas
               FROM profesores WHERE codigo_profesor = %s""",
            (codigo,)
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})

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

        cur.execute("SELECT id_estudiante FROM estudiantes WHERE codigo_estudiante = %s", (estudiante_id,))
        if not cur.fetchone():
            return jsonify({"status": "error", "message": "Estudiante no encontrado."})

        if correo_electronico:
            cur.execute(
                "SELECT id_estudiante FROM estudiantes WHERE correo_electronico = %s AND codigo_estudiante != %s",
                (correo_electronico, estudiante_id)
            )
            if cur.fetchone():
                return jsonify({"status": "error", "message": "Este correo ya está registrado por otro estudiante."})

        update_fields = ["nombre_completo=%s", "tipo_documento=%s", "numero_documento=%s",
                         "correo_electronico=%s", "grado=%s", "grupo=%s"]
        update_values = [nombre_completo, tipo_documento, numero_documento, correo_electronico, grado, grupo]

        if nueva_contrasena:
            if len(nueva_contrasena) < 8:
                return jsonify({"status": "error", "message": "La nueva contraseña debe tener al menos 8 caracteres."})
            hashed = bcrypt.hashpw(nueva_contrasena.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            update_fields.append("contrasena=%s")
            update_values.append(hashed)

        update_values.append(estudiante_id)
        cur.execute(
            f"UPDATE estudiantes SET {', '.join(update_fields)} WHERE codigo_estudiante = %s "
            f"RETURNING codigo_estudiante, nombre_completo, correo_electronico, grado, grupo",
            tuple(update_values)
        )
        updated = cur.fetchone()
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})

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

        cur.execute("SELECT id_profesor FROM profesores WHERE codigo_profesor = %s", (profesor_id,))
        if not cur.fetchone():
            return jsonify({"status": "error", "message": "Profesor no encontrado."})

        if correo_electronico:
            cur.execute(
                "SELECT id_profesor FROM profesores WHERE correo_electronico = %s AND codigo_profesor != %s",
                (correo_electronico, profesor_id)
            )
            if cur.fetchone():
                return jsonify({"status": "error", "message": "Este correo ya está registrado por otro profesor."})

        cur.execute(
            "SELECT id_profesor FROM profesores WHERE numero_documento = %s AND codigo_profesor != %s",
            (numero_documento, profesor_id)
        )
        if cur.fetchone():
            return jsonify({"status": "error", "message": "Este número de documento ya está registrado por otro profesor."})

        update_fields = ["nombre_completo=%s", "tipo_documento=%s", "numero_documento=%s",
                         "correo_electronico=%s", "telefono=%s", "asignaturas=%s"]
        update_values = [nombre_completo, tipo_documento, numero_documento,
                         correo_electronico, telefono, asignaturas_str]

        if nueva_contrasena:
            if len(nueva_contrasena) < 8:
                return jsonify({"status": "error", "message": "La nueva contraseña debe tener al menos 8 caracteres."})
            hashed = bcrypt.hashpw(nueva_contrasena.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            update_fields.append("contrasena=%s")
            update_values.append(hashed)

        update_values.append(profesor_id)
        cur.execute(
            f"UPDATE profesores SET {', '.join(update_fields)} WHERE codigo_profesor = %s "
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id_profesor, nombre_completo, codigo_profesor FROM profesores ORDER BY nombre_completo")
        data = [dict(p) for p in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

########Devuelve los IDs y datos básicos de los estudiantes para usarlos en listas o selects, validando sesión.#######
#
@app.route("/obtener-estudiantes-ids", methods=["GET"])
def obtener_estudiantes_ids():
    """Devuelve id_estudiante (entero) para los selects de asignaciones"""
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id_estudiante, nombre_completo, codigo_estudiante FROM estudiantes ORDER BY nombre_completo")
        data = [dict(e) for e in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

#######Devuelve los IDs y nombres de los grupos para usarlos en listas o selects, validando sesión.#######
#
@app.route("/obtener-grupos-ids", methods=["GET"])
def obtener_grupos_ids():
    """Devuelve id_grupo (entero) para los selects de asignaciones"""
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id_grupo, nombre FROM grupos ORDER BY nombre")
        data = [dict(g) for g in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

########Devuelve los IDs y nombres de las materias para usarlos en listas o selects, validando sesión.######
#
@app.route("/obtener-materias-ids", methods=["GET"])
def obtener_materias_ids():
    """Devuelve id_materia (entero) para los selects de asignaciones"""
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id_materia, nombre FROM materia ORDER BY nombre")
        data = [dict(m) for m in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

#######Obtiene la cantidad de estudiantes y profesores activos para mostrar estadísticas en el dashboard del administrador.#######
#
@app.route("/dashboard-stats", methods=["GET"])
def dashboard_stats():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM estudiantes WHERE estado = 'activo'")
        estudiantes_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM profesores WHERE estado = 'activo'")
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT codigo_estudiante as id, nombre_completo as nombre, correo_electronico as email, grado, grupo, TO_CHAR(fecha_registro, 'DD/MM/YYYY') as fecha_registro, estado FROM estudiantes ORDER BY fecha_registro DESC")
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT codigo_profesor as id, nombre_completo as nombre, correo_electronico as email, telefono, asignaturas, TO_CHAR(fecha_registro, 'DD/MM/YYYY') as fecha_registro, estado FROM profesores ORDER BY fecha_registro DESC")
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
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
    hashed_password = bcrypt.hashpw(contrasena.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_estudiante FROM estudiantes WHERE correo_electronico = %s OR numero_documento = %s", (correo_electronico, numero_documento))
        if cur.fetchone():
            return jsonify({"status": "error", "message": "El correo o número de documento ya están registrados."})
        cur.execute("SELECT codigo_estudiante FROM estudiantes ORDER BY id_estudiante DESC LIMIT 1")
        last = cur.fetchone()
        new_number = int(last[0][3:]) + 1 if last else 1
        codigo_estudiante = f"EST{new_number:03d}"
        cur.execute(
            "INSERT INTO estudiantes (codigo_estudiante, nombre_completo, tipo_documento, numero_documento, correo_electronico, grado, grupo, contrasena, id_admin, nombre_completo_admin, correo_electronico_admin) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id_estudiante, codigo_estudiante;",
            (codigo_estudiante, nombre_completo, tipo_documento, numero_documento, correo_electronico, grado, grupo, hashed_password, session.get('user_id'), session.get('user_name'), session.get('user_email'))
        )
        new_student = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Estudiante registrado exitosamente!", "data": {"id": new_student[0], "codigo": new_student[1]}})
    except Exception as e:
        print(f"Error registrando estudiante: {e}")
        return jsonify({"status": "error", "message": "Error en la base de datos."})
    
#########Permite al administrador registrar un nuevo profesor, validando datos, evitando duplicados, guardando asignaturas y cifrando la contraseña.#######
#
@app.route("/registrar-profesor", methods=["POST"])
def registrar_profesor():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
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
    asignaturas_str = ','.join(asignaturas) if isinstance(asignaturas, list) else (asignaturas or "")
    hashed_password = bcrypt.hashpw(contrasena.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_profesor FROM profesores WHERE correo_electronico = %s OR numero_documento = %s", (correo_electronico, numero_documento))
        if cur.fetchone():
            return jsonify({"status": "error", "message": "El correo o número de documento ya están registrados."})
        cur.execute("SELECT codigo_profesor FROM profesores ORDER BY id_profesor DESC LIMIT 1")
        last = cur.fetchone()
        new_number = int(last[0][4:]) + 1 if last else 1
        codigo_profesor = f"PROF{new_number:03d}"
        cur.execute(
            "INSERT INTO profesores (codigo_profesor, nombre_completo, tipo_documento, numero_documento, correo_electronico, telefono, asignaturas, contrasena, id_admin, nombre_completo_admin, correo_electronico_admin) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id_profesor, codigo_profesor;",
            (codigo_profesor, nombre_completo, tipo_documento, numero_documento, correo_electronico, telefono, asignaturas_str, hashed_password, session.get('user_id'), session.get('user_name'), session.get('user_email'))
        )
        new_professor = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Profesor registrado exitosamente!", "data": {"id": new_professor[0], "codigo": new_professor[1]}})
    except Exception as e:
        print(f"Error registrando profesor: {e}")
        return jsonify({"status": "error", "message": "Error en la base de datos."})
    
#######Permite al administrador eliminar un estudiante por su código, validando sesión.######
#
@app.route("/eliminar-estudiante", methods=["POST"])
def eliminar_estudiante():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    data = request.get_json()
    codigo = data.get("codigo")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM estudiantes WHERE codigo_estudiante = %s", (codigo,))
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    data = request.get_json()
    codigo = data.get("codigo")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM profesores WHERE codigo_profesor = %s", (codigo,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Profesor eliminado exitosamente!"})
    except Exception as e:
        print(f"Error eliminando profesor: {e}")
        return jsonify({"status": "error", "message": "Error al eliminar."})
    
######Define el diseño del PDF, agregando un encabezado con título y fecha, y un pie de página con la numeración de las páginas.######
#
class MiBoletinPDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 16)
        self.set_text_color(0, 51, 102) # #003366
        self.cell(0, 10, 'MiBoletín Admin', 0, 1, 'C')
        self.set_font('helvetica', 'I', 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, f'Generado el: {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Página {self.page_no()}', 0, 0, 'C')
        
#########Genera y descarga un PDF con la lista de estudiantes, permitiendo filtrar por grado y grupo, y mostrando la información en formato de tabla.######
#
@app.route("/reporte/estudiantes/pdf", methods=["GET"])
def reporte_estudiantes_pdf():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    
    grado = request.args.get('grado', '')
    grupo = request.args.get('grupo', '')

    query = "SELECT codigo_estudiante, nombre_completo, correo_electronico, grado, grupo, estado FROM estudiantes"
    conditions = []
    params = []
    
    if grado:
        conditions.append("grado = %s")
        params.append(grado)
    if grupo:
        conditions.append("grupo = %s")
        params.append(grupo)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY grado, grupo, nombre_completo"
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(query, tuple(params))
        estudiantes = cur.fetchall()
        cur.close()
        conn.close()

        pdf = MiBoletinPDF()
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
        pdf_bytes = pdf.output(dest='S')
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        return send_file(
            buffer,
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT codigo_profesor, nombre_completo, correo_electronico, telefono, estado FROM profesores ORDER BY nombre_completo")
        profesores = cur.fetchall()
        cur.close()
        conn.close()

        pdf = MiBoletinPDF()
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

        pdf_bytes = pdf.output(dest='S')
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        return send_file(
            buffer,
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Estadistica Estudiantes
        cur.execute("SELECT COUNT(*) FROM estudiantes WHERE estado = 'activo'")
        estudiantes_activos = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM estudiantes WHERE estado != 'activo'")
        estudiantes_inactivos = cur.fetchone()[0]
        
        # Estadistica Profesores
        cur.execute("SELECT COUNT(*) FROM profesores WHERE estado = 'activo'")
        profesores_activos = cur.fetchone()[0]
        
        # Solicitudes
        cur.execute("SELECT COUNT(*) FROM solicitudes_cambio_contrasena")
        total_solicitudes = cur.fetchone()[0]
        
        cur.close()
        conn.close()

        pdf = MiBoletinPDF()
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

        pdf_bytes = pdf.output(dest='S')
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        return send_file(
            buffer,
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
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Debes iniciar sesión primero."})
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id_admin, nombre_completo, correo_electronico, email_verified FROM administradores ORDER BY id_admin")
        admins = cur.fetchall()
        cur.close()
        conn.close()

        pdf = MiBoletinPDF()
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

        pdf_bytes = pdf.output(dest='S')
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name='directorio_administradores.pdf', mimetype='application/pdf')

    except Exception as e:
        print(f"Error generando PDF de administradores: {e}")
        return jsonify({"status": "error", "message": "Error generando el reporte PDF."})


# RUTAS DEL PROFESOR

#######Obtiene los estudiantes activos asignados al profesor según sus grupos.########
#
@app.route('/profesor/estudiantes')
def profesor_estudiantes():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT DISTINCT e.id_estudiante, e.nombre_completo, e.codigo_estudiante,
                   e.grado, e.grupo, g.nombre as nombre_grupo
            FROM estudiantes e
            JOIN grupo_estudiantes ge ON e.id_estudiante = ge.id_estudiante
            JOIN grupos g ON ge.id_grupo = g.id_grupo
            JOIN grupo_materias gm ON g.id_grupo = gm.id_grupo
            WHERE gm.id_docente = %s AND e.estado = 'activo'
            ORDER BY e.nombre_completo
        """, (user_info['id'],))
        estudiantes = [dict(e) for e in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": estudiantes})
    except Exception as e:
        print(f"Error obteniendo estudiantes del profesor: {e}")
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

############obtiene los eventos del profesor con fecha, hora y estado###########
#
@app.route('/profesor/agenda', methods=['GET'])
def ver_agenda():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT id_agenda, titulo, descripcion, fecha_evento,
                   hora_inicio, hora_fin, estado
            FROM agenda
            WHERE id_profesor = %s
            ORDER BY fecha_evento ASC
        """, (user_info['id'],))
        eventos = [dict(e) for e in cur.fetchall()]
        for e in eventos:
            e['fecha_evento'] = str(e['fecha_evento'])
            e['hora_inicio'] = str(e['hora_inicio']) if e['hora_inicio'] else None
            e['hora_fin'] = str(e['hora_fin']) if e['hora_fin'] else None
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": eventos})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

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
    hora_inicio = data.get('hora_inicio')
    hora_fin = data.get('hora_fin')
    if not all([titulo, fecha_evento]):
        return jsonify({"status": "error", "message": "Título y fecha son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO agenda (id_profesor, titulo, descripcion, fecha_evento, hora_inicio, hora_fin)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id_agenda
        """, (user_info['id'], titulo, descripcion, fecha_evento, hora_inicio, hora_fin))
        id_agenda = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Evento agregado!", "id_agenda": id_agenda})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})



#######genera y descarga un PDF con el reporte completo de todos los estudiantes del profesor, incluyendo datos personales, notas por materia con promedio y observaciones registradas#######
#
@app.route('/profesor/reporte/pdf')
def profesor_reporte_pdf():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Datos del profesor
        cur.execute("SELECT nombre_completo, codigo_profesor FROM profesores WHERE id_profesor = %s", (user_info['id'],))
        profesor = dict(cur.fetchone())

        # Estudiantes asignados
        cur.execute("""
            SELECT DISTINCT e.id_estudiante, e.nombre_completo, e.codigo_estudiante, e.grado, e.grupo
            FROM estudiantes e
            JOIN grupo_estudiantes ge ON e.id_estudiante = ge.id_estudiante
            JOIN grupos g ON ge.id_grupo = g.id_grupo
            JOIN grupo_materias gm ON g.id_grupo = gm.id_grupo
            WHERE gm.id_docente = %s AND e.estado = 'activo'
            ORDER BY e.grado, e.grupo, e.nombre_completo
        """, (user_info['id'],))
        estudiantes = [dict(e) for e in cur.fetchall()]

        pdf = MiBoletinPDF()

        for est in estudiantes:
            pdf.add_page()
            pdf.set_font('helvetica', 'B', 14)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 10, f"Reporte del Estudiante: {est['nombre_completo']}", 0, 1, 'C')
            pdf.set_font('helvetica', '', 10)
            pdf.set_text_color(80, 80, 80)
            pdf.cell(0, 7, f"Código: {est['codigo_estudiante']}  |  Grado: {est['grado']}  |  Grupo: {est['grupo']}", 0, 1, 'C')
            pdf.cell(0, 7, f"Docente: {profesor['nombre_completo']} ({profesor['codigo_profesor']})", 0, 1, 'C')
            pdf.ln(5)

            # Notas
            cur.execute("""
                SELECT n.valor, n.descripcion, TO_CHAR(n.fecha_registro,'DD/MM/YYYY') as fecha,
                       tn.nombre_tipo, m.nombre as materia
                FROM notas n
                JOIN tipos_nota tn ON n.id_tipo = tn.id_tipo
                JOIN grupo_materias gm ON n.id_grupo_materia = gm.id_grupo_materia
                JOIN materia m ON gm.id_materia = m.id_materia
                WHERE n.id_estudiante = %s AND gm.id_docente = %s
                ORDER BY m.nombre, n.fecha_registro DESC
            """, (est['id_estudiante'], user_info['id']))
            notas = [dict(n) for n in cur.fetchall()]

            pdf.set_font('helvetica', 'B', 11)
            pdf.set_fill_color(0, 51, 102)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(0, 9, ' Notas Académicas', 1, 1, 'L', fill=True)
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
                    pdf.cell(55, 7, n['materia'][:28], 1, 0, 'L', fill=fill)
                    pdf.cell(35, 7, n['nombre_tipo'][:18], 1, 0, 'C', fill=fill)
                    pdf.set_text_color(*color)
                    pdf.cell(20, 7, str(v), 1, 0, 'C', fill=fill)
                    pdf.set_text_color(0, 0, 0)
                    pdf.cell(55, 7, (n['descripcion'] or '-')[:28], 1, 0, 'L', fill=fill)
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

            # Observaciones
            cur.execute("""
                SELECT tipo, descripcion, TO_CHAR(fecha_registro,'DD/MM/YYYY') as fecha
                FROM observador WHERE id_estudiante = %s AND id_profesor = %s
                ORDER BY fecha_registro DESC
            """, (est['id_estudiante'], user_info['id']))
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
                    pdf.cell(140, 7, (o['descripcion'] or '')[:70], 1, 0, 'L', fill=fill)
                    pdf.cell(25, 7, o['fecha'], 1, 1, 'C', fill=fill)
                    fill = not fill
            else:
                pdf.set_font('helvetica', 'I', 9)
                pdf.cell(0, 8, '  No hay observaciones registradas.', 0, 1)

        cur.close()
        conn.close()

        nombre_prof = profesor['nombre_completo'].replace(' ', '_')
        pdf_bytes = pdf.output(dest='S')
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        return send_file(buffer, as_attachment=True,
                         download_name=f'reporte_completo_{nombre_prof}.pdf',
                         mimetype='application/pdf')
    except Exception as e:
        print(f"Error generando PDF profesor: {e}")
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})


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
        return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({"status": "error", "message": str(e)})


# ── MATERIAL DE CLASE ──

#########obtiene el listado de materiales de clase subidos por el profesor, con título, descripción, tipo, archivo o enlace, fecha de subida y opción de filtrar por materia/grupo específico######
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
        return jsonify({"status": "error", "message": str(e)})

########permite al profesor subir material de clase registrando título, descripción, tipo (archivo o enlace), recurso (URL o nombre) y la materia/grupo al que pertenece, guardándolo en el sistema para su posterior consulta########
#
@app.route('/profesor/material', methods=['POST'])
def subir_material():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    titulo = data.get('titulo')
    descripcion = data.get('descripcion', '')
    tipo = data.get('tipo', 'enlace')
    url_o_nombre = data.get('url_o_nombre')
    id_grupo_materia = data.get('id_grupo_materia')
    if not all([titulo, url_o_nombre, id_grupo_materia]):
        return jsonify({"status": "error", "message": "Título, enlace y materia son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO material_clase (id_profesor, id_grupo_materia, titulo, descripcion, tipo, url_o_nombre)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id_material
        """, (user_info['id'], id_grupo_materia, titulo, descripcion, tipo, url_o_nombre))
        id_mat = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Material agregado.", "id_material": id_mat})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

##########elimina un material de clase específico del profesor, validando que le pertenezca antes de borrarlo del sistema##########
#
@app.route('/profesor/material/<int:id_material>', methods=['DELETE'])
def eliminar_material(id_material):
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM material_clase WHERE id_material = %s AND id_profesor = %s",
                    (id_material, user_info['id']))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Material eliminado."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


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
        return jsonify({"status":"error","message":str(e)})

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
        return jsonify({"status":"error","message":str(e)})

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
        return jsonify({"status":"error","message":str(e)})

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
        return jsonify({"status":"error","message":str(e)})

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
        return jsonify({"status":"error","message":str(e)})

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
        return jsonify({"status": "error", "message": str(e)})

###########permite a estudiantes o profesores actualizar su nombre completo y correo electrónico, guardando los cambios en la base de datos y actualizando la sesión activa########
#
@app.route('/update-profile', methods=['POST'])
def update_profile():
    user_info = session.get('user_info')
    if not user_info: return jsonify({"status":"error","message":"No autorizado"}), 401
    data = request.get_json()
    fullname = data.get('fullname','').strip()
    email = data.get('email','').strip()
    if not fullname: return jsonify({"status":"error","message":"El nombre es requerido."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        tipo = user_info.get('tipo')
        if tipo == 'estudiante':
            cur.execute("UPDATE estudiantes SET nombre_completo=%s, correo_electronico=%s WHERE id_estudiante=%s",
                        (fullname, email, user_info['id']))
        elif tipo == 'profesor':
            cur.execute("UPDATE profesores SET nombre_completo=%s, correo_electronico=%s WHERE id_profesor=%s",
                        (fullname, email, user_info['id']))
        conn.commit(); cur.close(); conn.close()
        session['user_info']['nombre'] = fullname
        return jsonify({"status":"success","message":"Perfil actualizado."})
    except Exception as e:
        return jsonify({"status":"error","message":str(e)})


# ── FIN RUTAS ESTUDIANTE ──

##########obtiene el listado de períodos académicos registrados en el sistema, incluyendo id, nombre, fecha de inicio y fecha de finalización formateadas, ordenados de forma descendente según la fecha de inicio#######
#
@app.route('/admin/periodos', methods=['GET'])
def get_periodos():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id_periodo, nombre, TO_CHAR(fecha_inicio,'DD/MM/YYYY') as fecha_inicio, TO_CHAR(fecha_fin,'DD/MM/YYYY') as fecha_fin FROM periodo_academico ORDER BY fecha_inicio DESC")
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        print(f"Error periodos: {e}")
        return jsonify({"status": "error", "message": str(e)})

###########permite crear un nuevo período académico validando los campos requeridos (nombre, fecha_inicio, fecha_fin) y almacenándolo en la base de datos, retornando el id del período creado junto con un mensaje de confirmación#########
#
@app.route('/admin/periodos', methods=['POST'])
def crear_periodo():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    nombre = data.get('nombre')
    fecha_inicio = data.get('fecha_inicio')
    fecha_fin = data.get('fecha_fin')
    if not all([nombre, fecha_inicio, fecha_fin]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("INSERT INTO periodo_academico (nombre, fecha_inicio, fecha_fin) VALUES (%s,%s,%s) RETURNING id_periodo", (nombre, fecha_inicio, fecha_fin))
        id_periodo = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Período creado exitosamente!", "id_periodo": id_periodo})
    except Exception as e:
        print(f"Error creando período: {e}")
        return jsonify({"status": "error", "message": str(e)})

###########obtiene todos los grupos registrados junto con su período académico asociado mediante un LEFT JOIN, retornando id del grupo, nombre y nombre del período, ordenados de forma descendente######
#
@app.route('/admin/grupos', methods=['GET'])
def get_grupos():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT g.id_grupo, g.nombre, p.nombre as periodo
            FROM grupos g
            LEFT JOIN periodo_academico p ON g.id_periodo = p.id_periodo
            ORDER BY g.id_grupo DESC
        """)
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

########permite crear un nuevo grupo validando los campos obligatorios (nombre e id_periodo), insertándolo en la base de datos y devolviendo el id del grupo creado junto con un mensaje de confirmación########
#
@app.route('/admin/grupos', methods=['POST'])
def crear_grupo():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    nombre = data.get('nombre')
    id_periodo = data.get('id_periodo')
    if not all([nombre, id_periodo]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("INSERT INTO grupos (nombre, id_periodo) VALUES (%s,%s) RETURNING id_grupo", (nombre, id_periodo))
        id_grupo = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Grupo creado exitosamente!", "id_grupo": id_grupo})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

#########obtiene el total de grupos registrados en el sistema mediante una consulta COUNT(*) sobre la tabla grupos, retornando la cantidad como dato numérico########
#
@app.route('/admin/grupos-count', methods=['GET'])
def grupos_count():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM grupos")
        count = cur.fetchone()[0]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": count})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

###########lista todas las materias registradas mostrando id, nombre y código, ordenadas alfabéticamente por nombre para facilitar su visualización y selección######
#
@app.route('/admin/materias', methods=['GET'])
def get_materias():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id_materia, nombre, codigo FROM materia ORDER BY nombre")
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

#############permite crear una nueva materia validando el campo obligatorio nombre y un código opcional, insertándola en la base de datos y retornando el id generado, manejando además errores de duplicidad en el código#######
#
@app.route('/admin/materias', methods=['POST'])
def crear_materia():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    nombre = data.get('nombre')
    codigo = data.get('codigo') or None
    if not nombre:
        return jsonify({"status": "error", "message": "El nombre es requerido."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("INSERT INTO materia (nombre, codigo) VALUES (%s,%s) RETURNING id_materia", (nombre, codigo))
        id_materia = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Materia creada exitosamente!", "id_materia": id_materia})
    except psycopg2.Error as e:
        if "unique" in str(e).lower():
            return jsonify({"status": "error", "message": "El código ya existe."})
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

##########obtiene el total de materias registradas mediante una consulta COUNT(*) sobre la tabla materia, retornando la cantidad como dato numérico##########
#
@app.route('/admin/materias-count', methods=['GET'])
def materias_count():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM materia")
        count = cur.fetchone()[0]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": count})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

###obtiene todas las asignaciones de materias a grupos y profesores mediante múltiples JOINs, retornando id de la asignación, nombre del profesor, grupo y materia, organizados por grupo y materia para una mejor visualización###
#
@app.route('/admin/asignaciones', methods=['GET'])
def get_asignaciones():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT gm.id_grupo_materia, p.nombre_completo as profesor,
                   g.nombre as grupo, m.nombre as materia
            FROM grupo_materias gm
            JOIN profesores p ON gm.id_docente = p.id_profesor
            JOIN grupos g ON gm.id_grupo = g.id_grupo
            JOIN materia m ON gm.id_materia = m.id_materia
            ORDER BY g.nombre, m.nombre
        """)
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

####permite crear una nueva asignación validando los campos obligatorios (id_docente, id_grupo, id_materia), insertándola en la tabla grupo_materias y retornando el id generado, incluyendo manejo de errores en caso de asignaciones duplicadas####
#
@app.route('/admin/asignaciones', methods=['POST'])
def crear_asignacion():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    id_docente = data.get('id_docente')
    id_grupo = data.get('id_grupo')
    id_materia = data.get('id_materia')
    if not all([id_docente, id_grupo, id_materia]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
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
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

#####permite eliminar una asignación específica entre grupo, materia y profesor mediante su id, ejecutando una eliminación directa en la tabla grupo_materias y retornando un mensaje de confirmación#####
#
@app.route('/admin/asignaciones/<int:id_grupo_materia>', methods=['DELETE'])
def eliminar_asignacion(id_grupo_materia):
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM grupo_materias WHERE id_grupo_materia = %s", (id_grupo_materia,))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Asignación eliminada."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

#####asigna un estudiante a un grupo validando los campos requeridos (id_estudiante, id_grupo), insertándolo en la tabla grupo_estudiantes con control de duplicados mediante ON CONFLICT DO NOTHING para evitar registros repetidos####
#
@app.route('/admin/asignar-estudiante', methods=['POST'])
def asignar_estudiante_grupo():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    id_estudiante = data.get('id_estudiante')
    id_grupo = data.get('id_grupo')
    if not all([id_estudiante, id_grupo]):
        return jsonify({"status": "error", "message": "Todos los campos son requeridos."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO grupo_estudiantes (id_grupo, id_estudiante) VALUES (%s,%s) ON CONFLICT DO NOTHING",
            (id_grupo, id_estudiante)
        )
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Estudiante asignado al grupo exitosamente!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

####permite eliminar la relación entre un estudiante y un grupo específico validando id_estudiante e id_grupo, eliminando el registro correspondiente en la tabla grupo_estudiantes y retornando un mensaje de confirmación#####
#
@app.route('/admin/quitar-estudiante', methods=['POST'])
def quitar_estudiante_grupo():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    data = request.get_json()
    id_estudiante = data.get('id_estudiante')
    id_grupo = data.get('id_grupo')
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM grupo_estudiantes WHERE id_grupo=%s AND id_estudiante=%s", (id_grupo, id_estudiante))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Estudiante quitado del grupo."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

####obtiene el listado de estudiantes pertenecientes a un grupo específico mediante un JOIN entre estudiantes y grupo_estudiantes, retornando id, código y nombre completo, ordenados alfabéticamente para facilitar su visualización####
#
@app.route('/admin/grupo/<int:id_grupo>/estudiantes', methods=['GET'])
def get_estudiantes_grupo(id_grupo):
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT e.id_estudiante, e.codigo_estudiante, e.nombre_completo
            FROM estudiantes e
            JOIN grupo_estudiantes ge ON e.id_estudiante = ge.id_estudiante
            WHERE ge.id_grupo = %s
            ORDER BY e.nombre_completo
        """, (id_grupo,))
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

#######obtiene el listado de administradores registrados en el sistema mostrando id, nombre completo, correo electrónico y estado de verificación de email, ordenados por id para una gestión organizada####
#

@app.route('/admin/administradores', methods=['GET'])
def get_administradores():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id_admin, nombre_completo, correo_electronico, email_verified FROM administradores ORDER BY id_admin")
        data = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

###permite eliminar un administrador específico mediante su id, validando previamente que no sea el mismo usuario en sesión para evitar auto-eliminación, y ejecutando la eliminación en la base de datos con confirmación de éxito######
#
@app.route('/admin/administradores/<int:id_admin>', methods=['DELETE'])
def eliminar_administrador(id_admin):
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    if id_admin == session['user_id']:
        return jsonify({"status": "error", "message": "No puedes eliminarte a ti mismo."})
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM administradores WHERE id_admin = %s", (id_admin,))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"status": "success", "message": "Administrador eliminado."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})




if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5006)