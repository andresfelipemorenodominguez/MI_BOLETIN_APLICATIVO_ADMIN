/**
 * Perfil compartido: vista, edición y foto para admin, estudiante y profesor.
 */
const ProfilePanel = {
  _cache: null,

  _rolLabel(rol) {
    const map = {
      superadmin: 'Super administrador',
      admin_lider: 'Administrador líder',
      admin_colegio: 'Administrador de colegio',
    };
    return map[rol] || rol || '';
  },

  _fieldLabels() {
    return {
      nombre_completo: 'Nombre',
      correo_electronico: 'Correo',
      codigo: 'Código',
      tipo_documento: 'Tipo de documento',
      numero_documento: 'Documento',
      grado: 'Grado',
      grupo: 'Grupo',
      telefono: 'Teléfono',
      cargo: 'Cargo',
      fecha_nacimiento: 'Fecha de nacimiento',
      lugar_nacimiento: 'Lugar de nacimiento',
      genero: 'Género',
      direccion_residencia: 'Dirección',
      eps: 'EPS',
      grupo_sanguineo: 'Grupo sanguíneo',
      alergias: 'Alergias',
      titulos_academicos: 'Títulos académicos',
      area_especialidad: 'Área de especialidad',
      anios_experiencia: 'Años de experiencia',
      registro_escalafon: 'Registro escalafón',
      entidad_salud: 'Entidad de salud',
      entidad_pension: 'Entidad de pensión',
      asignaturas: 'Asignaturas',
    };
  },

  async load() {
    try {
      const res = await fetch('/api/profile');
      const json = await res.json();
      if (json.status === 'success') {
        this._cache = json.data;
        this.renderView(json.data);
        this.fillEditForm(json.data);
        this.updateAvatars(json.data);
      }
    } catch (_) {}
    return this._cache;
  },

  updateAvatars(data) {
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre_completo || '')}&background=003366&color=fff&size=120`;
    const url = data.foto_perfil || data.avatar_url || fallbackUrl;

    // Avatares del modal
    ['profile-avatar-img', 'edit-profile-avatar'].forEach(id => {
      const img = document.getElementById(id);
      if (img) img.src = url;
    });

    // Avatar del footer del sidebar (nueva estructura .sb-avatar)
    const sbAvatar = document.querySelector('[data-sb-footer] .sb-avatar');
    if (sbAvatar) {
      if (data.foto_perfil || data.avatar_url) {
        sbAvatar.innerHTML = `<img src="${data.foto_perfil || data.avatar_url}" class="sb-avatar-img" alt="avatar">`;
      } else {
        const names = (data.nombre_completo || '').trim().split(' ');
        const initials = names.length > 0
          ? names[0][0].toUpperCase() + (names.length > 1 ? names[1][0].toUpperCase() : '')
          : '?';
        sbAvatar.innerHTML = `<div class="sb-avatar-initials">${initials}</div>`;
      }
    }
  },

  renderView(data) {
    const nameEl = document.getElementById('profile-view-name');
    const emailEl = document.getElementById('profile-view-email');
    const roleEl = document.getElementById('profile-view-role');
    const listEl = document.getElementById('profile-info-list');
    if (nameEl) nameEl.textContent = data.nombre_completo || '';
    if (emailEl) emailEl.textContent = data.correo_electronico || data.codigo || '';
    if (roleEl) {
      if (data.tipo === 'admin') {
        roleEl.textContent = this._rolLabel(data.rol);
      } else if (data.tipo === 'estudiante') {
        roleEl.textContent = 'Estudiante';
      } else if (data.tipo === 'profesor') {
        roleEl.textContent = 'Profesor';
      }
    }
    if (!listEl) return;
    const skip = new Set(['tipo', 'rol', 'foto_perfil', 'avatar_url', 'nombre_completo', 'correo_electronico']);
    const labels = this._fieldLabels();
    const rows = Object.entries(data)
      .filter(([k, v]) => !skip.has(k) && v != null && String(v).trim() !== '')
      .map(([k, v]) => `<div class="profile-info-row"><span class="profile-info-label">${labels[k] || k}</span><span class="profile-info-value">${v}</span></div>`)
      .join('');
    listEl.innerHTML = rows || '<p class="profile-info-empty">Completa tu perfil desde Editar Perfil.</p>';
  },

  fillEditForm(data) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    set('profile-name', data.nombre_completo);
    set('editName', data.nombre_completo);
    set('profile-email', data.correo_electronico);
    set('editEmail', data.correo_electronico);
    set('profile-telefono', data.telefono);
    set('profile-cargo', data.cargo);
    set('edit-telefono', data.telefono);
    set('edit-fecha-nac', data.fecha_nacimiento);
    set('edit-lugar-nac', data.lugar_nacimiento);
    set('edit-genero', data.genero);
    set('edit-direccion', data.direccion_residencia);
    set('edit-eps', data.eps);
    set('edit-rh', data.grupo_sanguineo);
    set('edit-alergias', data.alergias);
    set('edit-titulos', data.titulos_academicos);
    set('edit-area', data.area_especialidad);
    set('edit-experiencia', data.anios_experiencia);
    set('edit-escalafon', data.registro_escalafon);
    set('edit-entidad-salud', data.entidad_salud);
    set('edit-entidad-pension', data.entidad_pension);
  },

  collectPayload() {
    const v = id => document.getElementById(id)?.value?.trim() || '';
    const base = {
      fullname: v('profile-name') || v('editName'),
      email: v('profile-email') || v('editEmail'),
    };
    const tipo = this._cache?.tipo;
    if (tipo === 'admin') {
      return { ...base, telefono: v('profile-telefono'), cargo: v('profile-cargo') };
    }
    if (tipo === 'estudiante') {
      return {
        ...base,
        fecha_nacimiento: v('edit-fecha-nac') || null,
        lugar_nacimiento: v('edit-lugar-nac'),
        genero: v('edit-genero'),
        direccion_residencia: v('edit-direccion'),
        eps: v('edit-eps'),
        grupo_sanguineo: v('edit-rh'),
        alergias: v('edit-alergias'),
      };
    }
    if (tipo === 'profesor') {
      return {
        ...base,
        telefono: v('edit-telefono'),
        titulos_academicos: v('edit-titulos'),
        area_especialidad: v('edit-area'),
        anios_experiencia: v('edit-experiencia'),
        registro_escalafon: v('edit-escalafon'),
        entidad_salud: v('edit-entidad-salud'),
        entidad_pension: v('edit-entidad-pension'),
      };
    }
    return base;
  },

  async save() {
    const payload = this.collectPayload();
    if (!payload.fullname) return { status: 'error', message: 'El nombre es requerido.' };
    const res = await fetch('/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.status === 'success') {
      await this.load();
      const nameEl = document.querySelector('.user-name');
      if (nameEl) nameEl.textContent = payload.fullname;
    }
    return data;
  },

  async uploadPhoto(file) {
    const form = new FormData();
    form.append('foto', file);
    const res = await fetch('/upload-profile-photo', { method: 'POST', body: form });
    const data = await res.json();
    if (data.status === 'success') {
      await this.load();
    }
    return data;
  },

  async removePhoto() {
    const res = await fetch('/remove-profile-photo', { method: 'POST' });
    const data = await res.json();
    if (data.status === 'success') {
      await this.load();
    }
    return data;
  },

  // Carga silenciosa — solo actualiza el avatar del sidebar sin abrir modal
  async _loadSidebarAvatar() {
    try {
      const res = await fetch('/api/profile');
      const json = await res.json();
      if (json.status === 'success') {
        this._cache = json.data;
        this.updateAvatars(json.data);
        // Actualizar nombre/email del sidebar si ya están disponibles
        const nameEl = document.getElementById('sb-user-name');
        const emailEl = document.getElementById('sb-user-email');
        if (nameEl && json.data.nombre_completo) nameEl.textContent = json.data.nombre_completo;
        if (emailEl && (json.data.correo_electronico || json.data.codigo))
          emailEl.textContent = json.data.correo_electronico || json.data.codigo;
      }
    } catch (_) { /* silencioso — el sidebar ya tiene los datos del servidor */ }
  },

  init(options = {}) {
    const overlays = ['profile-modal-overlay', 'edit-modal-overlay', 'password-modal-overlay'];
    const toggle = (id, show) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', show);
    };
    const closeAll = () => overlays.forEach(id => toggle(id, false));

    // Cargar avatar del sidebar al inicio sin abrir el modal
    this._loadSidebarAvatar();

    document.getElementById('profile-btn')?.addEventListener('click', async () => {
      await this.load();
      toggle('profile-modal-overlay', true);
      options.onProfileOpen?.();
    });
    document.getElementById('close-profile-modal')?.addEventListener('click', () => toggle('profile-modal-overlay', false));
    document.getElementById('open-edit-profile')?.addEventListener('click', async () => {
      await this.load();
      toggle('profile-modal-overlay', false);
      toggle('edit-modal-overlay', true);
    });
    document.getElementById('open-password-modal')?.addEventListener('click', () => {
      toggle('profile-modal-overlay', false);
      toggle('password-modal-overlay', true);
    });
    document.getElementById('close-edit-modal')?.addEventListener('click', () => toggle('edit-modal-overlay', false));
    document.getElementById('cancel-edit-modal')?.addEventListener('click', () => toggle('edit-modal-overlay', false));
    document.getElementById('cancel-profile')?.addEventListener('click', () => toggle('edit-modal-overlay', false));
    document.getElementById('close-password-modal')?.addEventListener('click', () => toggle('password-modal-overlay', false));
    document.getElementById('cancel-password-modal')?.addEventListener('click', () => toggle('password-modal-overlay', false));

    overlays.forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
      });
    });
    window.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

    const saveBtn = document.getElementById('save-profile');
    if (saveBtn && !saveBtn.dataset.profileBound) {
      saveBtn.dataset.profileBound = '1';
      saveBtn.addEventListener('click', async () => {
        const data = await this.save();
        const notify = options.notify || ((msg, ok) => alert(msg));
        notify(data.message, data.status === 'success');
        if (data.status === 'success') toggle('profile-modal-overlay', false);
      });
    }

    const photoInput = document.getElementById('profile-photo-input');
    if (photoInput && !photoInput.dataset.profileBound) {
      photoInput.dataset.profileBound = '1';
      photoInput.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const data = await this.uploadPhoto(file);
        const notify = options.notify || ((msg, ok) => alert(msg));
        notify(data.message, data.status === 'success');
        e.target.value = '';
      });
    }

    const removePhotoBtn = document.getElementById('remove-photo-btn');
    if (removePhotoBtn && !removePhotoBtn.dataset.profileBound) {
      removePhotoBtn.dataset.profileBound = '1';
      removePhotoBtn.addEventListener('click', async () => {
        if (!confirm('¿Estás seguro de que deseas quitar tu foto de perfil?')) return;
        const data = await this.removePhoto();
        const notify = options.notify || ((msg, ok) => alert(msg));
        notify(data.message, data.status === 'success');
      });
    }

    const savePw = document.getElementById('savePassword');
    if (savePw && !savePw.dataset.profileBound) {
      savePw.dataset.profileBound = '1';
      savePw.addEventListener('click', async () => {
        const current = document.getElementById('currentPassword')?.value;
        const nueva = document.getElementById('newPassword')?.value;
        const conf = document.getElementById('confirmPassword')?.value;
        const msgEl = document.getElementById('pw-msg');
        if (!current || !nueva || !conf) {
          if (msgEl) msgEl.innerHTML = '<span style="color:var(--error)">Completa todos los campos.</span>';
          return;
        }
        if (nueva !== conf) {
          if (msgEl) msgEl.innerHTML = '<span style="color:var(--error)">Las contraseñas no coinciden.</span>';
          return;
        }
        const res = await fetch('/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_password: current, new_password: nueva, confirm_password: conf }),
        });
        const data = await res.json();
        if (msgEl) {
          msgEl.innerHTML = `<span style="color:${data.status === 'success' ? 'var(--success)' : 'var(--error)'}">${data.message}</span>`;
        }
        if (data.status === 'success') {
          setTimeout(() => toggle('password-modal-overlay', false), 1200);
        }
      });
    }
  },
};
