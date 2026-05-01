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
            'agregar-estudiante-section': () => window.app?.tables?.estudiantes?.loadData(),
            'agregar-profesor-section': () => window.app?.tables?.profesores?.loadData(),
            'periodos-section': () => AdminManager.cargarPeriodos(),
            'grupos-section': () => { AdminManager.cargarGrupos(); AdminManager.cargarPeriodosSelect('grupo-periodo'); },
            'materias-section': () => AdminManager.cargarMaterias(),
            'asignaciones-section': () => AdminManager.cargarDatosAsignaciones(),
            'reportes-section': () => AdminManager.cargarReportes(),
            'inicio-section': () => window.app?.stats?.refresh(),
            'administradores-section': () => AdminManager.cargarAdministradores()
        };
        loaders[sectionId]?.();
    }
}


// STATS


class StatsManager {
    async refresh() {
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
        document.querySelectorAll('.toggle-password-btn[data-target="contrasena"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('contrasena');
                if (!input) return;
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                btn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
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
            { id: 'grado', fn: v => Validator.required(v) },
            { id: 'grupo', fn: v => Validator.required(v) },
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

        const data = {
            nombre_completo: document.getElementById('nombre-completo').value,
            tipo_documento: document.getElementById('tipo-documento').value,
            numero_documento: document.getElementById('numero-documento').value,
            correo_electronico: document.getElementById('correo-electronico').value,
            grado: document.getElementById('grado').value,
            grupo: document.getElementById('grupo').value,
            contrasena: document.getElementById('contrasena').value
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
        document.querySelectorAll('.toggle-password-btn[data-target="prof-contrasena"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('prof-contrasena');
                if (!input) return;
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                btn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        });
        const sel = document.getElementById('prof-asignaturas');
        const counter = document.getElementById('asignaturas-count');
        sel?.addEventListener('change', () => {
            const count = Array.from(sel.selectedOptions).length;
            if (counter) counter.textContent = `${count} seleccionada${count !== 1 ? 's' : ''}`;
        });
        ['prof-num-doc', 'prof-telefono'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
        });
        this.cargarAsignaturas();
    }
    async cargarAsignaturas() {
        const sel = document.getElementById('prof-asignaturas');
        if (!sel) return;
        try {
            const res  = await fetch('/admin/materias');
            const data = await res.json();
            const materias = data.data || [];
            if (!materias.length) {
                sel.innerHTML = '<option disabled>No hay materias registradas</option>';
                return;
            }
            sel.innerHTML = materias.map(m =>
                `<option value="${m.nombre}">${m.nombre}</option>`
            ).join('');
        } catch(e) {
            console.error('Error cargando materias:', e);
        }
    }
    async handleSubmit(e) {
        e.preventDefault();
        const sel = document.getElementById('prof-asignaturas');
        const asignaturas = sel ? Array.from(sel.selectedOptions).map(o => o.value) : [];
        if (!asignaturas.length) { Utils.showToast('Selecciona al menos una asignatura.', 'error'); return; }

        const data = {
            nombre_completo: document.getElementById('prof-nombre').value,
            tipo_documento: document.getElementById('prof-tipo-doc').value,
            numero_documento: document.getElementById('prof-num-doc').value,
            correo_electronico: document.getElementById('prof-correo').value,
            telefono: document.getElementById('prof-telefono').value,
            asignaturas,
            contrasena: document.getElementById('prof-contrasena').value
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
        const counter = document.getElementById('asignaturas-count');
        if (counter) counter.textContent = '0 seleccionadas';
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
            if (!data.data?.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--gray-500);">No hay períodos registrados</td></tr>'; return; }
            tbody.innerHTML = data.data.map(p => `<tr><td>${p.id_periodo}</td><td><strong>${p.nombre}</strong></td><td>${p.fecha_inicio}</td><td>${p.fecha_fin}</td></tr>`).join('');
        } catch(e) {}
    },

    async crearPeriodo() {
        const nombre = document.getElementById('periodo-nombre')?.value.trim();
        const fecha_inicio = document.getElementById('periodo-inicio')?.value;
        const fecha_fin = document.getElementById('periodo-fin')?.value;
        if (!nombre || !fecha_inicio || !fecha_fin) { this.showMsg('periodo-msg', '⚠️ Todos los campos son requeridos.', false); return; }
        const res = await fetch('/admin/periodos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, fecha_inicio, fecha_fin }) });
        const data = await res.json();
        this.showMsg('periodo-msg', data.message, data.status === 'success');
        if (data.status === 'success') {
            document.getElementById('periodo-nombre').value = '';
            document.getElementById('periodo-inicio').value = '';
            document.getElementById('periodo-fin').value = '';
            this.cargarPeriodos();
        }
    },

    async cargarPeriodosSelect(selectId) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        const res = await fetch('/admin/periodos');
        const data = await res.json();
        sel.innerHTML = '<option value="">Selecciona un período</option>';
        (data.data || []).forEach(p => { const o = document.createElement('option'); o.value = p.id_periodo; o.textContent = p.nombre; sel.appendChild(o); });
    },

    async cargarGrupos() {
        const tbody = document.getElementById('tbody-grupos');
        if (!tbody) return;
        try {
            const res = await fetch('/admin/grupos');
            const data = await res.json();
            if (!data.data?.length) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--gray-500);">No hay grupos registrados</td></tr>'; return; }
            tbody.innerHTML = data.data.map(g => `<tr><td>${g.id_grupo}</td><td><strong>${g.nombre}</strong></td><td>${g.periodo || '–'}</td></tr>`).join('');
        } catch(e) {}
    },

    async crearGrupo() {
        const nombre = document.getElementById('grupo-nombre')?.value.trim();
        const id_periodo = document.getElementById('grupo-periodo')?.value;
        if (!nombre || !id_periodo) { this.showMsg('grupo-msg', '⚠️ Todos los campos son requeridos.', false); return; }
        const res = await fetch('/admin/grupos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, id_periodo }) });
        const data = await res.json();
        this.showMsg('grupo-msg', data.message, data.status === 'success');
        if (data.status === 'success') { document.getElementById('grupo-nombre').value = ''; this.cargarGrupos(); }
    },

    async cargarMaterias() {
        const tbody = document.getElementById('tbody-materias');
        if (!tbody) return;
        try {
            const res = await fetch('/admin/materias');
            const data = await res.json();
            if (!data.data?.length) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--gray-500);">No hay materias registradas</td></tr>'; return; }
            tbody.innerHTML = data.data.map(m => `<tr><td>${m.id_materia}</td><td><strong>${m.nombre}</strong></td><td>${m.codigo || '–'}</td></tr>`).join('');
        } catch(e) {}
    },

    async crearMateria() {
        const nombre = document.getElementById('materia-nombre')?.value.trim();
        const codigo = document.getElementById('materia-codigo')?.value.trim();
        if (!nombre) { this.showMsg('materia-msg', '⚠️ El nombre es requerido.', false); return; }
        const res = await fetch('/admin/materias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, codigo }) });
        const data = await res.json();
        this.showMsg('materia-msg', data.message, data.status === 'success');
        if (data.status === 'success') { document.getElementById('materia-nombre').value = ''; document.getElementById('materia-codigo').value = ''; this.cargarMaterias(); }
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


async cargarAdministradores() {
        const tbody = document.getElementById('tbody-administradores');
        if (!tbody) return;
        try {
            const res = await fetch('/admin/administradores');
            const data = await res.json();
            if (!data.data?.length) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--gray-500);">No hay administradores registrados</td></tr>';
                return;
            }
            tbody.innerHTML = data.data.map(a => `
                <tr>
                    <td>${a.id_admin}</td>
                    <td><strong>${a.nombre_completo}</strong></td>
                    <td>${a.correo_electronico}</td>
                    <td><span class="${a.email_verified ? 'tag-success' : 'tag-error'}">${a.email_verified ? 'Sí' : 'No'}</span></td>
                    <td>${a.id_admin !== currentUserId ?
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
window.crearPeriodo = () => AdminManager.crearPeriodo();
window.crearGrupo = () => AdminManager.crearGrupo();
window.crearMateria = () => AdminManager.crearMateria();
window.asignarProfesor = () => AdminManager.asignarProfesor();
window.asignarEstudiante = () => AdminManager.asignarEstudiante();
window.cargarEstudiantesGrupo = id => AdminManager.cargarEstudiantesGrupo(id);
window.guardarPerfil = async () => {
    const fullname = document.getElementById('profile-name')?.value;
    const email = document.getElementById('profile-email')?.value;
    const res = await fetch('/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullname, email }) });
    const data = await res.json();
    Utils.showToast(data.message, data.status === 'success' ? 'success' : 'error');
    if (data.status === 'success') document.getElementById('profile-modal-overlay')?.classList.remove('active');
};


// UI MANAGER


class UIManager {
    init() {
        document.getElementById('profile-btn')?.addEventListener('click', () => document.getElementById('profile-modal-overlay')?.classList.add('active'));
        document.getElementById('close-profile-modal')?.addEventListener('click', () => document.getElementById('profile-modal-overlay')?.classList.remove('active'));
        document.getElementById('cancel-profile')?.addEventListener('click', () => document.getElementById('profile-modal-overlay')?.classList.remove('active'));
        document.getElementById('profile-modal-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.target.classList.remove('active'); });
        const dateEl = document.getElementById('current-date');
        if (dateEl) dateEl.textContent = Utils.formatDate();
    }
}


// APP


class App {
    init() {
    try {
        new UIManager().init();
        this.navigation = new NavigationManager();
        this.stats = new StatsManager();
        this.forms = {
            student: new StudentFormHandler(),
            professor: new ProfessorFormHandler()
        };
        this.tables = {
            estudiantes: new EstudiantesTableManager(),
            profesores: new ProfesoresTableManager()
        };
        // Cargar inicio DESPUÉS de que window.app esté disponible
        setTimeout(() => {
            this.stats.refresh();
        }, 100);
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

    open(data) {
        this.currentCodigo = data.id;
        document.getElementById('edit-est-codigo').value      = data.id       || '';
        document.getElementById('edit-est-nombre').value      = data.nombre   || '';
        document.getElementById('edit-est-correo').value      = data.email    || '';
        document.getElementById('edit-est-grado').value       = data.grado    || '';
        document.getElementById('edit-est-grupo').value       = data.grupo    || '';
        document.getElementById('edit-est-nueva-pass').value  = '';
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

        const payload = {
            id:                  document.getElementById('edit-est-codigo').value,
            nombre_completo:     document.getElementById('edit-est-nombre').value,
            tipo_documento:      document.getElementById('edit-est-tipo-doc').value,
            numero_documento:    document.getElementById('edit-est-num-doc').value,
            correo_electronico:  document.getElementById('edit-est-correo').value,
            grado:               document.getElementById('edit-est-grado').value,
            grupo:               document.getElementById('edit-est-grupo').value,
            nueva_contrasena:    document.getElementById('edit-est-nueva-pass').value || null
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

        // Renderizar checkboxes de asignaturas
        const container = document.getElementById('edit-prof-asignaturas');
        if (container) {
            container.innerHTML = ASIGNATURAS_DISPONIBLES.map(a =>
                `<label class="check-asig">
                    <input type="checkbox" value="${a}" name="asignatura"> ${a}
                </label>`
            ).join('');
        }
    },

    open(data) {
        this.currentCodigo = data.id;
        document.getElementById('edit-prof-codigo').value     = data.id       || '';
        document.getElementById('edit-prof-nombre').value     = data.nombre   || '';
        document.getElementById('edit-prof-correo').value     = data.email    || '';
        document.getElementById('edit-prof-telefono').value   = data.telefono || '';
        document.getElementById('edit-prof-nueva-pass').value = '';
        document.getElementById('edit-prof-msg').textContent  = '';

        // Marcar checkboxes según asignaturas actuales
        const actuales = Array.isArray(data.asignaturas)
            ? data.asignaturas.map(a => a.trim())
            : (data.asignaturas || '').split(',').map(a => a.trim());

        document.querySelectorAll('#edit-prof-asignaturas input[type="checkbox"]').forEach(cb => {
            cb.checked = actuales.includes(cb.value);
        });

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

        const asignaturas = [...document.querySelectorAll('#edit-prof-asignaturas input:checked')]
            .map(cb => cb.value);

        const payload = {
            id:                 document.getElementById('edit-prof-codigo').value,
            nombre_completo:    document.getElementById('edit-prof-nombre').value,
            tipo_documento:     document.getElementById('edit-prof-tipo-doc').value,
            numero_documento:   document.getElementById('edit-prof-num-doc').value,
            correo_electronico: document.getElementById('edit-prof-correo').value,
            telefono:           document.getElementById('edit-prof-telefono').value,
            asignaturas:        asignaturas,
            nueva_contrasena:   document.getElementById('edit-prof-nueva-pass').value || null
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

// ── INICIALIZAR MODALES cuando el DOM esté listo ─────────────
document.addEventListener('DOMContentLoaded', () => {
    EditarEstudiante.init();
    EditarProfesor.init();
});
// Si el DOMContentLoaded ya corrió (script cargado tarde), inicializar de todos modos
if (document.readyState !== 'loading') {
    EditarEstudiante.init();
    EditarProfesor.init();
}