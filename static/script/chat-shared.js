/**
 * ChatManager compartido: usado por Admin, Profesor y Estudiante.
 * Dependencias: Font Awesome (para iconos), las clases CSS de chat en main.css.
 */
class ChatManager {
  constructor() {
    this.contacts = [];
    this.filteredContacts = [];
    this.activeRoomId = null;
    this.pollInterval = null;
    this.currentFilter = 'all';
    this._elements = {};
    this._initialized = false;
  }

  /** Vuelve a leer todos los elementos del DOM (útil tras renderizar el HTML del chat). */
  refreshElements() {
    const ids = [
      'chat-section', 'chat-contact-list', 'chat-search', 'chat-filter',
      'chat-placeholder', 'chat-active', 'chat-active-name', 'chat-active-status',
      'chat-status-dot', 'chat-active-initials', 'chat-active-avatar',
      'chat-messages', 'chat-msg-input', 'chat-send-btn', 'chat-menu-btn',
      'chat-menu-dropdown', 'chat-clear-btn', 'chat-emoji-btn', 'chat-emoji-picker',
    ];
    ids.forEach(id => { this._elements[id] = document.getElementById(id); });
    return this;
  }

  _el(id) { return this._elements[id] || document.getElementById(id); }

  init() {
    if (this._initialized) return;
    this.refreshElements();
    const section = this._el('chat-section');
    if (!section) return;

    section.classList.add('chat-mobile-sidebar');
    const backBtn = document.getElementById('chat-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        section.classList.remove('chat-mobile-conversation');
        section.classList.add('chat-mobile-sidebar');
      });
    }

    this._el('chat-search')?.addEventListener('input', this._debounce(() => this.filterContacts(), 200));
    this._el('chat-filter')?.addEventListener('change', () => {
      this.currentFilter = this._el('chat-filter')?.value || 'all';
      this.filterContacts();
    });

    const input = this._el('chat-msg-input');
    const sendBtn = this._el('chat-send-btn');
    const clearBtn = this._el('chat-clear-btn');

    if (input && sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keypress', e => {
        if (e.key === 'Enter') { e.preventDefault(); this.sendMessage(); }
      });
    }
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearChat());

    this._initEmojiPicker();
    this._initFileUpload();
    this.loadContacts();

    this.pollInterval = setInterval(() => {
      if (this.activeRoomId) this.loadMessages(this.activeRoomId);
    }, 10000);

    this._initialized = true;
  }

  destroy() {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
    this._initialized = false;
  }

  /* ─── utilidades internas ─── */
  _debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  _notify(msg, ok) {
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast(msg, ok ? 'success' : 'error');
    } else {
      alert(msg);
    }
  }

  async _confirm(title, msg) {
    if (typeof Utils !== 'undefined' && Utils.confirmDialog) {
      return Utils.confirmDialog(title, msg);
    }
    return confirm(`${title}: ${msg}`);
  }

  async _prompt(title, value) {
    if (typeof Utils !== 'undefined' && Utils.promptDialog) {
      return Utils.promptDialog(title, value);
    }
    return prompt(title, value);
  }

  _avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % 8;
  }

  _initials(name) {
    const parts = (name || '').trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (parts[0]?.[0] || '?').toUpperCase();
  }

  _roleLabel(rol) {
    const map = { admin: 'Admin', profesor: 'Profesor', docente: 'Profesor', estudiante: 'Estudiante', grupo: 'Grupo' };
    return map[rol] || rol || '';
  }

  /* ─── Emoji picker ─── */
  _initEmojiPicker() {
    const btn = this._el('chat-emoji-btn');
    const picker = this._el('chat-emoji-picker');
    const input = this._el('chat-msg-input');
    if (!btn || !picker || !input) return;

    const EMOJIS = [
      '😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','🥳','😏','😒','😞','😢','😭',
      '😤','😡','🤯','😱','😴','🥴','🤒','😷','🤧','🥺','😔','😌','🙄','😬','🤫','🤔',
      '👍','👎','👏','🙌','🤝','✌️','🤞','🤘','👌','🤌','🙏','💪','🫡','👋','🫶','❤️',
      '🎉','🎊','🎁','🔥','💥','⚡','✨','💫','🌟','🏆','💡','📌','📎','🔔','📢','💬',
      '🚀','🌈','☀️','🌙','⭐','💯','✅','❌','⚠️','🚨','🛑','📞','💌','📧','🔒','🔓',
      '🍎','🍕','🍔','🍜','☕','🍺','🌸','🌺','🌻','🌹','🐶','🐱','🐧','🦋','🌊','🏔️',
    ];

    picker.innerHTML = EMOJIS.map(e =>
      `<button style="font-size:22px;padding:4px 5px;border:none;background:none;cursor:pointer;border-radius:6px;transition:background 0.15s;line-height:1;" title="${e}">${e}</button>`
    ).join('');

    picker.querySelectorAll('button').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const emoji = el.textContent;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const val = input.value;
        input.value = val.slice(0, start) + emoji + val.slice(end);
        input.setSelectionRange(start + emoji.length, start + emoji.length);
        input.focus();
      });
    });

    btn.addEventListener('click', e => {
      e.stopPropagation();
      picker.style.display = (picker.style.display === 'none' || picker.style.display === '') ? 'flex' : 'none';
    });

    document.addEventListener('click', e => {
      if (!picker.contains(e.target) && e.target !== btn) picker.style.display = 'none';
    });
  }

  /* ─── File upload ─── */
  _initFileUpload() {
    const btn = document.getElementById('chat-file-btn');
    const input = document.getElementById('chat-file-input');
    if (!btn || !input) return;
    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      this._uploadFile(file);
      input.value = '';
    });
  }

  async _uploadFile(file) {
    if (!this.activeRoomId) { this._notify('Selecciona un chat primero', false); return; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('room_id', this.activeRoomId);
    try {
      const res = await fetch('/chat/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.status === 'success') {
        await this.loadMessages(this.activeRoomId);
        this.loadContacts();
      } else {
        this._notify(data.message || 'Error al subir archivo', false);
      }
    } catch (e) {
      this._notify('Error de conexión al subir archivo', false);
    }
  }

  /* ─── Contacts ─── */
  async loadContacts() {
    try {
      const cl = this._el('chat-contact-list');
      if (cl && this.contacts.length === 0) {
        cl.innerHTML = `<div style="padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-circle-notch fa-spin" style="font-size:22px;color:var(--accent);"></i>
          </div>
          <p style="margin:0;font-size:13px;color:var(--gray-400);">Cargando chats...</p>
        </div>`;
      }
      const [contactsRes, roomsRes] = await Promise.all([
        fetch('/chat/contacts'), fetch('/chat/rooms')
      ]);
      const contactsData = await contactsRes.json().catch(() => null);
      const roomsData = await roomsRes.json().catch(() => null);

      const rawContacts = (contactsData?.status === 'success') ? contactsData.data : [];
      const rawRooms = (roomsData?.status === 'success') ? roomsData.data : [];

      this.contacts = rawContacts.map(c => {
        const room = rawRooms.find(r => r.partner_names && r.partner_names.includes(c.nombre_usuario));
        return {
          ...c,
          room_id: room ? room.room_id : null,
          subtitle: room?.subtitle || 'Haz clic para iniciar chat',
          unread_count: room ? room.unread_count : 0,
          latest_time: room ? room.latest_time : null,
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
            latest_time: r.latest_time || null,
          });
        }
      });

      this.filteredContacts = [...this.contacts];
      this.filterContacts();

      if (this.activeRoomId) {
        const active = this.contacts.find(c => c.room_id === this.activeRoomId);
        if (active) this.showActivePanel(active);
      } else if (this.contacts.some(c => c.room_id)) {
        const first = this.contacts.find(c => c.room_id);
        if (first) this.startChat(first);
      }
    } catch (e) {
      console.error('Error cargando contactos', e);
      const cl = this._el('chat-contact-list');
      if (cl) cl.innerHTML = '<div class="chat-empty">Error cargando chats.</div>';
    }
  }

  filterContacts() {
    const term = this._el('chat-search')?.value?.trim().toLowerCase() || '';
    this.filteredContacts = this.contacts.filter(c => {
      const matchSearch = !term || c.nombre_usuario.toLowerCase().includes(term);
      let matchFilter = true;
      if (this.currentFilter === 'profesor' || this.currentFilter === 'docente') {
        matchFilter = c.rol_usuario === 'profesor' || c.rol_usuario === 'docente';
      } else if (this.currentFilter === 'admin') {
        matchFilter = c.rol_usuario === 'admin';
      } else if (this.currentFilter === 'estudiante') {
        matchFilter = c.rol_usuario === 'estudiante';
      }
      return matchSearch && matchFilter;
    });

    this.filteredContacts.sort((a, b) => {
      if (a.latest_time && b.latest_time) return new Date(b.latest_time) - new Date(a.latest_time);
      if (a.latest_time) return -1;
      if (b.latest_time) return 1;
      return a.nombre_usuario.localeCompare(b.nombre_usuario);
    });
    this.renderContacts();
  }

  renderContacts() {
    const cl = this._el('chat-contact-list');
    if (!cl) return;
    if (!this.filteredContacts.length) {
      cl.innerHTML = '<div class="chat-empty">No hay contactos que coincidan.</div>';
      return;
    }

    cl.innerHTML = this.filteredContacts.map(contact => {
      const activeClass = contact.room_id === this.activeRoomId ? 'active' : '';
      const hasUnread = contact.unread_count > 0;
      const badge = hasUnread ? `<span class="chat-badge">${contact.unread_count}</span>` : '';
      const roleLabel = this._roleLabel(contact.rol_usuario);
      const initials = this._initials(contact.nombre_usuario);
      const color = this._avatarColor(contact.nombre_usuario);
      return `
        <button class="chat-contact-item ${activeClass} ${hasUnread ? 'has-unread' : ''}" data-user-id="${contact.user_id}">
          <div class="chat-contact-avatar" data-color="${color}">${initials}</div>
          <div class="chat-contact-info">
            <strong>${contact.nombre_usuario} <small style="color:var(--gray-400);font-weight:400;">(${roleLabel})</small></strong>
            <span>${contact.subtitle}</span>
          </div>
          <div class="chat-contact-meta">${badge}</div>
        </button>
      `;
    }).join('');

    cl.querySelectorAll('.chat-contact-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.dataset.userId;
        const contact = this.contacts.find(c => String(c.user_id) === String(userId));
        if (contact) this.startChat(contact);
      });
    });
  }

  /* ─── Chat active panel ─── */
  showActivePanel(contact) {
    const ph = this._el('chat-placeholder');
    const ap = this._el('chat-active');
    if (ph) ph.style.display = 'none';
    if (ap) ap.style.display = 'flex';
    const nameEl = this._el('chat-active-name');
    if (nameEl) nameEl.textContent = contact.nombre_usuario;

    const statusEl = this._el('chat-active-status');
    const dotEl = this._el('chat-status-dot');
    if (statusEl && dotEl) {
      if (contact.rol_usuario === 'grupo') {
        statusEl.textContent = 'Grupo'; dotEl.className = 'chat-status-dot';
      } else if (contact.is_online) {
        statusEl.textContent = 'En línea'; statusEl.style.color = '#22c55e';
        dotEl.className = 'chat-status-dot online';
      } else {
        statusEl.textContent = 'Desconectado'; statusEl.style.color = '#f87171';
        dotEl.className = 'chat-status-dot offline';
      }
    }

    const iniEl = this._el('chat-active-initials');
    const avEl = this._el('chat-active-avatar');
    if (iniEl) {
      iniEl.textContent = this._initials(contact.nombre_usuario);
      if (avEl) avEl.dataset.color = this._avatarColor(contact.nombre_usuario);
    }

    const menuBtn = this._el('chat-menu-btn');
    const menuDrop = this._el('chat-menu-dropdown');
    if (menuBtn && menuDrop && !menuBtn._bound) {
      menuBtn._bound = true;
      menuBtn.addEventListener('click', e => { e.stopPropagation(); menuDrop.classList.toggle('open'); });
      document.addEventListener('click', () => menuDrop.classList.remove('open'));
    }
  }

  /* ─── Start chat ─── */
  async startChat(contact) {
    try {
      this.showActivePanel(contact);
      const chatApp = this._el('chat-section');
      if (chatApp) {
        chatApp.classList.remove('chat-mobile-sidebar');
        chatApp.classList.add('chat-mobile-conversation');
      }
      const mc = this._el('chat-messages');
      if (mc) {
        mc.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px 20px;text-align:center;">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-circle-notch fa-spin" style="font-size:24px;color:var(--accent);"></i>
          </div>
          <p style="margin:0;font-size:13px;color:var(--gray-400);">Cargando mensajes...</p>
        </div>`;
      }

      this.activeRoomId = contact.room_id || 'loading';
      this.filterContacts();

      let roomId = contact.room_id;
      if (!roomId) {
        const res = await fetch('/chat/start', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_user_id: contact.user_id, target_rol: contact.rol_usuario, target_nombre: contact.nombre_usuario })
        });
        const data = await res.json();
        if (data.status === 'success') {
          roomId = data.data.room_id;
          contact.room_id = roomId;
        } else {
          this._notify(data.message || 'Error iniciando chat', false);
          if (mc) mc.innerHTML = '<div class="chat-empty">Error al iniciar chat.</div>';
          return;
        }
      }

      this.activeRoomId = roomId;
      this.filterContacts();
      await this.loadMessages(roomId);
    } catch (e) {
      console.error('Error iniciando chat', e);
      this._notify('Error de red al iniciar chat', false);
      const mc = this._el('chat-messages');
      if (mc) mc.innerHTML = '<div class="chat-empty">Error de conexión.</div>';
    }
  }

  /* ─── Messages ─── */
  async loadMessages(roomId) {
    if (!roomId || roomId === 'loading') return;
    try {
      const res = await fetch(`/chat/rooms/${encodeURIComponent(roomId)}/messages`);
      const data = await res.json();
      if (data.status === 'success') this.renderMessages(data.data || []);
    } catch (e) {
      console.error('Error cargando mensajes', e);
      const mc = this._el('chat-messages');
      if (mc) mc.innerHTML = '<div class="chat-empty">Error cargando mensajes.</div>';
    }
  }

  renderMessages(messages) {
    const mc = this._el('chat-messages');
    if (!mc) return;

    if (!messages.length) {
      mc.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px 20px;text-align:center;">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;">
          <i class="far fa-paper-plane" style="font-size:28px;color:var(--accent);"></i>
        </div>
        <p style="margin:0;font-size:15px;font-weight:600;color:var(--gray-600);">Sin mensajes aún</p>
        <p style="margin:0;font-size:13px;color:var(--gray-400);max-width:220px;line-height:1.5;">Sé el primero en escribir algo</p>
      </div>`;
      return;
    }

    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    mc.innerHTML = messages.map((msg, i) => {
      const isLast = i === messages.length - 1;
      const msgTime = new Date(msg.created_at).getTime();
      const canEdit = msg.is_mine && isLast && (now - msgTime <= tenMinutes);

      let opts = '';
      if (canEdit) {
        opts = `<div class="msg-options-wrapper" style="position:relative;display:inline-block;margin-left:8px;">
          <button class="msg-options-btn" style="background:none;border:none;color:var(--gray-400);cursor:pointer;padding:2px;font-size:14px;" title="Opciones"><i class="fas fa-ellipsis-v"></i></button>
          <div class="msg-options-dropdown" style="display:none;position:absolute;right:0;top:100%;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;min-width:110px;padding:4px 0;">
            <button class="edit-msg-btn" data-msg-id="${msg.message_id}" style="display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:none;cursor:pointer;color:var(--gray-800);font-size:13px;"><i class="fas fa-edit" style="margin-right:6px;width:14px;text-align:center;"></i> Editar</button>
            <button class="delete-msg-btn" data-msg-id="${msg.message_id}" style="display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:none;cursor:pointer;color:var(--error);font-size:13px;"><i class="fas fa-trash" style="margin-right:6px;width:14px;text-align:center;"></i> Eliminar</button>
          </div>
        </div>`;
      }

      const isMine = msg.is_mine;
      const senderName = msg.sender_nombre || '';
      const senderRol = msg.sender_rol || '';
      const roleLabel = this._roleLabel(senderRol);
      const initials = this._initials(senderName || (isMine ? 'Yo' : '?'));
      const color = this._avatarColor(senderName || 'default');

      const nextMsg = messages[i + 1];
      const lastInGroup = !nextMsg || nextMsg.is_mine !== isMine;

      const avatarHtml = (!isMine && lastInGroup)
        ? `<div class="chat-msg-avatar" data-color="${color}" title="${senderName}">${initials}</div>`
        : (!isMine ? `<div style="width:28px;min-width:28px;"></div>` : '');

      const prevMsg = messages[i - 1];
      const firstInGroup = !prevMsg || prevMsg.is_mine !== isMine;
      const senderLabel = (!isMine && firstInGroup && senderName)
        ? `<div class="chat-bubble-sender"><span class="chat-role-tag chat-role-${senderRol}">${roleLabel}</span> ${senderName}</div>`
        : '';

      // Render content: detect if it's a file message (stored as "FILE:name:path" in contenido)
      const contentHtml = msg.content && msg.content.startsWith('FILE:')
        ? this._renderFileContent(msg.content)
        : `<span class="msg-text" data-msg-id="${msg.message_id}" style="word-break:break-word;">${this._linkify(msg.content)}</span>`;

      return `<div class="chat-bubble-row ${isMine ? 'mine' : 'other'}" style="align-self:${isMine ? 'flex-end' : 'flex-start'};max-width:72%;">
        ${avatarHtml}
        <div class="chat-bubble ${isMine ? 'mine' : 'other'}" style="max-width:100%;">
          ${senderLabel}
          <div class="chat-bubble-content" style="display:flex;align-items:center;gap:4px;">
            ${contentHtml}
            ${opts}
          </div>
          <div class="chat-bubble-meta">${this._formatDate(msg.created_at)}</div>
        </div>
      </div>`;
    }).join('');

    mc.scrollTop = mc.scrollHeight;

    // Options toggle
    mc.querySelectorAll('.msg-options-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        mc.querySelectorAll('.msg-options-dropdown').forEach(d => d.style.display = 'none');
        const dd = btn.nextElementSibling;
        if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
      });
    });
    document.addEventListener('click', () => {
      mc.querySelectorAll('.msg-options-dropdown').forEach(d => d.style.display = 'none');
    });

    // Delete
    mc.querySelectorAll('.delete-msg-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (!await this._confirm('Eliminar mensaje', '¿Seguro que deseas eliminar este mensaje?')) return;
        try {
          const res = await fetch(`/chat/messages/${btn.dataset.msgId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.status === 'success') this.loadMessages(this.activeRoomId);
          else this._notify(data.message, false);
        } catch (_) { this._notify('Error al eliminar', false); }
      });
    });

    // Edit
    mc.querySelectorAll('.edit-msg-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        btn.closest('.msg-options-dropdown').style.display = 'none';
        const msgId = btn.dataset.msgId;
        const msgEl = mc.querySelector(`.msg-text[data-msg-id="${msgId}"]`);
        if (!msgEl) return;
        const current = msgEl.textContent;
        const newText = await this._prompt('Editar mensaje', current);
        if (newText && newText.trim() && newText !== current) {
          try {
            const res = await fetch(`/chat/messages/${msgId}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: newText })
            });
            const data = await res.json();
            if (data.status === 'success') this.loadMessages(this.activeRoomId);
            else this._notify(data.message, false);
          } catch (_) { this._notify('Error al editar', false); }
        }
      });
    });
  }

  _renderFileContent(content) {
    // Format: FILE:original_name.ext:saved_name.ext
    const parts = content.split(':');
    const originalName = parts[1] || 'archivo';
    const savedName = parts[2] || '';
    const ext = originalName.split('.').pop().toLowerCase();
    const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext);
    const url = `/uploads_chat/${savedName}`;
    if (isImage) {
      return `<div class="chat-file-preview"><a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${originalName}" style="max-width:200px;max-height:200px;border-radius:8px;cursor:pointer;"></a></div>`;
    }
    const iconMap = { pdf:'fa-file-pdf', doc:'fa-file-word', docx:'fa-file-word', xls:'fa-file-excel', xlsx:'fa-file-excel', zip:'fa-file-archive', rar:'fa-file-archive' };
    const icon = iconMap[ext] || 'fa-file';
    return `<div class="chat-file-preview"><a href="${url}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--gray-100);border-radius:8px;text-decoration:none;color:var(--gray-800);"><i class="fas ${icon}" style="font-size:24px;"></i><span>${originalName}</span></a></div>`;
  }

  _linkify(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;">${url}</a>`);
  }

  _formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  /* ─── Send message ─── */
  async sendMessage() {
    const input = this._el('chat-msg-input');
    const content = input?.value.trim();
    if (!content || !this.activeRoomId) return;
    if (this._sending) return;
    this._sending = true;

    const sendBtn = this._el('chat-send-btn');
    const origHTML = sendBtn?.innerHTML;
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
      sendBtn.style.opacity = '0.7';
    }

    try {
      const res = await fetch(`/chat/rooms/${encodeURIComponent(this.activeRoomId)}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.status === 'success') {
        input.value = '';
        await this.loadMessages(this.activeRoomId);
        this.loadContacts();
      } else {
        this._notify(data.message || 'Error enviando mensaje', false);
      }
    } catch (_) { this._notify('Error enviando mensaje', false); }
    finally {
      this._sending = false;
      if (sendBtn && origHTML) {
        sendBtn.innerHTML = origHTML;
        sendBtn.disabled = false;
        sendBtn.style.opacity = '';
      }
    }
  }

  /* ─── Clear chat ─── */
  async clearChat() {
    if (!this.activeRoomId || this.activeRoomId === 'loading') return;
    this._el('chat-menu-dropdown')?.classList.remove('open');
    if (!await this._confirm('Vaciar chat', '¿Seguro que deseas vaciar este chat? Los mensajes se eliminarán solo para ti.')) return;
    try {
      const res = await fetch(`/chat/rooms/${this.activeRoomId}/clear`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        this._notify('Chat vaciado', true);
        await this.loadMessages(this.activeRoomId);
        this.loadContacts();
      } else { this._notify(data.message || 'Error al vaciar chat', false); }
    } catch (_) { this._notify('Error de red al vaciar chat', false); }
  }
}
