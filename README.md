# 🎓 MiBoletín - Sistema de Gestión Académica

<div align="center">
  <img src="static/img/Logo.png" alt="Logo MiBoletín" width="200"/>
  
  ![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)
  ![Flask](https://img.shields.io/badge/Flask-3.1.3-green.svg)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-orange.svg)
  ![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)
  ![Licencia](https://img.shields.io/badge/Licencia-MIT-yellow.svg)
</div>

> Sistema integral de gestión académica para instituciones educativas. Administra estudiantes, profesores, calificaciones, asistencia y genera boletines en PDF.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Roles y Permisos](#-roles-y-permisos)
- [Funcionalidades](#-funcionalidades)
- [Generación de Reportes](#-generación-de-reportes)
- [Seguridad](#-seguridad)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

---

## ✨ Características

### 👨‍💼 Panel de Administrador
- ✅ Gestión completa de estudiantes y profesores
- ✅ Registro y verificación por email
- ✅ Recuperación de contraseña
- ✅ Administración de períodos académicos
- ✅ Gestión de grupos y materias
- ✅ Asignación de profesores a materias
- ✅ Asignación de estudiantes a grupos
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Generación de reportes en PDF

### 👨‍🏫 Panel de Profesor
- ✅ Gestión de estudiantes por materia
- ✅ Registro de calificaciones
- ✅ Tipos de notas configurables
- ✅ Registro de asistencia
- ✅ Observador académico
- ✅ Agenda de actividades
- ✅ Carga de materiales educativos
- ✅ Reportes individuales de estudiantes

### 🎓 Panel de Estudiante
- ✅ Visualización de calificaciones
- ✅ Consulta de desempeño académico
- ✅ Registro de asistencia
- ✅ Acceso a materiales de clase
- ✅ Consulta de observaciones

---

## 🛠 Tecnologías

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Backend | Flask | 3.1.3 |
| Base de Datos | PostgreSQL (Supabase) | - |
| ORM | psycopg2 | 2.9.11 |
| Plantillas | Jinja2 | 3.1.6 |
| PDFs | FPDF2 | 2.8.7 |
| Autenticación | Bcrypt | 5.0.0 |
| Email | SMTP Gmail | - |
| Contenedores | Docker | - |
| Variables de Entorno | python-dotenv | 1.2.2 |

---

## 📦 Requisitos Previos

- **Python** 3.12 o superior
- **PostgreSQL** (o cuenta de Supabase)
- **Docker** y **Docker Compose** (opcional)
- **Cuenta de Gmail** con App Password (para envío de emails)

---

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/mi-boletin.git
cd mi-boletin
```

### 2. Crear Entorno Virtual

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

### 3. Instalar Dependencias

```bash
pip install -r requirements.txt
```

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de Datos (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Clave Secreta para Sesiones
SECRET_KEY=tu-clave-secreta-muy-segura-aqui

# Configuración de Email (Gmail)
EMAIL_PASSWORD=tu-app-password-de-gmail
```

### Obtener App Password de Gmail

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. Habilita la verificación en dos pasos si no está activa
3. Ve a "App passwords"
4. Genera una nueva contraseña para "Mail"
5. Copia la contraseña generada en `EMAIL_PASSWORD`

---

## ▶️ Ejecución

### Modo Desarrollo

```bash
python app.py
```

La aplicación estará disponible en: `http://localhost:5005`

### Usando Docker

```bash
docker-compose up -d
```

La aplicación estará disponible en: `http://localhost:5005`

---

## 📁 Estructura del Proyecto

```
MI_BOLETIN_APLICATIVO_ADMIN/
├── app.py                 # Aplicación principal Flask
├── requirements.txt       # Dependencias Python
├── Dockerfile             # Imagen Docker
├── docker-compose.yml     # Orquestación de contenedores
├── .env.example          # Plantilla de variables de entorno
├── .gitignore            # Archivos ignorados por Git
├── static/
│   ├── css/              # Estilos CSS
│   │   ├── main.css      # Estilos principales
│   │   ├── login.css     # Estilos de autenticación
│   │   ├── estudiante.css # Estilos panel estudiante
│   │   ├── profesor.css  # Estilos panel profesor
│   │   └── dashboard-extra.css # Estilos adicionales dashboard
│   ├── script/           # JavaScript del frontend
│   │   ├── login.js      # Lógica de autenticación
│   │   ├── dashboard.js  # Dashboard admin
│   │   ├── estudiante.js # Panel estudiante
│   │   ├── profesor.js   # Panel profesor
│   │   └── *.js          # Otros scripts
│   └── img/              # Imágenes y logos
├── templates/
│   ├── general/          # Plantillas compartidas
│   │   ├── base.html     # Plantilla base
│   │   ├── loginuser.html # Login usuarios
│   │   └── solicitud.html # Formulario de solicitud
│   ├── administrador/    # Panel de administración
│   │   ├── dashboard.html # Dashboard principal
│   │   ├── loginadmin.html # Login admin
│   │   ├── registeradmin.html # Registro admin
│   │   ├── e-verification.html # Verificación email
│   │   ├── f-password.html # Recuperar contraseña
│   │   └── r-password.html # Restablecer contraseña
│   ├── estudiantes/      # Panel de estudiantes
│   │   └── estudiante.html
│   └── profesor/         # Panel de profesores
│       └── profesor.html
└── README.md             # Este archivo
```

---

## 🔗 API Endpoints

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Página principal |
| GET | `/loginuser` | Login de usuarios (estudiantes) |
| GET | `/admin` | Login de administradores |
| GET | `/register` | Registro de administradores |
| POST | `/login` | Iniciar sesión |
| POST | `/register` | Registrar nuevo admin |
| POST | `/verify-code` | Verificar código de email |
| POST | `/resend-code` | Reenviar código de verificación |
| GET | `/logout` | Cerrar sesión |
| POST | `/change-password` | Cambiar contraseña |

### Recuperación de Contraseña

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/forgot-password` | Solicitar recuperación |
| POST | `/request-password` | Enviar email de recuperación |
| POST | `/reset-password` | Restablecer contraseña |

### Gestión (Admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | Dashboard principal |
| GET | `/admin/estudiantes` | Listar estudiantes |
| GET | `/admin/profesores` | Listar profesores |
| POST | `/registrar-estudiante` | Registrar estudiante |
| POST | `/registrar-profesor` | Registrar profesor |
| POST | `/actualizar-estudiante` | Actualizar estudiante |
| POST | `/actualizar-profesor` | Actualizar profesor |
| POST | `/eliminar-estudiante` | Eliminar estudiante |
| POST | `/eliminar-profesor` | Eliminar profesor |

### Configuración Académica (Admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/admin/periodos` | Gestionar períodos |
| GET/POST | `/admin/grupos` | Gestionar grupos |
| GET/POST | `/admin/materias` | Gestionar materias |
| GET/POST | `/admin/asignaciones` | Asignar profesor-materia |
| POST | `/admin/asignar-estudiante` | Asignar estudiante a grupo |
| POST | `/admin/quitar-estudiante` | Quitar estudiante de grupo |

### Panel Profesor

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/profesor` | Dashboard del profesor |
| GET | `/profesor/estudiantes` | Ver mis estudiantes |
| GET/POST | `/profesor/tipos-nota` | Configurar tipos de nota |
| POST | `/profesor/subir-nota` | Registrar calificación |
| POST | `/profesor/subir-notas-masivo` | Registro masivo de notas |
| GET/POST | `/profesor/asistencia` | Gestión de asistencia |
| POST | `/profesor/observador` | Agregar observación |
| GET | `/profesor/observador/<id>` | Ver observaciones |
| GET/POST | `/profesor/agenda` | Agenda de actividades |
| GET/POST | `/profesor/material` | Gestionar materiales |

### Panel Estudiante

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/estudiante` | Dashboard del estudiante |
| GET | `/estudiante/notas` | Ver calificaciones |
| GET | `/estudiante/desempeno` | Ver desempeño académico |
| GET | `/estudiante/asistencia` | Ver asistencia |
| GET | `/estudiante/material` | Ver materiales |
| GET | `/estudiante/observador` | Ver observaciones |

### Reportes PDF

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reporte/estudiantes/pdf` | Reporte de estudiantes |
| GET | `/reporte/profesores/pdf` | Reporte de profesores |
| GET | `/reporte/resumen/pdf` | Reporte resumen |
| GET | `/reporte/administradores/pdf` | Reporte de admins |
| GET | `/profesor/reporte/<id>/pdf` | Reporte individual estudiante |

---

## 👥 Roles y Permisos

### 🔐 Administrador
- Acceso completo al sistema
- Gestión de usuarios (estudiantes, profesores, otros admins)
- Configuración de períodos, grupos y materias
- Ver todas las estadísticas
- Generar reportes generales

### 👨‍🏫 Profesor
- Gestión de sus propios estudiantes
- Registro de calificaciones
- Control de asistencia
- Agenda personal
- Carga de materiales
- Agregar observaciones

### 🎓 Estudiante
- Consulta de calificaciones propias
- Ver desempeño académico
- Revisar asistencia
- Acceder a materiales
- Ver observaciones de profesores

---

## 🎯 Funcionalidades Detalladas

### 📊 Dashboard del Administrador
- Estadísticas en tiempo real
- Gráficos de estudiantes por grupo
- Resumen de actividad reciente
- Accesos rápidos a funciones principales

### 📝 Sistema de Calificaciones
- Configuración de tipos de nota (Parcial, Quiz, Tarea, etc.)
- Escala de notas personalizable
- Cálculo automático de promedios
- Registro individual y masivo

### 📅 Agenda Académica
- Programación de actividades
- Estados: Pendiente, En curso, Completado
-纪录 de eventos académicos

### 📚 Gestión de Materiales
- Soporte para documentos
- Organización por materia
- Acceso para estudiantes

### 📋 Observador Académico
- Registro de observaciones por estudiante
- Historial completo
- Seguimiento del desempeño

---

## 📄 Generación de Reportes

El sistema genera reportes en formato PDF utilizando **FPDF2**:

| Reporte | Descripción |
|---------|-------------|
| **Reporte de Estudiantes** | Lista completa con datos y estadísticas |
| **Reporte de Profesores** | Directorio del cuerpo docente |
| **Reporte Resumen** | Panorama general de la institución |
| **Reporte Administradores** | Listado de usuarios admin |
| **Reporte Individual** | Boleta personal de calificaciones |

Los PDFs incluyen:
- Encabezado institucional
- Logo de la aplicación
- Información del estudiante/profesor
- Tablas de datos formateadas
- Fecha y período académico

---

## 🔒 Seguridad

### Contraseñas
- Almacenamiento seguro con **bcrypt**
- Hash de contraseñas con sal
- No se almacenan contraseñas en texto plano

### Sesiones
- Clave secreta configurable
- Tokens de sesión seguros
- Tiempo de expiración configurable

### Verificación de Email
- Código de verificación de 6 dígitos
- Validez de 5 minutos
- Reenvío limitado para prevenir abuso

### Base de Datos
- Conexión SSL para PostgreSQL
- Prepared statements (previene SQL injection)
- Consultas parametrizadas

---

## 🤝 Contribución

¡Contribuciones son bienvenidas! Para contribuir:

1. **Fork** el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcion`)
3. **Commit** tus cambios (`git commit -m 'Agregar nueva función'`)
4. **Push** a la rama (`git push origin feature/nueva-funcion`)
5. Abre un **Pull Request**

### Guías de Estilo
- Sigue el estilo de código existente
- Agrega comentarios descriptivos
- Actualiza la documentación si es necesario

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 📧 Contacto

- **Email**: miboletinpep@gmail.com
- **Sitio Web**: MiBoletin.com

---

<div align="center">
  <p>Hecho con ❤️ para la comunidad educativa</p>
  <p>© 2024-2026 MiBoletín. Todos los derechos reservados.</p>
</div>
