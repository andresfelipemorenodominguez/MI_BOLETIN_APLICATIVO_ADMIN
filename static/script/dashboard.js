// ============================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================

const CONFIG = {
    selectors: {
        sidebar: '.sidebar',
        mainContent: '.main-content',
        navLinks: '.nav-link',
        profileBtn: '#profile-btn',
        userProfile: '.user-profile',
        currentDate: '#current-date',
        quickActionBtns: '.quick-action-btn',
        viewAllBtn: '.view-all-btn'
    },

    sectionMap: {
        'Inicio': 'inicio-section',
        'Agregar Estudiante': 'agregar-estudiante-section',
        'Agregar Profesor': 'agregar-profesor-section',
        'Reportes': 'reportes-section'
    },

    quickActions: {
        'agregar-estudiante': { section: 'agregar-estudiante-section', navIndex: 1 },
        'agregar-profesor': { section: 'agregar-profesor-section', navIndex: 2 },
        'reportes': { section: 'reportes-section', navIndex: 3 }
    },

    validation: {
        emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        passwordMinLength: 8,
        nameMinLength: 5
    }
};

// ============================================
// MÓDULO DE UTILIDADES
// ============================================

const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    generatePassword(length = 12) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*';

        let password = '';
        password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
        password += numbers.charAt(Math.floor(Math.random() * numbers.length));
        password += symbols.charAt(Math.floor(Math.random() * symbols.length));

        const allChars = uppercase + lowercase + numbers + symbols;
        for (let i = 3; i < length; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }

        return password.split('').sort(() => Math.random() - 0.5).join('');
    },

    formatDate(date = new Date()) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return date.toLocaleDateString('es-ES', options);
    },

    formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    showError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }

        if (inputElement) {
            inputElement.classList.remove('success');
            inputElement.classList.add('error');
        }
    },

    clearError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);

        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }

        if (inputElement) {
            inputElement.classList.remove('error');
        }
    },

    markAsValid(fieldId) {
        const inputElement = document.getElementById(fieldId);
        if (inputElement) {
            this.clearError(fieldId);
            inputElement.classList.remove('error');
            inputElement.classList.add('success');
        }
    },

    filterTableData(data, searchTerm, fields) {
        if (!searchTerm.trim()) return data;

        const term = searchTerm.toLowerCase();
        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                if (Array.isArray(value)) {
                    return value.some(v => v.toLowerCase().includes(term));
                }
                return String(value).toLowerCase().includes(term);
            });
        });
    }
};

// ============================================
// MÓDULO DE GESTIÓN DE TABLAS
// ============================================

class TableManager {
    constructor(tableId, data, options = {}) {
        this.tableId = tableId;
        this.originalData = [...data];
        this.filteredData = [...data];
        this.options = options;
        this.searchInputId = options.searchInputId || '';
        this.counterId = options.counterId || '';
        this.infoId = options.infoId || '';

        this.init();
    }

    init() {
        this.renderTable();
        this.setupSearch();
        this.updateCounters();
    }

    renderTable() {
        const tableBody = document.querySelector(`#${this.tableId} tbody`);
        if (!tableBody) return;

        if (this.filteredData.length === 0) {
            const colSpan = document.querySelector(`#${this.tableId} thead tr`).children.length;
            tableBody.innerHTML = `
                <tr class="no-results">
                    <td colspan="${colSpan}">
                        <i class="fas fa-search"></i>
                        No se encontraron resultados
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.filteredData.map(item => this.renderRow(item)).join('');
    }

    renderRow(item) {
        // Este método debe ser sobrescrito por las clases hijas
        return '';
    }

    setupSearch() {
        if (!this.searchInputId) return;

        const searchInput = document.getElementById(this.searchInputId);
        if (!searchInput) return;

        const searchHandler = Utils.debounce(() => {
            this.filterData(searchInput.value);
            this.renderTable();
            this.updateCounters();
        }, 300);

        searchInput.addEventListener('input', searchHandler);
    }

    filterData(searchTerm) {
        const searchFields = this.options.searchFields || ['nombre', 'email', 'id'];
        this.filteredData = Utils.filterTableData(this.originalData, searchTerm, searchFields);
    }

    updateCounters() {
        if (this.counterId) {
            const counterElement = document.getElementById(this.counterId);
            if (counterElement) {
                counterElement.textContent = `Total: ${this.filteredData.length} ${this.options.itemName || 'items'}`;
            }
        }

        if (this.infoId) {
            const infoElement = document.getElementById(this.infoId);
            if (infoElement) {
                const total = this.originalData.length;
                const shown = this.filteredData.length;

                const totalSpan = infoElement.querySelector(`#${this.options.totalSpanId}`);
                const shownSpan = infoElement.querySelector(`#${this.options.shownSpanId}`);

                if (totalSpan) totalSpan.textContent = total;
                if (shownSpan) shownSpan.textContent = shown;
            }
        }
    }

    refreshData(newData) {
        this.originalData = [...newData];
        this.filteredData = [...newData];
        this.renderTable();
        this.updateCounters();
    }
}

// ============================================
// TABLA DE ESTUDIANTES
// ============================================

class EstudiantesTableManager extends TableManager {
    constructor() {
        super('tabla-estudiantes', [], {  // Inicialmente vacío
            searchInputId: 'search-estudiantes',
            counterId: 'estudiantes-counter',
            infoId: 'estudiantes-info',
            itemName: 'estudiantes',
            totalSpanId: 'estudiantes-total',
            shownSpanId: 'estudiantes-mostrados',
            searchFields: ['nombre', 'email', 'id', 'grado', 'grupo']
        });
        this.loadData();
        this.setupDeleteListeners();
    }

    async loadData() {
        try {
            const response = await fetch('/obtener-estudiantes');
            const result = await response.json();

            if (result.status === 'success') {
                this.originalData = result.data;
                this.filteredData = [...result.data];
                this.renderTable();
                this.updateCounters();
            } else {
                console.error('Error cargando estudiantes:', result.message);
                // Datos vacíos en caso de error
                this.originalData = [];
                this.filteredData = [];
                this.renderTable();
                this.updateCounters();
            }
        } catch (error) {
            console.error('Error cargando datos de estudiantes:', error);
            // Datos vacíos en caso de error
            this.originalData = [];
            this.filteredData = [];
            this.renderTable();
            this.updateCounters();
        }
    }

    setupDeleteListeners() {
        const table = document.getElementById(this.tableId);
        if (!table) return;

        table.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.action-btn.delete');
            if (!deleteBtn) return;

            const codigo = deleteBtn.dataset.codigo;
            const nombre = deleteBtn.closest('tr').querySelector('.nombre-cell').textContent;
            
            if (!codigo) return;

            if (confirm(`¿Estás seguro de que deseas eliminar al estudiante "${nombre}" (${codigo})? Esta acción no se puede deshacer.`)) {
                await this.deleteEstudiante(codigo, deleteBtn.closest('tr'));
            }
        });
    }

    async deleteEstudiante(codigo, rowElement) {
        try {
            // Mostrar indicador de carga
            const deleteBtn = rowElement.querySelector('.action-btn.delete');
            const originalHTML = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            deleteBtn.disabled = true;

            // Enviar solicitud de eliminación
            const response = await fetch('/eliminar-estudiante', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ codigo: codigo })
            });

            const result = await response.json();

            if (result.status === 'success') {
                // Eliminar fila de la tabla
                rowElement.remove();
                
                // Actualizar contadores
                this.originalData = this.originalData.filter(est => est.id !== codigo);
                this.filteredData = this.filteredData.filter(est => est.id !== codigo);
                this.updateCounters();
                
                // Mostrar mensaje de éxito
                this.showMessage(result.message, 'success');

                // Actualizar estadísticas del dashboard
                if (window.app && window.app.stats) {
                    await window.app.stats.refresh();
                }
            } else {
                this.showMessage(result.message, 'error');
                // Restaurar botón
                deleteBtn.innerHTML = originalHTML;
                deleteBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error eliminando estudiante:', error);
            this.showMessage('Error al conectar con el servidor', 'error');
            
            // Restaurar botón
            const deleteBtn = rowElement.querySelector('.action-btn.delete');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.disabled = false;
        }
    }

    showMessage(message, type) {
        // Crear o reutilizar contenedor de mensajes
        let messageContainer = document.getElementById('table-message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'table-message-container';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 300px;
            `;
            document.body.appendChild(messageContainer);
        }

        const messageElement = document.createElement('div');
        messageElement.className = `table-message ${type}`;
        messageElement.innerHTML = `
            <div style="
                padding: 12px 16px;
                border-radius: 6px;
                margin-bottom: 10px;
                background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
                color: ${type === 'success' ? '#155724' : '#721c24'};
                border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        messageContainer.appendChild(messageElement);

        // Eliminar mensaje después de 5 segundos
        setTimeout(() => {
            messageElement.style.opacity = '0';
            messageElement.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                messageElement.remove();
            }, 300);
        }, 5000);
    }

    renderRow(estudiante) {
        return `
            <tr data-codigo="${estudiante.id}">
                <td>
                    <span class="table-badge badge-primary">${estudiante.id}</span>
                </td>
                <td class="nombre-cell">${estudiante.nombre}</td>
                <td class="email-cell">${estudiante.email}</td>
                <td class="grado-cell">
                    <span class="table-badge">${estudiante.grado}</span>
                </td>
                <td class="grupo-cell">
                    <span class="table-badge">${estudiante.grupo}</span>
                </td>
                <td>${estudiante.fecha_registro}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn view" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" title="Eliminar" data-codigo="${estudiante.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderTable() {
        const tableBody = document.querySelector(`#${this.tableId} tbody`);
        if (!tableBody) return;

        // Caso: Tabla vacía (sin estudiantes registrados)
        if (this.filteredData.length === 0 && !this.currentSearchTerm) {
            const colSpan = document.querySelector(`#${this.tableId} thead tr`).children.length;
            tableBody.innerHTML = `
                <tr class="no-results">
                    <td colspan="${colSpan}">
                        <div class="empty-state">
                            <i class="fas fa-user-graduate"></i>
                            <h3>No hay ningún estudiante registrado</h3>
                            <p>Comienza agregando estudiantes usando el formulario "Agregar Estudiante"</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Caso: Búsqueda sin resultados
        if (this.filteredData.length === 0 && this.currentSearchTerm) {
            const colSpan = document.querySelector(`#${this.tableId} thead tr`).children.length;
            tableBody.innerHTML = `
                <tr class="no-results">
                    <td colspan="${colSpan}">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>No se encontraron resultados con "${this.currentSearchTerm}"</h3>
                            <p>Intenta con otros términos de búsqueda</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Caso normal: Mostrar datos
        tableBody.innerHTML = this.filteredData.map(item => this.renderRow(item)).join('');
    }

    filterData(searchTerm) {
        this.currentSearchTerm = searchTerm; // Guardar el término de búsqueda actual
        const searchFields = this.options.searchFields || ['nombre', 'email', 'id', 'grado', 'grupo'];
        this.filteredData = Utils.filterTableData(this.originalData, searchTerm, searchFields);
    }
}

// ============================================
// TABLA DE PROFESORES
// ============================================

class ProfesoresTableManager extends TableManager {
    constructor() {
        super('tabla-profesores', [], {  // Inicialmente vacío
            searchInputId: 'search-profesores',
            counterId: 'profesores-counter',
            infoId: 'profesores-info',
            itemName: 'profesores',
            totalSpanId: 'profesores-total',
            shownSpanId: 'profesores-mostrados',
            searchFields: ['nombre', 'email', 'id', 'asignaturas', 'telefono']
        });
        this.loadData();
        this.setupDeleteListeners();
    }

    async loadData() {
        try {
            const response = await fetch('/obtener-profesores');
            const result = await response.json();

            if (result.status === 'success') {
                this.originalData = result.data;
                this.filteredData = [...result.data];
                this.renderTable();
                this.updateCounters();
            } else {
                console.error('Error cargando profesores:', result.message);
                // Datos vacíos en caso de error
                this.originalData = [];
                this.filteredData = [];
                this.renderTable();
                this.updateCounters();
            }
        } catch (error) {
            console.error('Error cargando datos de profesores:', error);
            // Datos vacíos en caso de error
            this.originalData = [];
            this.filteredData = [];
            this.renderTable();
            this.updateCounters();
        }
    }

    setupDeleteListeners() {
        const table = document.getElementById(this.tableId);
        if (!table) return;

        table.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.action-btn.delete');
            if (!deleteBtn) return;

            const codigo = deleteBtn.dataset.codigo;
            const nombre = deleteBtn.closest('tr').querySelector('.nombre-cell').textContent;
            
            if (!codigo) return;

            if (confirm(`¿Estás seguro de que deseas eliminar al profesor "${nombre}" (${codigo})? Esta acción no se puede deshacer.`)) {
                await this.deleteProfesor(codigo, deleteBtn.closest('tr'));
            }
        });
    }

    async deleteProfesor(codigo, rowElement) {
        try {
            // Mostrar indicador de carga
            const deleteBtn = rowElement.querySelector('.action-btn.delete');
            const originalHTML = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            deleteBtn.disabled = true;

            // Enviar solicitud de eliminación
            const response = await fetch('/eliminar-profesor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ codigo: codigo })
            });

            const result = await response.json();

            if (result.status === 'success') {
                // Eliminar fila de la tabla
                rowElement.remove();
                
                // Actualizar contadores
                this.originalData = this.originalData.filter(prof => prof.id !== codigo);
                this.filteredData = this.filteredData.filter(prof => prof.id !== codigo);
                this.updateCounters();
                
                // Mostrar mensaje de éxito
                this.showMessage(result.message, 'success');

                // Actualizar estadísticas del dashboard
                if (window.app && window.app.stats) {
                    await window.app.stats.refresh();
                }
            } else {
                this.showMessage(result.message, 'error');
                // Restaurar botón
                deleteBtn.innerHTML = originalHTML;
                deleteBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error eliminando profesor:', error);
            this.showMessage('Error al conectar con el servidor', 'error');
            
            // Restaurar botón
            const deleteBtn = rowElement.querySelector('.action-btn.delete');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.disabled = false;
        }
    }

    showMessage(message, type) {
        // Crear o reutilizar contenedor de mensajes
        let messageContainer = document.getElementById('table-message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'table-message-container';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 300px;
            `;
            document.body.appendChild(messageContainer);
        }

        const messageElement = document.createElement('div');
        messageElement.className = `table-message ${type}`;
        messageElement.innerHTML = `
            <div style="
                padding: 12px 16px;
                border-radius: 6px;
                margin-bottom: 10px;
                background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
                color: ${type === 'success' ? '#155724' : '#721c24'};
                border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        messageContainer.appendChild(messageElement);

        // Eliminar mensaje después de 5 segundos
        setTimeout(() => {
            messageElement.style.opacity = '0';
            messageElement.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                messageElement.remove();
            }, 300);
        }, 5000);
    }

    renderRow(profesor) {
        const asignaturasText = profesor.asignaturas && profesor.asignaturas.length > 2
            ? `${profesor.asignaturas.slice(0, 2).join(', ')}...`
            : (profesor.asignaturas ? profesor.asignaturas.join(', ') : '');

        return `
            <tr data-codigo="${profesor.id}">
                <td>
                    <span class="table-badge badge-primary">${profesor.id}</span>
                </td>
                <td class="nombre-cell">${profesor.nombre}</td>
                <td class="email-cell">${profesor.email}</td>
                <td class="asignaturas-cell" title="${profesor.asignaturas ? profesor.asignaturas.join(', ') : ''}">
                    ${asignaturasText}
                </td>
                <td>${profesor.telefono || 'N/A'}</td>
                <td>${profesor.fecha_registro}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn view" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" title="Eliminar" data-codigo="${profesor.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderTable() {
        const tableBody = document.querySelector(`#${this.tableId} tbody`);
        if (!tableBody) return;

        // Caso: Tabla vacía (sin profesores registrados)
        if (this.filteredData.length === 0 && !this.currentSearchTerm) {
            const colSpan = document.querySelector(`#${this.tableId} thead tr`).children.length;
            tableBody.innerHTML = `
                <tr class="no-results">
                    <td colspan="${colSpan}">
                        <div class="empty-state">
                            <i class="fas fa-chalkboard-teacher"></i>
                            <h3>No hay ningún profesor registrado</h3>
                            <p>Comienza agregando profesores usando el formulario "Agregar Profesor"</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Caso: Búsqueda sin resultados
        if (this.filteredData.length === 0 && this.currentSearchTerm) {
            const colSpan = document.querySelector(`#${this.tableId} thead tr`).children.length;
            tableBody.innerHTML = `
                <tr class="no-results">
                    <td colspan="${colSpan}">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>No se encontraron resultados con "${this.currentSearchTerm}"</h3>
                            <p>Intenta con otros términos de búsqueda</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Caso normal: Mostrar datos
        tableBody.innerHTML = this.filteredData.map(item => this.renderRow(item)).join('');
    }

    filterData(searchTerm) {
        this.currentSearchTerm = searchTerm; // Guardar el término de búsqueda actual
        const searchFields = this.options.searchFields || ['nombre', 'email', 'id', 'asignaturas', 'telefono'];
        this.filteredData = Utils.filterTableData(this.originalData, searchTerm, searchFields);
    }
}

// ============================================
// MÓDULO DE VALIDACIÓN
// ============================================

const Validator = {
    email(email) {
        if (!email) return { valid: false, message: 'El correo electrónico es obligatorio' };
        if (!CONFIG.validation.emailRegex.test(email)) {
            return { valid: false, message: 'Ingresa un correo electrónico válido' };
        }
        return { valid: true };
    },

    required(value, fieldName, minLength = 0) {
        if (!value || value.trim() === '') {
            return { valid: false, message: 'Este campo es obligatorio' };
        }

        if (minLength > 0 && value.length < minLength) {
            return {
                valid: false,
                message: `Debe tener al menos ${minLength} caracteres`
            };
        }

        return { valid: true };
    },

    password(password) {
        const minLength = CONFIG.validation.passwordMinLength;
        const validation = this.required(password, 'contraseña', minLength);

        if (!validation.valid) return validation;

        if (!/(?=.*[A-Z])/.test(password)) {
            return { valid: false, message: 'Debe contener al menos una mayúscula' };
        }

        if (!/\d/.test(password)) {
            return { valid: false, message: 'Debe contener al menos un número' };
        }

        return { valid: true };
    },

    calculatePasswordStrength(password) {
        let score = 0;
        const criteria = [
            password.length >= 8,
            /[A-Z]/.test(password),
            /\d/.test(password),
            /[!@#$%^&*]/.test(password)
        ];

        criteria.forEach(criterion => criterion && score++);

        if (score === 4) return { level: 'strong', percentage: 100, color: 'var(--success)' };
        if (score >= 2) return { level: 'medium', percentage: 66, color: 'var(--warning)' };
        return { level: 'weak', percentage: 33, color: 'var(--error)' };
    }
};

// ============================================
// GESTOR DE MODALES
// ============================================

class ModalManager {
    constructor(modalId, options = {}) {
        this.modal = document.getElementById(modalId);
        this.closeBtn = options.closeBtnId ?
            document.getElementById(options.closeBtnId) : null;
        this.onClose = options.onClose || null;
        this.onOpen = options.onOpen || null;

        this.init();
    }

    init() {
        if (!this.modal) return;

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) this.close();
        });
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (this.onOpen) this.onOpen();
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            if (this.onClose) this.onClose();
        }
    }

    isOpen() {
        return this.modal?.classList.contains('active') || false;
    }
}

// ============================================
// GESTOR DE FORMULARIOS BASE
// ============================================

class BaseFormHandler {
    constructor(formId, options = {}) {
        this.form = document.getElementById(formId);
        this.options = options;
        this.fields = options.fields || {};
        this.initialize();
    }

    initialize() {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.setupEventListeners();
        this.setupRealTimeValidation();
    }

    setupEventListeners() {
        // Método a ser sobrescrito por subclases
    }

    setupRealTimeValidation() {
        // Método a ser sobrescrito por subclases
    }

    handleSubmit(e) {
        e.preventDefault();

        if (this.validateForm()) {
            this.processForm();
        } else {
            this.showFormError('Por favor, corrige los campos marcados con error.');
        }
    }

    validateForm() {
        let isValid = true;

        Object.entries(this.fields).forEach(([fieldId, config]) => {
            const input = document.getElementById(fieldId);
            if (!input) return;

            const value = input.value.trim();
            const validation = config.validator(value);

            if (!validation.valid) {
                Utils.showError(fieldId, validation.message);
                isValid = false;
            } else {
                Utils.markAsValid(fieldId);
            }
        });

        return isValid;
    }

    processForm() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        console.log('Datos del formulario:', data);
        this.showSuccessMessage();
        this.resetForm();
    }

    resetForm() {
        this.form.reset();

        this.form.querySelectorAll('.form-input, .form-select').forEach(input => {
            input.classList.remove('error', 'success');
        });

        this.form.querySelectorAll('.error-message').forEach(error => {
            error.classList.remove('show');
            error.textContent = '';
        });
    }

    showSuccessMessage(message = null) {
        const formMessage = document.getElementById(`${this.form.id}-message`);
        if (!formMessage) return;

        const defaultMessage = '¡Registro exitoso! Los datos han sido procesados correctamente.';

        formMessage.className = 'form-message success';
        formMessage.innerHTML = `
            <div class="form-message-content">
                <div class="form-message-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="form-message-text">
                    <h4 class="form-message-title">¡Operación exitosa!</h4>
                    <p class="form-message-details">${message || defaultMessage}</p>
                </div>
            </div>
        `;

        setTimeout(() => {
            formMessage.className = 'form-message';
            formMessage.innerHTML = '';
        }, 5000);
    }

    showFormError(message) {
        const formMessage = document.getElementById(`${this.form.id}-message`);
        if (!formMessage) return;

        formMessage.className = 'form-message error';
        formMessage.innerHTML = `
            <div class="form-message-content">
                <div class="form-message-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="form-message-text">
                    <h4 class="form-message-title">Error de Validación</h4>
                    <p class="form-message-details">${message}</p>
                </div>
            </div>
        `;

        const firstError = this.form.querySelector('.error');
        if (firstError) firstError.focus();
    }

    setupPasswordToggle(passwordInputId, toggleBtnId) {
        const toggleBtn = document.getElementById(toggleBtnId);
        const passwordInput = document.getElementById(passwordInputId);

        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const isVisible = passwordInput.type === 'text';
                passwordInput.type = isVisible ? 'password' : 'text';

                const icon = toggleBtn.querySelector('i');
                icon.classList.toggle('fa-eye', isVisible);
                icon.classList.toggle('fa-eye-slash', !isVisible);
            });
        }
    }

    updatePasswordStrength(passwordInputId, strengthFillId, strengthLabelId) {
        const passwordInput = document.getElementById(passwordInputId);
        const strengthFill = document.getElementById(strengthFillId);
        const strengthLabel = document.getElementById(strengthLabelId);

        if (!passwordInput || !strengthFill || !strengthLabel) return;

        const password = passwordInput.value;
        const strength = Validator.calculatePasswordStrength(password);

        strengthFill.style.width = `${strength.percentage}%`;
        strengthFill.style.backgroundColor = strength.color;
        strengthLabel.textContent = this.getStrengthText(strength.level);
        strengthLabel.style.color = strength.color;
    }

    getStrengthText(level) {
        const texts = {
            weak: 'Débil',
            medium: 'Moderada',
            strong: 'Fuerte'
        };
        return texts[level] || 'Débil';
    }
}

class StudentFormHandler extends BaseFormHandler {
    constructor() {
        super('estudiante-form', {
            fields: {
                'nombre-completo': {
                    validator: (v) => Validator.required(v, 'nombre completo', 5)
                },
                'tipo-documento': {
                    validator: (v) => Validator.required(v, 'tipo de documento')
                },
                'numero-documento': {
                    validator: (v) => Validator.required(v, 'número de documento')
                },
                'correo-electronico': {
                    validator: (v) => Validator.email(v)
                },
                'grado': {
                    validator: (v) => Validator.required(v, 'grado')
                },
                'grupo': {
                    validator: (v) => Validator.required(v, 'grupo')
                },
                'contrasena': {
                    validator: (v) => Validator.password(v)
                }
            }
        });
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Botón cancelar
        const cancelBtn = document.getElementById('cancel-form-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que deseas cancelar? Se perderán todos los datos ingresados.')) {
                    this.resetForm();
                    this.updatePasswordStrength('contrasena', 'password-strength-fill', 'password-strength-label');
                }
            });
        }

        // Generar contraseña
        const generateBtn = document.getElementById('generate-password-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                const password = Utils.generatePassword();
                document.getElementById('contrasena').value = password;
                this.updatePasswordStrength('contrasena', 'password-strength-fill', 'password-strength-label');
                Utils.markAsValid('contrasena');
            });
        }

        // Toggle contraseña
        this.setupPasswordToggle('contrasena', 'toggle-estudiante-password');

        // Validación en tiempo real para número de documento
        const docInput = document.getElementById('numero-documento');
        if (docInput) {
            docInput.addEventListener('input', () => {
                docInput.value = docInput.value.replace(/[^0-9]/g, '');
                Utils.clearError('numero-documento');
            });
        }
    }

    setupRealTimeValidation() {
        const passwordInput = document.getElementById('contrasena');
        const emailInput = document.getElementById('correo-electronico');

        if (passwordInput) {
            const updateStrength = Utils.debounce(() => {
                this.updatePasswordStrength('contrasena', 'password-strength-fill', 'password-strength-label');
            }, 300);

            passwordInput.addEventListener('input', updateStrength);
        }

        if (emailInput) {
            const validateEmail = Utils.debounce(() => {
                const validation = Validator.email(emailInput.value);
                if (validation.valid) {
                    Utils.markAsValid('correo-electronico');
                } else {
                    Utils.showError('correo-electronico', validation.message);
                }
            }, 500);

            emailInput.addEventListener('input', validateEmail);
            emailInput.addEventListener('blur', validateEmail);
        }
    }

    async validateForm() {
        let isValid = true;

        Object.entries(this.fields).forEach(([fieldId, config]) => {
            const input = document.getElementById(fieldId);
            if (!input) return;

            const value = input.value.trim();
            const validation = config.validator(value);

            if (!validation.valid) {
                Utils.showError(fieldId, validation.message);
                isValid = false;
            } else {
                Utils.markAsValid(fieldId);
            }
        });

        // Validación adicional para número de documento
        const docInput = document.getElementById('numero-documento');
        if (docInput && !docInput.value.trim()) {
            Utils.showError('numero-documento', 'El número de documento es obligatorio');
            isValid = false;
        }

        return isValid;
    }

    async processForm() {
        // Preparar datos para enviar
        const studentData = {
            nombre_completo: document.getElementById('nombre-completo').value,
            tipo_documento: document.getElementById('tipo-documento').value,
            numero_documento: document.getElementById('numero-documento').value,
            correo_electronico: document.getElementById('correo-electronico').value,
            grado: document.getElementById('grado').value,
            grupo: document.getElementById('grupo').value,
            contrasena: document.getElementById('contrasena').value
        };

        // Mostrar indicador de carga
        const submitBtn = this.form.querySelector('.save-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        submitBtn.disabled = true;

        try {
            // Enviar datos al servidor
            const response = await fetch('/registrar-estudiante', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(studentData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.showSuccessMessage(`Estudiante registrado exitosamente. Código: ${result.data.codigo}`);
                this.resetForm();
                this.updatePasswordStrength('contrasena', 'password-strength-fill', 'password-strength-label');

                // Actualizar la tabla de estudiantes si está visible
                if (window.app && window.app.tables && window.app.tables.estudiantes) {
                    await window.app.tables.estudiantes.loadData();
                }

                // Actualizar estadísticas del dashboard
                if (window.app && window.app.stats) {
                    await window.app.stats.refresh();
                }

            } else {
                this.showFormError(result.message || 'Error al registrar el estudiante');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showFormError('Error al conectar con el servidor. Verifica tu conexión.');
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    showSuccessMessage(message = null) {
        const formMessage = document.getElementById('estudiante-form-message');
        if (!formMessage) return;

        // Aquí se recibe el código automáticamente del backend
        // El mensaje ya incluye el código generado secuencialmente (EST001, EST002, etc.)
        const defaultMessage = '¡Estudiante registrado exitosamente! Los datos han sido guardados correctamente.';

        formMessage.className = 'form-message success';
        formMessage.innerHTML = `
            <div class="form-message-content">
                <div class="form-message-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="form-message-text">
                    <h4 class="form-message-title">¡Registro Exitoso!</h4>
                    <p class="form-message-details">${message || defaultMessage}</p>
                </div>
            </div>
        `;

        // Scroll to message
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showFormError(message) {
        const formMessage = document.getElementById('estudiante-form-message');
        if (!formMessage) return;

        formMessage.className = 'form-message error';
        formMessage.innerHTML = `
            <div class="form-message-content">
                <div class="form-message-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="form-message-text">
                    <h4 class="form-message-title">Error de Registro</h4>
                    <p class="form-message-details">${message}</p>
                </div>
            </div>
        `;

        // Scroll to error
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const firstError = this.form.querySelector('.error');
        if (firstError) {
            setTimeout(() => firstError.focus(), 300);
        }
    }

    resetForm() {
        super.resetForm();

        // Resetear la barra de fortaleza de contraseña
        this.updatePasswordStrength('contrasena', 'password-strength-fill', 'password-strength-label');

        // Resetear campos específicos adicionales
        const passwordInput = document.getElementById('contrasena');
        if (passwordInput) {
            passwordInput.type = 'password';
            const toggleBtn = document.getElementById('toggle-estudiante-password');
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        }
    }
}

class ProfessorFormHandler extends BaseFormHandler {
    constructor() {
        super('profesor-form', {
            fields: {
                'profesor-nombre-completo': {
                    validator: (v) => Validator.required(v, 'nombre completo', 5)
                },
                'profesor-tipo-documento': {
                    validator: (v) => Validator.required(v, 'tipo de documento')
                },
                'profesor-numero-documento': {
                    validator: (v) => Validator.required(v, 'número de documento')
                },
                'profesor-correo-electronico': {
                    validator: (v) => Validator.email(v)
                },
                'profesor-telefono': {
                    validator: (v) => Validator.required(v, 'teléfono')
                },
                'profesor-asignaturas': {
                    validator: (v) => this.validateAsignaturas(v)
                },
                'profesor-contrasena': {
                    validator: (v) => Validator.password(v)
                }
            }
        });
    }

    validateAsignaturas(value) {
        const select = document.getElementById('profesor-asignaturas');
        if (!select) {
            return { valid: false, message: 'Campo de asignaturas no encontrado' };
        }

        const selectedOptions = Array.from(select.selectedOptions);
        if (selectedOptions.length === 0) {
            return { valid: false, message: 'Debe seleccionar al menos una asignatura' };
        }

        return { valid: true };
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Botón cancelar
        const cancelBtn = document.getElementById('cancel-profesor-form-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que deseas cancelar? Se perderán todos los datos ingresados.')) {
                    this.resetForm();
                    this.updatePasswordStrength('profesor-contrasena', 'profesor-password-strength-fill', 'profesor-password-strength-label');
                }
            });
        }

        // Generar contraseña
        const generateBtn = document.getElementById('generate-profesor-password-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                const password = Utils.generatePassword();
                document.getElementById('profesor-contrasena').value = password;
                this.updatePasswordStrength('profesor-contrasena', 'profesor-password-strength-fill', 'profesor-password-strength-label');
                Utils.markAsValid('profesor-contrasena');
            });
        }

        // Toggle contraseña
        this.setupPasswordToggle('profesor-contrasena', 'toggle-profesor-password');

        // Actualizar contador de asignaturas
        const asignaturasSelect = document.getElementById('profesor-asignaturas');
        if (asignaturasSelect) {
            asignaturasSelect.addEventListener('change', () => {
                this.updateAsignaturasCount();
                this.validateAsignaturasInRealTime();
            });
        }

        // Validación en tiempo real para número de documento
        const docInput = document.getElementById('profesor-numero-documento');
        if (docInput) {
            docInput.addEventListener('input', () => {
                docInput.value = docInput.value.replace(/[^0-9]/g, '');
                Utils.clearError('profesor-numero-documento');
            });
        }

        // Validación en tiempo real para teléfono
        const telefonoInput = document.getElementById('profesor-telefono');
        if (telefonoInput) {
            telefonoInput.addEventListener('input', () => {
                telefonoInput.value = telefonoInput.value.replace(/[^0-9]/g, '');
                Utils.clearError('profesor-telefono');
            });
        }
    }

    validateAsignaturasInRealTime() {
        const select = document.getElementById('profesor-asignaturas');
        const selectedCount = Array.from(select.selectedOptions).length;
        const errorElement = document.getElementById('profesor-asignaturas-error');

        if (selectedCount === 0) {
            if (errorElement) {
                errorElement.textContent = 'Debe seleccionar al menos una asignatura';
                errorElement.classList.add('show');
            }
            select.classList.add('error');
            select.classList.remove('success');
        } else {
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.classList.remove('show');
            }
            select.classList.remove('error');
            select.classList.add('success');
        }
    }

    updateAsignaturasCount() {
        const select = document.getElementById('profesor-asignaturas');
        const counter = document.getElementById('asignaturas-seleccionadas');

        if (select && counter) {
            const selectedCount = Array.from(select.selectedOptions).length;
            counter.textContent = `${selectedCount} asignatura${selectedCount !== 1 ? 's' : ''} seleccionada${selectedCount !== 1 ? 's' : ''}`;
        }
    }

    setupRealTimeValidation() {
        const passwordInput = document.getElementById('profesor-contrasena');
        const emailInput = document.getElementById('profesor-correo-electronico');

        if (passwordInput) {
            const updateStrength = Utils.debounce(() => {
                this.updatePasswordStrength('profesor-contrasena', 'profesor-password-strength-fill', 'profesor-password-strength-label');
            }, 300);

            passwordInput.addEventListener('input', updateStrength);
        }

        if (emailInput) {
            const validateEmail = Utils.debounce(() => {
                const validation = Validator.email(emailInput.value);
                if (validation.valid) {
                    Utils.markAsValid('profesor-correo-electronico');
                } else {
                    Utils.showError('profesor-correo-electronico', validation.message);
                }
            }, 500);

            emailInput.addEventListener('input', validateEmail);
            emailInput.addEventListener('blur', validateEmail);
        }

        // Validación en tiempo real para teléfono
        const telefonoInput = document.getElementById('profesor-telefono');
        if (telefonoInput) {
            telefonoInput.addEventListener('input', () => {
                if (telefonoInput.value.trim().length >= 7) {
                    Utils.markAsValid('profesor-telefono');
                } else if (telefonoInput.value.trim() === '') {
                    Utils.clearError('profesor-telefono');
                }
            });
        }

        this.updateAsignaturasCount();
    }

    async validateForm() {
        let isValid = true;

        // Validar campos del formulario base
        Object.entries(this.fields).forEach(([fieldId, config]) => {
            const input = document.getElementById(fieldId);
            if (!input) return;

            let value;
            if (fieldId === 'profesor-asignaturas') {
                const select = document.getElementById(fieldId);
                value = Array.from(select.selectedOptions).map(opt => opt.value);
            } else {
                value = input.value.trim();
            }

            const validation = config.validator(value);

            if (!validation.valid) {
                Utils.showError(fieldId, validation.message);
                isValid = false;
            } else {
                Utils.markAsValid(fieldId);
            }
        });

        return isValid;
    }

    async processForm() {
        // Obtener las asignaturas seleccionadas
        const asignaturasSelect = document.getElementById('profesor-asignaturas');
        const asignaturas = Array.from(asignaturasSelect.selectedOptions).map(option => option.value);

        // Preparar datos para enviar
        const professorData = {
            nombre_completo: document.getElementById('profesor-nombre-completo').value,
            tipo_documento: document.getElementById('profesor-tipo-documento').value,
            numero_documento: document.getElementById('profesor-numero-documento').value,
            correo_electronico: document.getElementById('profesor-correo-electronico').value,
            telefono: document.getElementById('profesor-telefono').value,
            asignaturas: asignaturas,
            contrasena: document.getElementById('profesor-contrasena').value
        };

        // Mostrar indicador de carga
        const submitBtn = this.form.querySelector('.save-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        submitBtn.disabled = true;

        try {
            // Enviar datos al servidor
            const response = await fetch('/registrar-profesor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(professorData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.showSuccessMessage(`Profesor registrado exitosamente. Código: ${result.data.codigo}`);
                this.resetForm();
                this.updatePasswordStrength('profesor-contrasena', 'profesor-password-strength-fill', 'profesor-password-strength-label');

                // Actualizar la tabla de profesores si está visible
                if (window.app && window.app.tables && window.app.tables.profesores) {
                    await window.app.tables.profesores.loadData();
                }

                // Actualizar estadísticas del dashboard
                if (window.app && window.app.stats) {
                    await window.app.stats.refresh();
                }

            } else {
                this.showFormError(result.message || 'Error al registrar el profesor');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showFormError('Error al conectar con el servidor. Verifica tu conexión.');
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    showSuccessMessage(message = null) {
        const formMessage = document.getElementById('profesor-form-message');
        if (!formMessage) return;

        // Aquí se recibe el código automáticamente del backend
        // El mensaje ya incluye el código generado secuencialmente (PROF001, PROF002, etc.)
        const defaultMessage = '¡Profesor registrado exitosamente! Los datos han sido guardados correctamente.';

        formMessage.className = 'form-message success';
        formMessage.innerHTML = `
            <div class="form-message-content">
                <div class="form-message-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="form-message-text">
                    <h4 class="form-message-title">¡Registro Exitoso!</h4>
                    <p class="form-message-details">${message || defaultMessage}</p>
                </div>
            </div>
        `;

        // Scroll to message
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showFormError(message) {
        const formMessage = document.getElementById('profesor-form-message');
        if (!formMessage) return;

        formMessage.className = 'form-message error';
        formMessage.innerHTML = `
            <div class="form-message-content">
                <div class="form-message-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="form-message-text">
                    <h4 class="form-message-title">Error de Registro</h4>
                    <p class="form-message-details">${message}</p>
                </div>
            </div>
        `;

        // Scroll to error
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const firstError = this.form.querySelector('.error');
        if (firstError) {
            setTimeout(() => firstError.focus(), 300);
        }
    }

    resetForm() {
        super.resetForm();

        // Resetear la barra de fortaleza de contraseña
        this.updatePasswordStrength('profesor-contrasena', 'profesor-password-strength-fill', 'profesor-password-strength-label');

        // Resetear selector de asignaturas
        const asignaturasSelect = document.getElementById('profesor-asignaturas');
        if (asignaturasSelect) {
            Array.from(asignaturasSelect.options).forEach(option => {
                option.selected = false;
            });
        }

        // Resetear contador de asignaturas
        this.updateAsignaturasCount();

        // Resetear campos específicos adicionales
        const passwordInput = document.getElementById('profesor-contrasena');
        if (passwordInput) {
            passwordInput.type = 'password';
            const toggleBtn = document.getElementById('toggle-profesor-password');
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        }
    }
}

// ============================================
// GESTOR DE NAVEGACIÓN
// ============================================

class NavigationManager {
    constructor() {
        this.currentSection = 'inicio-section';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupQuickActions();
    }

    setupNavigation() {
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink) {
                e.preventDefault();
                this.navigateToSection(navLink);
            }
        });
    }

    navigateToSection(navLink) {
        const sectionName = navLink.querySelector('.nav-text').textContent;
        const targetSectionId = CONFIG.sectionMap[sectionName];

        if (!targetSectionId) return;

        // Actualizar navegación activa
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        navLink.classList.add('active');

        // Ocultar todas las secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Mostrar sección objetivo
        const targetSection = document.getElementById(targetSectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = targetSectionId;
            
            // Si estamos en la sección de inicio, actualizar estadísticas
            if (targetSectionId === 'inicio-section' && window.app && window.app.stats) {
                window.app.stats.refresh();
            }
        }
    }

    setupQuickActions() {
        document.addEventListener('click', (e) => {
            const quickActionBtn = e.target.closest('.quick-action-btn');
            if (quickActionBtn) {
                const target = quickActionBtn.dataset.target;
                this.handleQuickAction(target);
            }
        });
    }

    handleQuickAction(action) {
        const config = CONFIG.quickActions[action];
        if (!config) return;

        // Ocultar todas las secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Mostrar sección objetivo
        const targetSection = document.getElementById(config.section);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = config.section;
        }

        // Actualizar navegación activa
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const navLinks = document.querySelectorAll(CONFIG.selectors.navLinks);
        if (navLinks[config.navIndex]) {
            navLinks[config.navIndex].classList.add('active');
        }
    }
}

// ============================================
// GESTOR DE INTERFAZ
// ============================================

class UIManager {
    constructor() {
        this.modals = {};
        this.init();
    }

    init() {
        this.setupModals();
        this.setupProfileModals();
        this.setupPasswordToggles();
        this.updateCurrentDate();
        this.setupResizeHandler();
    }

    setupModals() {
        // Modal de perfil
        this.modals.profile = new ModalManager('profile-modal', {
            closeBtnId: 'modal-close-btn'
        });

        // Modal de editar perfil
        this.modals.editProfile = new ModalManager('edit-profile-modal', {
            closeBtnId: 'edit-modal-close-btn'
        });

        // Modal de cambiar contraseña
        this.modals.changePassword = new ModalManager('change-password-modal', {
            closeBtnId: 'change-password-close-btn'
        });

        // Configurar interacciones entre modales
        this.setupModalInteractions();

        // Abrir modal de perfil
        document.querySelector(CONFIG.selectors.profileBtn)?.addEventListener('click',
            () => this.modals.profile.open());

        document.querySelector(CONFIG.selectors.userProfile)?.addEventListener('click',
            () => this.modals.profile.open());

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                // Cerrar modales
                this.modals.profile.close();
                // Redirigir al servidor para cerrar sesión
                window.location.href = '/logout';
            }
        });
    }

    setupModalInteractions() {
        // Editar perfil
        document.querySelector('.edit-btn')?.addEventListener('click', () => {
            this.modals.profile.close();
            setTimeout(() => this.modals.editProfile.open(), 150);
        });

        // Cambiar contraseña
        document.querySelector('.password-btn')?.addEventListener('click', () => {
            this.modals.profile.close();
            setTimeout(() => {
                this.modals.changePassword.open();
                document.getElementById('current-password')?.focus();
            }, 150);
        });

        // Cancelar edición
        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            this.modals.editProfile.close();
            setTimeout(() => this.modals.profile.open(), 150);
        });

        // Cancelar cambio de contraseña
        document.getElementById('cancel-password-btn')?.addEventListener('click', () => {
            this.modals.changePassword.close();
            setTimeout(() => this.modals.profile.open(), 150);
        });
    }

    updateCurrentDate() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            dateElement.textContent = Utils.formatDate();
        }
    }

    setupResizeHandler() {
        const adjustLayout = () => {
            const sidebar = document.querySelector(CONFIG.selectors.sidebar);
            const mainContent = document.querySelector(CONFIG.selectors.mainContent);

            if (!sidebar || !mainContent) return;

            if (window.innerWidth > 768) {
                mainContent.style.marginLeft = `${sidebar.offsetWidth}px`;
            } else {
                mainContent.style.marginLeft = '0';
            }
        };

        adjustLayout();
        window.addEventListener('resize', Utils.debounce(adjustLayout, 250));
    }

    setupProfileModals() {
        // Formulario de editar perfil
        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => this.handleEditProfile(e));
        }

        // Formulario de cambiar contraseña
        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => this.handleChangePassword(e));
        }
    }

    handleEditProfile(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const data = {
            fullname: formData.get('full-name') || document.getElementById('full-name').value,
            email: formData.get('email') || document.getElementById('email').value
        };

        // Validación básica
        if (!data.fullname || !data.email) {
            this.showModalError('edit-profile-modal', 'Todos los campos son requeridos.');
            return;
        }

        // Mostrar indicador de carga
        const submitBtn = form.querySelector('.save-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        submitBtn.disabled = true;

        // Enviar datos al servidor
        fetch('/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                // Actualizar la interfaz con los nuevos datos
                this.updateUserInterface(result.user);

                // Mostrar mensaje de éxito
                this.showModalSuccess('edit-profile-modal', result.message);

                // Cerrar modal después de 2 segundos
                setTimeout(() => {
                    this.modals.editProfile.close();
                    this.modals.profile.open();

                    // Actualizar datos en el modal de perfil
                    this.updateProfileModalData(result.user);
                }, 2000);
            } else {
                this.showModalError('edit-profile-modal', result.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showModalError('edit-profile-modal', 'Error al conectar con el servidor.');
        })
        .finally(() => {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    }

    handleChangePassword(e) {
        e.preventDefault();

        const form = e.target;
        const data = {
            current_password: document.getElementById('current-password').value,
            new_password: document.getElementById('new-password').value,
            confirm_password: document.getElementById('confirm-password').value
        };

        // Validación
        if (!data.current_password || !data.new_password || !data.confirm_password) {
            this.showModalError('change-password-modal', 'Todos los campos son requeridos.');
            return;
        }

        if (data.new_password.length < 8) {
            this.showModalError('change-password-modal', 'La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (data.new_password !== data.confirm_password) {
            this.showModalError('change-password-modal', 'Las contraseñas no coinciden.');
            return;
        }

        // Mostrar indicador de carga
        const submitBtn = form.querySelector('.save-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        submitBtn.disabled = true;

        // Enviar datos al servidor
        fetch('/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                // Mostrar mensaje de éxito
                this.showModalSuccess('change-password-modal', result.message);

                // Limpiar formulario
                form.reset();

                // Cerrar modal después de 2 segundos
                setTimeout(() => {
                    this.modals.changePassword.close();
                    this.modals.profile.open();
                }, 2000);
            } else {
                this.showModalError('change-password-modal', result.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showModalError('change-password-modal', 'Error al conectar con el servidor.');
        })
        .finally(() => {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    }

    updateUserInterface(userData) {
        // Actualizar nombre en el sidebar
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = userData.name;
        });

        // Actualizar email en el sidebar
        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(element => {
            element.textContent = userData.email;
        });

        // Actualizar bienvenida en el dashboard
        const welcomeTitle = document.querySelector('.welcome-section h1');
        if (welcomeTitle) {
            welcomeTitle.textContent = `Bienvenido, ${userData.name}`;
        }

        // Actualizar avatar
        const avatarImages = document.querySelectorAll('img[alt*="Avatar"]');
        avatarImages.forEach(img => {
            const newAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=6366f1&color=fff`;
            img.src = newAvatarUrl;
        });
    }

    updateProfileModalData(userData) {
        // Actualizar información en el modal de perfil
        const profileName = document.querySelector('.profile-name');
        if (profileName) {
            profileName.textContent = userData.name;
        }

        const profileEmail = document.querySelector('.profile-email');
        if (profileEmail) {
            profileEmail.innerHTML = `<i class="fas fa-envelope"></i> ${userData.email}`;
        }
    }

    showModalSuccess(modalId, message) {
        const modal = document.getElementById(modalId);
        const messageContainer = modal.querySelector('.form-message') || this.createMessageContainer(modal);
        // Quitar la clase error por si la tenía
        messageContainer.classList.remove('error');

        messageContainer.className = 'form-message success';
        messageContainer.innerHTML = `
            <div class="form-message-content">
                <div class="form-message-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="form-message-text">
                    <h4 class="form-message-title">¡Éxito!</h4>
                    <p class="form-message-details">${message}</p>
                </div>
            </div>
        `;
    }

    showModalError(modalId, message) {
        const modal = document.getElementById(modalId);
        const messageContainer = modal.querySelector('.form-message') || this.createMessageContainer(modal);
        // Quitar la clase success por si la tenía
        messageContainer.classList.remove('success');

        messageContainer.className = 'form-message error';
        messageContainer.innerHTML = `
            <div class="form-message-content">
                <div class="form-message-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="form-message-text">
                    <h4 class="form-message-title">Error</h4>
                    <p class="form-message-details">${message}</p>
                </div>
            </div>
        `;
    }

    createMessageContainer(modal) {
        const container = document.createElement('div');
        container.className = 'form-message';
        // Insertar antes del modal-body o al inicio del modal-content
        const modalContent = modal.querySelector('.modal-content');
        const modalBody = modal.querySelector('.modal-body');
        
        if (modalBody) {
            modalContent.insertBefore(container, modalBody);
        } else {
             modalContent.appendChild(container);
        }
        
        return container;
    }

    setupPasswordToggles() {
        document.querySelectorAll('.toggle-password-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.dataset.target || 'current-password';
                const passwordInput = document.getElementById(targetId);

                if (passwordInput) {
                    const isVisible = passwordInput.type === 'text';
                    passwordInput.type = isVisible ? 'password' : 'text';

                    const icon = btn.querySelector('i');
                    icon.classList.toggle('fa-eye', isVisible);
                    icon.classList.toggle('fa-eye-slash', !isVisible);
                }
            });
        });
    }
}

// ============================================
// MÓDULO DE ESTADÍSTICAS
// ============================================

class StatsManager {
    constructor() {
        this.stats = {
            estudiantes: 0,
            profesores: 0
        };
        this.init();
    }

    async init() {
        await this.loadStats();
        this.updateUI();
    }

    async loadStats() {
        try {
            const response = await fetch('/dashboard-stats');
            const result = await response.json();

            if (result.status === 'success') {
                this.stats = result.data;
                return true;
            } else {
                console.error('Error cargando estadísticas:', result.message);
                return false;
            }
        } catch (error) {
            console.error('Error cargando estadísticas del dashboard:', error);
            return false;
        }
    }

    updateUI() {
        // Actualizar contador de estudiantes
        const estudiantesElement = document.querySelector('.overview-cards .overview-card:nth-child(1) .card-value');
        if (estudiantesElement) {
            estudiantesElement.textContent = this.stats.estudiantes;
        }

        // Actualizar contador de profesores
        const profesoresElement = document.querySelector('.overview-cards .overview-card:nth-child(2) .card-value');
        if (profesoresElement) {
            profesoresElement.textContent = this.stats.profesores;
        }

        // Si estamos en la sección de reportes, también actualizar los contadores de las tablas
        this.updateTableCounters();
    }

    updateTableCounters() {
        // Actualizar contadores en las tablas si están visibles
        if (window.app && window.app.tables) {
            if (window.app.tables.estudiantes) {
                const estudiantesCounter = document.getElementById('estudiantes-counter');
                if (estudiantesCounter) {
                    estudiantesCounter.textContent = `Total: ${this.stats.estudiantes} estudiantes`;
                }
            }
            
            if (window.app.tables.profesores) {
                const profesoresCounter = document.getElementById('profesores-counter');
                if (profesoresCounter) {
                    profesoresCounter.textContent = `Total: ${this.stats.profesores} profesores`;
                }
            }
        }
    }

    async refresh() {
        const success = await this.loadStats();
        if (success) {
            this.updateUI();
        }
        return success;
    }

    getStats() {
        return { ...this.stats };
    }
}

// ============================================
// GESTOR DE EDICIÓN DE ESTUDIANTES Y PROFESORES
// ============================================

class EditManager {
    constructor() {
        this.modals = {};
        this.init();
    }

    init() {
        this.setupModals();
        this.setupEventListeners();
        this.setupPasswordToggle();
    }

    setupModals() {
        // Modal de editar estudiante
        this.modals.estudiante = new ModalManager('edit-estudiante-modal', {
            closeBtnId: 'close-edit-estudiante-modal'
        });

        // Modal de editar profesor
        this.modals.profesor = new ModalManager('edit-profesor-modal', {
            closeBtnId: 'close-edit-profesor-modal'
        });

        // Configurar botones cancelar
        document.getElementById('cancel-edit-estudiante')?.addEventListener('click', 
            () => this.modals.estudiante.close());
        
        document.getElementById('cancel-edit-profesor')?.addEventListener('click', 
            () => this.modals.profesor.close());
    }

    setupEventListeners() {
        // Listener para botones de editar en la tabla de estudiantes
        document.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.action-btn.edit');
            if (!editBtn) return;

            const row = editBtn.closest('tr');
            const codigo = row.dataset.codigo;
            
            if (!codigo) return;

            // Determinar si es estudiante o profesor
            if (row.closest('#tabla-estudiantes')) {
                await this.loadEstudianteData(codigo);
                this.modals.estudiante.open();
            } else if (row.closest('#tabla-profesores')) {
                await this.loadProfesorData(codigo);
                this.modals.profesor.open();
            }
        });

        // Formulario de editar estudiante
        const editEstudianteForm = document.getElementById('edit-estudiante-form');
        if (editEstudianteForm) {
            editEstudianteForm.addEventListener('submit', (e) => this.handleEditEstudiante(e));
        }

        // Formulario de editar profesor
        const editProfesorForm = document.getElementById('edit-profesor-form');
        if (editProfesorForm) {
            editProfesorForm.addEventListener('submit', (e) => this.handleEditProfesor(e));
        }

        // Actualizar contador de asignaturas en tiempo real
        const asignaturasSelect = document.getElementById('edit-profesor-asignaturas');
        if (asignaturasSelect) {
            asignaturasSelect.addEventListener('change', () => {
                this.updateAsignaturasCount();
            });
        }
    }

    // ============================================
    // NUEVOS MÉTODOS PARA MANEJO DE CONTRASEÑAS
    // ============================================

    setupPasswordToggle() {
        // Toggle para mostrar/ocultar sección de contraseña
        const toggleEstudianteBtn = document.getElementById('toggle-estudiante-password-section');
        const toggleProfesorBtn = document.getElementById('toggle-profesor-password-section');
        
        if (toggleEstudianteBtn) {
            toggleEstudianteBtn.addEventListener('click', () => {
                this.togglePasswordSection('estudiante');
            });
        }
        
        if (toggleProfesorBtn) {
            toggleProfesorBtn.addEventListener('click', () => {
                this.togglePasswordSection('profesor');
            });
        }
        
        // Botones para generar contraseña
        const generateEstudianteBtn = document.getElementById('generate-estudiante-password');
        const generateProfesorBtn = document.getElementById('generate-profesor-modal-password');
        
        if (generateEstudianteBtn) {
            generateEstudianteBtn.addEventListener('click', () => {
                const password = Utils.generatePassword();
                document.getElementById('edit-estudiante-nueva-contrasena').value = password;
                document.getElementById('edit-estudiante-confirmar-contrasena').value = password;
                this.updatePasswordStrength('estudiante');
            });
        }
        
        if (generateProfesorBtn) {
            generateProfesorBtn.addEventListener('click', () => {
                const password = Utils.generatePassword();
                document.getElementById('edit-profesor-nueva-contrasena').value = password;
                document.getElementById('edit-profesor-confirmar-contrasena').value = password;
                this.updatePasswordStrength('profesor');
            });
        }
        
        // Validación en tiempo real de contraseñas
        const estudiantePasswordInput = document.getElementById('edit-estudiante-nueva-contrasena');
        const profesorPasswordInput = document.getElementById('edit-profesor-nueva-contrasena');
        
        if (estudiantePasswordInput) {
            estudiantePasswordInput.addEventListener('input', () => {
                this.updatePasswordStrength('estudiante');
                this.validatePasswordConfirmation('estudiante');
            });
        }
        
        if (profesorPasswordInput) {
            profesorPasswordInput.addEventListener('input', () => {
                this.updatePasswordStrength('profesor');
                this.validatePasswordConfirmation('profesor');
            });
        }
        
        // Validación de confirmación de contraseña
        const estudianteConfirmInput = document.getElementById('edit-estudiante-confirmar-contrasena');
        const profesorConfirmInput = document.getElementById('edit-profesor-confirmar-contrasena');
        
        if (estudianteConfirmInput) {
            estudianteConfirmInput.addEventListener('input', () => {
                this.validatePasswordConfirmation('estudiante');
            });
        }
        
        if (profesorConfirmInput) {
            profesorConfirmInput.addEventListener('input', () => {
                this.validatePasswordConfirmation('profesor');
            });
        }
        
        // Setup password toggles para mostrar/ocultar contraseña
        this.setupPasswordVisibilityToggles();
    }

    setupPasswordVisibilityToggles() {
        document.querySelectorAll('.toggle-password-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.dataset.target;
                const passwordInput = document.getElementById(targetId);
                
                if (passwordInput) {
                    const isVisible = passwordInput.type === 'text';
                    passwordInput.type = isVisible ? 'password' : 'text';
                    
                    const icon = btn.querySelector('i');
                    icon.classList.toggle('fa-eye', isVisible);
                    icon.classList.toggle('fa-eye-slash', !isVisible);
                }
            });
        });
    }

    togglePasswordSection(type) {
        const content = document.getElementById(`${type}-password-content`);
        const toggleBtn = document.getElementById(`toggle-${type}-password-section`);
        
        if (!content || !toggleBtn) return;
        
        const isVisible = content.classList.contains('show');
        content.classList.toggle('show', !isVisible);
        
        const icon = toggleBtn.querySelector('.fa-chevron-down');
        const text = toggleBtn.querySelector('span');
        
        if (icon) {
            icon.classList.toggle('fa-chevron-down', isVisible);
            icon.classList.toggle('fa-chevron-up', !isVisible);
        }
        
        if (text) {
            text.textContent = isVisible ? 'Mostrar' : 'Ocultar';
        }
    }

    updatePasswordStrength(type) {
        const passwordInput = document.getElementById(`edit-${type}-nueva-contrasena`);
        const strengthFill = document.getElementById(`edit-${type}-password-strength-fill`);
        const strengthLabel = document.getElementById(`edit-${type}-password-strength-label`);
        
        if (!passwordInput || !strengthFill || !strengthLabel) return;
        
        const password = passwordInput.value;
        const strength = Validator.calculatePasswordStrength(password);
        
        strengthFill.style.width = `${strength.percentage}%`;
        strengthFill.style.backgroundColor = strength.color;
        strengthFill.className = `strength-fill ${strength.level}`;
        strengthLabel.textContent = this.getStrengthText(strength.level);
        strengthLabel.style.color = strength.color;
    }

    validatePasswordConfirmation(type) {
        const password = document.getElementById(`edit-${type}-nueva-contrasena`).value;
        const confirmPassword = document.getElementById(`edit-${type}-confirmar-contrasena`).value;
        const errorElement = document.getElementById(`edit-${type}-confirmar-error`);
        
        if (!password || !confirmPassword) {
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.classList.remove('show');
            }
            return true;
        }
        
        if (password !== confirmPassword) {
            if (errorElement) {
                errorElement.textContent = 'Las contraseñas no coinciden';
                errorElement.classList.add('show');
            }
            return false;
        } else {
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.classList.remove('show');
            }
            return true;
        }
    }

    getStrengthText(level) {
        const texts = {
            weak: 'Débil',
            medium: 'Moderada',
            strong: 'Fuerte'
        };
        return texts[level] || 'Débil';
    }

    validatePasswordFields(type) {
        const password = document.getElementById(`edit-${type}-nueva-contrasena`).value;
        const confirmPassword = document.getElementById(`edit-${type}-confirmar-contrasena`).value;
        
        // Si ambos campos están vacíos, no se cambia la contraseña
        if (!password && !confirmPassword) {
            return { valid: true, shouldUpdatePassword: false };
        }
        
        // Validar que ambos campos estén llenos
        if (!password || !confirmPassword) {
            return { 
                valid: false, 
                shouldUpdatePassword: true, 
                message: 'Ambos campos de contraseña deben estar llenos' 
            };
        }
        
        // Validar que coincidan
        if (password !== confirmPassword) {
            return { 
                valid: false, 
                shouldUpdatePassword: true, 
                message: 'Las contraseñas no coinciden' 
            };
        }
        
        // Validar fortaleza de contraseña
        const passwordValidation = Validator.password(password);
        if (!passwordValidation.valid) {
            return { 
                valid: false, 
                shouldUpdatePassword: true, 
                message: passwordValidation.message 
            };
        }
        
        return { valid: true, shouldUpdatePassword: true };
    }

    // ============================================
    // MÉTODOS EXISTENTES (cargar datos)
    // ============================================

    async loadEstudianteData(codigo) {
        try {
            const response = await fetch(`/obtener-estudiante/${codigo}`);
            const result = await response.json();

            if (result.status === 'success') {
                const estudiante = result.data;
                
                // Llenar formulario con los datos
                document.getElementById('edit-estudiante-id').value = estudiante.id;
                document.getElementById('edit-nombre-completo').value = estudiante.nombre;
                document.getElementById('edit-tipo-documento').value = estudiante.tipo_documento;
                document.getElementById('edit-numero-documento').value = estudiante.numero_documento;
                document.getElementById('edit-correo-electronico').value = estudiante.email;
                document.getElementById('edit-grado').value = estudiante.grado;
                document.getElementById('edit-grupo').value = estudiante.grupo;

                // Limpiar campos de contraseña
                document.getElementById('edit-estudiante-nueva-contrasena').value = '';
                document.getElementById('edit-estudiante-confirmar-contrasena').value = '';
                this.updatePasswordStrength('estudiante');

                // Limpiar errores
                this.clearFormErrors('edit-estudiante-form');
            } else {
                this.showMessage('Error al cargar datos del estudiante', 'error');
            }
        } catch (error) {
            console.error('Error cargando datos del estudiante:', error);
            this.showMessage('Error de conexión', 'error');
        }
    }

    async loadProfesorData(codigo) {
        try {
            const response = await fetch(`/obtener-profesor/${codigo}`);
            const result = await response.json();

            if (result.status === 'success') {
                const profesor = result.data;
                
                // Llenar formulario con los datos
                document.getElementById('edit-profesor-id').value = profesor.id;
                document.getElementById('edit-profesor-nombre-completo').value = profesor.nombre;
                document.getElementById('edit-profesor-tipo-documento').value = profesor.tipo_documento;
                document.getElementById('edit-profesor-numero-documento').value = profesor.numero_documento;
                document.getElementById('edit-profesor-correo-electronico').value = profesor.email;
                document.getElementById('edit-profesor-telefono').value = profesor.telefono;

                // Seleccionar asignaturas
                const asignaturasSelect = document.getElementById('edit-profesor-asignaturas');
                if (asignaturasSelect && profesor.asignaturas) {
                    Array.from(asignaturasSelect.options).forEach(option => {
                        option.selected = profesor.asignaturas.includes(option.value);
                    });
                    this.updateAsignaturasCount();
                }

                // Limpiar campos de contraseña
                document.getElementById('edit-profesor-nueva-contrasena').value = '';
                document.getElementById('edit-profesor-confirmar-contrasena').value = '';
                this.updatePasswordStrength('profesor');

                // Limpiar errores
                this.clearFormErrors('edit-profesor-form');
            } else {
                this.showMessage('Error al cargar datos del profesor', 'error');
            }
        } catch (error) {
            console.error('Error cargando datos del profesor:', error);
            this.showMessage('Error de conexión', 'error');
        }
    }

    updateAsignaturasCount() {
        const select = document.getElementById('edit-profesor-asignaturas');
        const counter = document.getElementById('edit-asignaturas-seleccionadas');

        if (select && counter) {
            const selectedCount = Array.from(select.selectedOptions).length;
            counter.textContent = `${selectedCount} asignatura${selectedCount !== 1 ? 's' : ''} seleccionada${selectedCount !== 1 ? 's' : ''}`;
        }
    }

    // ============================================
    // MÉTODOS EXISTENTES (manejo de formularios)
    // ============================================

    async handleEditEstudiante(e) {
        e.preventDefault();

        const form = e.target;
        const estudianteId = document.getElementById('edit-estudiante-id').value;

        // Validar formulario principal
        if (!this.validateEstudianteForm()) {
            return;
        }
        
        // Validar campos de contraseña si se están actualizando
        const passwordValidation = this.validatePasswordFields('estudiante');
        if (!passwordValidation.valid) {
            this.showMessage(passwordValidation.message, 'error');
            return;
        }

        // Preparar datos
        const estudianteData = {
            id: estudianteId,
            nombre_completo: document.getElementById('edit-nombre-completo').value,
            tipo_documento: document.getElementById('edit-tipo-documento').value,
            numero_documento: document.getElementById('edit-numero-documento').value,
            correo_electronico: document.getElementById('edit-correo-electronico').value,
            grado: document.getElementById('edit-grado').value,
            grupo: document.getElementById('edit-grupo').value
        };
        
        // Agregar contraseña solo si se está cambiando
        if (passwordValidation.shouldUpdatePassword) {
            estudianteData.nueva_contrasena = document.getElementById('edit-estudiante-nueva-contrasena').value;
        }

        // Mostrar indicador de carga
        const submitBtn = form.querySelector('.save-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        submitBtn.disabled = true;

        try {
            // Enviar datos al servidor
            const response = await fetch('/actualizar-estudiante', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(estudianteData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.showMessage('Estudiante actualizado exitosamente', 'success');
                this.modals.estudiante.close();
                
                // Limpiar campos de contraseña
                document.getElementById('edit-estudiante-nueva-contrasena').value = '';
                document.getElementById('edit-estudiante-confirmar-contrasena').value = '';
                this.updatePasswordStrength('estudiante');
                
                // Actualizar la tabla de estudiantes
                if (window.app && window.app.tables && window.app.tables.estudiantes) {
                    await window.app.tables.estudiantes.loadData();
                }

                // Actualizar estadísticas
                if (window.app && window.app.stats) {
                    await window.app.stats.refresh();
                }
            } else {
                this.showMessage(result.message || 'Error al actualizar el estudiante', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error de conexión', 'error');
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleEditProfesor(e) {
        e.preventDefault();

        const form = e.target;
        const profesorId = document.getElementById('edit-profesor-id').value;

        // Validar formulario principal
        if (!this.validateProfesorForm()) {
            return;
        }
        
        // Validar campos de contraseña si se están actualizando
        const passwordValidation = this.validatePasswordFields('profesor');
        if (!passwordValidation.valid) {
            this.showMessage(passwordValidation.message, 'error');
            return;
        }

        // Obtener asignaturas seleccionadas
        const asignaturasSelect = document.getElementById('edit-profesor-asignaturas');
        const asignaturas = Array.from(asignaturasSelect.selectedOptions).map(option => option.value);

        // Preparar datos
        const profesorData = {
            id: profesorId,
            nombre_completo: document.getElementById('edit-profesor-nombre-completo').value,
            tipo_documento: document.getElementById('edit-profesor-tipo-documento').value,
            numero_documento: document.getElementById('edit-profesor-numero-documento').value,
            correo_electronico: document.getElementById('edit-profesor-correo-electronico').value,
            telefono: document.getElementById('edit-profesor-telefono').value,
            asignaturas: asignaturas
        };
        
        // Agregar contraseña solo si se está cambiando
        if (passwordValidation.shouldUpdatePassword) {
            profesorData.nueva_contrasena = document.getElementById('edit-profesor-nueva-contrasena').value;
        }

        // Mostrar indicador de carga
        const submitBtn = form.querySelector('.save-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        submitBtn.disabled = true;

        try {
            // Enviar datos al servidor
            const response = await fetch('/actualizar-profesor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profesorData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.showMessage('Profesor actualizado exitosamente', 'success');
                this.modals.profesor.close();
                
                // Limpiar campos de contraseña
                document.getElementById('edit-profesor-nueva-contrasena').value = '';
                document.getElementById('edit-profesor-confirmar-contrasena').value = '';
                this.updatePasswordStrength('profesor');
                
                // Actualizar la tabla de profesores
                if (window.app && window.app.tables && window.app.tables.profesores) {
                    await window.app.tables.profesores.loadData();
                }

                // Actualizar estadísticas
                if (window.app && window.app.stats) {
                    await window.app.stats.refresh();
                }
            } else {
                this.showMessage(result.message || 'Error al actualizar el profesor', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error de conexión', 'error');
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // ============================================
    // MÉTODOS EXISTENTES (validación)
    // ============================================

    validateEstudianteForm() {
        let isValid = true;

        // Validar nombre
        const nombre = document.getElementById('edit-nombre-completo').value.trim();
        if (!nombre || nombre.length < 5) {
            this.showFieldError('edit-nombre-completo', 'El nombre debe tener al menos 5 caracteres');
            isValid = false;
        } else {
            this.clearFieldError('edit-nombre-completo');
        }

        // Validar tipo de documento
        const tipoDocumento = document.getElementById('edit-tipo-documento').value;
        if (!tipoDocumento) {
            this.showFieldError('edit-tipo-documento', 'Selecciona un tipo de documento');
            isValid = false;
        } else {
            this.clearFieldError('edit-tipo-documento');
        }

        // Validar número de documento
        const numeroDocumento = document.getElementById('edit-numero-documento').value.trim();
        if (!numeroDocumento) {
            this.showFieldError('edit-numero-documento', 'El número de documento es obligatorio');
            isValid = false;
        } else {
            this.clearFieldError('edit-numero-documento');
        }

        // Validar correo
        const correo = document.getElementById('edit-correo-electronico').value.trim();
        if (!correo || !CONFIG.validation.emailRegex.test(correo)) {
            this.showFieldError('edit-correo-electronico', 'Ingresa un correo electrónico válido');
            isValid = false;
        } else {
            this.clearFieldError('edit-correo-electronico');
        }

        // Validar grado
        const grado = document.getElementById('edit-grado').value;
        if (!grado) {
            this.showFieldError('edit-grado', 'Selecciona un grado');
            isValid = false;
        } else {
            this.clearFieldError('edit-grado');
        }

        // Validar grupo
        const grupo = document.getElementById('edit-grupo').value;
        if (!grupo) {
            this.showFieldError('edit-grupo', 'Selecciona un grupo');
            isValid = false;
        } else {
            this.clearFieldError('edit-grupo');
        }

        return isValid;
    }

    validateProfesorForm() {
        let isValid = true;

        // Validar nombre
        const nombre = document.getElementById('edit-profesor-nombre-completo').value.trim();
        if (!nombre || nombre.length < 5) {
            this.showFieldError('edit-profesor-nombre-completo', 'El nombre debe tener al menos 5 caracteres');
            isValid = false;
        } else {
            this.clearFieldError('edit-profesor-nombre-completo');
        }

        // Validar tipo de documento
        const tipoDocumento = document.getElementById('edit-profesor-tipo-documento').value;
        if (!tipoDocumento) {
            this.showFieldError('edit-profesor-tipo-documento', 'Selecciona un tipo de documento');
            isValid = false;
        } else {
            this.clearFieldError('edit-profesor-tipo-documento');
        }

        // Validar número de documento
        const numeroDocumento = document.getElementById('edit-profesor-numero-documento').value.trim();
        if (!numeroDocumento) {
            this.showFieldError('edit-profesor-numero-documento', 'El número de documento es obligatorio');
            isValid = false;
        } else {
            this.clearFieldError('edit-profesor-numero-documento');
        }

        // Validar correo
        const correo = document.getElementById('edit-profesor-correo-electronico').value.trim();
        if (!correo || !CONFIG.validation.emailRegex.test(correo)) {
            this.showFieldError('edit-profesor-correo-electronico', 'Ingresa un correo electrónico válido');
            isValid = false;
        } else {
            this.clearFieldError('edit-profesor-correo-electronico');
        }

        // Validar teléfono
        const telefono = document.getElementById('edit-profesor-telefono').value.trim();
        if (!telefono || telefono.length < 7) {
            this.showFieldError('edit-profesor-telefono', 'El teléfono debe tener al menos 7 dígitos');
            isValid = false;
        } else {
            this.clearFieldError('edit-profesor-telefono');
        }

        // Validar asignaturas
        const asignaturasSelect = document.getElementById('edit-profesor-asignaturas');
        const selectedAsignaturas = Array.from(asignaturasSelect.selectedOptions);
        if (selectedAsignaturas.length === 0) {
            this.showFieldError('edit-profesor-asignaturas', 'Selecciona al menos una asignatura');
            isValid = false;
        } else {
            this.clearFieldError('edit-profesor-asignaturas');
        }

        return isValid;
    }

    showFieldError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }

        if (inputElement) {
            inputElement.classList.remove('success');
            inputElement.classList.add('error');
        }
    }

    clearFieldError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);

        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }

        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }

    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.querySelectorAll('.modal-error-message').forEach(error => {
            error.textContent = '';
            error.classList.remove('show');
        });

        form.querySelectorAll('.modal-form-input, .modal-form-select').forEach(input => {
            input.classList.remove('error', 'success');
        });
    }

    showMessage(message, type) {
        // Crear o reutilizar contenedor de mensajes
        let messageContainer = document.getElementById('edit-message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'edit-message-container';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 300px;
            `;
            document.body.appendChild(messageContainer);
        }

        const messageElement = document.createElement('div');
        messageElement.className = `edit-message ${type}`;
        messageElement.innerHTML = `
            <div style="
                padding: 12px 16px;
                border-radius: 6px;
                margin-bottom: 10px;
                background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
                color: ${type === 'success' ? '#155724' : '#721c24'};
                border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        messageContainer.appendChild(messageElement);

        // Eliminar mensaje después de 5 segundos
        setTimeout(() => {
            messageElement.style.opacity = '0';
            messageElement.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                messageElement.remove();
            }, 300);
        }, 5000);
    }
}

// ============================================
// INICIALIZACIÓN ACTUALIZADA
// ============================================

class App {
    constructor() {
        this.ui = null;
        this.navigation = null;
        this.forms = {};
        this.tables = {};
        this.stats = null;
        this.editManager = null;
    }

    init() {
        try {
            // Inicializar componentes
            this.ui = new UIManager();
            this.navigation = new NavigationManager();
            
            // Inicializar estadísticas
            this.stats = new StatsManager();

            // Inicializar formularios
            this.forms.student = new StudentFormHandler();
            this.forms.professor = new ProfessorFormHandler();

            // Inicializar tablas
            this.initializeTables();

            // Inicializar gestor de edición
            this.editManager = new EditManager();

            console.log('Aplicación inicializada correctamente');
            console.log('Componentes cargados:', {
                ui: !!this.ui,
                navigation: !!this.navigation,
                stats: !!this.stats,
                forms: Object.keys(this.forms),
                tables: Object.keys(this.tables),
                editManager: !!this.editManager
            });

        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
        }
    }

    initializeTables() {
        this.tables.estudiantes = new EstudiantesTableManager();
        this.tables.profesores = new ProfesoresTableManager();
    }
}

// ============================================
// EJECUCIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app;
    app.init();
});