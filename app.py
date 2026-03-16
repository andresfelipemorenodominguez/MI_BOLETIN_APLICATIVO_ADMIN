from flask import Flask, render_template, request, jsonify, session, redirect, url_for
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



app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_aqui'

# -------------------------
# 🔧 CONFIGURACIÓN EMAIL (GMAIL)
# -------------------------
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USER = "miboletinpep@gmail.com"
EMAIL_PASSWORD = "ihpo waip cekq dstv"
EMAIL_FROM = "MiBoletínAdmin.com <miboletinpep@gmail.com>"

# -------------------------
# 🔌 CONFIGURACIÓN DATABASE
# -------------------------



def get_db_connection():
    DATABASE_URL = os.environ.get("DATABASE_URL")
    return psycopg2.connect(DATABASE_URL, sslmode='require')



# -------------------------
# 📧 FUNCIONES DE EMAIL
# -------------------------
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

@app.route('/loginuser', methods=['GET', 'POST'])
def loginuser():
    if request.method == 'GET':
        return render_template('loginuser.html')

    elif request.method == 'POST':
        user_identifier = request.form.get('userIdentifier')
        user_email = request.form.get('correo')
        password = request.form.get('contraseña')

        if not all([user_identifier, user_email, password]):
            return render_template('loginuser.html',
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
                    return render_template('loginuser.html', error='Contraseña incorrecta')

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
                    return render_template('loginuser.html', error='Contraseña incorrecta')

            return render_template('loginuser.html',
                                   error='Usuario no encontrado. Verifica tu identificador y correo electrónico.')

        except Exception as e:
            print(f"Error en login: {str(e)}")
            return render_template('loginuser.html', error='Error en el servidor. Intenta más tarde.')
        finally:
            cur.close()
            conn.close()


@app.route('/estudiante')
def estudiante_dashboard():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'estudiante':
        return redirect(url_for('loginuser'))
    return render_template('estudiante.html',
                           nombre=user_info['nombre'],
                           codigo=user_info['codigo'])


@app.route('/profesor')
def profesor_dashboard():
    user_info = session.get('user_info')
    if not user_info or user_info.get('tipo') != 'profesor':
        return redirect(url_for('loginuser'))
    return render_template('profesor.html',
                           nombre=user_info['nombre'],
                           codigo=user_info['codigo'])


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

    return render_template('solicitud.html',
                           admin_id=admin_id,
                           admin_name=admin_name,
                           admin_email=admin_email)


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


@app.route('/limpiar_sesion', methods=['POST'])
def limpiar_sesion():
    session.pop('user_info', None)
    return jsonify({'status': 'success'})


# =========================================================
# 📌 RUTAS DE ADMINISTRADORES — app.py (panel admin)
# =========================================================

@app.route("/admin")
def admin_login():
    """Página de login para administradores"""
    return render_template("loginadmin.html")


@app.route("/register")
def register():
    return render_template("registeradmin.html")


@app.route("/forgot-password")
def forgot_password():
    return render_template("f-password.html")


@app.route("/email-verification")
def email_verification():
    return render_template("e-verification.html")


@app.route("/request-password")
def request_password():
    return render_template("r-password.html")


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
            return render_template("dashboard.html",
                                   user_name=user['nombre_completo'],
                                   user_email=user['correo_electronico'])
        else:
            return render_template("dashboard.html",
                                   user_name=session.get('user_name', 'Usuario'),
                                   user_email=session.get('user_email', 'usuario@ejemplo.com'))
    except Exception as e:
        print(f"Error al obtener datos del usuario: {e}")
        return render_template("dashboard.html",
                               user_name=session.get('user_name', 'Usuario'),
                               user_email=session.get('user_email', 'usuario@ejemplo.com'))


@app.route("/logout")
def logout():
    """Cierra sesión tanto de usuarios como de administradores"""
    session.clear()
    return redirect(url_for('loginuser'))


# -------------------------
# 📌 APIs DE ADMINISTRADORES (POST)
# -------------------------

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


# =========================================================
# 📌 RUTAS DEL PANEL ADMIN (gestión de estudiantes/profesores)
# =========================================================

@app.route("/admin/estudiantes")
def admin_estudiantes():
    if 'user_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("estudiantes.html")


@app.route("/admin/profesores")
def admin_profesores():
    if 'user_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("profesores.html")


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



# =========================================================
# 📌 RUTAS FALTANTES
# =========================================================

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5006)
