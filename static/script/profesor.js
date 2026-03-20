// ── Elementos del DOM ──
const profileButton = document.getElementById('profileButton');
const profileModal = document.getElementById('profileModal');
const closeModal = document.getElementById('closeModal');
const openEdit = document.getElementById('openEdit');
const openPassword = document.getElementById('openPassword');
const editModal = document.getElementById('editModal');
const closeEdit = document.getElementById('closeEdit');
const cancelEdit = document.getElementById('cancelEdit');
const passwordModal = document.getElementById('passwordModal');
const closePassword = document.getElementById('closePassword');
const cancelPassword = document.getElementById('cancelPassword');
const savePassword = document.getElementById('savePassword');
const menuItems = Array.from(document.querySelectorAll('.menu-item'));
const content = document.getElementById('content');

// ── Modales ──
function toggleModal(modal, show) {
  if (!modal) return;
  modal.classList.toggle('active', show);
  modal.setAttribute('aria-hidden', String(!show));
}

profileButton.addEventListener('click', () => toggleModal(profileModal, true));
closeModal.addEventListener('click', () => toggleModal(profileModal, false));
openEdit.addEventListener('click', () => { toggleModal(profileModal, false); toggleModal(editModal, true); });
closeEdit.addEventListener('click', () => toggleModal(editModal, false));
cancelEdit.addEventListener('click', () => toggleModal(editModal, false));
openPassword.addEventListener('click', () => { toggleModal(profileModal, false); toggleModal(passwordModal, true); });
closePassword.addEventListener('click', () => toggleModal(passwordModal, false));
cancelPassword.addEventListener('click', () => toggleModal(passwordModal, false));

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { toggleModal(profileModal, false); toggleModal(editModal, false); toggleModal(passwordModal, false); }
});

// ── Cambiar contraseña ──
savePassword.addEventListener('click', async () => {
  const current = document.getElementById('currentPassword').value;
  const nueva = document.getElementById('newPassword').value;
  const confirmar = document.getElementById('confirmPassword').value;
  if (!current || !nueva || !confirmar) return alert('Completa todos los campos.');
  if (nueva !== confirmar) return alert('Las contraseñas no coinciden.');
  const res = await fetch('/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: current, new_password: nueva, confirm_password: confirmar })
  });
  const data = await res.json();
  alert(data.message);
  if (data.status === 'success') toggleModal(passwordModal, false);
});

// ── Navegación ──
menuItems.forEach(item => {
  item.addEventListener('click', () => {
    menuItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    renderSection(item.dataset.section);
  });
});

// ── Renderizar secciones ──
async function renderSection(section) {
  switch(section) {
    case 'inicio': renderInicio(); break;
    case 'notas': await renderNotas(); break;
    case 'observador': await renderObservador(); break;
    case 'reporte': await renderReporte(); break;
    case 'agenda': await renderAgenda(); break;
    default: renderInicio();
  }
}

function renderInicio() {
  content.innerHTML = `
    <div class="card">
      <h2>👋 Bienvenido a MiBoletín</h2>
      <p>Usa el menú para subir notas, revisar el observador, ver reportes o gestionar tu agenda.</p>
    </div>`;
}

// ── SUBIR NOTAS ──
async function renderNotas() {
  const [estudiantesRes, materiasRes, tiposRes] = await Promise.all([
    fetch('/profesor/estudiantes').then(r => r.json()),
    fetch('/profesor/materias').then(r => r.json()),
    fetch('/profesor/tipos-nota').then(r => r.json())
  ]);

  const estudiantes = estudiantesRes.data || [];
  const materias = materiasRes.data || [];
  const tipos = tiposRes.data || [];

  content.innerHTML = `
    <div class="card">
      <h2>📝 Subir Notas</h2>
      <div class="form-group">
        <label>Estudiante</label>
        <select id="selEstudiante">
          <option value="">Selecciona un estudiante</option>
          ${estudiantes.map(e => `<option value="${e.id_estudiante}">${e.nombre_completo} — ${e.codigo_estudiante}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Materia / Grupo</label>
        <select id="selMateria">
          <option value="">Selecciona una materia</option>
          ${materias.map(m => `<option value="${m.id_grupo_materia}">${m.materia} — ${m.grupo}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Tipo de Nota</label>
        <select id="selTipo">
          <option value="">Selecciona tipo</option>
          ${tipos.map(t => `<option value="${t.id_tipo}">${t.nombre_tipo}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Valor (0.0 — 5.0)</label>
        <input type="number" id="inputValor" min="0" max="5" step="0.1" placeholder="Ej: 4.5">
      </div>
      <div class="form-group">
        <label>Descripción (opcional)</label>
        <textarea id="inputDesc" placeholder="Observación sobre la nota..."></textarea>
      </div>
      <button class="save" onclick="subirNota()">💾 Guardar Nota</button>
      <div id="notaMsg" style="margin-top:12px;"></div>
    </div>

    <div class="card" style="margin-top:24px;">
      <h2>📋 Notas Registradas</h2>
      <div class="form-group">
        <label>Ver notas de estudiante</label>
        <select id="selEstudianteNotas" onchange="cargarNotas(this.value)">
          <option value="">Selecciona un estudiante</option>
          ${estudiantes.map(e => `<option value="${e.id_estudiante}">${e.nombre_completo}</option>`).join('')}
        </select>
      </div>
      <div id="tablaNotas"></div>
    </div>`;
}

async function subirNota() {
  const id_estudiante = document.getElementById('selEstudiante').value;
  const id_grupo_materia = document.getElementById('selMateria').value;
  const id_tipo = document.getElementById('selTipo').value;
  const valor = document.getElementById('inputValor').value;
  const descripcion = document.getElementById('inputDesc').value;
  const msg = document.getElementById('notaMsg');

  if (!id_estudiante || !id_grupo_materia || !id_tipo || !valor) {
    msg.innerHTML = `<span style="color:red">⚠️ Completa todos los campos obligatorios.</span>`;
    return;
  }

  const res = await fetch('/profesor/subir-nota', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_estudiante, id_grupo_materia, id_tipo, valor, descripcion })
  });
  const data = await res.json();
  msg.innerHTML = `<span style="color:${data.status === 'success' ? 'green' : 'red'}">${data.message}</span>`;
}

async function cargarNotas(id_estudiante) {
  if (!id_estudiante) return;
  const res = await fetch(`/profesor/notas/${id_estudiante}`);
  const data = await res.json();
  const notas = data.data || [];
  const tabla = document.getElementById('tablaNotas');
  if (!notas.length) { tabla.innerHTML = '<p>No hay notas registradas.</p>'; return; }
  tabla.innerHTML = `
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <thead><tr style="background:#f0f4f8;">
        <th style="padding:10px;text-align:left;">Materia</th>
        <th>Tipo</th><th>Valor</th><th>Descripción</th><th>Fecha</th>
      </tr></thead>
      <tbody>
        ${notas.map(n => `<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px;">${n.materia}</td>
          <td style="text-align:center;">${n.nombre_tipo}</td>
          <td style="text-align:center;font-weight:700;color:${n.valor >= 3 ? '#38a169' : '#e53e3e'};">${n.valor}</td>
          <td>${n.descripcion || '-'}</td>
          <td>${n.fecha_registro}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── OBSERVADOR ──
async function renderObservador() {
  const res = await fetch('/profesor/estudiantes');
  const data = await res.json();
  const estudiantes = data.data || [];

  content.innerHTML = `
    <div class="card">
      <h2>👁 Observador de Estudiantes</h2>
      <div class="form-group">
        <label>Estudiante</label>
        <select id="selEstObs" onchange="cargarObservaciones(this.value)">
          <option value="">Selecciona un estudiante</option>
          ${estudiantes.map(e => `<option value="${e.id_estudiante}">${e.nombre_completo} — ${e.codigo_estudiante}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Tipo de observación</label>
        <select id="selTipoObs">
          <option value="positivo">✅ Positivo</option>
          <option value="negativo">❌ Negativo</option>
          <option value="neutro">📌 Neutro</option>
        </select>
      </div>
      <div class="form-group">
        <label>Descripción</label>
        <textarea id="inputObs" placeholder="Describe el comportamiento o situación..."></textarea>
      </div>
      <button class="save" onclick="guardarObservacion()">💾 Guardar Observación</button>
      <div id="obsMsg" style="margin-top:12px;"></div>
    </div>

    <div class="card" style="margin-top:24px;">
      <h2>📋 Historial de Observaciones</h2>
      <div id="listaObs"><p>Selecciona un estudiante para ver su historial.</p></div>
    </div>`;
}

async function guardarObservacion() {
  const id_estudiante = document.getElementById('selEstObs').value;
  const tipo = document.getElementById('selTipoObs').value;
  const descripcion = document.getElementById('inputObs').value;
  const msg = document.getElementById('obsMsg');

  if (!id_estudiante || !descripcion) {
    msg.innerHTML = `<span style="color:red">⚠️ Selecciona un estudiante y escribe una descripción.</span>`;
    return;
  }
  const res = await fetch('/profesor/observador', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_estudiante, tipo, descripcion })
  });
  const data = await res.json();
  msg.innerHTML = `<span style="color:${data.status === 'success' ? 'green' : 'red'}">${data.message}</span>`;
  if (data.status === 'success') cargarObservaciones(id_estudiante);
}

async function cargarObservaciones(id_estudiante) {
  if (!id_estudiante) return;
  const res = await fetch(`/profesor/observador/${id_estudiante}`);
  const data = await res.json();
  const obs = data.data || [];
  const lista = document.getElementById('listaObs');
  if (!obs.length) { lista.innerHTML = '<p>No hay observaciones registradas.</p>'; return; }
  const colores = { positivo: '#c6f6d5', negativo: '#fed7d7', neutro: '#e2e8f0' };
  const iconos = { positivo: '✅', negativo: '❌', neutro: '📌' };
  lista.innerHTML = obs.map(o => `
    <div style="background:${colores[o.tipo]};padding:14px;border-radius:12px;margin-bottom:10px;">
      <strong>${iconos[o.tipo]} ${o.tipo.toUpperCase()}</strong>
      <p style="margin:6px 0;">${o.descripcion}</p>
      <small style="color:#666;">${o.fecha_registro}</small>
    </div>`).join('');
}

// ── REPORTE GENERAL ──
async function renderReporte() {
  const res = await fetch('/profesor/estudiantes');
  const data = await res.json();
  const estudiantes = data.data || [];

  content.innerHTML = `
    <div class="card">
      <h2>📊 Reporte General del Estudiante</h2>
      <div class="form-group">
        <label>Selecciona un estudiante</label>
        <select id="selEstReporte" onchange="cargarReporte(this.value)">
          <option value="">Selecciona un estudiante</option>
          ${estudiantes.map(e => `<option value="${e.id_estudiante}">${e.nombre_completo} — ${e.codigo_estudiante}</option>`).join('')}
        </select>
      </div>
      <div id="reporteContenido"></div>
    </div>`;
}

async function cargarReporte(id_estudiante) {
  if (!id_estudiante) return;
  const res = await fetch(`/profesor/reporte/${id_estudiante}`);
  const data = await res.json();
  if (data.status !== 'success') return;
  const { estudiante, notas, observaciones, promedio } = data.data;
  const colorPromedio = promedio >= 3 ? '#38a169' : '#e53e3e';

  document.getElementById('reporteContenido').innerHTML = `
    <div style="margin-top:20px;padding:16px;background:#f0f4f8;border-radius:12px;">
      <h3 style="margin:0;">${estudiante.nombre_completo}</h3>
      <p style="margin:4px 0;color:#666;">Código: ${estudiante.codigo_estudiante} | Grado: ${estudiante.grado} ${estudiante.grupo}</p>
      <p style="font-size:22px;font-weight:700;color:${colorPromedio};">Promedio General: ${promedio}</p>
    </div>

    <h3 style="margin-top:20px;">📝 Notas</h3>
    ${notas.length ? `
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f0f4f8;">
        <th style="padding:10px;text-align:left;">Materia</th><th>Tipo</th><th>Valor</th><th>Fecha</th>
      </tr></thead>
      <tbody>
        ${notas.map(n => `<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px;">${n.materia}</td>
          <td style="text-align:center;">${n.nombre_tipo}</td>
          <td style="text-align:center;font-weight:700;color:${n.valor >= 3 ? '#38a169' : '#e53e3e'};">${n.valor}</td>
          <td>${n.fecha_registro}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p>No hay notas registradas.</p>'}

    <h3 style="margin-top:20px;">👁 Observaciones</h3>
    ${observaciones.length ? observaciones.map(o => {
      const colores = { positivo: '#c6f6d5', negativo: '#fed7d7', neutro: '#e2e8f0' };
      const iconos = { positivo: '✅', negativo: '❌', neutro: '📌' };
      return `<div style="background:${colores[o.tipo]};padding:12px;border-radius:10px;margin-bottom:8px;">
        <strong>${iconos[o.tipo]} ${o.tipo}</strong>
        <p style="margin:4px 0;">${o.descripcion}</p>
        <small>${o.fecha_registro}</small>
      </div>`;
    }).join('') : '<p>No hay observaciones registradas.</p>'}`;
}

// ── AGENDA ──
async function renderAgenda() {
  const res = await fetch('/profesor/agenda');
  const data = await res.json();
  const eventos = data.data || [];

  content.innerHTML = `
    <div class="card">
      <h2>📅 Agenda</h2>
      <div class="form-group">
        <label>Título</label>
        <input type="text" id="agTitulo" placeholder="Ej: Examen parcial">
      </div>
      <div class="form-group">
        <label>Descripción (opcional)</label>
        <textarea id="agDesc" placeholder="Detalles del evento..."></textarea>
      </div>
      <div style="display:flex;gap:12px;">
        <div class="form-group" style="flex:1;">
          <label>Fecha</label>
          <input type="date" id="agFecha">
        </div>
        <div class="form-group" style="flex:1;">
          <label>Hora inicio</label>
          <input type="time" id="agHoraInicio">
        </div>
        <div class="form-group" style="flex:1;">
          <label>Hora fin</label>
          <input type="time" id="agHoraFin">
        </div>
      </div>
      <button class="save" onclick="agregarEvento()">➕ Agregar Evento</button>
      <div id="agMsg" style="margin-top:12px;"></div>
    </div>

    <div class="card" style="margin-top:24px;">
      <h2>📋 Eventos Pendientes</h2>
      <div id="listaAgenda">
        ${eventos.length ? eventos.map(e => `
          <div style="padding:14px;border-radius:12px;background:#f0f4f8;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${e.titulo}</strong>
              <p style="margin:4px 0;color:#666;">${e.descripcion || ''}</p>
              <small>📅 ${e.fecha_evento} ${e.hora_inicio ? '⏰ ' + e.hora_inicio : ''}</small>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="save" style="padding:8px 12px;" onclick="cambiarEstado(${e.id_agenda}, 'completado')">✅</button>
              <button class="cancel" style="padding:8px 12px;" onclick="cambiarEstado(${e.id_agenda}, 'cancelado')">❌</button>
            </div>
          </div>`).join('') : '<p>No hay eventos pendientes.</p>'}
      </div>
    </div>`;
}

async function agregarEvento() {
  const titulo = document.getElementById('agTitulo').value;
  const descripcion = document.getElementById('agDesc').value;
  const fecha_evento = document.getElementById('agFecha').value;
  const hora_inicio = document.getElementById('agHoraInicio').value;
  const hora_fin = document.getElementById('agHoraFin').value;
  const msg = document.getElementById('agMsg');

  if (!titulo || !fecha_evento) {
    msg.innerHTML = `<span style="color:red">⚠️ Título y fecha son requeridos.</span>`;
    return;
  }
  const res = await fetch('/profesor/agenda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, descripcion, fecha_evento, hora_inicio, hora_fin })
  });
  const data = await res.json();
  msg.innerHTML = `<span style="color:${data.status === 'success' ? 'green' : 'red'}">${data.message}</span>`;
  if (data.status === 'success') await renderAgenda();
}

async function cambiarEstado(id_agenda, estado) {
  await fetch(`/profesor/agenda/${id_agenda}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado })
  });
  await renderAgenda();
}

// ── CSS adicional para forms ──
const style = document.createElement('style');
style.textContent = `
  .form-group { margin-bottom: 16px; }
  .form-group label { display:block; font-weight:600; color:#1f3a5d; margin-bottom:6px; }
  .form-group input, .form-group select, .form-group textarea {
    width:100%; padding:10px 14px; border:1px solid #d1d5db;
    border-radius:10px; font-size:15px; font-family:inherit;
  }
  .form-group textarea { min-height:80px; resize:vertical; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
    outline:none; border-color:#3182ce; box-shadow:0 0 0 3px rgba(49,130,206,0.1);
  }
`;
document.head.appendChild(style);

// ── Inicialización ──
renderInicio();