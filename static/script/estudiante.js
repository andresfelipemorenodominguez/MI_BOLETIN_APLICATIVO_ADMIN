const content = document.getElementById('panel-content');
const navLinks = Array.from(document.querySelectorAll('.nav-link[data-section]'));
const userName = document.querySelector('.user-name')?.textContent?.trim() || 'Estudiante';

function toggleOverlay(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('active', show);
}

function closeAllModals() {
  ['profile-modal-overlay', 'edit-modal-overlay', 'password-modal-overlay'].forEach(id => toggleOverlay(id, false));
}

document.getElementById('profile-btn')?.addEventListener('click', () => toggleOverlay('profile-modal-overlay', true));
document.getElementById('close-profile-modal')?.addEventListener('click', () => toggleOverlay('profile-modal-overlay', false));
document.getElementById('open-edit-profile')?.addEventListener('click', () => {
  toggleOverlay('profile-modal-overlay', false);
  toggleOverlay('edit-modal-overlay', true);
});
document.getElementById('open-password-modal')?.addEventListener('click', () => {
  toggleOverlay('profile-modal-overlay', false);
  toggleOverlay('password-modal-overlay', true);
});
document.getElementById('close-edit-modal')?.addEventListener('click', () => toggleOverlay('edit-modal-overlay', false));
document.getElementById('cancel-edit-modal')?.addEventListener('click', () => toggleOverlay('edit-modal-overlay', false));
document.getElementById('close-password-modal')?.addEventListener('click', () => toggleOverlay('password-modal-overlay', false));
document.getElementById('cancel-password-modal')?.addEventListener('click', () => toggleOverlay('password-modal-overlay', false));

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});

document.getElementById('save-profile')?.addEventListener('click', async () => {
  const fullname = document.getElementById('editName')?.value;
  const email = document.getElementById('editEmail')?.value;
  const res = await fetch('/update-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullname, email }),
  });
  const data = await res.json();
  alert(data.message);
  if (data.status === 'success') toggleOverlay('edit-modal-overlay', false);
});

document.getElementById('savePassword')?.addEventListener('click', async () => {
  const current = document.getElementById('currentPassword').value;
  const nueva   = document.getElementById('newPassword').value;
  const conf    = document.getElementById('confirmPassword').value;
  const msg     = document.getElementById('pw-msg');
  if (!current || !nueva || !conf) {
    msg.innerHTML = '<span class="msg-err">Completa todos los campos.</span>';
    return;
  }
  if (nueva !== conf) {
    msg.innerHTML = '<span class="msg-err">Las contraseñas no coinciden.</span>';
    return;
  }
  const res = await fetch('/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: current, new_password: nueva }),
  });
  const data = await res.json();
  msg.innerHTML = `<span class="${data.status === 'success' ? 'msg-ok' : 'msg-err'}">${data.message}</span>`;
  if (data.status === 'success') {
    setTimeout(() => {
      toggleOverlay('password-modal-overlay', false);
      msg.innerHTML = '';
    }, 1500);
  }
});

function setActiveNav(section) {
  navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === section));
}

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    setActiveNav(link.dataset.section);
    renderSection(link.dataset.section);
    if (typeof window.closePanelSidebar === 'function') window.closePanelSidebar();
  });
});

async function renderSection(sec) {
  switch(sec) {
    case 'inicio':     renderInicio();          break;
    case 'notas':      await renderNotas();     break;
    case 'desempeno':  await renderDesempeno(); break;
    case 'asistencia': await renderAsistencia();break;
    case 'material':   await renderMaterial();  break;
    case 'observador': await renderObservador();break;
    case 'agenda':     await renderAgenda();     break;
    default:           renderInicio();
  }
}

function renderInicio() {
  content.innerHTML = `
    <div class="welcome-section">
      <h1>Bienvenido, ${userName}</h1>
      <p class="welcome-text">Consulta tus notas, asistencia, material de clase y tu desempeño académico.</p>
      <p class="welcome-date">Hoy es <span id="current-date"></span></p>
    </div>
    <div class="quick-actions-section">
      <h2 class="section-title">Accesos Rápidos</h2>
      <div class="quick-actions-grid">
        <button type="button" class="quick-action-btn" onclick="navTo('notas')">
          <i class="fas fa-graduation-cap"></i><span>Mis Notas</span>
        </button>
        <button type="button" class="quick-action-btn" onclick="navTo('desempeno')">
          <i class="fas fa-chart-bar"></i><span>Desempeño</span>
        </button>
        <button type="button" class="quick-action-btn" onclick="navTo('asistencia')">
          <i class="fas fa-calendar-check"></i><span>Asistencia</span>
        </button>
        <button type="button" class="quick-action-btn" onclick="navTo('material')">
          <i class="fas fa-folder-open"></i><span>Material</span>
        </button>
        <button type="button" class="quick-action-btn" onclick="navTo('observador')">
          <i class="fas fa-eye"></i><span>Observador</span>
        </button>
        <button type="button" class="quick-action-btn" onclick="navTo('agenda')">
          <i class="fas fa-calendar-alt"></i><span>Agenda</span>
        </button>
      </div>
    </div>`;
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
}

window.navTo = function (sec) {
  setActiveNav(sec);
  renderSection(sec);
};

// ══════════════════════════════════════════════════════
//  MIS NOTAS — tabla agrupada por materia
// ══════════════════════════════════════════════════════
async function renderNotas() {
  content.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando notas...</div>`;
  const res  = await fetch('/estudiante/notas');
  const data = await res.json();
  const notas = data.data || [];

  if (!notas.length) {
    content.innerHTML = emptyState('fas fa-graduation-cap', 'No tienes notas registradas aún.');
    return;
  }

  // Agrupar por materia
  const porMateria = {};
  notas.forEach(n => { (porMateria[n.materia] = porMateria[n.materia] || []).push(n); });

  const promGeneral = (notas.reduce((s,n)=>s+n.valor,0)/notas.length).toFixed(2);
  const colorPG = promGeneral >= 3 ? '#38a169' : '#e53e3e';

  content.innerHTML = `
  <div class="section-header-bar">
    <h2 class="section-title"><i class="fas fa-graduation-cap"></i> Mis Notas</h2>
    <div class="prom-general-badge" style="background:${promGeneral>=3?'#c6f6d5':'#fed7d7'};color:${colorPG};">
      <span>Promedio General</span>
      <strong>${promGeneral}</strong>
    </div>
  </div>

  ${Object.entries(porMateria).map(([materia, ns]) => {
    const prom = (ns.reduce((s,n)=>s+n.valor,0)/ns.length).toFixed(2);
    const cp   = prom >= 3 ? '#38a169' : '#e53e3e';
    return `
    <div class="materia-card">
      <div class="materia-card-header">
        <span class="materia-card-name"><i class="fas fa-book"></i> ${materia}</span>
        <span class="materia-prom" style="color:${cp};">Promedio: ${prom}</span>
      </div>
      <div class="table-wrap">
        <table class="est-table">
          <thead><tr><th>Tipo</th><th>Valor</th><th>Descripción</th><th>Profesor</th><th>Fecha</th></tr></thead>
          <tbody>
            ${ns.map(n => `<tr>
              <td><span class="tipo-chip">${n.nombre_tipo}</span></td>
              <td><span class="nota-chip" style="background:${n.valor>=3?'#c6f6d5':'#fed7d7'};color:${n.valor>=3?'#276749':'#9b2c2c'}">${n.valor}</span></td>
              <td class="cell-muted">${n.descripcion || '—'}</td>
              <td class="cell-muted">${n.profesor}</td>
              <td class="cell-muted">${n.fecha}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }).join('')}`;
}

// ══════════════════════════════════════════════════════
//  DESEMPEÑO — Barras gráficas por materia
// ══════════════════════════════════════════════════════
async function renderDesempeno() {
  content.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando desempeño...</div>`;
  const res  = await fetch('/estudiante/desempeno');
  const data = await res.json();
  const items = data.data || [];

  if (!items.length) {
    content.innerHTML = emptyState('fas fa-chart-bar', 'No hay datos de desempeño aún.');
    return;
  }

  const promGeneral = (items.reduce((s,i)=>s+i.promedio,0)/items.length).toFixed(2);

  content.innerHTML = `
  <div class="section-header-bar">
    <h2 class="section-title"><i class="fas fa-chart-bar"></i> Mi Desempeño</h2>
  </div>

  <!-- Promedio general grande -->
  <div class="desempeno-hero">
    <div class="desempeno-circle ${parseFloat(promGeneral)>=3?'circle-ok':'circle-warn'}">
      <span class="circle-num">${promGeneral}</span>
      <span class="circle-label">Promedio General</span>
    </div>
    <div class="desempeno-meta">
      <div class="meta-item">
        <i class="fas fa-book"></i>
        <div><strong>${items.length}</strong><span>Materias</span></div>
      </div>
      <div class="meta-item">
        <i class="fas fa-check-circle" style="color:#38a169"></i>
        <div><strong>${items.filter(i=>i.promedio>=3).length}</strong><span>Aprobadas</span></div>
      </div>
      <div class="meta-item">
        <i class="fas fa-times-circle" style="color:#e53e3e"></i>
        <div><strong>${items.filter(i=>i.promedio<3).length}</strong><span>En riesgo</span></div>
      </div>
    </div>
  </div>

  <!-- Barras por materia -->
  <div class="barra-lista">
    ${items.map(item => {
      const pct   = Math.min((item.promedio / 5) * 100, 100).toFixed(1);
      const color = item.promedio >= 4 ? '#38a169' : item.promedio >= 3 ? '#d69e2e' : '#e53e3e';
      const bg    = item.promedio >= 4 ? '#c6f6d5' : item.promedio >= 3 ? '#fefcbf' : '#fed7d7';
      return `
      <div class="barra-item">
        <div class="barra-top">
          <span class="barra-materia">${item.materia}</span>
          <div class="barra-stats">
            <span class="barra-prom" style="color:${color};">${item.promedio}</span>
            <span class="barra-detalle">${item.total_notas} nota(s) · Máx: ${item.nota_max} · Mín: ${item.nota_min}</span>
          </div>
        </div>
        <div class="barra-track">
          <div class="barra-fill" style="width:${pct}%;background:${color};"></div>
          <div class="barra-markers">
            <span style="left:60%">3.0</span>
            <span style="left:80%">4.0</span>
            <span style="left:100%">5.0</span>
          </div>
        </div>
        <div class="barra-badge" style="background:${bg};color:${color};">
          ${item.promedio >= 4 ? '🏆 Excelente' : item.promedio >= 3 ? '✓ Aprobado' : '⚠ En riesgo'}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  ASISTENCIA
// ══════════════════════════════════════════════════════
async function renderAsistencia() {
  content.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando asistencia...</div>`;
  const res  = await fetch('/estudiante/asistencia');
  const data = await res.json();
  const registros = data.data    || [];
  const resumen   = data.resumen || [];

  if (!registros.length) {
    content.innerHTML = emptyState('fas fa-calendar-check', 'No tienes registros de asistencia aún.');
    return;
  }

  const colores = { presente:'#c6f6d5', ausente:'#fed7d7', tardanza:'#feebc8', justificado:'#bee3f8' };
  const iconos  = { presente:'✓', ausente:'✗', tardanza:'⏱', justificado:'📋' };
  const textCol = { presente:'#276749', ausente:'#9b2c2c', tardanza:'#744210', justificado:'#2b4c7e' };

  content.innerHTML = `
  <div class="section-header-bar">
    <h2 class="section-title"><i class="fas fa-calendar-check"></i> Mi Asistencia</h2>
  </div>

  <!-- Resumen por materia -->
  <div class="asist-resumen-grid">
    ${resumen.map(r => {
      const pct = r.total > 0 ? Math.round((r.presentes / r.total) * 100) : 0;
      const color = pct >= 80 ? '#38a169' : pct >= 60 ? '#d69e2e' : '#e53e3e';
      return `
      <div class="asist-resumen-card">
        <div class="asist-resumen-title">${r.materia}</div>
        <div class="asist-resumen-pct" style="color:${color};">${pct}%</div>
        <div class="asist-mini-bar-track">
          <div class="asist-mini-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
        <div class="asist-resumen-detail">
          <span>✓ ${r.presentes}</span>
          <span>✗ ${r.ausentes}</span>
          <span>⏱ ${r.tardanzas}</span>
          <span>📋 ${r.justificados}</span>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- Historial detallado -->
  <h3 class="subsection-title">Historial Completo</h3>
  <div class="table-wrap">
    <table class="est-table">
      <thead><tr><th>Fecha</th><th>Materia</th><th>Profesor</th><th>Estado</th></tr></thead>
      <tbody>
        ${registros.map(r => `<tr>
          <td class="cell-muted">${r.fecha}</td>
          <td>${r.materia}</td>
          <td class="cell-muted">${r.profesor}</td>
          <td><span class="asist-chip" style="background:${colores[r.estado]};color:${textCol[r.estado]};">
            ${iconos[r.estado]} ${r.estado.charAt(0).toUpperCase()+r.estado.slice(1)}
          </span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  MATERIAL DE CLASE
// ══════════════════════════════════════════════════════
async function renderMaterial() {
  content.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando material...</div>`;
  const res  = await fetch('/estudiante/material');
  const data = await res.json();
  const mats = data.data || [];

  if (!mats.length) {
    content.innerHTML = emptyState('fas fa-folder-open', 'No hay material publicado aún.');
    return;
  }

  const iconosTipo  = { enlace:'🔗', documento:'📄', video:'🎬', otro:'📎' };
  const coloresTipo = { enlace:'#ebf8ff', documento:'#f0fff4', video:'#fff5f5', otro:'#faf5ff' };
  const borderTipo  = { enlace:'#3182ce', documento:'#38a169', video:'#e53e3e', otro:'#805ad5' };

  // Agrupar por materia
  const porMateria = {};
  mats.forEach(m => { (porMateria[m.materia] = porMateria[m.materia] || []).push(m); });

  content.innerHTML = `
  <div class="section-header-bar">
    <h2 class="section-title"><i class="fas fa-folder-open"></i> Material de Clase</h2>
  </div>
  ${Object.entries(porMateria).map(([materia, ms]) => `
  <div class="materia-card">
    <div class="materia-card-header">
      <span class="materia-card-name"><i class="fas fa-book"></i> ${materia}</span>
      <span class="cell-muted">${ms.length} recurso(s)</span>
    </div>
    <div class="material-grid">
      ${ms.map(m => `
      <div class="material-item" style="border-left:4px solid ${borderTipo[m.tipo]||'#a0aec0'};">
        <div class="material-item-top">
          <span class="material-tipo" style="background:${coloresTipo[m.tipo]||'#f7fafc'};">
            ${iconosTipo[m.tipo]||'📎'} ${m.tipo}
          </span>
          <span class="cell-muted" style="font-size:12px;">${m.fecha_subida}</span>
        </div>
        <div class="material-titulo">${m.titulo}</div>
        ${m.descripcion ? `<div class="material-desc">${m.descripcion}</div>` : ''}
        <div class="material-meta">Por ${m.profesor}</div>
        <a href="${m.url_o_nombre}" target="_blank" rel="noopener" class="material-link">
          <i class="fas fa-external-link-alt"></i> Abrir recurso
        </a>
      </div>`).join('')}
    </div>
  </div>`).join('')}`;
}

// ══════════════════════════════════════════════════════
//  OBSERVADOR
// ══════════════════════════════════════════════════════
async function renderObservador() {
  content.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando observador...</div>`;
  const res  = await fetch('/estudiante/observador');
  const data = await res.json();
  const obs  = data.data || [];

  if (!obs.length) {
    content.innerHTML = emptyState('fas fa-eye', 'No tienes observaciones registradas.');
    return;
  }

  const colores = { positivo:'#c6f6d5', negativo:'#fed7d7', neutro:'#e2e8f0' };
  const iconos  = { positivo:'✅', negativo:'❌', neutro:'📌' };
  const textCol = { positivo:'#276749', negativo:'#9b2c2c', neutro:'#4a5568' };

  content.innerHTML = `
  <div class="section-header-bar">
    <h2 class="section-title"><i class="fas fa-eye"></i> Observador</h2>
  </div>
  <div class="obs-lista">
    ${obs.map(o => `
    <div class="obs-item" style="border-left:4px solid ${textCol[o.tipo]};">
      <div class="obs-top">
        <span class="obs-tipo" style="background:${colores[o.tipo]};color:${textCol[o.tipo]};">
          ${iconos[o.tipo]} ${o.tipo.charAt(0).toUpperCase()+o.tipo.slice(1)}
        </span>
        <span class="cell-muted">${o.fecha}</span>
      </div>
      <p class="obs-desc">${o.descripcion}</p>
      <div class="obs-profesor"><i class="fas fa-user-tie"></i> ${o.profesor}</div>
    </div>`).join('')}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  AGENDA (eventos compartidos por profesores)
// ══════════════════════════════════════════════════════
async function renderAgenda() {
  content.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando agenda...</div>`;
  const res = await fetch('/estudiante/agenda');
  const data = await res.json();
  const eventos = data.data || [];

  if (!eventos.length) {
    content.innerHTML = emptyState('fas fa-calendar-alt', 'No hay tareas ni eventos compartidos con tu grupo.');
    return;
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const pendientes = eventos.filter(e => e.estado === 'pendiente' && e.fecha_evento >= hoy);
  const otros = eventos.filter(e => !(e.estado === 'pendiente' && e.fecha_evento >= hoy));

  const renderLista = (lista, titulo) => {
    if (!lista.length) return '';
    return `
      <h3 class="section-subtitle">${titulo}</h3>
      <div class="obs-lista">
        ${lista.map(e => `
          <div class="obs-item agenda-evento-card" style="border-left:4px solid ${e.estado === 'completado' ? '#38a169' : e.estado === 'cancelado' ? '#a0aec0' : '#3182ce'};">
            <div class="obs-top">
              <strong>${e.titulo}</strong>
              <span class="cell-muted">${e.fecha_evento}</span>
            </div>
            ${e.descripcion ? `<p class="obs-desc">${e.descripcion}</p>` : ''}
            ${e.hora_inicio ? `<p class="cell-muted agenda-hora">⏰ ${e.hora_inicio}${e.hora_fin ? ' – ' + e.hora_fin : ''}</p>` : ''}
            <div class="obs-profesor"><i class="fas fa-user-tie"></i> ${e.profesor}</div>
            <span class="agenda-estado-badge ${e.estado}">${e.estado}</span>
          </div>`).join('')}
      </div>`;
  };

  content.innerHTML = `
    <div class="section-header-bar">
      <h2 class="section-title"><i class="fas fa-calendar-alt"></i> Mi Agenda</h2>
      <p class="welcome-text card-section-desc" style="margin-top:8px;">Tareas y actividades que tus profesores comparten con tu grupo.</p>
    </div>
    ${renderLista(pendientes, 'Próximos')}
    ${renderLista(otros, 'Anteriores o completados')}`;
}

// ── Utilidades ──
function emptyState(icon, msg) {
  return `<div class="empty-state"><i class="${icon}"></i><p>${msg}</p></div>`;
}

// ── Inicio ──
renderInicio();