// ── Elementos del DOM ──
const profileButton  = document.getElementById('profileButton');
const profileModal   = document.getElementById('profileModal');
const closeModal     = document.getElementById('closeModal');
const openEdit       = document.getElementById('openEdit');
const openPassword   = document.getElementById('openPassword');
const editModal      = document.getElementById('editModal');
const closeEdit      = document.getElementById('closeEdit');
const cancelEdit     = document.getElementById('cancelEdit');
const passwordModal  = document.getElementById('passwordModal');
const closePassword  = document.getElementById('closePassword');
const cancelPassword = document.getElementById('cancelPassword');
const savePassword   = document.getElementById('savePassword');
const menuItems      = Array.from(document.querySelectorAll('.menu-item'));
const content        = document.getElementById('content');

// ── Modales ──
function toggleModal(modal, show) {
  if (!modal) return;
  modal.classList.toggle('active', show);
  modal.setAttribute('aria-hidden', String(!show));
}
profileButton .addEventListener('click', () => toggleModal(profileModal, true));
closeModal    .addEventListener('click', () => toggleModal(profileModal, false));
openEdit      .addEventListener('click', () => { toggleModal(profileModal,false); toggleModal(editModal,true); });
closeEdit     .addEventListener('click', () => toggleModal(editModal, false));
cancelEdit    .addEventListener('click', () => toggleModal(editModal, false));
openPassword  .addEventListener('click', () => { toggleModal(profileModal,false); toggleModal(passwordModal,true); });
closePassword .addEventListener('click', () => toggleModal(passwordModal, false));
cancelPassword.addEventListener('click', () => toggleModal(passwordModal, false));
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    toggleModal(profileModal,false); toggleModal(editModal,false); toggleModal(passwordModal,false);
  }
});

// ── Cambiar contraseña ──
savePassword.addEventListener('click', async () => {
  const current   = document.getElementById('currentPassword').value;
  const nueva     = document.getElementById('newPassword').value;
  const confirmar = document.getElementById('confirmPassword').value;
  if (!current||!nueva||!confirmar) return alert('Completa todos los campos.');
  if (nueva !== confirmar) return alert('Las contraseñas no coinciden.');
  const res  = await fetch('/change-password', { method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ current_password:current, new_password:nueva, confirm_password:confirmar }) });
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

async function renderSection(section) {
  switch(section) {
    case 'inicio':     renderInicio();           break;
    case 'notas':      await renderNotas();      break;
    case 'observador': await renderObservador(); break;
    case 'reporte':    await renderReporte();    break;
    case 'agenda':     await renderAgenda();     break;
    case 'asistencia': await renderAsistencia(); break;
    case 'material':   await renderMaterial();   break;
    default:           renderInicio();
  }
}

function renderInicio() {
  content.innerHTML = `
  <div class="prof-welcome">

    <div class="prof-hero-card">
      <div class="prof-hero-icon"><i class="fas fa-chalkboard-teacher"></i></div>
      <div class="prof-hero-text">
        <h2>¡Bienvenido a MiBoletín!</h2>
        <p>Gestiona tus clases, registra notas, pasa asistencia, comparte material y sigue el progreso de tus estudiantes.</p>
      </div>
    </div>

    <div class="prof-quick-title">Accesos Rápidos</div>
    <div class="prof-quick-grid">
      <button class="prof-quick-card" onclick="navToProf('notas')">
        <div class="pqc-icon" style="background:#ebf8ff;color:#3182ce;"><i class="fas fa-graduation-cap"></i></div>
        <div class="pqc-info">
          <strong>Subir Notas</strong>
          <span>Registra notas por materia</span>
        </div>
        <i class="fas fa-chevron-right pqc-arrow"></i>
      </button>

      <button class="prof-quick-card" onclick="navToProf('asistencia')">
        <div class="pqc-icon" style="background:#f0fff4;color:#38a169;"><i class="fas fa-calendar-check"></i></div>
        <div class="pqc-info">
          <strong>Asistencia</strong>
          <span>Pasa lista a tus grupos</span>
        </div>
        <i class="fas fa-chevron-right pqc-arrow"></i>
      </button>

      <button class="prof-quick-card" onclick="navToProf('material')">
        <div class="pqc-icon" style="background:#faf5ff;color:#805ad5;"><i class="fas fa-folder-open"></i></div>
        <div class="pqc-info">
          <strong>Material</strong>
          <span>Publica recursos de clase</span>
        </div>
        <i class="fas fa-chevron-right pqc-arrow"></i>
      </button>

      <button class="prof-quick-card" onclick="navToProf('observador')">
        <div class="pqc-icon" style="background:#fffbeb;color:#d69e2e;"><i class="fas fa-eye"></i></div>
        <div class="pqc-info">
          <strong>Observador</strong>
          <span>Registra comportamientos</span>
        </div>
        <i class="fas fa-chevron-right pqc-arrow"></i>
      </button>

      <button class="prof-quick-card" onclick="navToProf('reporte')">
        <div class="pqc-icon" style="background:#fff5f5;color:#e53e3e;"><i class="fas fa-chart-bar"></i></div>
        <div class="pqc-info">
          <strong>Reporte General</strong>
          <span>Descarga PDF de estudiantes</span>
        </div>
        <i class="fas fa-chevron-right pqc-arrow"></i>
      </button>

      <button class="prof-quick-card" onclick="navToProf('agenda')">
        <div class="pqc-icon" style="background:#ebf8ff;color:#2b6cb0;"><i class="fas fa-calendar-alt"></i></div>
        <div class="pqc-info">
          <strong>Agenda</strong>
          <span>Organiza tus eventos</span>
        </div>
        <i class="fas fa-chevron-right pqc-arrow"></i>
      </button>
    </div>

  </div>`;
}

window.navToProf = function(sec) {
  const items = Array.from(document.querySelectorAll('.menu-item'));
  items.forEach(i => i.classList.toggle('active', i.dataset.section === sec));
  renderSection(sec);
};


// ══════════════════════════════════════════════════════
//  SUBIR NOTAS — Tabla con todos los estudiantes
// ══════════════════════════════════════════════════════
let notasData = { materias: [], tipos: [], estudiantes: [] };

async function renderNotas() {
  const [materiasRes, tiposRes] = await Promise.all([
    fetch('/profesor/materias').then(r => r.json()),
    fetch('/profesor/tipos-nota').then(r => r.json())
  ]);
  notasData.materias = materiasRes.data || [];
  notasData.tipos    = tiposRes.data    || [];

  content.innerHTML = `
  <div class="section-header-bar">
    <div>
      <h2 class="section-title">📝 Subir Notas</h2>
      <p class="section-sub">Selecciona materia y tipo de nota para ver la tabla de estudiantes.</p>
    </div>
  </div>

  <div class="filtros-bar">
    <div class="filtro-group">
      <label>Materia / Grupo</label>
      <select id="selMateria" onchange="cargarTablaNotas()">
        <option value="">Selecciona una materia</option>
        ${notasData.materias.map(m=>`<option value="${m.id_grupo_materia}">${m.materia} — ${m.grupo}</option>`).join('')}
      </select>
    </div>
    <div class="filtro-group">
      <label>Tipo de Nota</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <select id="selTipo" onchange="cargarTablaNotas()" style="flex:1;">
          <option value="">Selecciona tipo</option>
          ${notasData.tipos.map(t=>`<option value="${t.id_tipo}">${t.nombre_tipo}</option>`).join('')}
        </select>
        <button class="btn-nuevo-tipo" onclick="toggleNuevoTipo()" title="Crear nuevo tipo de nota">＋</button>
      </div>
      <div id="nuevo-tipo-panel" style="display:none;margin-top:8px;background:#f0f7ff;border:1px solid #bee3f8;border-radius:10px;padding:12px;">
        <p style="margin:0 0 8px;font-size:13px;color:#2b6cb0;font-weight:600;">✏️ Crear nuevo tipo de nota</p>
        <div style="display:flex;gap:8px;">
          <input type="text" id="input-nuevo-tipo" placeholder="Ej: Examen parcial"
            style="flex:1;padding:8px 12px;border:1px solid #bee3f8;border-radius:8px;font-size:14px;font-family:inherit;"
            onkeydown="if(event.key==='Enter') crearTipoNota()">
          <button class="btn-guardar" style="width:auto;padding:8px 16px;margin:0;font-size:13px;" onclick="crearTipoNota()">Crear</button>
        </div>
        <div id="tipo-msg" style="margin-top:6px;font-size:13px;min-height:18px;"></div>
      </div>
    </div>
    <div class="filtro-group" style="align-self:flex-end;">
      <button class="btn-guardar" id="btnGuardarNotas" onclick="guardarTodasNotas()" disabled>
        💾 Guardar Todas
      </button>
    </div>
  </div>

  <div id="notas-msg" class="nota-msg" style="margin:8px 0;"></div>
  <div id="tabla-notas-container">
    <div class="empty-table-msg">
      <span>📋</span>
      <p>Selecciona una materia y tipo de nota para ver los estudiantes.</p>
    </div>
  </div>`;
}

window.cargarTablaNotas = async function() {
  const id_gm   = document.getElementById('selMateria')?.value;
  const id_tipo = document.getElementById('selTipo')?.value;
  const cont    = document.getElementById('tabla-notas-container');
  const btnGuardar = document.getElementById('btnGuardarNotas');

  if (!id_gm || !id_tipo) {
    cont.innerHTML = `<div class="empty-table-msg"><span>📋</span><p>Selecciona una materia y tipo de nota.</p></div>`;
    if (btnGuardar) btnGuardar.disabled = true;
    return;
  }

  cont.innerHTML = `<div class="loading-state">⏳ Cargando estudiantes...</div>`;
  const res  = await fetch(`/profesor/estudiantes-por-materia/${id_gm}`);
  const data = await res.json();
  const estudiantes = data.data || [];
  notasData.estudiantes = estudiantes;

  if (!estudiantes.length) {
    cont.innerHTML = `<div class="empty-table-msg"><span>👥</span><p>No hay estudiantes asignados a esta materia.</p></div>`;
    if (btnGuardar) btnGuardar.disabled = true;
    return;
  }

  if (btnGuardar) btnGuardar.disabled = false;

  cont.innerHTML = `
  <div class="tabla-scroll">
    <table class="grade-table">
      <thead>
        <tr>
          <th class="th-num">#</th>
          <th class="th-codigo">Código</th>
          <th class="th-nombre">Nombre del Estudiante</th>
          <th class="th-grado">Grado</th>
          <th class="th-nota">Nota (0–5)</th>
          <th class="th-desc">Descripción</th>
          <th class="th-estado">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${estudiantes.map((e,i) => `
        <tr class="grade-row" id="row-${e.id_estudiante}">
          <td class="td-num">${i+1}</td>
          <td class="td-codigo"><span class="codigo-badge">${e.codigo_estudiante}</span></td>
          <td class="td-nombre">${e.nombre_completo}</td>
          <td class="td-grado">${e.grado}–${e.grupo}</td>
          <td class="td-nota">
            <input type="number" class="nota-input" id="nota-${e.id_estudiante}"
              min="0" max="5" step="0.1" placeholder="—"
              oninput="actualizarEstadoFila(${e.id_estudiante}, this.value)">
          </td>
          <td class="td-desc">
            <input type="text" class="desc-input" id="desc-${e.id_estudiante}" placeholder="Opcional...">
          </td>
          <td class="td-estado">
            <span class="estado-chip chip-vacio" id="chip-${e.id_estudiante}">Sin nota</span>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="table-footer">
    <span id="conteo-notas">0 / ${estudiantes.length} notas ingresadas</span>
  </div>`;
};

window.actualizarEstadoFila = function(id, valor) {
  const chip = document.getElementById(`chip-${id}`);
  const row  = document.getElementById(`row-${id}`);
  const v    = parseFloat(valor);

  // conteo
  const total   = notasData.estudiantes.length;
  const llenos  = notasData.estudiantes.filter(e => {
    const inp = document.getElementById(`nota-${e.id_estudiante}`);
    return inp && inp.value !== '';
  }).length;
  const conteo = document.getElementById('conteo-notas');
  if (conteo) conteo.textContent = `${llenos} / ${total} notas ingresadas`;

  if (!valor || isNaN(v)) {
    chip.className  = 'estado-chip chip-vacio';
    chip.textContent = 'Sin nota';
    row.classList.remove('row-aprobado','row-reprobado');
    return;
  }
  if (v >= 3) {
    chip.className   = 'estado-chip chip-aprobado';
    chip.textContent  = '✓ Aprobado';
    row.classList.add('row-aprobado'); row.classList.remove('row-reprobado');
  } else {
    chip.className   = 'estado-chip chip-reprobado';
    chip.textContent  = '✗ Reprobado';
    row.classList.add('row-reprobado'); row.classList.remove('row-aprobado');
  }
};

window.toggleNuevoTipo = function() {
  const panel = document.getElementById('nuevo-tipo-panel');
  if (!panel) return;
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) document.getElementById('input-nuevo-tipo')?.focus();
};

window.crearTipoNota = async function() {
  const input = document.getElementById('input-nuevo-tipo');
  const msg   = document.getElementById('tipo-msg');
  const nombre = input?.value?.trim();
  if (!nombre) { msg.innerHTML = `<span class="msg-err">⚠️ Escribe un nombre.</span>`; return; }

  const res  = await fetch('/profesor/tipos-nota', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre_tipo: nombre })
  });
  const data = await res.json();

  if (data.status === 'success') {
    msg.innerHTML = `<span class="msg-ok">✓ Tipo creado exitosamente.</span>`;
    input.value = '';
    // Agregar la nueva opción al select y seleccionarla
    const sel = document.getElementById('selTipo');
    if (sel && data.id_tipo) {
      const opt = document.createElement('option');
      opt.value = data.id_tipo;
      opt.textContent = nombre;
      sel.appendChild(opt);
      sel.value = data.id_tipo;
      notasData.tipos.push({ id_tipo: data.id_tipo, nombre_tipo: nombre });
    }
    // Cerrar el panel después de 1.5s
    setTimeout(() => {
      document.getElementById('nuevo-tipo-panel').style.display = 'none';
      msg.innerHTML = '';
      cargarTablaNotas();
    }, 1500);
  } else {
    msg.innerHTML = `<span class="msg-err">✗ ${data.message}</span>`;
  }
};

window.guardarTodasNotas = async function() {
  const id_gm   = document.getElementById('selMateria')?.value;
  const id_tipo = document.getElementById('selTipo')?.value;
  const msg     = document.getElementById('notas-msg');
  if (!id_gm || !id_tipo) return;

  const notas = [];
  notasData.estudiantes.forEach(e => {
    const valor = document.getElementById(`nota-${e.id_estudiante}`)?.value;
    const desc  = document.getElementById(`desc-${e.id_estudiante}`)?.value || '';
    if (valor) notas.push({ id_estudiante: e.id_estudiante, valor, descripcion: desc, id_tipo, id_grupo_materia: id_gm });
  });

  if (!notas.length) { msg.innerHTML = `<span class="msg-err">⚠️ No hay notas para guardar.</span>`; return; }

  const btn = document.getElementById('btnGuardarNotas');
  btn.disabled = true; btn.textContent = '⏳ Guardando...';

  const res  = await fetch('/profesor/subir-notas-masivo', { method:'POST',
    headers:{'Content-Type':'application/json'}, body: JSON.stringify({notas}) });
  const data = await res.json();
  msg.innerHTML = `<span class="${data.status==='success'?'msg-ok':'msg-err'}">${data.message}</span>`;
  btn.disabled = false; btn.innerHTML = '💾 Guardar Todas';
};


// ══════════════════════════════════════════════════════
//  ASISTENCIA — Tabla con checkboxes por día
// ══════════════════════════════════════════════════════
let asistData = { materias: [], estudiantes: [] };

async function renderAsistencia() {
  const res = await fetch('/profesor/materias');
  const d   = await res.json();
  asistData.materias = d.data || [];

  const hoy = new Date().toISOString().split('T')[0];

  content.innerHTML = `
  <div class="section-header-bar">
    <div>
      <h2 class="section-title">✅ Asistencia</h2>
      <p class="section-sub">Pasa lista fácilmente. Selecciona materia y fecha.</p>
    </div>
  </div>

  <div class="filtros-bar">
    <div class="filtro-group">
      <label>Materia / Grupo</label>
      <select id="asist-materia" onchange="cargarTablaAsistencia()">
        <option value="">Selecciona una materia</option>
        ${asistData.materias.map(m=>`<option value="${m.id_grupo_materia}">${m.materia} — ${m.grupo}</option>`).join('')}
      </select>
    </div>
    <div class="filtro-group">
      <label>Fecha</label>
      <input type="date" id="asist-fecha" value="${hoy}" onchange="cargarTablaAsistencia()">
    </div>
    <div class="filtro-group" style="align-self:flex-end;">
      <button class="btn-guardar" id="btnGuardarAsist" onclick="guardarAsistencia()" disabled>
        💾 Guardar Asistencia
      </button>
    </div>
  </div>

  <div id="asist-msg" class="nota-msg" style="margin:8px 0;"></div>

  <div class="asist-acciones" id="asist-acciones" style="display:none;margin-bottom:10px;">
    <button class="btn-accion-asist" onclick="marcarTodos('presente')">✓ Todos Presentes</button>
    <button class="btn-accion-asist" onclick="marcarTodos('ausente')">✗ Todos Ausentes</button>
  </div>

  <div id="tabla-asist-container">
    <div class="empty-table-msg">
      <span>📋</span>
      <p>Selecciona una materia y fecha para pasar lista.</p>
    </div>
  </div>`;
}

window.cargarTablaAsistencia = async function() {
  const id_gm = document.getElementById('asist-materia')?.value;
  const fecha = document.getElementById('asist-fecha')?.value;
  const cont  = document.getElementById('tabla-asist-container');
  const btnG  = document.getElementById('btnGuardarAsist');
  const acciones = document.getElementById('asist-acciones');

  if (!id_gm || !fecha) {
    cont.innerHTML = `<div class="empty-table-msg"><span>📋</span><p>Selecciona materia y fecha.</p></div>`;
    if (btnG) btnG.disabled = true;
    if (acciones) acciones.style.display = 'none';
    return;
  }

  cont.innerHTML = `<div class="loading-state">⏳ Cargando...</div>`;

  const [estRes, asistRes] = await Promise.all([
    fetch(`/profesor/estudiantes-por-materia/${id_gm}`).then(r=>r.json()),
    fetch(`/profesor/asistencia?id_grupo_materia=${id_gm}&fecha=${fecha}`).then(r=>r.json())
  ]);

  const estudiantes = estRes.data  || [];
  const registros   = asistRes.data || {};
  asistData.estudiantes = estudiantes;

  if (!estudiantes.length) {
    cont.innerHTML = `<div class="empty-table-msg"><span>👥</span><p>No hay estudiantes en esta materia.</p></div>`;
    if (btnG) btnG.disabled = true;
    if (acciones) acciones.style.display = 'none';
    return;
  }

  if (btnG) btnG.disabled = false;
  if (acciones) acciones.style.display = 'flex';

  const estados = ['presente','ausente','tardanza','justificado'];
  const colores = { presente:'#c6f6d5', ausente:'#fed7d7', tardanza:'#feebc8', justificado:'#bee3f8' };
  const iconos  = { presente:'✓', ausente:'✗', tardanza:'⏱', justificado:'📋' };

  cont.innerHTML = `
  <div class="tabla-scroll">
    <table class="grade-table">
      <thead>
        <tr>
          <th class="th-num">#</th>
          <th class="th-codigo">Código</th>
          <th class="th-nombre">Nombre del Estudiante</th>
          <th class="th-grado">Grado</th>
          ${estados.map(e=>`<th class="th-asist" style="background:${colores[e]};color:#2d3748;">${iconos[e]} ${e.charAt(0).toUpperCase()+e.slice(1)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${estudiantes.map((e,i) => {
          const actual = registros[e.id_estudiante] || 'presente';
          return `<tr class="grade-row asist-row" id="asist-row-${e.id_estudiante}" data-estado="${actual}">
            <td class="td-num">${i+1}</td>
            <td class="td-codigo"><span class="codigo-badge">${e.codigo_estudiante}</span></td>
            <td class="td-nombre">${e.nombre_completo}</td>
            <td class="td-grado">${e.grado}–${e.grupo}</td>
            ${estados.map(est => `
            <td class="td-asist">
              <button class="asist-btn ${actual===est?'asist-active':''}"
                style="${actual===est?`background:${colores[est]};border-color:${colores[est]};`:''}"
                onclick="setAsistencia(${e.id_estudiante}, '${est}', event)">
                ${iconos[est]}
              </button>
            </td>`).join('')}
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  <div class="table-footer">
    <span id="resumen-asist">${resumenAsistencia(registros, estudiantes)}</span>
  </div>`;
};

function resumenAsistencia(registros, estudiantes) {
  const c = { presente:0, ausente:0, tardanza:0, justificado:0 };
  estudiantes.forEach(e => { const est = registros[e.id_estudiante]||'presente'; c[est]=(c[est]||0)+1; });
  return `✓ ${c.presente} presentes  ✗ ${c.ausente} ausentes  ⏱ ${c.tardanza} tardanzas  📋 ${c.justificado} justificados`;
}

window.setAsistencia = function(id, estado, evt) {
  const row = document.getElementById(`asist-row-${id}`);
  row.dataset.estado = estado;
  const colores = { presente:'#c6f6d5', ausente:'#fed7d7', tardanza:'#feebc8', justificado:'#bee3f8' };
  row.querySelectorAll('.asist-btn').forEach(b => {
    b.classList.remove('asist-active');
    b.style.background = ''; b.style.borderColor = '';
  });
  evt.currentTarget.classList.add('asist-active');
  evt.currentTarget.style.background    = colores[estado];
  evt.currentTarget.style.borderColor   = colores[estado];

  // Actualizar resumen
  const registros = {};
  asistData.estudiantes.forEach(e => {
    registros[e.id_estudiante] = document.getElementById(`asist-row-${e.id_estudiante}`)?.dataset.estado || 'presente';
  });
  const res = document.getElementById('resumen-asist');
  if (res) res.textContent = resumenAsistencia(registros, asistData.estudiantes);
};

window.marcarTodos = function(estado) {
  const colores = { presente:'#c6f6d5', ausente:'#fed7d7', tardanza:'#feebc8', justificado:'#bee3f8' };
  asistData.estudiantes.forEach(e => {
    const row = document.getElementById(`asist-row-${e.id_estudiante}`);
    if (!row) return;
    row.dataset.estado = estado;
    row.querySelectorAll('.asist-btn').forEach(b => { b.classList.remove('asist-active'); b.style.background=''; b.style.borderColor=''; });
    const btns = row.querySelectorAll('.asist-btn');
    const idx  = ['presente','ausente','tardanza','justificado'].indexOf(estado);
    if (btns[idx]) { btns[idx].classList.add('asist-active'); btns[idx].style.background=colores[estado]; btns[idx].style.borderColor=colores[estado]; }
  });
  const registros = {};
  asistData.estudiantes.forEach(e => { registros[e.id_estudiante] = estado; });
  const res = document.getElementById('resumen-asist');
  if (res) res.textContent = resumenAsistencia(registros, asistData.estudiantes);
};

window.guardarAsistencia = async function() {
  const id_gm = document.getElementById('asist-materia')?.value;
  const fecha = document.getElementById('asist-fecha')?.value;
  const msg   = document.getElementById('asist-msg');
  if (!id_gm || !fecha) return;

  const registros = asistData.estudiantes.map(e => ({
    id_estudiante: e.id_estudiante,
    estado: document.getElementById(`asist-row-${e.id_estudiante}`)?.dataset.estado || 'presente'
  }));

  const btn = document.getElementById('btnGuardarAsist');
  btn.disabled = true; btn.textContent = '⏳ Guardando...';

  const res  = await fetch('/profesor/asistencia', { method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ id_grupo_materia: id_gm, fecha, registros }) });
  const data = await res.json();
  msg.innerHTML = `<span class="${data.status==='success'?'msg-ok':'msg-err'}">${data.message}</span>`;
  btn.disabled = false; btn.innerHTML = '💾 Guardar Asistencia';
};


// ══════════════════════════════════════════════════════
//  MATERIAL DE CLASE
// ══════════════════════════════════════════════════════
async function renderMaterial() {
  const res = await fetch('/profesor/materias');
  const d   = await res.json();
  const materias = d.data || [];

  content.innerHTML = `
  <div class="section-header-bar">
    <div>
      <h2 class="section-title">📁 Material de Clase</h2>
      <p class="section-sub">Comparte enlaces, documentos y recursos con tus estudiantes.</p>
    </div>
  </div>

  <div class="material-layout">
    <!-- Formulario -->
    <div class="material-form-panel">
      <div class="panel-header"><span class="panel-icon">➕</span><h2>Agregar Material</h2></div>

      <div class="form-group">
        <label>Materia / Grupo</label>
        <select id="mat-materia">
          <option value="">Selecciona una materia</option>
          ${materias.map(m=>`<option value="${m.id_grupo_materia}">${m.materia} — ${m.grupo}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Título</label>
        <input type="text" id="mat-titulo" placeholder="Ej: Guía de estudio parcial 1">
      </div>
<div class="form-group">
        <label>Tipo</label>
        <select id="mat-tipo" onchange="toggleTipoMaterial(this.value)">
          <option value="enlace">🔗 Enlace web</option>
          <option value="documento">📄 Documento (Drive, etc.)</option>
          <option value="video">🎬 Video (YouTube, etc.)</option>
          <option value="archivo">📁 Archivo desde mi PC</option>
          <option value="otro">📎 Otro</option>

        </select>
      </div>
      <div class="form-group" id="mat-url-group">
        <label>URL / Enlace</label>
        <input type="url" id="mat-url" placeholder="https://...">
      </div>
      <div class="form-group" id="mat-file-group" style="display:none;">
        <label>Seleccionar archivo</label>
        <input type="file" id="mat-archivo" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip">
        <small style="color:#6b7a8a;font-size:12px;">PDF, Word, Excel, PPT, imágenes, ZIP — máx. 10 MB</small>
      </div>
      <div id="mat-msg" class="nota-msg"></div>
      <div class="form-group">
     <button class="btn-guardar" onclick="agregarMaterial()">
        <span>📤</span> Publicar Material
      </button>
      </div>
</div>

    <!-- Lista de materiales -->
    <div class="material-list-panel">
      <div class="panel-header">
        <span class="panel-icon">📚</span>
        <h2>Materiales Publicados</h2>
        <div style="margin-left:auto;">
          <select id="filtro-mat-materia" onchange="cargarMateriales(this.value)" class="mini-select">
            <option value="">Todas las materias</option>
            ${materias.map(m=>`<option value="${m.id_grupo_materia}">${m.materia} — ${m.grupo}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="lista-materiales"><div class="loading-state">⏳ Cargando...</div></div>
    </div>
  </div>`;

  cargarMateriales('');
}

window.cargarMateriales = async function(id_gm) {
  const url  = id_gm ? `/profesor/material?id_grupo_materia=${id_gm}` : '/profesor/material';
  const res  = await fetch(url);
  const data = await res.json();
  const mats = data.data || [];
  const cont = document.getElementById('lista-materiales');

  if (!mats.length) {
    cont.innerHTML = `<div class="empty-table-msg"><span>📭</span><p>No hay materiales publicados aún.</p></div>`;
    return;
  }

  const iconosTipo = { enlace:'🔗', documento:'📄', video:'🎬', otro:'📎' };
  const coloresTipo= { enlace:'#ebf8ff', documento:'#f0fff4', video:'#fff5f5', otro:'#faf5ff' };

  cont.innerHTML = mats.map(m => `
    <div class="material-card" style="border-left:4px solid ${m.tipo==='enlace'?'#3182ce':m.tipo==='documento'?'#38a169':m.tipo==='video'?'#e53e3e':'#805ad5'};">
      <div class="material-card-top">
        <span class="material-tipo-badge" style="background:${coloresTipo[m.tipo]||'#f7fafc'}">
          ${iconosTipo[m.tipo]||'📎'} ${m.tipo}
        </span>
        <span class="material-fecha">${m.fecha_subida}</span>
        <button class="btn-del-material" onclick="eliminarMaterial(${m.id_material})" title="Eliminar">✕</button>
      </div>
      <h4 class="material-titulo">${m.titulo}</h4>
      ${m.descripcion ? `<p class="material-desc">${m.descripcion}</p>` : ''}
      ${m.tipo === 'archivo'
        ? `<a href="${m.url_o_nombre}" class="material-link" download>⬇️ Descargar archivo</a>`
        : `<a href="${m.url_o_nombre}" target="_blank" rel="noopener" class="material-link">🔗 Abrir recurso</a>`
      }
    </div>`).join('');
};

window.toggleTipoMaterial = function(tipo) {
  const urlGroup  = document.getElementById('mat-url-group');
  const fileGroup = document.getElementById('mat-file-group');
  if (tipo === 'archivo') {
    urlGroup.style.display  = 'none';
    fileGroup.style.display = 'block';
  } else {
    urlGroup.style.display  = 'block';
    fileGroup.style.display = 'none';
  }
};

window.agregarMaterial = async function() {
  const id_gm      = document.getElementById('mat-materia')?.value;
  const titulo     = document.getElementById('mat-titulo')?.value?.trim();
  const tipo       = document.getElementById('mat-tipo')?.value;
  const descripcion= document.getElementById('mat-desc')?.value || '';
  const msg        = document.getElementById('mat-msg');

  if (!id_gm || !titulo) {
    msg.innerHTML = `<span class="msg-err">⚠️ Materia y título son requeridos.</span>`; return;
  }

  let res;

  if (tipo === 'archivo') {
    const archivoInput = document.getElementById('mat-archivo');
    if (!archivoInput.files.length) {
      msg.innerHTML = `<span class="msg-err">⚠️ Selecciona un archivo.</span>`; return;
    }
    const formData = new FormData();
    formData.append('id_grupo_materia', id_gm);
    formData.append('titulo', titulo);
    formData.append('tipo', tipo);
    formData.append('descripcion', descripcion);
    formData.append('archivo', archivoInput.files[0]);
    msg.innerHTML = `<span class="msg-ok">⏳ Subiendo archivo...</span>`;
    res = await fetch('/profesor/material', { method: 'POST', body: formData });
  } else {
    const url = document.getElementById('mat-url')?.value;
    if (!url) { msg.innerHTML = `<span class="msg-err">⚠️ La URL es requerida.</span>`; return; }
    res = await fetch('/profesor/material', { method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id_grupo_materia:id_gm, titulo, tipo, url_o_nombre:url, descripcion}) });
  }

  const data = await res.json();
  msg.innerHTML = `<span class="${data.status==='success'?'msg-ok':'msg-err'}">${data.message}</span>`;
  if (data.status === 'success') {
    document.getElementById('mat-titulo').value = '';
    document.getElementById('mat-url').value = '';
    document.getElementById('mat-desc').value = '';
    document.getElementById('mat-archivo').value = '';
    const filtro = document.getElementById('filtro-mat-materia')?.value || '';
    cargarMateriales(filtro);
  }
};


// ══════════════════════════════════════════════════════
//  OBSERVADOR
// ══════════════════════════════════════════════════════
async function renderObservador() {
  const res  = await fetch('/profesor/estudiantes');
  const data = await res.json();
  const estudiantes = data.data || [];

  content.innerHTML = `
    <div class="card">
      <h2>👁 Observador de Estudiantes</h2>
      <div class="form-group">
        <label>Estudiante</label>
        <select id="selEstObs" onchange="cargarObservaciones(this.value)">
          <option value="">Selecciona un estudiante</option>
          ${estudiantes.map(e=>`<option value="${e.id_estudiante}">${e.nombre_completo} — ${e.codigo_estudiante}</option>`).join('')}
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

window.guardarObservacion = async function() {
  const id_estudiante = document.getElementById('selEstObs').value;
  const tipo          = document.getElementById('selTipoObs').value;
  const descripcion   = document.getElementById('inputObs').value;
  const msg           = document.getElementById('obsMsg');
  if (!id_estudiante||!descripcion) { msg.innerHTML=`<span style="color:red">⚠️ Selecciona estudiante y escribe descripción.</span>`; return; }
  const res  = await fetch('/profesor/observador', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({id_estudiante,tipo,descripcion}) });
  const data = await res.json();
  msg.innerHTML = `<span style="color:${data.status==='success'?'green':'red'}">${data.message}</span>`;
  if (data.status==='success') cargarObservaciones(id_estudiante);
};

window.cargarObservaciones = async function(id_estudiante) {
  if (!id_estudiante) return;
  const res  = await fetch(`/profesor/observador/${id_estudiante}`);
  const data = await res.json();
  const obs  = data.data || [];
  const lista= document.getElementById('listaObs');
  if (!obs.length) { lista.innerHTML='<p>No hay observaciones registradas.</p>'; return; }
  const colores = {positivo:'#c6f6d5',negativo:'#fed7d7',neutro:'#e2e8f0'};
  const iconos  = {positivo:'✅',negativo:'❌',neutro:'📌'};
  lista.innerHTML = obs.map(o=>`
    <div style="background:${colores[o.tipo]};padding:14px;border-radius:12px;margin-bottom:10px;">
      <strong>${iconos[o.tipo]} ${o.tipo.toUpperCase()}</strong>
      <p style="margin:6px 0;">${o.descripcion}</p>
      <small style="color:#666;">${o.fecha_registro}</small>
    </div>`).join('');
};


// ══════════════════════════════════════════════════════
//  REPORTE GENERAL
// ══════════════════════════════════════════════════════
async function renderReporte() {
  const res  = await fetch('/profesor/estudiantes');
  const data = await res.json();
  const estudiantes = data.data || [];

  content.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="margin:0;">📊 Reporte General</h2>
          <p style="margin:4px 0 0;color:#6b7a8a;">Consulta el reporte individual o descarga el PDF completo de todos tus estudiantes.</p>
        </div>
        <button class="btn-pdf" onclick="window.location.href='/profesor/reporte/pdf'">
          <span>📄</span> Descargar PDF Completo
        </button>
      </div>
    </div>
    <div class="card">
      <h2>🔍 Reporte por Estudiante</h2>
      <div class="form-group">
        <label>Selecciona un estudiante</label>
        <select id="selEstReporte" onchange="cargarReporte(this.value)">
          <option value="">Selecciona un estudiante</option>
          ${estudiantes.map(e=>`<option value="${e.id_estudiante}">${e.nombre_completo} — ${e.codigo_estudiante}</option>`).join('')}
        </select>
      </div>
      <div id="reporteContenido"></div>
    </div>`;
}

window.cargarReporte = async function(id_estudiante) {
  if (!id_estudiante) return;
  const res  = await fetch(`/profesor/reporte/${id_estudiante}`);
  const data = await res.json();
  if (data.status !== 'success') return;
  const {estudiante, notas, observaciones, promedio} = data.data;
  const colorProm = promedio >= 3 ? '#38a169' : '#e53e3e';
  const porMateria = {};
  notas.forEach(n => { (porMateria[n.materia]=porMateria[n.materia]||[]).push(n); });

  document.getElementById('reporteContenido').innerHTML = `
    <div class="reporte-header">
      <div><h3>${estudiante.nombre_completo}</h3>
        <p>Código: <strong>${estudiante.codigo_estudiante}</strong> | Grado: <strong>${estudiante.grado} ${estudiante.grupo}</strong></p></div>
      <div class="promedio-badge" style="background:${promedio>=3?'#c6f6d5':'#fed7d7'};color:${colorProm};">
        <span>Promedio</span><strong>${promedio}</strong>
      </div>
    </div>
    <h3 style="margin-top:20px;color:#1f3a5d;">📝 Notas por Materia</h3>
    ${Object.keys(porMateria).length ? Object.entries(porMateria).map(([materia,ns])=>{
      const p=(ns.reduce((s,n)=>s+n.valor,0)/ns.length).toFixed(2);
      const c=p>=3?'#38a169':'#e53e3e';
      return `<div class="materia-group">
        <div class="materia-header"><span class="materia-name">${materia}</span>
          <span class="materia-prom" style="color:${c}">Promedio: ${p}</span></div>
        <table class="notas-table"><thead><tr>
          <th>Tipo</th><th>Valor</th><th>Descripción</th><th>Fecha</th>
        </tr></thead><tbody>
          ${ns.map(n=>`<tr>
            <td><span class="tipo-badge">${n.nombre_tipo}</span></td>
            <td><span class="nota-chip" style="background:${n.valor>=3?'#c6f6d5':'#fed7d7'};color:${n.valor>=3?'#38a169':'#e53e3e'}">${n.valor}</span></td>
            <td>${n.descripcion||'—'}</td><td>${n.fecha_registro}</td>
          </tr>`).join('')}
        </tbody></table></div>`;
    }).join('') : '<p>No hay notas.</p>'}
    <h3 style="margin-top:24px;color:#1f3a5d;">👁 Observaciones</h3>
    ${observaciones.length ? observaciones.map(o=>{
      const c={positivo:'#c6f6d5',negativo:'#fed7d7',neutro:'#e2e8f0'}[o.tipo];
      const i={positivo:'✅',negativo:'❌',neutro:'📌'}[o.tipo];
      return `<div style="background:${c};padding:12px;border-radius:10px;margin-bottom:8px;">
        <strong>${i} ${o.tipo}</strong><p style="margin:4px 0;">${o.descripcion}</p>
        <small>${o.fecha_registro}</small></div>`;
    }).join('') : '<p>No hay observaciones.</p>'}`;
};


// ══════════════════════════════════════════════════════
//  AGENDA
// ══════════════════════════════════════════════════════
let calYear, calMonth, todosEventos = [];

async function renderAgenda() {
  const now = new Date();
  calYear  = now.getFullYear(); calMonth = now.getMonth();
  const res  = await fetch('/profesor/agenda');
  const data = await res.json();
  todosEventos = data.data || [];

  content.innerHTML = `
  <div class="agenda-layout">
    <div class="agenda-form-panel">
      <div class="panel-header"><span class="panel-icon">📅</span><h2>Nuevo Evento</h2></div>
      <div class="form-group"><label>Título <span style="color:#e53e3e">*</span></label>
        <input type="text" id="agTitulo" placeholder="Ej: Examen parcial"></div>
      <div class="form-group"><label>Descripción</label>
        <textarea id="agDesc" placeholder="Detalles..."></textarea></div>
      <div class="form-group"><label>Fecha <span style="color:#e53e3e">*</span></label>
        <input type="date" id="agFecha"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Hora inicio</label><input type="time" id="agHoraInicio"></div>
        <div class="form-group"><label>Hora fin</label><input type="time" id="agHoraFin"></div>
      </div>
      <button class="btn-guardar" onclick="agregarEvento()"><span>➕</span> Agregar Evento</button>
      <div id="agMsg" class="nota-msg"></div>
      <div class="agenda-pendientes">
        <h3>⏳ Próximos Eventos</h3>
        <div id="listaPendientes">${renderPendientes(todosEventos)}</div>
      </div>
    </div>
    <div class="agenda-cal-panel"><div id="calendario"></div></div>
  </div>`;
  renderCalendario();
}

function renderPendientes(eventos) {
  const p = eventos.filter(e=>e.estado==='pendiente').sort((a,b)=>a.fecha_evento.localeCompare(b.fecha_evento));
  if (!p.length) return '<p style="color:#6b7a8a;font-style:italic;">No hay eventos pendientes.</p>';
  return p.map(e=>`
    <div class="evento-item">
      <div class="evento-fecha-badge">${formatFechaBadge(e.fecha_evento)}</div>
      <div class="evento-info">
        <strong>${e.titulo}</strong>
        ${e.descripcion?`<p>${e.descripcion}</p>`:''}
        ${e.hora_inicio?`<small>⏰ ${e.hora_inicio}${e.hora_fin?' – '+e.hora_fin:''}</small>`:''}
      </div>
      <div class="evento-acciones">
        <button class="btn-accion btn-ok"  onclick="cambiarEstado(${e.id_agenda},'completado')">✓</button>
        <button class="btn-accion btn-del" onclick="cambiarEstado(${e.id_agenda},'cancelado')">✕</button>
      </div>
    </div>`).join('');
}

function formatFechaBadge(f) {
  const [y,m,d]=f.split('-');
  const meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `<span class="badge-dia">${d}</span><span class="badge-mes">${meses[parseInt(m)-1]}</span>`;
}

function renderCalendario() {
  const cal=document.getElementById('calendario'); if(!cal) return;
  const dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const primerDia=new Date(calYear,calMonth,1).getDay();
  const diasMes=new Date(calYear,calMonth+1,0).getDate();
  const hoy=new Date();
  const eventosMap={};
  todosEventos.forEach(e=>{const[y,m,d]=e.fecha_evento.split('-');if(parseInt(y)===calYear&&parseInt(m)-1===calMonth){const k=parseInt(d);(eventosMap[k]=eventosMap[k]||[]).push(e);}});
  let cells='';
  for(let i=0;i<primerDia;i++) cells+=`<div class="cal-cell empty"></div>`;
  for(let d=1;d<=diasMes;d++){
    const esHoy=hoy.getFullYear()===calYear&&hoy.getMonth()===calMonth&&hoy.getDate()===d;
    const evs=eventosMap[d]||[];
    const dots=evs.slice(0,3).map(e=>{const c=e.estado==='completado'?'#38a169':e.estado==='cancelado'?'#a0aec0':'#3182ce';return`<span class="cal-dot" style="background:${c}" title="${e.titulo}"></span>`;}).join('');
    cells+=`<div class="cal-cell${esHoy?' hoy':''}" onclick="mostrarEventosDia(${d})"><span class="cal-num">${d}</span>${dots?`<div class="cal-dots">${dots}</div>`:''}</div>`;
  }
  cal.innerHTML=`
    <div class="cal-nav">
      <button class="cal-btn" onclick="cambiarMes(-1)">‹</button>
      <span class="cal-titulo">${meses[calMonth]} ${calYear}</span>
      <button class="cal-btn" onclick="cambiarMes(1)">›</button>
    </div>
    <div class="cal-grid">${dias.map(d=>`<div class="cal-header-cell">${d}</div>`).join('')}${cells}</div>
    <div class="cal-leyenda">
      <span><span class="cal-dot" style="background:#3182ce"></span> Pendiente</span>
      <span><span class="cal-dot" style="background:#38a169"></span> Completado</span>
      <span><span class="cal-dot" style="background:#a0aec0"></span> Cancelado</span>
    </div>
    <div id="dia-detalle" class="dia-detalle"></div>`;
}

window.cambiarMes=function(dir){calMonth+=dir;if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;}renderCalendario();};
window.mostrarEventosDia=function(dia){
  const evs=todosEventos.filter(e=>{const[y,m,d]=e.fecha_evento.split('-');return parseInt(y)===calYear&&parseInt(m)-1===calMonth&&parseInt(d)===dia;});
  const det=document.getElementById('dia-detalle');if(!det)return;
  if(!evs.length){det.innerHTML='';return;}
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  det.innerHTML=`<h4 style="margin:0 0 10px;color:#1f3a5d;">${dia} de ${meses[calMonth]}</h4>`+evs.map(e=>`<div style="background:${e.estado==='completado'?'#f0fff4':e.estado==='cancelado'?'#f7fafc':'#ebf8ff'};padding:12px;border-radius:10px;margin-bottom:8px;border-left:4px solid ${e.estado==='completado'?'#38a169':e.estado==='cancelado'?'#a0aec0':'#3182ce'}"><strong>${e.titulo}</strong>${e.descripcion?`<p style="margin:4px 0;color:#6b7a8a;font-size:13px;">${e.descripcion}</p>`:''}${e.hora_inicio?`<small>⏰ ${e.hora_inicio}${e.hora_fin?' – '+e.hora_fin:''}</small>`:''}  <span style="float:right;font-size:12px;color:#6b7a8a;text-transform:capitalize;">${e.estado}</span></div>`).join('');
};
window.agregarEvento=async function(){
  const titulo=document.getElementById('agTitulo').value;
  const descripcion=document.getElementById('agDesc').value;
  const fecha_evento=document.getElementById('agFecha').value;
  const hora_inicio=document.getElementById('agHoraInicio').value;
  const hora_fin=document.getElementById('agHoraFin').value;
  const msg=document.getElementById('agMsg');
  if(!titulo||!fecha_evento){msg.innerHTML=`<span class="msg-err">⚠️ Título y fecha son requeridos.</span>`;return;}
  const res=await fetch('/profesor/agenda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({titulo,descripcion,fecha_evento,hora_inicio,hora_fin})});
  const data=await res.json();
  msg.innerHTML=`<span class="${data.status==='success'?'msg-ok':'msg-err'}">${data.message}</span>`;
  if(data.status==='success'){
    const r2=await fetch('/profesor/agenda');const d2=await r2.json();todosEventos=d2.data||[];
    document.getElementById('agTitulo').value='';document.getElementById('agDesc').value='';
    document.getElementById('agFecha').value='';document.getElementById('agHoraInicio').value='';document.getElementById('agHoraFin').value='';
    document.getElementById('listaPendientes').innerHTML=renderPendientes(todosEventos);
    renderCalendario();
  }
};
window.cambiarEstado=async function(id_agenda,estado){
  await fetch(`/profesor/agenda/${id_agenda}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({estado})});
  const r2=await fetch('/profesor/agenda');const d2=await r2.json();todosEventos=d2.data||[];
  document.getElementById('listaPendientes').innerHTML=renderPendientes(todosEventos);
  renderCalendario();
};

// ── Inicialización ──
renderInicio();