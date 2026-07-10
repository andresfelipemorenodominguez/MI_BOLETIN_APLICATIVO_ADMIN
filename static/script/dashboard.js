// CONSTANTES Y CONFIGURACIÓN

const CONFIG = {
    selectors: {
        sidebar: '.sidebar',
        mainContent: '.main-content',
        navLinks: '.nav-link',
        profileBtn: '#profile-btn',
        userProfile: '.user-profile',
        currentDate: '#current-date',
        quickActionBtns: '.quick-action-btn',
    },
    validation: {
        emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        passwordMinLength: 8,
        nameMinLength: 5
    }
};

const currentUserId = parseInt(document.getElementById('current-user-data')?.dataset.userId || '0');
const userEmail = document.getElementById('current-user-data')?.dataset.userEmail || '';

const Utils = {
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },
    generatePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = 'A1!';
        for (let i = 3; i < length; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
        return password.split('').sort(() => Math.random() - 0.5).join('');
    },
    formatDate(date = new Date()) {
        return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    },
    showError(fieldId, message) {
        const err = document.getElementById(`${fieldId}-error`);
        const inp = document.getElementById(fieldId);
        if (err) { err.textContent = message; err.classList.add('show'); }
        if (inp) { inp.classList.add('error'); inp.classList.remove('success'); }
    },
    clearError(fieldId) {
        const err = document.getElementById(`${fieldId}-error`);
        const inp = document.getElementById(fieldId);
        if (err) { err.textContent = ''; err.classList.remove('show'); }
        if (inp) inp.classList.remove('error');
    },
    markAsValid(fieldId) {
        const inp = document.getElementById(fieldId);
        if (inp) { inp.classList.remove('error'); inp.classList.add('success'); }
        this.clearError(fieldId);
    },
    filterTableData(data, searchTerm, fields) {
        if (!searchTerm.trim()) return data;
        const term = searchTerm.toLowerCase();
        return data.filter(item => fields.some(f => {
            const v = item[f];
            if (Array.isArray(v)) return v.some(x => String(x).toLowerCase().includes(term));
            return String(v || '').toLowerCase().includes(term);
        }));
    },
    showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;max-width:350px;display:flex;flex-direction:column;gap:8px;';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `message ${type}`;
        toast.innerHTML = `<span>${message}</span><button class="close-btn" onclick="this.parentElement.remove()">×</button>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 5000);
    },
    calculatePasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*]/.test(password)) score++;
        if (score === 4) return { percentage: 100, color: 'var(--success)', label: 'Fuerte' };
        if (score >= 2) return { percentage: 66, color: 'var(--warning)', label: 'Moderada' };
        return { percentage: 33, color: 'var(--error)', label: 'Débil' };
    },
    confirmDialog(title, message, iconClass = 'fas fa-exclamation-triangle', confirmBtnText = 'Eliminar', confirmBtnColor = 'var(--error)') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s ease;';
            const modal = document.createElement('div');
            const isDark = document.documentElement.classList.contains('dark-mode');
            const bg = isDark ? '#1e293b' : '#ffffff';
            const color = isDark ? '#ffffff' : '#333333';
            const cancelColor = isDark ? '#cbd5e1' : '#64748b';
            
            modal.style.cssText = `background:${bg};border-radius:12px;padding:30px 24px;width:90%;max-width:380px;box-shadow:0 10px 25px rgba(0,0,0,0.2);transform:scale(0.95);transition:transform 0.2s ease;text-align:center;color:${color};`;
            
            modal.innerHTML = `
                <div style="font-size:48px;color:${confirmBtnColor};margin-bottom:16px;">
                    <i class="${iconClass}"></i>
                </div>
                <h3 style="margin:0 0 12px 0;font-size:20px;font-weight:600;">${title}</h3>
                <p style="margin:0 0 24px 0;color:var(--gray-500);font-size:14px;line-height:1.5;">${message}</p>
                <div style="display:flex;gap:12px;justify-content:center;">
                    <button id="confirm-cancel-btn" style="padding:10px 20px;border-radius:8px;border:1px solid var(--gray-300);background:transparent;color:${cancelColor};cursor:pointer;font-weight:500;flex:1;transition:all 0.2s;">Cancelar</button>
                    <button id="confirm-accept-btn" style="padding:10px 20px;border-radius:8px;border:none;background:${confirmBtnColor};color:white;cursor:pointer;font-weight:500;flex:1;transition:all 0.2s;">${confirmBtnText}</button>
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });
            
            const close = (result) => {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(result);
                }, 200);
            };
            
            modal.querySelector('#confirm-cancel-btn').onclick = () => close(false);
            modal.querySelector('#confirm-accept-btn').onclick = () => close(true);
        });
    },
    promptDialog(title, defaultValue = '', iconClass = 'fas fa-edit', confirmBtnText = 'Guardar') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s ease;';
            const modal = document.createElement('div');
            const isDark = document.documentElement.classList.contains('dark-mode');
            const bg = isDark ? '#1e293b' : '#ffffff';
            const color = isDark ? '#ffffff' : '#333333';
            const inputBg = isDark ? '#0f172a' : '#f8f9fa';
            const inputBorder = isDark ? '#334155' : '#e2e8f0';
            const cancelColor = isDark ? '#cbd5e1' : '#64748b';
            
            modal.style.cssText = `background:${bg};border-radius:12px;padding:30px 24px;width:90%;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.2);transform:scale(0.95);transition:transform 0.2s ease;text-align:center;color:${color};`;
            
            modal.innerHTML = `
                <div style="font-size:40px;color:var(--primary);margin-bottom:16px;">
                    <i class="${iconClass}"></i>
                </div>
                <h3 style="margin:0 0 16px 0;font-size:20px;font-weight:600;">${title}</h3>
                <textarea id="prompt-input" style="width:100%;padding:12px;border-radius:8px;border:1px solid ${inputBorder};background:${inputBg};color:${color};margin-bottom:24px;resize:vertical;min-height:80px;font-family:inherit;">${defaultValue}</textarea>
                <div style="display:flex;gap:12px;justify-content:center;">
                    <button id="prompt-cancel-btn" style="padding:10px 20px;border-radius:8px;border:1px solid var(--gray-300);background:transparent;color:${cancelColor};cursor:pointer;font-weight:500;flex:1;transition:all 0.2s;">Cancelar</button>
                    <button id="prompt-accept-btn" style="padding:10px 20px;border-radius:8px;border:none;background:var(--primary);color:white;cursor:pointer;font-weight:500;flex:1;transition:all 0.2s;">${confirmBtnText}</button>
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
                modal.querySelector('#prompt-input').focus();
            });
            
            const close = (result) => {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(result);
                }, 200);
            };
            
            modal.querySelector('#prompt-cancel-btn').onclick = () => close(null);
            modal.querySelector('#prompt-accept-btn').onclick = () => {
                close(modal.querySelector('#prompt-input').value);
            };
        });
    }
};

const Validator = {
    email(email) {
        if (!email) return { valid: false, message: 'El correo es obligatorio' };
        if (!CONFIG.validation.emailRegex.test(email)) return { valid: false, message: 'Correo inválido' };
        return { valid: true };
    },
    required(value, minLength = 0) {
        if (!value || !value.trim()) return { valid: false, message: 'Campo obligatorio' };
        if (minLength > 0 && value.length < minLength) return { valid: false, message: `Mínimo ${minLength} caracteres` };
        return { valid: true };
    },
    password(password) {
        if (!password || password.length < 8) return { valid: false, message: 'Mínimo 8 caracteres' };
        if (!/[A-Z]/.test(password)) return { valid: false, message: 'Debe tener una mayúscula' };
        if (!/\d/.test(password)) return { valid: false, message: 'Debe tener un número' };
        return { valid: true };
    }
};

// NAVEGACIÓN


class NavigationManager {
    constructor() {
        this.init();
    }

    init() {
        const hamburger = document.getElementById('hamburger-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (hamburger && sidebar && overlay) {
            hamburger.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            });
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }

        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                this.showSection(link.dataset.section);
                if (sidebar) sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
            });
        });

        document.querySelectorAll('.quick-action-btn[data-section]').forEach(btn => {
            btn.addEventListener('click', () => this.showSection(btn.dataset.section));
        });

        const adjustLayout = () => {
            const main = document.querySelector('.main-content');
            const sb = document.querySelector('.sidebar');
            if (!main || !sb) return;
            main.style.marginLeft = window.innerWidth > 768 ? `${sb.offsetWidth}px` : '0';
        };
        adjustLayout();
        window.addEventListener('resize', Utils.debounce(adjustLayout, 250));
    }

    showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const section = document.getElementById(sectionId);
        if (section) section.classList.add('active');
        document.querySelectorAll(`[data-section="${sectionId}"]`).forEach(l => l.classList.add('active'));

        const loaders = {
            'agregar-estudiante-section': () => {
                window.app?.tables?.estudiantes?.loadData();
                AdminManager.cargarGruposSelect('id-grupo-estudiante');
            },
            'agregar-profesor-section': () => window.app?.tables?.profesores?.loadData(),
            'periodos-section': () => AdminManager.cargarPeriodos(),
            'grupos-section': () => { AdminManager.cargarGrupos(); AdminManager.cargarPeriodosSelect('grupo-periodo'); },
            'materias-section': () => AdminManager.cargarMaterias(),
            'asignaciones-section': () => AdminManager.cargarDatosAsignaciones(),
            'clases-impartidas-section': () => AdminManager.cargarClasesImpartidas(),
            'horarios-section': () => AdminManager.cargarHorarios(),
            'boletines-section': () => AdminManager.cargarBoletines(),
            'reportes-section': () => AdminManager.cargarReportes(),
            'inicio-section': () => window.app?.stats?.refresh(),
            'administradores-section': () => AdminManager.cargarAdministradores(),
            'colegios-section': () => ColegiosAdmin.cargarColegios(),
            'superadmins-section': () => SuperAdminsAdmin.cargar(),
            'identidad-section': () => IdentidadAdmin.cargar(),
            'votaciones-section': () => {
                if (typeof cargarCandidatos === 'function') cargarCandidatos();
            },
        };
        loaders[sectionId]?.();
    }

    restoreLastSection() {
        this.showSection('inicio-section');
        return true;
    }
}


// STATS


class StatsManager {
    _isSuper() {
        return document.getElementById('current-user-data')?.dataset.isSuperadmin === 'true';
    }

    async refresh() {
        if (this._isSuper()) {
            return this.refreshSuper();
        }
        try {
            const res = await fetch('/dashboard-stats');
            const data = await res.json();
            if (data.status === 'success') {
                const est = document.getElementById('stat-estudiantes');
                const prof = document.getElementById('stat-profesores');
                if (est) est.textContent = data.data.estudiantes ?? '–';
                if (prof) prof.textContent = data.data.profesores ?? '–';
            }
        } catch(e) {}
        try {
            const g = await fetch('/admin/grupos-count');
            const gd = await g.json();
            const el = document.getElementById('stat-grupos');
            if (el && gd.status === 'success') el.textContent = gd.data ?? '–';
        } catch(e) {}
        try {
            const m = await fetch('/admin/materias-count');
            const md = await m.json();
            const el = document.getElementById('stat-materias');
            if (el && md.status === 'success') el.textContent = md.data ?? '–';
        } catch(e) {}
    }

    async refreshSuper() {
        try {
            const res = await fetch('/dashboard-stats');
            const data = await res.json();
            if (data.status === 'success') {
                const d = data.data;
                const elColegios = document.getElementById('stat-colegios');
                const elSuperadmins = document.getElementById('stat-superadmins');
                const elAdminsColegio = document.getElementById('stat-admins-colegio');
                const elEstudiantes = document.getElementById('stat-estudiantes-plat');
                if (elColegios) elColegios.textContent = d.colegios ?? '–';
                if (elSuperadmins) elSuperadmins.textContent = d.superadmins ?? '–';
                if (elAdminsColegio) elAdminsColegio.textContent = d.admins_colegio ?? '–';
                if (elEstudiantes) elEstudiantes.textContent = d.estudiantes ?? '–';
            }
        } catch(e) {}
    }
}


// TABLAS


class TableManager {
    constructor(tableId, options = {}) {
        this.tableId = tableId;
        this.originalData = [];
        this.filteredData = [];
        this.options = options;
        this.currentSearchTerm = '';
        this.setupSearch();
    }

    setupSearch() {
        if (!this.options.searchInputId) return;
        const input = document.getElementById(this.options.searchInputId);
        if (!input) return;
        input.addEventListener('input', Utils.debounce(() => {
            this.currentSearchTerm = input.value;
            this.filteredData = Utils.filterTableData(this.originalData, input.value, this.options.searchFields || ['nombre', 'email', 'id']);
            this.renderTable();
        }, 300));
    }

    async loadData() {
        try {
            const res = await fetch(this.options.endpoint);
            const result = await res.json();
            if (result.status === 'success') {
                this.originalData = result.data;
                this.filteredData = [...result.data];
                this.renderTable();
            }
        } catch(e) { console.error('Error cargando datos:', e); }
    }

    renderTable() {
        const tbody = document.querySelector(`#${this.tableId} tbody`);
        if (!tbody) return;
        if (!this.filteredData.length) {
            const cols = document.querySelector(`#${this.tableId} thead tr`)?.children.length || 7;
            tbody.innerHTML = `<tr class="no-results"><td colspan="${cols}"><div class="empty-state"><i class="fas fa-search"></i><h3>No se encontraron resultados</h3></div></td></tr>`;
            return;
        }
        tbody.innerHTML = this.filteredData.map(item => this.renderRow(item)).join('');
        this.setupRowListeners();
    }

    renderRow(item) { return ''; }
    setupRowListeners() {}
}

class EstudiantesTableManager extends TableManager {
    constructor() {
        super('tabla-estudiantes', {
            searchInputId: 'search-estudiantes',
            searchFields: ['nombre', 'email', 'id', 'grado', 'grupo'],
            endpoint: '/obtener-estudiantes'
        });
        this.loadData();
    }

    renderRow(e) {
        return `<tr data-codigo="${e.id}">
            <td><span class="table-badge badge-primary">${e.id}</span></td>
            <td class="nombre-cell">${e.nombre}</td>
            <td class="email-cell">${e.email}</td>
            <td><span class="table-badge">${e.grado}</span></td>
            <td><span class="table-badge">${e.grupo}</span></td>
            <td>${e.fecha_registro || '–'}</td>
            <td><div class="table-actions">
                <button class="action-btn delete" title="Eliminar" data-codigo="${e.id}"><i class="fas fa-trash"></i></button>
            </div></td>
        </tr>`;
    }

    setupRowListeners() {
        document.querySelector(`#${this.tableId} tbody`)?.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const codigo = btn.dataset.codigo;
                const nombre = btn.closest('tr')?.querySelector('.nombre-cell')?.textContent;
                if (!confirm(`¿Eliminar al estudiante "${nombre}"?`)) return;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                const res = await fetch('/eliminar-estudiante', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
                const data = await res.json();
                if (data.status === 'success') { Utils.showToast(data.message, 'success'); this.loadData(); window.app?.stats?.refresh(); }
                else { Utils.showToast(data.message, 'error'); btn.innerHTML = '<i class="fas fa-trash"></i>'; btn.disabled = false; }
            });
        });
    }
}

class ProfesoresTableManager extends TableManager {
    constructor() {
        super('tabla-profesores', {
            searchInputId: 'search-profesores',
            searchFields: ['nombre', 'email', 'id', 'asignaturas', 'telefono'],
            endpoint: '/obtener-profesores'
        });
        this.loadData();
    }

    renderRow(p) {
        const asigs = Array.isArray(p.asignaturas)
            ? (p.asignaturas.length > 2 ? p.asignaturas.slice(0, 2).join(', ') + '...' : p.asignaturas.join(', '))
            : (p.asignaturas || '');
        return `<tr data-codigo="${p.id}">
            <td><span class="table-badge badge-primary">${p.id}</span></td>
            <td class="nombre-cell">${p.nombre}</td>
            <td class="email-cell">${p.email}</td>
            <td>${p.telefono || 'N/A'}</td>
            <td title="${Array.isArray(p.asignaturas) ? p.asignaturas.join(', ') : ''}">${asigs}</td>
            <td>${p.fecha_registro || '–'}</td>
            <td><div class="table-actions">
                <button class="action-btn delete" title="Eliminar" data-codigo="${p.id}"><i class="fas fa-trash"></i></button>
            </div></td>
        </tr>`;
    }

    setupRowListeners() {
        document.querySelector(`#${this.tableId} tbody`)?.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const codigo = btn.dataset.codigo;
                const nombre = btn.closest('tr')?.querySelector('.nombre-cell')?.textContent;
                if (!confirm(`¿Eliminar al profesor "${nombre}"?`)) return;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                const res = await fetch('/eliminar-profesor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
                const data = await res.json();
                if (data.status === 'success') { Utils.showToast(data.message, 'success'); this.loadData(); window.app?.stats?.refresh(); }
                else { Utils.showToast(data.message, 'error'); btn.innerHTML = '<i class="fas fa-trash"></i>'; btn.disabled = false; }
            });
        });
    }
}

// FORMULARIO ESTUDIANTE


class StudentFormHandler {
    static collectProfile(prefix) {
        const v = id => document.getElementById(id)?.value?.trim() || '';
        return {
            fecha_nacimiento: v(`${prefix}fecha-nacimiento`) || v('edit-est-fecha-nac') || null,
            lugar_nacimiento: v(`${prefix}lugar-nacimiento`) || v('edit-est-lugar-nac'),
            genero: v(`${prefix}genero`) || v('edit-est-genero'),
            direccion_residencia: v(`${prefix}direccion`) || v('edit-est-direccion'),
            eps: v(`${prefix}eps`) || v('edit-est-eps'),
            grupo_sanguineo: v(`${prefix}grupo-sanguineo`) || v('edit-est-rh'),
            alergias: v(`${prefix}alergias`) || v('edit-est-alergias'),
            ultimo_grado: v(`${prefix}ultimo-grado`) || v('edit-est-ultimo-grado'),
            colegio_procedencia: v(`${prefix}colegio-procedencia`) || v('edit-est-procedencia'),
        };
    }

    static collectAcudiente(prefix) {
        const v = id => document.getElementById(id)?.value?.trim() || '';
        const nombre = v(`${prefix}nombre`) || v('edit-acu-nombre');
        if (!nombre) return null;
        const estrato = v(`${prefix}estrato`) || v('edit-acu-estrato');
        return {
            nombre_completo: nombre,
            tipo_documento: v(`${prefix}tipo-doc`) || v('edit-acu-tipo-doc') || 'cc',
            numero_documento: v(`${prefix}num-doc`) || v('edit-acu-num-doc'),
            parentesco: v(`${prefix}parentesco`) || v('edit-acu-parentesco'),
            telefono: v(`${prefix}telefono`) || v('edit-acu-telefono'),
            correo_electronico: v(`${prefix}correo`) || v('edit-acu-correo'),
            direccion: v(`${prefix}direccion`) || v('edit-acu-direccion'),
            ocupacion: v(`${prefix}ocupacion`) || v('edit-acu-ocupacion'),
            estrato_socioeconomico: estrato || null,
        };
    }

    constructor() {
        this.form = document.getElementById('estudiante-form');
        if (!this.form) return;
        this.init();
    }

    init() {
        this.form.addEventListener('submit', e => this.handleSubmit(e));
        document.getElementById('cancel-estudiante')?.addEventListener('click', () => {
            if (confirm('¿Cancelar? Se perderán los datos.')) this.resetForm();
        });
        document.getElementById('generate-student-password')?.addEventListener('click', () => {
            const pw = Utils.generatePassword();
            const input = document.getElementById('contrasena');
            if (input) { input.value = pw; this.updateStrength(pw); }
        });
        document.getElementById('contrasena')?.addEventListener('input', e => this.updateStrength(e.target.value));
        document.getElementById('numero-documento')?.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
    }

    updateStrength(password) {
        const fill = document.getElementById('student-password-strength-fill');
        const label = document.getElementById('student-password-strength-label');
        if (!fill || !label) return;
        const s = Utils.calculatePasswordStrength(password);
        fill.style.width = s.percentage + '%';
        fill.style.backgroundColor = s.color;
        label.textContent = s.label;
        label.style.color = s.color;
    }

    async handleSubmit(e) {
        e.preventDefault();
        const fields = [
            { id: 'nombre-completo', fn: v => Validator.required(v, 5) },
            { id: 'tipo-documento', fn: v => Validator.required(v) },
            { id: 'numero-documento', fn: v => Validator.required(v) },
            { id: 'correo-electronico', fn: v => Validator.email(v) },
            { id: 'id-grupo-estudiante', fn: v => Validator.required(v) },
            { id: 'contrasena', fn: v => Validator.password(v) }
        ];
        let valid = true;
        fields.forEach(({ id, fn }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const result = fn(el.value.trim());
            if (!result.valid) { Utils.showError(id, result.message); valid = false; }
            else Utils.markAsValid(id);
        });
        if (!valid) return;

        const idGrupoEl = document.getElementById('id-grupo-estudiante');
        const data = {
            nombre_completo: document.getElementById('nombre-completo').value,
            tipo_documento: document.getElementById('tipo-documento').value,
            numero_documento: document.getElementById('numero-documento').value,
            correo_electronico: document.getElementById('correo-electronico').value,
            id_grupo: idGrupoEl ? idGrupoEl.value : '',
            contrasena: document.getElementById('contrasena').value,
            ...StudentFormHandler.collectProfile('est-'),
            acudiente: StudentFormHandler.collectAcudiente('acu-'),
        };

        const btn = this.form.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        btn.disabled = true;

        try {
            const res = await fetch('/registrar-estudiante', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await res.json();
            if (result.status === 'success') {
                Utils.showToast(`✅ ${result.message} Código: ${result.data?.codigo}`, 'success');
                this.resetForm();
                window.app?.tables?.estudiantes?.loadData();
                window.app?.stats?.refresh();
            } else { Utils.showToast(result.message, 'error'); }
        } catch(err) { Utils.showToast('Error al conectar con el servidor.', 'error'); }
        finally { btn.innerHTML = orig; btn.disabled = false; }
    }

    resetForm() {
        this.form.reset();
        this.updateStrength('');
        this.form.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('success', 'error'));
    }
}

// FORMULARIO PROFESOR


class ProfessorFormHandler {
    static collectProfile(prefix) {
        const v = id => document.getElementById(id)?.value?.trim() || '';
        return {
            titulos_academicos: v(`${prefix}titulos`) || v('edit-prof-titulos'),
            area_especialidad: v(`${prefix}area`) || v('edit-prof-area'),
            anios_experiencia: v(`${prefix}experiencia`) || v('edit-prof-experiencia') || null,
            registro_escalafon: v(`${prefix}escalafon`) || v('edit-prof-escalafon'),
            entidad_salud: v(`${prefix}entidad-salud`) || v('edit-prof-entidad-salud'),
            entidad_pension: v(`${prefix}entidad-pension`) || v('edit-prof-entidad-pension'),
        };
    }

    constructor() {
        this.form = document.getElementById('profesor-form');
        if (!this.form) return;
        this.init();
    }

    init() {
        this.form.addEventListener('submit', e => this.handleSubmit(e));
        document.getElementById('cancel-profesor')?.addEventListener('click', () => {
            if (confirm('¿Cancelar? Se perderán los datos.')) this.resetForm();
        });
        document.getElementById('generate-profesor-password')?.addEventListener('click', () => {
            const pw = Utils.generatePassword();
            const input = document.getElementById('prof-contrasena');
            if (input) input.value = pw;
        });
        // El multi-select maneja eventos mediante onclick en las opciones
        ['prof-num-doc', 'prof-telefono'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
        });
        this.cargarAsignaturas();
    }
    async cargarAsignaturas() {
        const container = document.getElementById('prof-asignaturas');
        if (!container) return;
        try {
            const res  = await fetch('/admin/materias');
            const data = await res.json();
            const materias = data.data || [];
            if (!materias.length) {
                container.innerHTML = '<div class="custom-multi-select-empty">No hay materias registradas</div>';
                return;
            }
            container.innerHTML = materias.map(m =>
                `<div class="custom-multi-select-option" data-value="${m.nombre}" onclick="toggleOption(this)">
                    <span class="ms-checkbox"><i class="fas fa-check"></i></span>
                    <span class="ms-label">${m.nombre}</span>
                </div>`
            ).join('');
        } catch(e) {
            console.error('Error cargando materias:', e);
        }
    }
    async handleSubmit(e) {
        e.preventDefault();
        const wrapper = document.getElementById('prof-multi-select');
        const asignaturas = wrapper
            ? [...wrapper.querySelectorAll('.custom-multi-select-option.selected')].map(opt => opt.dataset.value)
            : [];
        if (!asignaturas.length) { Utils.showToast('Selecciona al menos una asignatura.', 'error'); return; }

        const data = {
            nombre_completo: document.getElementById('prof-nombre').value,
            tipo_documento: document.getElementById('prof-tipo-doc').value,
            numero_documento: document.getElementById('prof-num-doc').value,
            correo_electronico: document.getElementById('prof-correo').value,
            telefono: document.getElementById('prof-telefono').value,
            asignaturas,
            contrasena: document.getElementById('prof-contrasena').value,
            ...ProfessorFormHandler.collectProfile('prof-'),
        };

        const btn = this.form.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        btn.disabled = true;

        try {
            const res = await fetch('/registrar-profesor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await res.json();
            if (result.status === 'success') {
                Utils.showToast(`✅ ${result.message} Código: ${result.data?.codigo}`, 'success');
                this.resetForm();
                window.app?.tables?.profesores?.loadData();
                window.app?.stats?.refresh();
            } else { Utils.showToast(result.message, 'error'); }
        } catch(err) { Utils.showToast('Error al conectar con el servidor.', 'error'); }
        finally { btn.innerHTML = orig; btn.disabled = false; }
    }

    resetForm() {
        this.form.reset();
        this.form.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('success', 'error'));
        const wrapper = document.getElementById('prof-multi-select');
        if (wrapper) {
            wrapper.querySelectorAll('.custom-multi-select-option.selected').forEach(opt => opt.classList.remove('selected'));
            updateMultiSelectCount(wrapper);
        }
    }
}

// ADMIN MANAGER
const AdminManager = {
    showMsg(id, msg, ok = true) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.color = ok ? 'var(--success)' : 'var(--error)';
        el.style.fontWeight = '600';
        el.style.marginTop = '8px';
        el.textContent = msg;
        setTimeout(() => el.textContent = '', 4000);
    },

    async cargarPeriodos() {
        const tbody = document.getElementById('tbody-periodos');
        if (!tbody) return;
        try {
            const res = await fetch('/admin/periodos');
            const data = await res.json();
            if (!data.data?.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--gray-500);">No hay períodos registrados</td></tr>'; return; }
            tbody.innerHTML = data.data.map(p => {
                const inicio = p.fecha_inicio || '';
                const fin = p.fecha_fin || '';
                const inicioRaw = p.fecha_inicio_raw || '';
                const finRaw = p.fecha_fin_raw || '';
                return `<tr><td>${p.id_periodo}</td><td><strong>${p.nombre}</strong></td><td>${inicio}</td><td>${fin}</td>
                <td class="table-actions">
                    <button class="btn-sm btn-primary" onclick="AdminManager.editarPeriodo(${p.id_periodo},'${p.nombre.replace(/'/g,"\\'")}','${inicioRaw}','${finRaw}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="AdminManager.eliminarPeriodo(${p.id_periodo})" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td></tr>`;
            }).join('');
        } catch(e) {}
    },

    async guardarPeriodo() {
        const id = document.getElementById('edit-periodo-id')?.value;
        const nombre = document.getElementById('periodo-nombre')?.value.trim();
        const fecha_inicio = document.getElementById('periodo-inicio')?.value;
        const fecha_fin = document.getElementById('periodo-fin')?.value;
        if (!nombre || !fecha_inicio || !fecha_fin) { this.showMsg('periodo-msg', '⚠️ Todos los campos son requeridos.', false); return; }
        const url = id ? `/admin/periodos/${id}` : '/admin/periodos';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, fecha_inicio, fecha_fin }) });
        const data = await res.json();
        this.showMsg('periodo-msg', data.message, data.status === 'success');
        if (data.status === 'success') { this._resetPeriodoForm(); this.cargarPeriodos(); }
    },
    _resetPeriodoForm() {
        document.getElementById('edit-periodo-id').value = '';
        document.getElementById('periodo-nombre').value = '';
        document.getElementById('periodo-inicio').value = '';
        document.getElementById('periodo-fin').value = '';
        document.getElementById('periodo-form-title').textContent = 'Crear Período';
        document.getElementById('btn-guardar-periodo').innerHTML = '<i class="fas fa-plus"></i> Crear Período';
        document.getElementById('btn-cancelar-periodo').style.display = 'none';
    },
    cancelarEdicionPeriodo() { this._resetPeriodoForm(); },
    async editarPeriodo(id, nombre, inicio, fin) {
        document.getElementById('edit-periodo-id').value = id;
        document.getElementById('periodo-nombre').value = nombre;
        document.getElementById('periodo-inicio').value = inicio;
        document.getElementById('periodo-fin').value = fin;
        document.getElementById('periodo-form-title').textContent = 'Editar Período';
        document.getElementById('btn-guardar-periodo').innerHTML = '<i class="fas fa-save"></i> Actualizar';
        document.getElementById('btn-cancelar-periodo').style.display = 'inline-block';
        document.getElementById('periodo-msg').textContent = '';
        document.getElementById('periodos-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    async eliminarPeriodo(id) {
        if (!confirm('¿Eliminar este período?')) return;
        const res = await fetch(`/admin/periodos/${id}`, { method: 'DELETE' });
        const data = await res.json();
        this.showMsg('periodo-msg', data.message, data.status === 'success');
        if (data.status === 'success') this.cargarPeriodos();
    },

    async cargarPeriodosSelect(selectId) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        const res = await fetch('/admin/periodos');
        const data = await res.json();
        sel.innerHTML = '<option value="">Selecciona un período</option>';
        (data.data || []).forEach(p => { const o = document.createElement('option'); o.value = p.id_periodo; o.textContent = p.nombre; sel.appendChild(o); });
    },

    async cargarGruposSelect(selectId) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        try {
            const res = await fetch('/obtener-grupos-ids');
            const json = await res.json();
            sel.innerHTML = '<option value="">Selecciona un grupo</option>';
            (json.data || []).forEach(g => {
                const o = document.createElement('option');
                o.value = g.id_grupo;
                o.textContent = g.nombre;
                sel.appendChild(o);
            });
        } catch(e) { console.error('Error cargando grupos:', e); }
    },

    async cargarGrupos() {
        const tbody = document.getElementById('tbody-grupos');
        if (!tbody) return;
        try {
            const res = await fetch('/admin/grupos');
            const data = await res.json();
            if (!data.data?.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--gray-500);">No hay grupos registrados</td></tr>'; return; }
            tbody.innerHTML = data.data.map(g => {
                const periodo = g.periodo || '–';
                return `<tr><td>${g.id_grupo}</td><td><strong>${g.nombre}</strong></td><td>${periodo}</td>
                <td class="table-actions">
                    <button class="btn-sm btn-primary" onclick="AdminManager.editarGrupo(${g.id_grupo},'${g.nombre.replace(/'/g,"\\'")}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="AdminManager.eliminarGrupo(${g.id_grupo})" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td></tr>`;
            }).join('');
        } catch(e) {}
    },

    async guardarGrupo() {
        const id = document.getElementById('edit-grupo-id')?.value;
        const nombre = document.getElementById('grupo-nombre')?.value.trim();
        const id_periodo = document.getElementById('grupo-periodo')?.value;
        if (!nombre || !id_periodo) { this.showMsg('grupo-msg', '⚠️ Todos los campos son requeridos.', false); return; }
        const url = id ? `/admin/grupos/${id}` : '/admin/grupos';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, id_periodo }) });
        const data = await res.json();
        this.showMsg('grupo-msg', data.message, data.status === 'success');
        if (data.status === 'success') { this._resetGrupoForm(); this.cargarGrupos(); }
    },
    _resetGrupoForm() {
        document.getElementById('edit-grupo-id').value = '';
        document.getElementById('grupo-nombre').value = '';
        document.getElementById('grupo-periodo').value = '';
        document.getElementById('grupo-form-title').textContent = 'Crear Grupo';
        document.getElementById('btn-guardar-grupo').innerHTML = '<i class="fas fa-plus"></i> Crear Grupo';
        document.getElementById('btn-cancelar-grupo').style.display = 'none';
    },
    cancelarEdicionGrupo() { this._resetGrupoForm(); },
    async editarGrupo(id, nombre) {
        document.getElementById('edit-grupo-id').value = id;
        document.getElementById('grupo-nombre').value = nombre;
        document.getElementById('grupo-form-title').textContent = 'Editar Grupo';
        document.getElementById('btn-guardar-grupo').innerHTML = '<i class="fas fa-save"></i> Actualizar';
        document.getElementById('btn-cancelar-grupo').style.display = 'inline-block';
        document.getElementById('grupo-msg').textContent = '';
        document.getElementById('grupos-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    async eliminarGrupo(id) {
        if (!confirm('¿Eliminar este grupo? Se eliminarán también las asignaciones relacionadas.')) return;
        const res = await fetch(`/admin/grupos/${id}`, { method: 'DELETE' });
        const data = await res.json();
        this.showMsg('grupo-msg', data.message, data.status === 'success');
        if (data.status === 'success') this.cargarGrupos();
    },

    async cargarMaterias() {
        const tbody = document.getElementById('tbody-materias');
        if (!tbody) return;
        try {
            const res = await fetch('/admin/materias');
            const data = await res.json();
            if (!data.data?.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--gray-500);">No hay materias registradas</td></tr>'; return; }
            tbody.innerHTML = data.data.map(m => {
                const codigo = m.codigo || '–';
                return `<tr><td>${m.id_materia}</td><td><strong>${m.nombre}</strong></td><td>${codigo}</td>
                <td class="table-actions">
                    <button class="btn-sm btn-primary" onclick="AdminManager.editarMateria(${m.id_materia},'${m.nombre.replace(/'/g,"\\'")}','${codigo.replace(/'/g,"\\'")}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="AdminManager.eliminarMateria(${m.id_materia})" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td></tr>`;
            }).join('');
        } catch(e) {}
    },

    async guardarMateria() {
        const id = document.getElementById('edit-materia-id')?.value;
        const nombre = document.getElementById('materia-nombre')?.value.trim();
        const codigo = document.getElementById('materia-codigo')?.value.trim() || '';
        if (!nombre) { this.showMsg('materia-msg', '⚠️ El nombre es requerido.', false); return; }
        const url = id ? `/admin/materias/${id}` : '/admin/materias';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, codigo }) });
        const data = await res.json();
        this.showMsg('materia-msg', data.message, data.status === 'success');
        if (data.status === 'success') { this._resetMateriaForm(); this.cargarMaterias(); }
    },
    _resetMateriaForm() {
        document.getElementById('edit-materia-id').value = '';
        document.getElementById('materia-nombre').value = '';
        document.getElementById('materia-codigo').value = '';
        document.getElementById('materia-form-title').textContent = 'Crear Materia';
        document.getElementById('btn-guardar-materia').innerHTML = '<i class="fas fa-plus"></i> Crear Materia';
        document.getElementById('btn-cancelar-materia').style.display = 'none';
    },
    cancelarEdicionMateria() { this._resetMateriaForm(); },
    async editarMateria(id, nombre, codigo) {
        document.getElementById('edit-materia-id').value = id;
        document.getElementById('materia-nombre').value = nombre;
        document.getElementById('materia-codigo').value = codigo === '–' ? '' : codigo;
        document.getElementById('materia-form-title').textContent = 'Editar Materia';
        document.getElementById('btn-guardar-materia').innerHTML = '<i class="fas fa-save"></i> Actualizar';
        document.getElementById('btn-cancelar-materia').style.display = 'inline-block';
        document.getElementById('materia-msg').textContent = '';
        document.getElementById('materias-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    async eliminarMateria(id) {
        if (!confirm('¿Eliminar esta materia? Se eliminarán también las asignaciones relacionadas.')) return;
        const res = await fetch(`/admin/materias/${id}`, { method: 'DELETE' });
        const data = await res.json();
        this.showMsg('materia-msg', data.message, data.status === 'success');
        if (data.status === 'success') this.cargarMaterias();
    },

    async cargarDatosAsignaciones() {
        try {
            const [profRes, grupoRes, matRes, asigRes, estRes] = await Promise.all([
                fetch('/obtener-profesores-ids').then(r => r.json()),
                fetch('/obtener-grupos-ids').then(r => r.json()),
                fetch('/obtener-materias-ids').then(r => r.json()),
                fetch('/admin/asignaciones').then(r => r.json()),
                fetch('/obtener-estudiantes-ids').then(r => r.json())
            ]);
            const fillSelect = (id, items, valKey, labelFn) => {
                const sel = document.getElementById(id);
                if (!sel) return;
                sel.innerHTML = '<option value="">Selecciona</option>';
                (items || []).forEach(i => { const o = document.createElement('option'); o.value = i[valKey]; o.textContent = labelFn(i); sel.appendChild(o); });
            };
            fillSelect('asig-profesor',   profRes.data,  'id_profesor',   p => `${p.nombre_completo} (${p.codigo_profesor})`);
            fillSelect('asig-grupo',      grupoRes.data, 'id_grupo',      g => g.nombre);
            fillSelect('asig-materia',    matRes.data,   'id_materia',    m => m.nombre);
            fillSelect('asig-estudiante', estRes.data,   'id_estudiante', e => `${e.nombre_completo} (${e.codigo_estudiante})`);
            fillSelect('asig-grupo-est',  grupoRes.data, 'id_grupo',      g => g.nombre);
            fillSelect('filtro-grupo-est',grupoRes.data, 'id_grupo',      g => g.nombre);

            const tbody = document.getElementById('tbody-asignaciones');
            if (tbody) {
                if (!asigRes.data?.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--gray-500);">No hay asignaciones</td></tr>'; }
                else tbody.innerHTML = asigRes.data.map(a => `<tr><td>${a.profesor}</td><td>${a.grupo}</td><td>${a.materia}</td><td><button class="btn-danger btn-sm" onclick="AdminManager.eliminarAsignacion(${a.id_grupo_materia})"><i class="fas fa-trash"></i></button></td></tr>`).join('');
            }
        } catch(e) { console.error('Error cargando asignaciones:', e); }
    },

    async asignarProfesor() {
        const id_docente = document.getElementById('asig-profesor')?.value;
        const id_grupo = document.getElementById('asig-grupo')?.value;
        const id_materia = document.getElementById('asig-materia')?.value;
        if (!id_docente || !id_grupo || !id_materia) { this.showMsg('asig-profesor-msg', '⚠️ Todos los campos son requeridos.', false); return; }
        const res = await fetch('/admin/asignaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_docente, id_grupo, id_materia }) });
        const data = await res.json();
        this.showMsg('asig-profesor-msg', data.message, data.status === 'success');
        if (data.status === 'success') this.cargarDatosAsignaciones();
    },

    async asignarEstudiante() {
        const id_estudiante = document.getElementById('asig-estudiante')?.value;
        const id_grupo = document.getElementById('asig-grupo-est')?.value;
        if (!id_estudiante || !id_grupo) { this.showMsg('asig-estudiante-msg', '⚠️ Todos los campos son requeridos.', false); return; }
        const res = await fetch('/admin/asignar-estudiante', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_estudiante, id_grupo }) });
        const data = await res.json();
        this.showMsg('asig-estudiante-msg', data.message, data.status === 'success');
    },

    async eliminarAsignacion(id) {
        if (!confirm('¿Eliminar esta asignación?')) return;
        const res = await fetch(`/admin/asignaciones/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') { Utils.showToast('Asignación eliminada.', 'success'); this.cargarDatosAsignaciones(); }
    },

    async cargarEstudiantesGrupo(id_grupo) {
        if (!id_grupo) return;
        const tbody = document.getElementById('tbody-est-grupo');
        if (!tbody) return;
        const res = await fetch(`/admin/grupo/${id_grupo}/estudiantes`);
        const data = await res.json();
        if (!data.data?.length) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--gray-500);">No hay estudiantes en este grupo</td></tr>'; return; }
        tbody.innerHTML = data.data.map(e => `<tr><td><span class="table-badge badge-primary">${e.codigo_estudiante}</span></td><td>${e.nombre_completo}</td><td><button class="btn-danger btn-sm" onclick="AdminManager.quitarEstudianteGrupo(${e.id_estudiante}, ${id_grupo})"><i class="fas fa-times"></i></button></td></tr>`).join('');
    },

    async quitarEstudianteGrupo(id_estudiante, id_grupo) {
        if (!confirm('¿Quitar estudiante del grupo?')) return;
        const res = await fetch('/admin/quitar-estudiante', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_estudiante, id_grupo }) });
        const data = await res.json();
        if (data.status === 'success') this.cargarEstudiantesGrupo(id_grupo);
    },

    async cargarClasesImpartidas() {
        try {
            const [profRes, grupoRes, matRes, clasesRes] = await Promise.all([
                fetch('/admin/lista-profesores').then(r => r.json()),
                fetch('/obtener-grupos-ids').then(r => r.json()),
                fetch('/obtener-materias-ids').then(r => r.json()),
                (async () => {
                    const params = new URLSearchParams();
                    const pr = document.getElementById('ci-filtro-profesor')?.value;
                    const gr = document.getElementById('ci-filtro-grupo')?.value;
                    const mr = document.getElementById('ci-filtro-materia')?.value;
                    const fd = document.getElementById('ci-filtro-desde')?.value;
                    const fh = document.getElementById('ci-filtro-hasta')?.value;
                    if (pr) params.set('id_profesor', pr);
                    if (gr) params.set('id_grupo', gr);
                    if (mr) params.set('id_materia', mr);
                    if (fd) params.set('fecha_desde', fd);
                    if (fh) params.set('fecha_hasta', fh);
                    return fetch(`/admin/clases-impartidas?${params}`).then(r => r.json());
                })()
            ]);
            const fillSelect = (id, items, valKey, labelFn) => {
                const sel = document.getElementById(id);
                if (!sel) return;
                const current = sel.value;
                sel.innerHTML = '<option value="">Todos</option>';
                (items || []).forEach(i => { const o = document.createElement('option'); o.value = i[valKey]; o.textContent = labelFn(i); sel.appendChild(o); });
                sel.value = current;
            };
            fillSelect('ci-filtro-profesor', profRes.data, 'id_profesor', p => p.nombre_completo);
            fillSelect('ci-filtro-grupo', grupoRes.data, 'id_grupo', g => g.nombre);
            fillSelect('ci-filtro-materia', matRes.data, 'id_materia', m => m.nombre);

            const tbody = document.getElementById('tbody-clases-impartidas');
            if (tbody) {
                const clases = clasesRes.data || [];
                if (!clases.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--gray-500);">No hay clases registradas con estos filtros</td></tr>'; return; }
                tbody.innerHTML = clases.map(c => `<tr>
                    <td>${c.fecha}</td>
                    <td>${c.profesor}</td>
                    <td>${c.nombre_grupo}</td>
                    <td>${c.nombre_materia}</td>
                    <td>${c.tema}</td>
                    <td>${c.material_utilizado || '—'}</td>
                </tr>`).join('');
            }
        } catch(e) { console.error('Error cargando clases impartidas:', e); }
    },

    async cargarHorarios() {
        try {
            const [gmRes, horRes] = await Promise.all([
                fetch('/obtener-asignaciones-ids').then(r => r.json()),
                fetch('/admin/horarios').then(r => r.json())
            ]);
            const gmSel = document.getElementById('hor-grupo-materia');
            if (gmSel) {
                gmSel.innerHTML = '<option value="">Selecciona</option>';
                (gmRes.data || []).forEach(a => {
                    const o = document.createElement('option');
                    o.value = a.id_grupo_materia;
                    o.textContent = `${a.materia} — ${a.grupo}`;
                    gmSel.appendChild(o);
                });
            }
            const tbody = document.getElementById('tbody-horarios');
            if (tbody) {
                const horarios = horRes.data || [];
                if (!horarios.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--gray-500);">No hay horarios registrados</td></tr>'; return; }
                const diasOpts = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map(d =>
                    `<option value="${d}">${d}</option>`
                ).join('');
                tbody.innerHTML = horarios.map(h => {
                    const diasSel = diasOpts.replace(`value="${h.dia_semana}"`, `value="${h.dia_semana}" selected`);
                    return `<tr>
                    <td><select id="hor-dia-${h.id_horario}" class="form-select" style="min-width:100px;">${diasSel}</select></td>
                    <td><input type="time" id="hor-hi-${h.id_horario}" class="form-input" value="${h.hora_inicio}" style="min-width:85px;"></td>
                    <td><input type="time" id="hor-hf-${h.id_horario}" class="form-input" value="${h.hora_fin}" style="min-width:85px;"></td>
                    <td>${h.nombre_grupo}</td>
                    <td>${h.nombre_materia}</td>
                    <td>${h.profesor}</td>
                    <td><input type="text" id="hor-salon-${h.id_horario}" class="form-input" value="${h.salon || ''}" style="min-width:70px;" placeholder="Salón"></td>
                    <td style="white-space:nowrap;">
                        <button class="btn-sm btn-primary" onclick="AdminManager.editarHorario(${h.id_horario})" title="Guardar"><i class="fas fa-save"></i></button>
                        <button class="btn-danger btn-sm" onclick="AdminManager.eliminarHorario(${h.id_horario})" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
                }).join('');
            }
        } catch(e) { console.error('Error cargando horarios:', e); }
    },

    async crearHorario() {
        const id_grupo_materia = document.getElementById('hor-grupo-materia')?.value;
        const dia_semana = document.getElementById('hor-dia')?.value;
        const hora_inicio = document.getElementById('hor-inicio')?.value;
        const hora_fin = document.getElementById('hor-fin')?.value;
        const salon = document.getElementById('hor-salon')?.value || '';
        if (!id_grupo_materia || !dia_semana || !hora_inicio || !hora_fin) {
            this.showMsg('hor-msg', '⚠️ Todos los campos marcados son requeridos.', false);
            return;
        }
        const res = await fetch('/admin/horarios', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_grupo_materia, dia_semana, hora_inicio, hora_fin, salon })
        });
        const data = await res.json();
        this.showMsg('hor-msg', data.message, data.status === 'success');
        if (data.status === 'success') this.cargarHorarios();
    },

    async eliminarHorario(id) {
        if (!confirm('¿Eliminar este horario?')) return;
        const res = await fetch(`/admin/horarios/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') { Utils.showToast('Horario eliminado.', 'success'); this.cargarHorarios(); }
    },

    async editarHorario(id) {
        const dia = document.getElementById(`hor-dia-${id}`)?.value;
        const hi = document.getElementById(`hor-hi-${id}`)?.value;
        const hf = document.getElementById(`hor-hf-${id}`)?.value;
        const salon = document.getElementById(`hor-salon-${id}`)?.value || '';
        if (!dia || !hi || !hf) { Utils.showToast('Completa todos los campos.', 'error'); return; }
        const res = await fetch(`/admin/horarios/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dia_semana: dia, hora_inicio: hi, hora_fin: hf, salon })
        });
        const data = await res.json();
        if (data.status === 'success') { Utils.showToast('Horario actualizado.', 'success'); this.cargarHorarios(); }
        else Utils.showToast(data.message, 'error');
    },

    async generarHorarios(limpiar) {
        if (limpiar && !confirm('¿Eliminar TODOS los horarios existentes y regenerar?')) return;
        const dias = Array.from(document.getElementById('hor-gen-dias')?.selectedOptions || []).map(o => o.value);
        if (!dias.length) { Utils.showToast('Selecciona al menos un día.', 'error'); return; }
        const body = {
            hora_inicio: document.getElementById('hor-gen-inicio')?.value || '07:00',
            duracion_min: parseInt(document.getElementById('hor-gen-duracion')?.value || '50'),
            horas_por_dia: parseInt(document.getElementById('hor-gen-por-dia')?.value || '7'),
            dias: dias,
            eliminar_existentes: limpiar,
        };
        const msgEl = document.getElementById('hor-gen-msg');
        if (msgEl) msgEl.innerHTML = '<span style="color:#3182ce;">⏳ Generando horarios...</span>';
        const res = await fetch('/admin/horarios/generar', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.status === 'success') {
            let html = `<span style="color:green;">✅ ${data.message}</span>`;
            if (data.conflictos > 0) {
                const sinLugar = (data.sin_lugar || []).map(s => `• ${s.grupo} — ${s.materia} (${s.profesor})`).join('<br>');
                html += `<br><span style="color:#e67e22;">⚠️ ${data.conflictos} sin lugar:</span><div style="margin-top:6px;font-size:12px;color:var(--gray-600);">${sinLugar}</div>`;
            }
            if (msgEl) msgEl.innerHTML = html;
            this.cargarHorarios();
        } else {
            if (msgEl) msgEl.innerHTML = `<span style="color:red;">❌ ${data.message}</span>`;
        }
    },

    async cargarBoletines() {
        try {
            const [areasRes, periodosRes, materiasRes, gruposRes, estudiantesRes] = await Promise.all([
                fetch('/admin/boletin/areas').then(r => r.json()),
                fetch('/admin/boletin/periodos').then(r => r.json()),
                fetch('/obtener-materias-ids').then(r => r.json()),
                fetch('/obtener-grupos-ids').then(r => r.json()),
                fetch('/obtener-estudiantes-ids').then(r => r.json()),
            ]);
            const tbody = document.getElementById('tbody-boletin-areas');
            if (tbody) {
                const areas = areasRes.data || [];
                if (!areas.length) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--gray-500);">No hay áreas creadas</td></tr>'; }
                else tbody.innerHTML = areas.map(a => `<tr>
                    <td><strong>${a.nombre}</strong></td>
                    <td>${(a.materias||[]).map(m=>m.nombre).join(', ') || '—'}</td>
                    <td><button class="btn-danger btn-sm" onclick="AdminManager.eliminarAreaBoletin(${a.id_area})"><i class="fas fa-trash"></i></button></td>
                </tr>`).join('');
            }
            const matSel = document.getElementById('bol-area-materias');
            if (matSel) {
                matSel.innerHTML = '';
                (materiasRes.data||[]).forEach(m => { const o = document.createElement('option'); o.value = m.id_materia; o.textContent = m.nombre; matSel.appendChild(o); });
            }
            const periodos = periodosRes.data || [];
            ['bol-lib-periodo','bol-est-periodo'].forEach(id => {
                const sel = document.getElementById(id);
                if (sel) { sel.innerHTML = '<option value="">Selecciona</option>'; periodos.forEach(p => { const o = document.createElement('option'); o.value = p.id_periodo; o.textContent = p.nombre; sel.appendChild(o); }); }
            });
            const grpSel = document.getElementById('bol-lib-grupo');
            if (grpSel) { grpSel.innerHTML = '<option value="">Todos los grupos</option>'; (gruposRes.data||[]).forEach(g => { const o = document.createElement('option'); o.value = g.id_grupo; o.textContent = g.nombre; grpSel.appendChild(o); }); }
            const estSel = document.getElementById('bol-est-select');
            if (estSel) { estSel.innerHTML = '<option value="">Selecciona</option>'; (estudiantesRes.data||[]).forEach(e => { const o = document.createElement('option'); o.value = e.id_estudiante; o.textContent = `${e.nombre_completo} (${e.codigo_estudiante})`; estSel.appendChild(o); }); }
        } catch(e) { console.error('Error cargando boletines:', e); }
    },

    async crearAreaBoletin() {
        const nombre = document.getElementById('bol-area-nombre')?.value;
        const matSel = document.getElementById('bol-area-materias');
        const id_materias = matSel ? Array.from(matSel.selectedOptions).map(o => parseInt(o.value)) : [];
        if (!nombre) { this.showMsg('bol-area-msg', '⚠️ Nombre del área es requerido.', false); return; }
        const res = await fetch('/admin/boletin/areas', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({nombre, id_materias}) });
        const data = await res.json();
        this.showMsg('bol-area-msg', data.message, data.status==='success');
        if (data.status==='success') { document.getElementById('bol-area-nombre').value=''; this.cargarBoletines(); }
    },

    async eliminarAreaBoletin(id) {
        if (!confirm('¿Eliminar esta área?')) return;
        await fetch(`/admin/boletin/areas/${id}`, { method:'DELETE' });
        this.cargarBoletines();
    },

    async liberarBoletines(liberar) {
        const id_periodo = document.getElementById('bol-lib-periodo')?.value;
        const id_grupo = document.getElementById('bol-lib-grupo')?.value || undefined;
        if (!id_periodo) { this.showMsg('bol-lib-msg', '⚠️ Selecciona un periodo.', false); return; }
        const res = await fetch('/admin/boletin/liberar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id_periodo, id_grupo: id_grupo ? parseInt(id_grupo) : undefined, liberar}) });
        const data = await res.json();
        this.showMsg('bol-lib-msg', data.message, data.status==='success');
    },

    descargarBoletin() {
        const id_est = document.getElementById('bol-est-select')?.value;
        const id_per = document.getElementById('bol-est-periodo')?.value;
        if (!id_est) { Utils.showToast('Selecciona un estudiante.', 'error'); return; }
        let url = `/boletin/${id_est}/pdf`;
        if (id_per) url += `?id_periodo=${id_per}`;
        window.open(url, '_blank');
    },


    _rolAdminLabel(rol) {
        const map = { admin_lider: 'Líder', admin_colegio: 'Administrador', superadmin: 'Super admin' };
        return map[rol] || rol || '–';
    },

    _initCrearAdminUI(meta) {
        const form = document.getElementById('admin-crear-form');
        const aviso = document.getElementById('admin-crear-aviso');
        const esLider = meta?.es_lider;
        if (form) form.style.display = esLider ? '' : 'none';
        if (aviso) aviso.style.display = esLider ? 'none' : '';
    },

    async crearAdministrador() {
        const body = {
            nombre: document.getElementById('new-admin-nombre')?.value.trim(),
            email: document.getElementById('new-admin-email')?.value.trim(),
            password: document.getElementById('new-admin-pass')?.value,
        };
        const msgEl = document.getElementById('admin-crear-msg');
        const res = await fetch('/admin/administradores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (msgEl) {
            msgEl.style.color = data.status === 'success' ? 'var(--success)' : 'var(--error)';
            msgEl.textContent = data.message;
        }
        if (data.status === 'success') {
            ['new-admin-nombre', 'new-admin-email', 'new-admin-pass'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            this.cargarAdministradores();
        }
    },

    async cargarAdministradores() {
        const tbody = document.getElementById('tbody-administradores');
        if (!tbody) return;
        try {
            const res = await fetch('/admin/administradores');
            const data = await res.json();
            this._initCrearAdminUI(data.meta);
            if (!data.data?.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--gray-500);">No hay administradores registrados</td></tr>';
                return;
            }
            const esLider = data.meta?.es_lider || userEmail === 'gualt45@gmail.com';
            tbody.innerHTML = data.data.map(a => `
                <tr>
                    <td>${a.id_admin}</td>
                    <td><strong>${a.nombre_completo}</strong></td>
                    <td>${a.correo_electronico}</td>
                    <td><span class="table-badge ${a.rol === 'admin_lider' ? 'badge-primary' : ''}">${this._rolAdminLabel(a.rol)}</span></td>
                    <td><span class="${a.email_verified ? 'tag-success' : 'tag-error'}">${a.email_verified ? 'Activo' : 'Pendiente'}</span></td>
                    <td>${esLider && a.id_admin !== currentUserId ?
                        `<button class="btn-danger btn-sm" onclick="AdminManager.eliminarAdmin(${a.id_admin})"><i class="fas fa-trash"></i></button>`
                        : '–'}</td>
                </tr>`).join('');
        } catch(e) {}
    },

    async eliminarAdmin(id_admin) {
        if (!confirm('¿Eliminar este administrador?')) return;
        const res = await fetch(`/admin/administradores/${id_admin}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') { Utils.showToast('Administrador eliminado.', 'success'); this.cargarAdministradores(); }
        else Utils.showToast(data.message, 'error');
    },


    async cargarReportes() {
        try {
            const res = await fetch('/dashboard-stats');
            const data = await res.json();
            const el = document.getElementById('reportes-stats');
            if (el && data.status === 'success') {
                el.innerHTML = `
                    <div class="overview-card"><div class="card-icon"><i class="fas fa-users"></i></div><div class="card-content"><h3 class="card-title">Estudiantes Activos</h3><p class="card-value">${data.data.estudiantes}</p></div></div>
                    <div class="overview-card"><div class="card-icon"><i class="fas fa-chalkboard-teacher"></i></div><div class="card-content"><h3 class="card-title">Profesores Activos</h3><p class="card-value">${data.data.profesores}</p></div></div>`;
            }
        } catch(e) {}
    }
};

// Exponer funciones globales para onclick en HTML
window.crearPeriodo = () => AdminManager.guardarPeriodo();
window.crearGrupo = () => AdminManager.guardarGrupo();
window.crearMateria = () => AdminManager.guardarMateria();
window.asignarProfesor = () => AdminManager.asignarProfesor();
window.asignarEstudiante = () => AdminManager.asignarEstudiante();
window.cargarEstudiantesGrupo = id => AdminManager.cargarEstudiantesGrupo(id);
// UI MANAGER


class UIManager {
    init() {
        ProfilePanel.init({
            notify: (msg, ok) => Utils.showToast(msg, ok ? 'success' : 'error'),
            onProfileOpen: () => {
                const chk = document.getElementById('dark-mode-toggle');
                if (chk) chk.checked = document.documentElement.classList.contains('dark-mode');
            },
        });
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            function updateDateTime() {
                const now = new Date();
                const fecha = now.toLocaleDateString('es-ES', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                });
                const hora = now.toLocaleTimeString('es-ES', {
                    hour: 'numeric', minute: '2-digit', hour12: true,
                });
                dateEl.textContent = `${fecha} · ${hora}`;
            }
            updateDateTime();
            setInterval(updateDateTime, 30000);
        }
    }
}


// APP


class App {
    init() {
    try {
        new UIManager().init();
        this.navigation = new NavigationManager();
        // Restaurar última sección visitada (persiste tras F5)
        this.navigation.restoreLastSection();
        this.stats = new StatsManager();
        this.forms = {
            student: new StudentFormHandler(),
            professor: new ProfessorFormHandler()
        };
        const isSuper = document.getElementById('current-user-data')?.dataset.isSuperadmin === 'true';
        if (!isSuper) {
            this.tables = {
                estudiantes: new EstudiantesTableManager(),
                profesores: new ProfesoresTableManager()
            };
        }
        this.chat = new ChatManager();
        this.chat.init();
        setTimeout(() => this.stats.refresh(), 100);
        console.log('✅ App inicializada');
    } catch(e) { console.error('Error iniciando app:', e); }
}
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app;
    app.init();
});


// ============================================================
//  ADDON: Editar Estudiantes y Profesores
//  Pega este bloque AL FINAL de dashboard.js,
//  justo antes del cierre del DOMContentLoaded o al final del archivo.
// ============================================================

// ── MODAL EDITAR ESTUDIANTE ──────────────────────────────────

const EditarEstudiante = {
    modal: null,
    currentCodigo: null,

    init() {
        this.modal = document.getElementById('modal-editar-estudiante');
        document.getElementById('cerrar-modal-est')?.addEventListener('click', () => this.close());
        document.getElementById('cancelar-editar-est')?.addEventListener('click', () => this.close());
        document.getElementById('form-editar-estudiante')?.addEventListener('submit', e => this.guardar(e));
        // Cerrar al hacer clic fuera
        this.modal?.addEventListener('click', e => { if (e.target === this.modal) this.close(); });
    },

    async open(data) {
        this.currentCodigo = data.id;
        try {
            const res = await fetch(`/obtener-estudiante/${encodeURIComponent(data.id)}`);
            const json = await res.json();
            if (json.status === 'success') data = json.data;
        } catch (_) { /* usar datos de la tabla */ }

        // Cargar grupos y seleccionar el que corresponda
        await AdminManager.cargarGruposSelect('edit-est-id-grupo');
        const grupoSelect = document.getElementById('edit-est-id-grupo');
        if (grupoSelect && data.grado && data.grupo) {
            const grupoNombre = (data.grado.replace(/[^\d]/g, '') + (data.grupo || '')).trim();
            for (const opt of grupoSelect.options) {
                if (opt.textContent.replace(/\s/g, '') === grupoNombre) {
                    opt.selected = true;
                    break;
                }
            }
        }

        document.getElementById('edit-est-codigo').value      = data.id       || '';
        document.getElementById('edit-est-nombre').value      = data.nombre_completo || data.nombre   || '';
        document.getElementById('edit-est-correo').value      = data.email || data.correo_electronico    || '';
        document.getElementById('edit-est-tipo-doc').value    = (data.tipo_documento || 'ti').toLowerCase();
        document.getElementById('edit-est-num-doc').value     = data.numero_documento || '';
        document.getElementById('edit-est-fecha-nac').value   = data.fecha_nacimiento || '';
        document.getElementById('edit-est-lugar-nac').value   = data.lugar_nacimiento || '';
        document.getElementById('edit-est-genero').value      = data.genero || '';
        document.getElementById('edit-est-rh').value          = data.grupo_sanguineo || '';
        document.getElementById('edit-est-direccion').value   = data.direccion_residencia || '';
        document.getElementById('edit-est-eps').value         = data.eps || '';
        document.getElementById('edit-est-ultimo-grado').value = data.ultimo_grado || '';
        document.getElementById('edit-est-procedencia').value = data.colegio_procedencia || '';
        document.getElementById('edit-est-alergias').value    = data.alergias || '';
        const ac = data.acudiente || {};
        document.getElementById('edit-acu-nombre').value      = ac.nombre_completo || '';
        document.getElementById('edit-acu-tipo-doc').value    = (ac.tipo_documento || 'cc').toLowerCase();
        document.getElementById('edit-acu-num-doc').value      = ac.numero_documento || '';
        document.getElementById('edit-acu-parentesco').value  = ac.parentesco || '';
        document.getElementById('edit-acu-telefono').value    = ac.telefono || '';
        document.getElementById('edit-acu-correo').value      = ac.correo_electronico || '';
        document.getElementById('edit-acu-estrato').value     = ac.estrato_socioeconomico ? String(ac.estrato_socioeconomico) : '';
        document.getElementById('edit-acu-direccion').value    = ac.direccion || '';
        document.getElementById('edit-acu-ocupacion').value   = ac.ocupacion || '';
        const passEl = document.getElementById('edit-est-nueva-pass');
        if (passEl) {
            passEl.value = '';
            passEl.type = 'password';
        }
        document.querySelectorAll('.toggle-password-btn[data-target="edit-est-nueva-pass"] i').forEach(icon => {
            icon.className = 'fas fa-eye';
        });
        document.getElementById('edit-est-msg').textContent   = '';
        this.modal?.classList.add('active');
    },

    close() {
        this.modal?.classList.remove('active');
        this.currentCodigo = null;
    },

    async guardar(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-guardar-est');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        const idGrupoEl = document.getElementById('edit-est-id-grupo');
        const payload = {
            id:                  document.getElementById('edit-est-codigo').value,
            nombre_completo:     document.getElementById('edit-est-nombre').value,
            tipo_documento:      document.getElementById('edit-est-tipo-doc').value,
            numero_documento:    document.getElementById('edit-est-num-doc').value,
            correo_electronico:  document.getElementById('edit-est-correo').value,
            id_grupo:            idGrupoEl ? idGrupoEl.value : '',
            nueva_contrasena:    document.getElementById('edit-est-nueva-pass').value || null,
            ...StudentFormHandler.collectProfile('edit-est-'),
            acudiente: StudentFormHandler.collectAcudiente('edit-acu-'),
        };

        try {
            const res  = await fetch('/actualizar-estudiante', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            const msg  = document.getElementById('edit-est-msg');

            if (data.status === 'success') {
                msg.style.color = 'var(--success, #16a34a)';
                msg.textContent = '✅ ' + data.message;
                Utils.showToast(data.message, 'success');
                window.app?.tables?.estudiantes?.loadData();
                setTimeout(() => this.close(), 1200);
            } else {
                msg.style.color = 'var(--error, #dc2626)';
                msg.textContent = '❌ ' + data.message;
            }
        } catch (err) {
            document.getElementById('edit-est-msg').textContent = '❌ Error de conexión';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar cambios';
        }
    }
};

// ── MODAL EDITAR PROFESOR ────────────────────────────────────

const ASIGNATURAS_DISPONIBLES = [
    'Matemáticas', 'Lenguaje', 'Ciencias Naturales', 'Ciencias Sociales',
    'Inglés', 'Educación Física', 'Informática', 'Ética y Valores', 'Artes', 'Química'
];

const EditarProfesor = {
    modal: null,
    currentCodigo: null,

    init() {
        this.modal = document.getElementById('modal-editar-profesor');
        document.getElementById('cerrar-modal-prof')?.addEventListener('click', () => this.close());
        document.getElementById('cancelar-editar-prof')?.addEventListener('click', () => this.close());
        document.getElementById('form-editar-profesor')?.addEventListener('submit', e => this.guardar(e));
        this.modal?.addEventListener('click', e => { if (e.target === this.modal) this.close(); });

        // Renderizar opciones de asignaturas
        const container = document.getElementById('edit-prof-asignaturas');
        if (container) {
            container.innerHTML = ASIGNATURAS_DISPONIBLES.map(a =>
                `<div class="custom-multi-select-option" data-value="${a}" onclick="toggleOption(this)">
                    <span class="ms-checkbox"><i class="fas fa-check"></i></span>
                    <span class="ms-label">${a}</span>
                </div>`
            ).join('');
        }
    },

    async open(data) {
        this.currentCodigo = data.id;
        try {
            const res = await fetch(`/obtener-profesor/${encodeURIComponent(data.id)}`);
            const json = await res.json();
            if (json.status === 'success') data = json.data;
        } catch (_) { /* usar datos de la tabla */ }

        document.getElementById('edit-prof-codigo').value     = data.id       || '';
        document.getElementById('edit-prof-nombre').value     = data.nombre_completo || data.nombre   || '';
        document.getElementById('edit-prof-correo').value     = data.email || data.correo_electronico    || '';
        document.getElementById('edit-prof-telefono').value   = data.telefono || '';
        document.getElementById('edit-prof-tipo-doc').value   = (data.tipo_documento || 'cc').toUpperCase();
        document.getElementById('edit-prof-num-doc').value    = data.numero_documento || '';
        document.getElementById('edit-prof-titulos').value    = data.titulos_academicos || '';
        document.getElementById('edit-prof-area').value       = data.area_especialidad || '';
        document.getElementById('edit-prof-experiencia').value = data.anios_experiencia ?? '';
        document.getElementById('edit-prof-escalafon').value  = data.registro_escalafon || '';
        document.getElementById('edit-prof-entidad-salud').value = data.entidad_salud || '';
        document.getElementById('edit-prof-entidad-pension').value = data.entidad_pension || '';
        const profPass = document.getElementById('edit-prof-nueva-pass');
        if (profPass) {
            profPass.value = '';
            profPass.type = 'password';
        }
        document.querySelectorAll('.toggle-password-btn[data-target="edit-prof-nueva-pass"] i').forEach(icon => {
            icon.className = 'fas fa-eye';
        });
        document.getElementById('edit-prof-msg').textContent  = '';

        // Seleccionar asignaturas actuales
        const actuales = Array.isArray(data.asignaturas)
            ? data.asignaturas.map(a => a.trim())
            : (data.asignaturas || '').split(',').map(a => a.trim());

        const wrapper = document.getElementById('edit-prof-multi-select');
        if (wrapper) {
            wrapper.querySelectorAll('.custom-multi-select-option').forEach(opt => {
                opt.classList.toggle('selected', actuales.includes(opt.dataset.value));
            });
            updateMultiSelectCount(wrapper);
        }

        this.modal?.classList.add('active');
    },

    close() {
        this.modal?.classList.remove('active');
        this.currentCodigo = null;
    },

    async guardar(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-guardar-prof');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        const wrapper = document.getElementById('edit-prof-multi-select');
        const asignaturas = wrapper
            ? [...wrapper.querySelectorAll('.custom-multi-select-option.selected')].map(opt => opt.dataset.value)
            : [];

        const payload = {
            id:                 document.getElementById('edit-prof-codigo').value,
            nombre_completo:    document.getElementById('edit-prof-nombre').value,
            tipo_documento:     document.getElementById('edit-prof-tipo-doc').value,
            numero_documento:   document.getElementById('edit-prof-num-doc').value,
            correo_electronico: document.getElementById('edit-prof-correo').value,
            telefono:           document.getElementById('edit-prof-telefono').value,
            asignaturas:        asignaturas,
            nueva_contrasena:   document.getElementById('edit-prof-nueva-pass').value || null,
            ...ProfessorFormHandler.collectProfile('edit-prof-'),
        };

        try {
            const res  = await fetch('/actualizar-profesor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            const msg  = document.getElementById('edit-prof-msg');

            if (data.status === 'success') {
                msg.style.color = 'var(--success, #16a34a)';
                msg.textContent = '✅ ' + data.message;
                Utils.showToast(data.message, 'success');
                window.app?.tables?.profesores?.loadData();
                setTimeout(() => this.close(), 1200);
            } else {
                msg.style.color = 'var(--error, #dc2626)';
                msg.textContent = '❌ ' + data.message;
            }
        } catch (err) {
            document.getElementById('edit-prof-msg').textContent = '❌ Error de conexión';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar cambios';
        }
    }
};

// ── PARCHEAR renderRow PARA AGREGAR BOTÓN EDITAR ────────────

// Sobrescribir renderRow de EstudiantesTableManager
EstudiantesTableManager.prototype.renderRow = function(e) {
    return `<tr data-codigo="${e.id}">
        <td><span class="table-badge badge-primary">${e.id}</span></td>
        <td class="nombre-cell">${e.nombre}</td>
        <td class="email-cell">${e.email}</td>
        <td><span class="table-badge">${e.grado}</span></td>
        <td><span class="table-badge">${e.grupo}</span></td>
        <td>${e.fecha_registro || '–'}</td>
        <td><div class="table-actions">
            <button class="action-btn edit" title="Editar" data-codigo="${e.id}">
                <i class="fas fa-pen"></i>
            </button>
            <button class="action-btn delete" title="Eliminar" data-codigo="${e.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div></td>
    </tr>`;
};

EstudiantesTableManager.prototype.setupRowListeners = function() {
    const tbody = document.querySelector(`#${this.tableId} tbody`);

    // Botones eliminar (sin cambios)
    tbody?.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const codigo = btn.dataset.codigo;
            const nombre = btn.closest('tr')?.querySelector('.nombre-cell')?.textContent;
            if (!confirm(`¿Eliminar al estudiante "${nombre}"?`)) return;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            const res = await fetch('/eliminar-estudiante', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo })
            });
            const data = await res.json();
            if (data.status === 'success') {
                Utils.showToast(data.message, 'success');
                this.loadData();
                window.app?.stats?.refresh();
            } else {
                Utils.showToast(data.message, 'error');
                btn.innerHTML = '<i class="fas fa-trash"></i>';
                btn.disabled = false;
            }
        });
    });

    // Botones editar
    tbody?.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const codigo = btn.dataset.codigo;
            const item   = this.originalData.find(e => e.id === codigo);
            if (item) EditarEstudiante.open(item);
        });
    });
};

// Sobrescribir renderRow de ProfesoresTableManager
ProfesoresTableManager.prototype.renderRow = function(p) {
    const asigs = Array.isArray(p.asignaturas)
        ? (p.asignaturas.length > 2 ? p.asignaturas.slice(0, 2).join(', ') + '...' : p.asignaturas.join(', '))
        : (p.asignaturas || '');
    return `<tr data-codigo="${p.id}">
        <td><span class="table-badge badge-primary">${p.id}</span></td>
        <td class="nombre-cell">${p.nombre}</td>
        <td class="email-cell">${p.email}</td>
        <td>${p.telefono || 'N/A'}</td>
        <td title="${Array.isArray(p.asignaturas) ? p.asignaturas.join(', ') : ''}">${asigs}</td>
        <td>${p.fecha_registro || '–'}</td>
        <td><div class="table-actions">
            <button class="action-btn edit" title="Editar" data-codigo="${p.id}">
                <i class="fas fa-pen"></i>
            </button>
            <button class="action-btn delete" title="Eliminar" data-codigo="${p.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div></td>
    </tr>`;
};

ProfesoresTableManager.prototype.setupRowListeners = function() {
    const tbody = document.querySelector(`#${this.tableId} tbody`);

    tbody?.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const codigo = btn.dataset.codigo;
            const nombre = btn.closest('tr')?.querySelector('.nombre-cell')?.textContent;
            if (!confirm(`¿Eliminar al profesor "${nombre}"?`)) return;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            const res = await fetch('/eliminar-profesor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo })
            });
            const data = await res.json();
            if (data.status === 'success') {
                Utils.showToast(data.message, 'success');
                this.loadData();
                window.app?.stats?.refresh();
            } else {
                Utils.showToast(data.message, 'error');
                btn.innerHTML = '<i class="fas fa-trash"></i>';
                btn.disabled = false;
            }
        });
    });

    tbody?.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const codigo = btn.dataset.codigo;
            const item   = this.originalData.find(p => p.id === codigo);
            if (item) EditarProfesor.open(item);
        });
    });
};

// IDENTIDAD INSTITUCIONAL (admin colegio)
const IdentidadAdmin = {
    showMsg(id, msg, ok = true) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.color = ok ? 'var(--success)' : 'var(--error)';
        el.textContent = msg;
    },

    _hexFromInput(id) {
        const el = document.getElementById(id);
        if (!el || !el.value) return '#003366';
        return el.value.startsWith('#') ? el.value : `#${el.value}`;
    },

    _setColorInput(id, hex) {
        const el = document.getElementById(id);
        if (el && hex) el.value = hex;
    },

    renderPreview(data) {
        const grid = document.getElementById('id-preview-grid');
        if (!grid) return;
        const items = [
            { label: 'Escudo', url: data.escudo_url },
            { label: 'Encabezado PDF', url: data.encabezado_pdf_url },
            { label: 'Marca de agua', url: data.marca_agua_url },
        ];
        grid.innerHTML = items.map(it => `
            <div class="branding-preview-card">
                ${it.url ? `<img src="${it.url}" alt="${it.label}">` : '<p style="color:#a0aec0;font-size:13px;">Sin imagen</p>'}
                <span>${it.label}</span>
            </div>`).join('');
    },

    async cargar() {
        try {
            const res = await fetch('/admin/colegio/branding');
            const data = await res.json();
            if (data.status !== 'success' || !data.data) {
                this.showMsg('id-msg-texto', data.message || 'No se pudo cargar', false);
                return;
            }
            const b = data.data;
            const nombre = document.getElementById('id-nombre');
            const lema = document.getElementById('id-lema');
            if (nombre) nombre.value = b.nombre_oficial || '';
            if (lema) lema.value = b.lema || '';
            this._setColorInput('id-color-prim', b.color_primario || '#003366');
            this._setColorInput('id-color-sec', b.color_secundario || '#3182ce');
            this.renderPreview(b);
            if (window.PanelBranding) {
                window.PanelBranding.applyCss(b);
                window.PanelBranding.apply(b);
            }
        } catch (e) {
            this.showMsg('id-msg-texto', 'Error al cargar identidad', false);
        }
    },

    async guardarTexto() {
        const body = {
            nombre_oficial: document.getElementById('id-nombre')?.value.trim(),
            lema: document.getElementById('id-lema')?.value.trim(),
            color_primario: this._hexFromInput('id-color-prim'),
            color_secundario: this._hexFromInput('id-color-sec'),
        };
        const res = await fetch('/admin/colegio/branding', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        this.showMsg('id-msg-texto', data.message, data.status === 'success');
        if (data.status === 'success' && data.data) {
            this.renderPreview(data.data);
            window.PanelBranding?.applyCss(data.data);
            window.PanelBranding?.apply(data.data);
            window.PanelBranding?.reload?.();
        }
    },

    async subir(tipo) {
        const map = { escudo: 'id-file-escudo', encabezado: 'id-file-encabezado', marca_agua: 'id-file-marca' };
        const input = document.getElementById(map[tipo]);
        if (!input?.files?.[0]) {
            this.showMsg('id-msg-archivo', 'Selecciona un archivo.', false);
            return;
        }
        const fd = new FormData();
        fd.append('tipo', tipo);
        fd.append('archivo', input.files[0]);
        const res = await fetch('/admin/colegio/branding/upload', { method: 'POST', body: fd });
        const data = await res.json();
        this.showMsg('id-msg-archivo', data.message, data.status === 'success');
        if (data.status === 'success' && data.data) {
            this.renderPreview(data.data);
            input.value = '';
            window.PanelBranding?.apply(data.data);
        }
    },
};

// COLEGIOS (super admin)
const ColegiosAdmin = {
    showMsg(id, msg, ok = true) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.color = ok ? 'var(--success)' : 'var(--error)';
        el.textContent = msg;
    },

    async cargarColegios() {
        const tbody = document.getElementById('tbody-colegios');
        if (!tbody) return;
        try {
            const res = await fetch('/admin/colegios');
            const data = await res.json();
            if (data.status !== 'success' || !data.data?.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;">No hay colegios</td></tr>';
                return;
            }
            tbody.innerHTML = data.data.map(c => `
                <tr>
                    <td><span class="table-badge badge-primary">${c.codigo_colegio}</span></td>
                    <td><strong>${c.nombre_oficial}</strong>${c.lema ? `<br><small style="color:var(--gray-500)">${c.lema}</small>` : ''}</td>
                    <td>${c.total_estudiantes}</td>
                    <td>${c.total_profesores}</td>
                    <td>${c.total_admins}</td>
                    <td>${c.estado}</td>
                </tr>`).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="6">Error al cargar</td></tr>';
        }
    },

    async crearColegio() {
        const body = {
            nombre_oficial: document.getElementById('col-nombre')?.value.trim(),
            lema: document.getElementById('col-lema')?.value.trim(),
            codigo_colegio: document.getElementById('col-codigo')?.value.trim() || null,
            admin_nombre: document.getElementById('col-admin-nombre')?.value.trim(),
            admin_email: document.getElementById('col-admin-email')?.value.trim(),
            admin_password: document.getElementById('col-admin-pass')?.value,
        };
        const res = await fetch('/admin/colegios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        this.showMsg('col-msg', data.message, data.status === 'success');
        if (data.status === 'success') {
            ['col-nombre','col-lema','col-codigo','col-admin-nombre','col-admin-email','col-admin-pass'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            this.cargarColegios();
        }
    },

};

const SuperAdminsAdmin = {
    showMsg(id, msg, ok = true) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.color = ok ? 'var(--success)' : 'var(--error)';
        el.textContent = msg;
    },

    async cargar() {
        const tbodySa = document.getElementById('tbody-superadmins');
        const tbodyAc = document.getElementById('tbody-admins-colegio');
        try {
            const res = await fetch('/admin/colegios/admins');
            const data = await res.json();
            if (data.status !== 'success') return;
            const supers = (data.data || []).filter(a => a.rol === 'superadmin');
            const colegio = (data.data || []).filter(a => a.rol === 'admin_colegio' || a.rol === 'admin_lider');
            if (tbodySa) {
                tbodySa.innerHTML = supers.length
                    ? supers.map(a => {
                        const showDelete = userEmail === 'gualt45@gmail.com' && a.id_admin !== currentUserId;
                        return `<tr>
                            <td>${a.id_admin}</td>
                            <td>${a.nombre_completo}</td>
                            <td>${a.correo_electronico}</td>
                            <td>${a.email_verified ? 'Sí' : 'No'}</td>
                            <td>${showDelete ? `<button class="btn-danger btn-sm" onclick="SuperAdminsAdmin.eliminarSuperAdmin(${a.id_admin})"><i class="fas fa-trash"></i></button>` : '–'}</td>
                        </tr>`;
                    }).join('')
                    : '<tr><td colspan="5" style="text-align:center;">No hay super administradores</td></tr>';
            }
            if (tbodyAc) {
                tbodyAc.innerHTML = colegio.length
                    ? colegio.map(a => {
                        const esLider = a.rol === 'admin_lider';
                        const rolLabel = esLider ? 'Líder' : 'Administrador';
                        return `<tr>
                            <td>${a.colegio || '-'} <small>(${a.codigo_colegio || ''})</small></td>
                            <td>${a.nombre_completo}</td>
                            <td>${a.correo_electronico}</td>
                            <td><span class="table-badge ${esLider ? 'badge-primary' : ''}">${rolLabel}</span></td>
                            <td>
                                <button type="button" class="btn-sm ${esLider ? 'btn-secondary' : 'btn-primary'}"
                                    onclick="SuperAdminsAdmin.toggleLider(${a.id_admin}, ${!esLider})">
                                    ${esLider ? 'Quitar líder' : 'Hacer líder'}
                                </button>
                            </td>
                        </tr>`;
                    }).join('')
                    : '<tr><td colspan="5" style="text-align:center;">No hay admins de colegio</td></tr>';
            }
        } catch (e) {
            if (tbodySa) tbodySa.innerHTML = '<tr><td colspan="5">Error al cargar</td></tr>';
        }
    },

    async crear() {
        const body = {
            nombre: document.getElementById('sa-nombre')?.value.trim(),
            email: document.getElementById('sa-email')?.value.trim(),
            password: document.getElementById('sa-pass')?.value,
        };
        const res = await fetch('/admin/superadmins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        ColegiosAdmin.showMsg('sa-msg', data.message, data.status === 'success');
        if (data.status === 'success') {
            ['sa-nombre', 'sa-email', 'sa-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            this.cargar();
        }
    },

    async toggleLider(id_admin, es_lider) {
        const accion = es_lider ? 'designar como administrador líder' : 'quitar el rol de líder';
        if (!confirm(`¿Confirmas ${accion} a este usuario?`)) return;
        const res = await fetch(`/admin/administradores/${id_admin}/lider`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ es_lider }),
        });
        const data = await res.json();
        Utils.showToast(data.message, data.status === 'success' ? 'success' : 'error');
        if (data.status === 'success') this.cargar();
    },

    async eliminarSuperAdmin(id_admin) {
        if (!confirm('¿Eliminar este super administrador?')) return;
        const res = await fetch(`/admin/administradores/${id_admin}`, { method: 'DELETE' });
        const data = await res.json();
        Utils.showToast(data.message, data.status === 'success' ? 'success' : 'error');
        if (data.status === 'success') this.cargar();
    },
};

function initPasswordToggles() {
    document.querySelectorAll('.toggle-password-btn[data-target]').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye', !show);
                icon.classList.toggle('fa-eye-slash', show);
            }
        });
    });
}

const BulkImport = {
    async importar(tipo) {
        const fileInput = document.getElementById(`import-${tipo}-file`);
        const resultEl = document.getElementById(`import-${tipo}-result`);
        const btn = document.getElementById(`import-${tipo}-btn`);
        const file = fileInput?.files?.[0];
        if (!file) {
            Utils.showToast('Selecciona un archivo CSV.', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('archivo', file);
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
        resultEl.innerHTML = '';
        try {
            const res = await fetch(`/admin/importar/${tipo}`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.status === 'success') {
                Utils.showToast(data.message, 'success');
                let html = `<p style="color:var(--success,#16a34a);"><strong>${data.message}</strong></p>`;
                const errs = data.data?.errores || [];
                if (errs.length) {
                    html += '<ul style="margin:8px 0 0;padding-left:20px;color:var(--error,#dc2626);">';
                    errs.slice(0, 15).forEach(e => {
                        html += `<li>Fila ${e.fila}: ${e.mensaje}</li>`;
                    });
                    if (errs.length > 15) html += `<li>… y ${errs.length - 15} error(es) más</li>`;
                    html += '</ul>';
                }
                resultEl.innerHTML = html;
                fileInput.value = '';
                if (tipo === 'estudiantes') window.app?.tables?.estudiantes?.loadData();
                else window.app?.tables?.profesores?.loadData();
                window.app?.stats?.refresh();
            } else {
                Utils.showToast(data.message || 'Error al importar.', 'error');
                resultEl.innerHTML = `<p style="color:var(--error,#dc2626);">${data.message}</p>`;
            }
        } catch (_) {
            Utils.showToast('Error de conexión al importar.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    },
    init() {
        document.getElementById('import-estudiantes-btn')?.addEventListener('click', () => this.importar('estudiantes'));
        document.getElementById('import-profesores-btn')?.addEventListener('click', () => this.importar('profesores'));
    },
};

function initAdminLiderUI() {
    const meta = document.getElementById('current-user-data');
    AdminManager._initCrearAdminUI({ es_lider: meta?.dataset.isAdminLider === 'true' });
}

function initSuperAdminUI() {
    const meta = document.getElementById('current-user-data');
    const isSuper = meta?.dataset.isSuperadmin === 'true';
    const userEmail = meta?.dataset.userEmail || '';
    const esGualt = userEmail === 'gualt45@gmail.com';
    document.querySelectorAll('.superadmin-only').forEach(el => {
        el.style.display = isSuper ? '' : 'none';
    });
    document.querySelectorAll('.admin-colegio-only').forEach(el => {
        if (el.classList.contains('nav-item') || el.classList.contains('nav-section-label')) {
            el.style.display = (isSuper && !esGualt) ? 'none' : '';
        }
    });
    if (isSuper) {
        document.querySelectorAll('.content-section.admin-colegio-only').forEach(s => s.classList.remove('active'));
        const welcome = document.querySelector('#inicio-section .welcome-text');
        if (welcome) {
            welcome.textContent = 'Panel super administrador. Gestiona colegios, super admins y reportes de plataforma.';
        }
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.getElementById('inicio-section')?.classList.add('active');
        document.querySelector('[data-section="inicio-section"]')?.classList.add('active');
        window.app?.stats?.refresh();
    }
}

// ── INICIALIZAR MODALES cuando el DOM esté listo ─────────────
document.addEventListener('DOMContentLoaded', () => {
    EditarEstudiante.init();
    EditarProfesor.init();
    initPasswordToggles();
    BulkImport.init();
    initSuperAdminUI();
    initAdminLiderUI();
});
if (document.readyState !== 'loading') {
    EditarEstudiante.init();
    EditarProfesor.init();
    initPasswordToggles();
    BulkImport.init();
    initSuperAdminUI();
    initAdminLiderUI();
}