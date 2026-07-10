const content = document.getElementById('panel-content');
const navLinks = Array.from(document.querySelectorAll('.nav-link[data-section]'));
const userName = document.querySelector('.user-name')?.textContent?.trim() || 'Estudiante';
const user_id = parseInt(document.getElementById('current-user-data')?.dataset.userId || '0');

ProfilePanel.init({
  notify: (msg, ok) => alert(msg),
  onProfileOpen: () => {
    const chk = document.getElementById('dark-mode-toggle');
    if (chk) chk.checked = document.documentElement.classList.contains('dark-mode');
  },
});

// Inline edit form toggle (split layout)
document.getElementById('est-open-edit')?.addEventListener('click', async () => {
  const form = document.getElementById('est-edit-form');
  if (form) {
    await ProfilePanel.load();
    form.style.display = 'block';
  }
});
document.getElementById('cancel-profile')?.addEventListener('click', () => {
  const form = document.getElementById('est-edit-form');
  if (form) form.style.display = 'none';
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
    case 'horario':    await renderHorario();    break;
    case 'boletin':    renderBoletin();          break;
    case 'agenda':     await renderAgenda();     break;
    case 'chat':       renderChat();            break;
    case 'votaciones': await renderVotaciones(); break;
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
        <button type="button" class="quick-action-btn" onclick="descargarMiBoletin()">
          <i class="fas fa-file-pdf"></i><span>Mi Boletín</span>
        </button>
        <button type="button" class="quick-action-btn" onclick="navTo('agenda')">
          <i class="fas fa-calendar-alt"></i><span>Agenda</span>
        </button>
      </div>
    </div>`;
  const dateEl = document.getElementById('current-date');
  if (dateEl && !dateEl._clockRunning) {
    dateEl._clockRunning = true;
    function updateEstDate() {
      const now = new Date();
      const fecha = now.toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      const hora = now.toLocaleTimeString('es-ES', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
      dateEl.textContent = `${fecha} · ${hora}`;
    }
    updateEstDate();
    setInterval(updateEstDate, 30000);
  }
}

window.navTo = function (sec) {
  setActiveNav(sec);
  renderSection(sec);
};


// ══════════════════════════════════════════════════════
//  CHAT INSTITUCIONAL
// ══════════════════════════════════════════════════════

let chatManagerEst = null;

function renderChat() {
  content.innerHTML = `
    <div id="chat-section" class="chat-app" style="height:calc(100vh - 120px);min-height:500px;">
      <div class="chat-sidebar">
        <div class="chat-sidebar-header">
          <h2 class="chat-sidebar-title"><i class="fas fa-comments"></i> Chats</h2>
          <div class="chat-search-box">
            <i class="fas fa-search chat-search-icon"></i>
            <input type="text" class="chat-search-input" id="chat-search" placeholder="Buscar contacto..." autocomplete="off">
          </div>
          <div class="chat-filter-row">
            <label for="chat-filter">Ver:</label>
            <select id="chat-filter" class="chat-filter-select">
              <option value="all">Todos</option>
              <option value="admin">Solo admins</option>
              <option value="profesor">Solo docentes</option>
              <option value="estudiante">Solo estudiantes</option>
            </select>
          </div>
        </div>
        <div class="chat-contact-list" id="chat-contact-list">
          <div style="padding:30px 20px;text-align:center;color:var(--gray-500);">
            <i class="fas fa-circle-notch fa-spin" style="font-size:24px;margin-bottom:12px;"></i>
            <p style="font-size:14px;">Cargando chats...</p>
          </div>
        </div>
      </div>
      <div class="chat-conversation">
        <div class="chat-conversation-placeholder" id="chat-placeholder">
          <div class="chat-placeholder-content">
            <div class="chat-placeholder-icon"><i class="fas fa-comments"></i></div>
            <h3>Tus mensajes</h3>
            <p>Selecciona una conversación para empezar a chatear</p>
          </div>
        </div>
        <div class="chat-conversation-active" id="chat-active" style="display:none;">
  <div class="chat-conversation-header">
    <button id="chat-back-btn" class="chat-back-btn" title="Volver a contactos"><i class="fas fa-arrow-left"></i></button>
    <div class="chat-conversation-user">
              <div class="chat-avatar" id="chat-active-avatar">
                <span class="chat-avatar-initials" id="chat-active-initials">JD</span>
              </div>
              <div>
                <h4 class="chat-conversation-name" id="chat-active-name">Juan Pérez</h4>
                <div class="chat-status-row">
                  <span class="chat-status-dot" id="chat-status-dot"></span>
                  <span class="chat-conversation-status" id="chat-active-status">Desconectado</span>
                </div>
              </div>
            </div>
            <div class="chat-header-menu" style="position:relative;">
              <button id="chat-menu-btn" class="chat-menu-btn" title="Opciones">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <div class="chat-menu-dropdown" id="chat-menu-dropdown">
                <button id="chat-clear-btn" class="chat-menu-item chat-menu-item--danger">
                  <i class="fas fa-trash-alt"></i> Vaciar chat
                </button>
              </div>
            </div>
          </div>
          <div class="chat-messages" id="chat-messages"></div>
          <div class="chat-input-area">
            <div id="chat-emoji-picker" style="display:none;flex-wrap:wrap;gap:2px;flex-direction:row;"></div>
            <div class="chat-input-wrapper">
              <button id="chat-emoji-btn" title="Emojis" class="chat-emoji-btn">
                <i class="far fa-smile"></i>
              </button>
              <button id="chat-file-btn" title="Adjuntar archivo" class="chat-emoji-btn" style="margin-left:2px;">
                <i class="fas fa-paperclip"></i>
              </button>
              <input type="file" id="chat-file-input" style="display:none" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar,.txt">
              <input type="text" class="chat-input" id="chat-msg-input" placeholder="Escribe un mensaje..." autocomplete="off">
              <button class="chat-send-btn" id="chat-send-btn" title="Enviar">
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  if (chatManagerEst) chatManagerEst.destroy();
  chatManagerEst = new ChatManager();
  chatManagerEst.refreshElements();
  chatManagerEst.init();
}


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
        <div class="table-scroll-hint"><i class="fas fa-arrows-alt-h"></i> Desliza horizontalmente para ver más columnas</div>
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
    <table class="est-table mobile-card-table">
      <thead><tr><th>Fecha</th><th>Materia</th><th>Profesor</th><th>Estado</th></tr></thead>
      <tbody>
        ${registros.map(r => `<tr>
          <td class="cell-muted" data-label="Fecha">${r.fecha}</td>
          <td data-label="Materia">${r.materia}</td>
          <td class="cell-muted" data-label="Profesor">${r.profesor}</td>
          <td data-label="Estado"><span class="asist-chip" style="background:${colores[r.estado]};color:${textCol[r.estado]};">
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
  const faltaLabels = {academica:'📚 Académica',disciplinaria:'⚠️ Disciplinaria',convivencia:'🤝 Convivencia',asistencia:'📅 Asistencia',otro:'📌 Otro'};

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
        <span class="cell-muted" style="margin-left:6px;font-size:12px;padding:2px 8px;border-radius:6px;background:rgba(0,0,0,0.06);">
          ${faltaLabels[o.tipo_falta] || faltaLabels.otro}
        </span>
        <span class="cell-muted">${o.fecha}</span>
      </div>
      <p class="obs-desc">${o.descripcion}</p>
      <div class="obs-profesor"><i class="fas fa-user-tie"></i> ${o.profesor}</div>
    </div>`).join('')}
  </div>`;
}

function renderBoletin() {
  content.innerHTML = `
  <div class="section-header-bar">
    <h2 class="section-title"><i class="fas fa-file-pdf"></i> Mi Boletín Académico</h2>
  </div>
  <div class="card" style="max-width:600px;margin:24px auto;text-align:center;padding:32px;">
    <i class="fas fa-file-pdf" style="font-size:48px;color:#e53e3e;margin-bottom:16px;"></i>
    <h3 style="margin:0 0 8px;">Descargar Boletín</h3>
    <p style="color:#666;margin-bottom:20px;">Haz clic en el botón para descargar tu boletín consolidado en PDF con todas tus materias, desempeño y observaciones.</p>
    <button type="button" class="btn-pdf" onclick="descargarMiBoletin()">
      <i class="fas fa-download"></i> Descargar Boletín PDF
    </button>
    <p style="color:#999;font-size:12px;margin-top:12px;">Si no puedes descargar, es posible que tu boletín aún no haya sido liberado por el administrador.</p>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  MI HORARIO
// ══════════════════════════════════════════════════════
async function renderHorario() {
  content.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando horario...</div>`;
  const res = await fetch('/estudiante/horarios');
  const data = await res.json();
  const horarios = data.data || [];

  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const porDia = {};
  dias.forEach(d => porDia[d] = []);
  horarios.forEach(h => {
    if (porDia[h.dia_semana]) porDia[h.dia_semana].push(h);
  });

  const colores = ['#ebf8ff','#f0fff4','#faf5ff','#fffaf0','#fff5f5','#f7fafc'];

  content.innerHTML = `
  <div class="section-header-bar">
    <h2 class="section-title"><i class="fas fa-calendar-week"></i> Mi Horario Semanal</h2>
  </div>
  ${!horarios.length ? '<p style="padding:24px;text-align:center;color:#666;">No tienes horarios registrados aún.</p>' : ''}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
    ${dias.map((d,i) => `
    <div style="background:${colores[i]};border-radius:12px;padding:16px;border:1px solid #e2e8f0;">
      <h3 style="margin:0 0 10px;font-size:16px;color:#2d3748;">📅 ${d}</h3>
      ${porDia[d].length ? porDia[d].map(h => `
        <div style="background:white;border-radius:8px;padding:10px;margin-bottom:8px;border:1px solid #e2e8f0;">
          <strong style="font-size:13px;">${h.hora_inicio} – ${h.hora_fin}</strong>
          <p style="margin:4px 0 0;font-size:14px;">${h.nombre_materia}</p>
          ${h.salon ? `<p style="margin:2px 0 0;font-size:12px;color:#888;">🏫 ${h.salon}</p>` : ''}
          <p style="margin:2px 0 0;font-size:12px;color:#888;">👤 ${h.profesor}</p>
        </div>`).join('') : '<p style="color:#999;font-size:13px;">Sin clases</p>'}
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

// ══════════════════════════════════════════════════════
//  VOTACIONES — Votar por Personero y Contralor
// ══════════════════════════════════════════════════════
async function renderVotaciones() {
  content.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando votaciones...</div>`;
  const res = await fetch('/api/estudiante/votacion');
  const data = await res.json();

  if (data.status !== 'success') {
    content.innerHTML = emptyState('fas fa-exclamation-triangle', 'Error al cargar votaciones.');
    return;
  }

  if (!data.activa || !data.sesion) {
    content.innerHTML = `
      <div class="section-header-bar">
        <h2 class="section-title"><i class="fas fa-vote-yea"></i> Votaciones</h2>
      </div>
      <div class="empty-state">
        <i class="fas fa-clock"></i>
        <p>No hay una votación activa en este momento.</p>
      </div>`;
    return;
  }

  const candidatos = data.candidatos || [];
  const yaVoto = data.ya_voto || {};

  if (!candidatos.length) {
    content.innerHTML = `
      <div class="section-header-bar">
        <h2 class="section-title"><i class="fas fa-vote-yea"></i> Votaciones</h2>
      </div>
      <div class="mgmt-card" style="display:flex;align-items:center;gap:10px;padding:14px 18px;margin-bottom:20px;">
        <i class="fas fa-circle" style="color:var(--success);font-size:10px;"></i>
        <span style="font-size:13px;font-weight:600;color:var(--success);">Votación activa</span>
        <span style="font-size:12px;color:var(--gray-500);margin-left:auto;">
          Finaliza: ${data.sesion.cierra_en || ''}
        </span>
      </div>
      <div class="empty-state"><i class="fas fa-users"></i><p>No hay candidatos registrados.</p></div>`;
    return;
  }

  const personeros = candidatos.filter(c => c.cargo === 'personero');
  const contralores = candidatos.filter(c => c.cargo === 'contralor');

  const renderCargoSection = (cargoLabel, lista, cargoKey) => {
    const yaVotaste = yaVoto[cargoKey];
    return `
      <div class="votacion-card" style="margin-bottom:24px;">
        <div class="votacion-card-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h3 style="margin:0;font-size:16px;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-${cargoKey === 'personero' ? 'star' : 'shield-alt'}"></i>
            ${cargoLabel}
          </h3>
          ${yaVotaste ? '<span class="badge badge-success" style="font-size:12px;padding:4px 12px;"><i class="fas fa-check-circle"></i> Ya votaste</span>' : ''}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;">
          ${lista.map(c => `
            <div class="candidato-card" style="width:180px;text-align:center;padding:16px;border:1px solid var(--gray-200);border-radius:var(--border-radius-lg);background:var(--card-bg);${yaVotaste ? 'opacity:0.7;' : ''}">
              ${c.imagen_url
                ? `<img src="${c.imagen_url}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;margin-bottom:10px;border:2px solid var(--gray-200);">`
                : `<div style="width:80px;height:80px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:28px;color:#fff;"><i class="fas fa-user"></i></div>`
              }
              <p style="font-weight:700;font-size:13px;margin:0 0 3px;">${c.nombre}</p>
              <p style="font-size:11px;color:var(--gray-500);margin:0 0 12px;">N° ${c.numero_campana}</p>
              ${yaVotaste
                ? `<button class="btn-secondary" disabled style="width:100%;padding:7px;cursor:not-allowed;"><i class="fas fa-check"></i> Votado</button>`
                : `<button class="btn-primary btn-votar-est" data-candidato-id="${c.id}" data-cargo="${cargoKey}" style="width:100%;padding:7px;"><i class="fas fa-check"></i> Votar</button>`
              }
            </div>
          `).join('')}
          ${!lista.length ? '<p style="color:var(--gray-500);font-size:14px;">No hay candidatos para este cargo.</p>' : ''}
        </div>
      </div>`;
  };

  content.innerHTML = `
    <div class="section-header-bar">
      <h2 class="section-title"><i class="fas fa-vote-yea"></i> Votaciones</h2>
    </div>
    <div class="mgmt-card" style="display:flex;align-items:center;gap:10px;padding:14px 18px;margin-bottom:20px;">
      <i class="fas fa-circle" style="color:var(--success);font-size:10px;"></i>
      <span style="font-size:13px;font-weight:600;color:var(--success);">Votación activa</span>
      <span style="font-size:12px;color:var(--gray-500);margin-left:auto;">
        Finaliza: ${data.sesion.cierra_en || ''}
      </span>
    </div>
    <p style="font-size:14px;color:var(--gray-500);margin-bottom:20px;">
      Selecciona un candidato para cada cargo y emite tu voto.
    </p>
    ${renderCargoSection('Personero Estudiantil', personeros, 'personero')}
    ${renderCargoSection('Contralor Estudiantil', contralores, 'contralor')}
    <div id="votacion-msg" style="margin-top:12px;"></div>`;

  // Attach vote events
  document.querySelectorAll('.btn-votar-est').forEach(btn => {
    btn.addEventListener('click', async function () {
      const candidatoId = this.dataset.candidatoId;
      const cargo = this.dataset.cargo;
      const msgEl = document.getElementById('votacion-msg');

      if (!confirm(`¿Confirmas tu voto para ${cargo}? Esta acción no se puede deshacer.`)) return;

      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

      try {
        const res = await fetch('/api/estudiante/votar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidato_id: parseInt(candidatoId), cargo })
        });
        const result = await res.json();
        if (result.status === 'success') {
          msgEl.innerHTML = `<div class="alert alert-success"><i class="fas fa-check-circle"></i> ${result.message}</div>`;
          // Re-render section to reflect "ya votaste" state
          setTimeout(() => renderVotaciones(), 1500);
        } else {
          msgEl.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> ${result.message}</div>`;
          this.disabled = false;
          this.innerHTML = '<i class="fas fa-check"></i> Votar';
        }
      } catch (err) {
        msgEl.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> Error de conexión.</div>`;
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-check"></i> Votar';
      }
    });
  });
}

function descargarMiBoletin() {
  if (!user_id) { alert('No se pudo identificar tu usuario.'); return; }
  window.open(`/boletin/${user_id}/pdf`, '_blank');
}

// ── Utilidades ──
function emptyState(icon, msg) {
  return `<div class="empty-state"><i class="${icon}"></i><p>${msg}</p></div>`;
}

// ── Inicio — siempre va a inicio ──
renderInicio();