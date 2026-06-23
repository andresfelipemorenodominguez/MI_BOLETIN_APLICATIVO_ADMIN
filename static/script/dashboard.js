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

        // Persistir sección activa para restaurar en F5
        try { localStorage.setItem('miboletin_last_section_admin', sectionId); } catch (_) {}

        const loaders = {
            'agregar-estudiante-section': () => window.app?.tables?.estudiantes?.loadData(),
            'agregar-profesor-section': () => window.app?.tables?.profesores?.loadData(),
            'periodos-section': () => AdminManager.cargarPeriodos(),
            'grupos-section': () => { AdminManager.cargarGrupos(); AdminManager.cargarPeriodosSelect('grupo-periodo'); },
            'materias-section': () => AdminManager.cargarMaterias(),
            'asignaciones-section': () => AdminManager.cargarDatosAsignaciones(),
            'reportes-section': () => AdminManager.cargarReportes(),
            'inicio-section': () => window.app?.stats?.refresh(),
            'administradores-section': () => AdminManager.cargarAdministradores(),
            'colegios-section': () => ColegiosAdmin.cargarColegios(),
            'superadmins-section': () => SuperAdminsAdmin.cargar(),
            'identidad-section': () => IdentidadAdmin.cargar(),
        };
        loaders[sectionId]?.();
    }

    restoreLastSection() {
        try {
            const saved = localStorage.getItem('miboletin_last_section_admin');
            // Solo restaurar si existe la sección en el DOM
            if (saved && document.getElementById(saved)) {
                this.showSection(saved);
                return true;
            }
        } catch (_) {}
        return false;
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
                const map = {
                    'stat-super-colegios': d.colegios,
                    'stat-super-superadmins': d.superadmins,
                    'stat-super-admins': d.admins_colegio,
                    'stat-super-estudiantes': d.estudiantes,
                };
                Object.entries(map).forEach(([id, val]) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = val ?? '–';
                });
            }
        } catch (e) {}
    }
}


class ChatManager {
    constructor() {
        this.chatSection = document.getElementById('chat-section');
        this.contactList = document.getElementById('chat-contact-list');
        this.searchInput = document.getElementById('chat-search');
        this.filterSelect = document.getElementById('chat-filter');
        this.placeholder = document.getElementById('chat-placeholder');
        this.activePanel = document.getElementById('chat-active');
        this.activeName = document.getElementById('chat-active-name');
        this.activeStatus = document.getElementById('chat-active-status');
        this.activeInitials = document.getElementById('chat-active-initials');
        this.messagesContainer = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('chat-msg-input');
        this.sendBtn = document.getElementById('chat-send-btn');
        this.contacts = [];
        this.filteredContacts = [];
        this.activeRoomId = null;
        this.pollInterval = null;
        this.currentFilter = 'all';
    }

    init() {
        if (!this.chatSection) return;

        this.searchInput?.addEventListener('input', Utils.debounce(() => this.filterContacts(), 200));
        this.filterSelect?.addEventListener('change', () => {
            this.currentFilter = this.filterSelect.value || 'all';
            this.filterContacts();
        });
        
        const chatInput = document.getElementById('chat-msg-input');
        const sendBtn = document.getElementById('chat-send-btn');
        const clearBtn = document.getElementById('chat-clear-btn');
        
        if (chatInput && sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearChat());
        }

        // ── Emoji Picker ──────────────────────────────────────────
        this.initEmojiPicker();

        this.loadContacts();
        this.pollInterval = setInterval(() => {
            if (this.activeRoomId) {
                this.loadMessages(this.activeRoomId);
            }
        }, 10000);
    }

    initEmojiPicker() {
        const emojiBtn = document.getElementById('chat-emoji-btn');
        const emojiPicker = document.getElementById('chat-emoji-picker');
        const input = document.getElementById('chat-msg-input');
        if (!emojiBtn || !emojiPicker || !input) return;

        const EMOJIS = [
            // Caras
            '😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','🥳','😏','😒','😞','😢','😭',
            '😤','😡','🤯','😱','😴','🥴','🤒','😷','🤧','🥺','😔','😌','🙄','😬','🤫','🤔',
            // Gestos / manos
            '👍','👎','👏','🙌','🤝','✌️','🤞','🤘','👌','🤌','🙏','💪','🫡','👋','🫶','❤️',
            // Objetos / misc
            '🎉','🎊','🎁','🔥','💥','⚡','✨','💫','🌟','🏆','💡','📌','📎','🔔','📢','💬',
            '🚀','🌈','☀️','🌙','⭐','💯','✅','❌','⚠️','🚨','🛑','📞','💌','📧','🔒','🔓',
            // Comida / naturaleza
            '🍎','🍕','🍔','🍜','☕','🍺','🌸','🌺','🌻','🌹','🐶','🐱','🐧','🦋','🌊','🏔️',
        ];

        // Populate picker
        emojiPicker.innerHTML = EMOJIS.map(e =>
            `<button style="font-size:22px;padding:4px 5px;border:none;background:none;cursor:pointer;border-radius:6px;transition:background 0.15s;line-height:1;" title="${e}" onmouseover="this.style.background='var(--gray-200)'" onmouseout="this.style.background='none'">${e}</button>`
        ).join('');

        // Click on emoji → insert at cursor position in input
        emojiPicker.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const emoji = btn.textContent;
                const start = input.selectionStart;
                const end = input.selectionEnd;
                const val = input.value;
                input.value = val.slice(0, start) + emoji + val.slice(end);
                input.setSelectionRange(start + emoji.length, start + emoji.length);
                input.focus();
            });
        });

        // Toggle picker
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = emojiPicker.style.display === 'none' || emojiPicker.style.display === '';
            emojiPicker.style.display = isHidden ? 'flex' : 'none';
        });

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
                emojiPicker.style.display = 'none';
            }
        });
    }

    async loadContacts() {
        try {
            if (this.contactList && this.contacts.length === 0) {
                this.contactList.innerHTML = `
                    <div style="padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;">
                        <div style="width:56px;height:56px;border-radius:50%;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-circle-notch fa-spin" style="font-size:22px;color:var(--accent);"></i>
                        </div>
                        <p style="margin:0;font-size:13px;color:var(--gray-400);">Cargando chats...</p>
                    </div>`;
            }
            const [contactsRes, roomsRes] = await Promise.all([
                fetch('/chat/contacts'),
                fetch('/chat/rooms')
            ]);
            
            let contactsData = await contactsRes.json().catch(() => null);
            let roomsData = await roomsRes.json().catch(() => null);
            
            const rawContacts = (contactsData && contactsData.status === 'success') ? contactsData.data : [];
            const rawRooms = (roomsData && roomsData.status === 'success') ? roomsData.data : [];
            
            this.contacts = rawContacts.map(c => {
                const room = rawRooms.find(r => r.partner_names && r.partner_names.includes(c.nombre_usuario));
                return {
                    ...c,
                    room_id: room ? room.room_id : null,
                    subtitle: room && room.subtitle ? room.subtitle : 'Haz clic para iniciar chat',
                    unread_count: room ? room.unread_count : 0,
                    latest_time: room ? room.latest_time : null
                };
            });
            
            rawRooms.forEach(r => {
                if (r.partner_names && r.partner_names.length > 1) {
                    this.contacts.push({
                        user_id: 'group_' + r.room_id,
                        rol_usuario: 'grupo',
                        nombre_usuario: r.title,
                        room_id: r.room_id,
                        subtitle: r.subtitle || 'Sin mensajes aún',
                        unread_count: r.unread_count || 0,
                        latest_time: r.latest_time || null
                    });
                }
            });
            
            this.filteredContacts = [...this.contacts];
            this.filterContacts();
            
            if (this.activeRoomId) {
                const activeContact = this.contacts.find(c => c.room_id === this.activeRoomId);
                if (activeContact) {
                    this.showActivePanel(activeContact);
                }
            } else if (this.contacts.length && this.contacts.some(c => c.room_id)) {
                const firstWithRoom = this.contacts.find(c => c.room_id);
                if (firstWithRoom) this.startChat(firstWithRoom);
            }
        } catch (e) {
            console.error('Error cargando contactos y salas', e);
            if (this.contactList) this.contactList.innerHTML = '<div class="chat-empty">Error cargando chats.</div>';
        }
    }

    filterContacts() {
        const term = this.searchInput?.value?.trim().toLowerCase() || '';
        this.filteredContacts = this.contacts.filter(c => {
            const matchesSearch = !term || c.nombre_usuario.toLowerCase().includes(term);
            let matchesFilter = true;
            if (this.currentFilter === 'docente') {
                matchesFilter = c.rol_usuario === 'docente';
            } else if (this.currentFilter === 'admin' || this.currentFilter === 'administradores') {
                matchesFilter = c.rol_usuario === 'admin';
            }
            return matchesSearch && matchesFilter;
        });
        
        this.filteredContacts.sort((a, b) => {
            if (a.latest_time && b.latest_time) {
                return new Date(b.latest_time) - new Date(a.latest_time);
            }
            if (a.latest_time) return -1;
            if (b.latest_time) return 1;
            return a.nombre_usuario.localeCompare(b.nombre_usuario);
        });
        
        this.renderContacts();
    }

    // Genera un color consistente (0-7) a partir del nombre
    _avatarColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return Math.abs(hash) % 8;
    }

    // Extrae las dos iniciales de un nombre
    _initials(name) {
        const parts = (name || '').trim().split(/\s+/);
        return parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : (parts[0]?.[0] || '?').toUpperCase();
    }

    renderContacts() {
        if (!this.contactList) return;
        if (!this.filteredContacts.length) {
            this.contactList.innerHTML = '<div class="chat-empty">No hay contactos que coincidan.</div>';
            return;
        }

        this.contactList.innerHTML = this.filteredContacts.map(contact => {
            const activeClass = contact.room_id && contact.room_id === this.activeRoomId ? 'active' : '';
            const hasUnread   = contact.unread_count > 0;
            const unreadClass = hasUnread ? 'has-unread' : '';
            const badge = hasUnread
                ? `<span class="chat-badge">${contact.unread_count}</span>` : '';
            const roleBadge = contact.rol_usuario === 'admin' ? '(Admin)'
                : contact.rol_usuario === 'docente' ? '(Docente)' : '';
            const initials = this._initials(contact.nombre_usuario);
            const color = this._avatarColor(contact.nombre_usuario);
            return `
                <button class="chat-contact-item ${activeClass} ${unreadClass}" data-user-id="${contact.user_id}">
                    <div class="chat-contact-avatar" data-color="${color}">${initials}</div>
                    <div class="chat-contact-info">
                        <strong>${contact.nombre_usuario}${roleBadge ? ` <small style="color:var(--gray-400);font-weight:400;">${roleBadge}</small>` : ''}</strong>
                        <span>${contact.subtitle}</span>
                    </div>
                    <div class="chat-contact-meta">${badge}</div>
                </button>
            `;
        }).join('');

        this.contactList.querySelectorAll('.chat-contact-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.dataset.userId;
                const contact = this.contacts.find(c => String(c.user_id) === String(userId));
                if (contact) this.startChat(contact);
            });
        });
    }

    async startChat(contact) {
        try {
            // Feedback UI inmediato
            this.showActivePanel(contact);
            if (this.messagesContainer) {
                this.messagesContainer.innerHTML = `
                    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px 20px;text-align:center;">
                        <div style="width:64px;height:64px;border-radius:50%;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-circle-notch fa-spin" style="font-size:24px;color:var(--accent);"></i>
                        </div>
                        <p style="margin:0;font-size:13px;color:var(--gray-400);">Cargando mensajes...</p>
                    </div>`;
            }

            // Resaltar el contacto seleccionado inmediatamente
            this.activeRoomId = contact.room_id || 'loading'; 
            this.filterContacts(); // Re-renderiza para ponerle la clase 'active'

            let roomId = contact.room_id;

            // Si no hay sala creada, hacemos el POST para iniciarla
            if (!roomId) {
                const res = await fetch('/chat/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        target_user_id: contact.user_id,
                        target_rol: contact.rol_usuario,
                        target_nombre: contact.nombre_usuario
                    })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    roomId = data.data.room_id;
                    contact.room_id = roomId;
                } else {
                    Utils.showToast(data.message || 'Error iniciando chat', 'error');
                    if (this.messagesContainer) this.messagesContainer.innerHTML = '<div class="chat-empty">Error al iniciar chat.</div>';
                    return;
                }
            }

            // Ya tenemos la sala, cargamos los mensajes
            this.activeRoomId = roomId;
            this.filterContacts(); // Actualizar clase 'active' con el ID real
            await this.loadMessages(roomId);

        } catch (e) {
            console.error('Error iniciando chat', e);
            Utils.showToast('Error de red al iniciar chat', 'error');
            if (this.messagesContainer) this.messagesContainer.innerHTML = '<div class="chat-empty">Error de conexión.</div>';
        }
    }

    showActivePanel(contact) {
        if (this.placeholder) this.placeholder.style.display = 'none';
        if (this.activePanel) this.activePanel.style.display = 'flex';
        if (this.activeName) this.activeName.textContent = contact.nombre_usuario;

        // Dot + texto de estado
        const statusEl = document.getElementById('chat-active-status');
        const dotEl    = document.getElementById('chat-status-dot');
        if (statusEl && dotEl) {
            if (contact.rol_usuario === 'grupo') {
                statusEl.textContent = 'Grupo';
                dotEl.className = 'chat-status-dot';
            } else if (contact.is_online) {
                statusEl.textContent = 'En línea';
                statusEl.style.color = '#22c55e';
                dotEl.className = 'chat-status-dot online';
            } else {
                statusEl.textContent = 'Desconectado';
                statusEl.style.color = '#f87171';
                dotEl.className = 'chat-status-dot offline';
            }
        }

        if (this.activeInitials) {
            const initials = this._initials(contact.nombre_usuario);
            const color    = this._avatarColor(contact.nombre_usuario);
            this.activeInitials.textContent = initials;
            const avatarEl = document.getElementById('chat-active-avatar');
            if (avatarEl) avatarEl.dataset.color = color;
        }

        // Menú 3 puntos — toggle
        const menuBtn  = document.getElementById('chat-menu-btn');
        const menuDrop = document.getElementById('chat-menu-dropdown');
        if (menuBtn && menuDrop && !menuBtn._bound) {
            menuBtn._bound = true;
            menuBtn.addEventListener('click', e => {
                e.stopPropagation();
                menuDrop.classList.toggle('open');
            });
            document.addEventListener('click', () => menuDrop.classList.remove('open'));
        }
    }

    async loadMessages(roomId) {
        if (!roomId || roomId === 'loading') return;
        try {
            const res = await fetch(`/chat/rooms/${encodeURIComponent(roomId)}/messages`);
            const data = await res.json();
            if (data.status === 'success') {
                this.renderMessages(data.data || []);
            }
        } catch (e) {
            console.error('Error cargando mensajes de chat', e);
            if (this.messagesContainer) this.messagesContainer.innerHTML = '<div class="chat-empty">Error cargando mensajes.</div>';
        }
    }

    renderMessages(messages) {
        if (!this.messagesContainer) return;
        if (!messages.length) {
            this.messagesContainer.innerHTML = `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px 20px;text-align:center;">
                    <div style="width:72px;height:72px;border-radius:50%;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;">
                        <i class="far fa-paper-plane" style="font-size:28px;color:var(--accent);"></i>
                    </div>
                    <p style="margin:0;font-size:15px;font-weight:600;color:var(--gray-600);">Sin mensajes aún</p>
                    <p style="margin:0;font-size:13px;color:var(--gray-400);max-width:220px;line-height:1.5;">Sé el primero en escribir algo</p>
                </div>
            `;
            return;
        }

        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;

        this.messagesContainer.innerHTML = messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const msgTime = new Date(message.created_at).getTime();
            const canEditOrDelete = message.is_mine && isLastMessage && (now - msgTime <= tenMinutes);

            let optionsMenu = '';
            if (canEditOrDelete) {
                optionsMenu = `
                    <div class="msg-options-wrapper" style="position: relative; display: inline-block; margin-left: 8px;">
                        <button class="msg-options-btn" style="background:none; border:none; color:var(--gray-400); cursor:pointer; padding:2px; font-size:14px;" title="Opciones">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="msg-options-dropdown" style="display:none; position:absolute; right:0; top:100%; background:var(--gray-50); border:1px solid var(--gray-200); border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:10000 !important; min-width:110px; padding:4px 0; overflow:hidden;">
                            <button class="edit-msg-btn" data-msg-id="${message.message_id}" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; cursor:pointer; color:var(--gray-800); font-size:13px;" onmouseover="this.style.background='var(--gray-200)'" onmouseout="this.style.background='none'">
                                <i class="fas fa-edit" style="margin-right:6px; width:14px; text-align:center;"></i> Editar
                            </button>
                            <button class="delete-msg-btn" data-msg-id="${message.message_id}" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; cursor:pointer; color:var(--error); font-size:13px;" onmouseover="this.style.background='var(--gray-200)'" onmouseout="this.style.background='none'">
                                <i class="fas fa-trash" style="margin-right:6px; width:14px; text-align:center;"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
            }

            const isMine = message.is_mine;
            const senderName = message.sender_name || '';
            const initials = this._initials(senderName || (isMine ? 'Yo' : '?'));
            const color = this._avatarColor(senderName || 'default');

            // Mostrar avatar solo en el último mensaje consecutivo del mismo remitente
            const nextMsg = messages[index + 1];
            const isLastInGroup = !nextMsg || nextMsg.is_mine !== isMine;

            const avatarHtml = (!isMine && isLastInGroup)
                ? `<div class="chat-msg-avatar" data-color="${color}" title="${senderName}">${initials}</div>`
                : (!isMine ? `<div style="width:28px;min-width:28px;"></div>` : '');

            // Mostrar nombre solo en el primer mensaje del grupo
            const prevMsg = messages[index - 1];
            const isFirstInGroup = !prevMsg || prevMsg.is_mine !== isMine;
            const senderLabel = (!isMine && isFirstInGroup && senderName)
                ? `<div class="chat-bubble-sender">${senderName}</div>` : '';

            return `
                <div class="chat-bubble-row ${isMine ? 'mine' : 'other'}" style="align-self:${isMine ? 'flex-end' : 'flex-start'}; max-width: 72%;">
                    ${avatarHtml}
                    <div class="chat-bubble ${isMine ? 'mine' : 'other'}" style="max-width:100%;">
                        ${senderLabel}
                        <div class="chat-bubble-content" style="display: flex; align-items: center; gap: 4px;">
                            <span class="msg-text" data-msg-id="${message.message_id}" style="word-break: break-word;">${message.content}</span>
                            ${optionsMenu}
                        </div>
                        <div class="chat-bubble-meta">${this.formatDate(message.created_at)}</div>
                    </div>
                </div>
            `;
        }).join('');

        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        
        // Manejar el toggle del menú
        this.messagesContainer.querySelectorAll('.msg-options-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Cerrar todos los demás
                this.messagesContainer.querySelectorAll('.msg-options-dropdown').forEach(dropdown => {
                    dropdown.style.display = 'none';
                });
                // Abrir este
                const dropdown = btn.nextElementSibling;
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', () => {
            this.messagesContainer.querySelectorAll('.msg-options-dropdown').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        });

        // Eliminar mensaje
        this.messagesContainer.querySelectorAll('.delete-msg-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!await Utils.confirmDialog('Eliminar mensaje', '¿Seguro que deseas eliminar este mensaje?')) return;
                try {
                    const res = await fetch(`/chat/messages/${btn.dataset.msgId}`, { method: 'DELETE' });
                    const data = await res.json();
                    if (data.status === 'success') {
                        this.loadMessages(this.activeRoomId);
                    } else {
                        Utils.showToast(data.message, 'error');
                    }
                } catch (err) {
                    Utils.showToast('Error al eliminar', 'error');
                }
            });
        });

        // Editar mensaje
        this.messagesContainer.querySelectorAll('.edit-msg-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                btn.closest('.msg-options-dropdown').style.display = 'none';
                const msgId = btn.dataset.msgId;
                const msgEl = this.messagesContainer.querySelector(`.msg-text[data-msg-id="${msgId}"]`);
                if (!msgEl) return;
                
                const currentText = msgEl.textContent;
                const newText = await Utils.promptDialog('Editar mensaje', currentText);
                
                if (newText && newText.trim() !== '' && newText !== currentText) {
                    try {
                        const res = await fetch(`/chat/messages/${msgId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: newText })
                        });
                        const data = await res.json();
                        if (data.status === 'success') {
                            this.loadMessages(this.activeRoomId);
                        } else {
                            Utils.showToast(data.message, 'error');
                        }
                    } catch (err) {
                        Utils.showToast('Error al editar', 'error');
                    }
                }
            });
        });
    }

    formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    async sendMessage() {
        const content = this.messageInput?.value.trim();
        if (!content || !this.activeRoomId) return;

        // Guard against double-sends
        if (this.isSending) return;
        this.isSending = true;

        const sendBtn = document.getElementById('chat-send-btn');
        const originalHTML = sendBtn ? sendBtn.innerHTML : null;

        // Disable button + show spinner while request is in-flight
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
            sendBtn.style.opacity = '0.7';
            sendBtn.title = 'Enviando...';
        }

        // Show "Enviando..." hint below the input
        let hint = document.getElementById('chat-sending-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'chat-sending-hint';
            hint.style.cssText = 'font-size:12px;color:var(--gray-500);padding:4px 0 0 4px;display:flex;align-items:center;gap:6px;';
            hint.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="font-size:11px;"></i> Enviando mensaje...';
            sendBtn?.parentElement?.appendChild(hint);
        }
        hint.style.display = 'flex';

        try {
            const res = await fetch(`/chat/rooms/${encodeURIComponent(this.activeRoomId)}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                this.messageInput.value = '';
                await this.loadMessages(this.activeRoomId);
                this.loadContacts();
            } else {
                Utils.showToast(data.message || 'Error enviando mensaje', 'error');
            }
        } catch (e) {
            Utils.showToast('Error enviando mensaje', 'error');
        } finally {
            // Always restore button & hide hint
            this.isSending = false;
            if (sendBtn && originalHTML) {
                sendBtn.innerHTML = originalHTML;
                sendBtn.disabled = false;
                sendBtn.style.opacity = '';
                sendBtn.title = 'Enviar';
            }
            if (hint) hint.style.display = 'none';
        }
    }

    async clearChat() {
        if (!this.activeRoomId || this.activeRoomId === 'loading') return;
        // Cerrar el menú
        document.getElementById('chat-menu-dropdown')?.classList.remove('open');
        if (!await Utils.confirmDialog('Vaciar chat', '¿Seguro que deseas vaciar este chat? Los mensajes se eliminarán solo para ti.', 'fas fa-trash-alt')) return;
        try {
            const res = await fetch(`/chat/rooms/${this.activeRoomId}/clear`, { method: 'DELETE' });
            const data = await res.json();
            if (data.status === 'success') {
                Utils.showToast('Chat vaciado', 'success');
                // Recargar mensajes Y contactos (para limpiar el subtitle)
                await this.loadMessages(this.activeRoomId);
                this.loadContacts();
            } else {
                Utils.showToast(data.message || 'Error al vaciar chat', 'error');
            }
        } catch (e) {
            Utils.showToast('Error de red al vaciar chat', 'error');
        }
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
        document.querySelectorAll('.toggle-password-btn[data-target="prof-contrasena"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('prof-contrasena');
                if (!input) return;
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                btn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        });
        const asigContainer = document.getElementById('prof-asignaturas');
        const counter = document.getElementById('asignaturas-count');
        asigContainer?.addEventListener('change', (e) => {
            if (e.target.type !== 'checkbox') return;
            const count = asigContainer.querySelectorAll('input[type="checkbox"]:checked').length;
            if (counter) counter.textContent = `${count} seleccionada${count !== 1 ? 's' : ''}`;
        });
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
                container.innerHTML = '<p class="asignaturas-empty">No hay materias registradas</p>';
                return;
            }
            container.innerHTML = materias.map(m =>
                `<label class="check-asig">
                    <input type="checkbox" value="${m.nombre}" name="asignatura">
                    <span>${m.nombre}</span>
                </label>`
            ).join('');
        } catch(e) {
            console.error('Error cargando materias:', e);
        }
    }
    async handleSubmit(e) {
        e.preventDefault();
        const asignaturas = [...document.querySelectorAll('#prof-asignaturas input[type="checkbox"]:checked')]
            .map(cb => cb.value);
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
        document.querySelectorAll('#prof-asignaturas input[type="checkbox"]').forEach(cb => { cb.checked = false; });
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
            const esLider = data.meta?.es_lider;
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
window.crearPeriodo = () => AdminManager.crearPeriodo();
window.crearGrupo = () => AdminManager.crearGrupo();
window.crearMateria = () => AdminManager.crearMateria();
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
        document.querySelectorAll('.toggle-password-btn[data-target="edit-est-nueva-pass"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('edit-est-nueva-pass');
                if (!input) return;
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                const icon = btn.querySelector('i');
                if (icon) icon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        });
    },

    async open(data) {
        this.currentCodigo = data.id;
        try {
            const res = await fetch(`/obtener-estudiante/${encodeURIComponent(data.id)}`);
            const json = await res.json();
            if (json.status === 'success') data = json.data;
        } catch (_) { /* usar datos de la tabla */ }

        document.getElementById('edit-est-codigo').value      = data.id       || '';
        document.getElementById('edit-est-nombre').value      = data.nombre_completo || data.nombre   || '';
        document.getElementById('edit-est-correo').value      = data.email || data.correo_electronico    || '';
        document.getElementById('edit-est-grado').value       = data.grado    || '';
        document.getElementById('edit-est-grupo').value       = data.grupo    || '';
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

        const payload = {
            id:                  document.getElementById('edit-est-codigo').value,
            nombre_completo:     document.getElementById('edit-est-nombre').value,
            tipo_documento:      document.getElementById('edit-est-tipo-doc').value,
            numero_documento:    document.getElementById('edit-est-num-doc').value,
            correo_electronico:  document.getElementById('edit-est-correo').value,
            grado:               document.getElementById('edit-est-grado').value,
            grupo:               document.getElementById('edit-est-grupo').value,
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
        document.querySelectorAll('.toggle-password-btn[data-target="edit-prof-nueva-pass"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('edit-prof-nueva-pass');
                if (!input) return;
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                const icon = btn.querySelector('i');
                if (icon) icon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        });

        // Renderizar checkboxes de asignaturas
        const container = document.getElementById('edit-prof-asignaturas');
        if (container) {
            container.innerHTML = ASIGNATURAS_DISPONIBLES.map(a =>
                `<label class="check-asig">
                    <input type="checkbox" value="${a}" name="asignatura">
                    <span>${a}</span>
                </label>`
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
                window.PanelBranding.apply(b);
                if (b.color_primario) {
                    document.documentElement.style.setProperty('--brand-primary', b.color_primario);
                    document.documentElement.style.setProperty('--primary', b.color_primario);
                }
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
                    ? supers.map(a => `<tr><td>${a.id_admin}</td><td>${a.nombre_completo}</td><td>${a.correo_electronico}</td><td>${a.email_verified ? 'Sí' : 'No'}</td></tr>`).join('')
                    : '<tr><td colspan="4" style="text-align:center;">No hay super administradores</td></tr>';
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
            if (tbodySa) tbodySa.innerHTML = '<tr><td colspan="4">Error al cargar</td></tr>';
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
    document.querySelectorAll('.superadmin-only').forEach(el => {
        el.style.display = isSuper ? '' : 'none';
    });
    document.querySelectorAll('.admin-colegio-only').forEach(el => {
        if (el.classList.contains('nav-item') || el.classList.contains('nav-section-label')) {
            el.style.display = isSuper ? 'none' : '';
        }
    });
    if (isSuper) {
        document.querySelectorAll('.content-section.admin-colegio-only').forEach(s => s.classList.remove('active'));
        document.querySelectorAll(
            '#inicio-section .overview-section:not(.superadmin-only), ' +
            '#inicio-section .quick-actions-section:not(.superadmin-only)'
        ).forEach(el => { el.style.display = 'none'; });
        document.querySelectorAll('#inicio-section .superadmin-only').forEach(el => { el.style.display = ''; });
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