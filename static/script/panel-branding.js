/**
 * Branding del colegio en paneles (sidebar, cabecera, variables CSS).
 */
(function () {
    const API = '/api/colegio/branding';
    const ROLE_LABELS = {
        admin: 'Admin',
        profesor: 'Profesor',
        estudiante: 'Estudiante',
    };

    function applyCssVars(data) {
        const root = document.documentElement;
        if (data.color_primario) {
            root.style.setProperty('--brand-primary', data.color_primario);
            root.style.setProperty('--primary', data.color_primario);
        }
        if (data.color_secundario) {
            root.style.setProperty('--brand-secondary', data.color_secundario);
            root.style.setProperty('--primary-light', data.color_secundario);
        }
    }

    function applySidebar(data) {
        const logoImg = document.getElementById('school-logo');
        const fallback = document.getElementById('school-logo-fallback');
        const nameEl = document.getElementById('school-name');
        const lemaEl = document.getElementById('school-lema');
        const roleEl = document.querySelector('.school-role-label');

        if (data.escudo_url && logoImg) {
            logoImg.src = data.escudo_url;
            logoImg.alt = data.nombre_oficial || 'Escudo';
            logoImg.style.display = '';
            if (fallback) fallback.style.display = 'none';
        } else if (fallback) {
            fallback.style.display = '';
            if (logoImg) logoImg.style.display = 'none';
        }

        if (nameEl && data.nombre_oficial) {
            nameEl.textContent = data.nombre_oficial;
        }
        if (lemaEl) {
            lemaEl.textContent = data.lema || '';
            lemaEl.style.display = data.lema ? '' : 'none';
        }
        if (roleEl && roleEl.dataset.role) {
            const label = ROLE_LABELS[roleEl.dataset.role] || roleEl.dataset.role;
            roleEl.textContent = label;
        }

        const headerTitle = document.getElementById('panel-header-title');
        if (headerTitle && data.nombre_oficial) {
            headerTitle.textContent = data.nombre_oficial;
        }
    }

    async function loadBranding() {
        const meta = document.getElementById('current-user-data');
        if (meta?.dataset.isSuperadmin === 'true') return;
        try {
            const res = await fetch(API);
            const json = await res.json();
            if (json.status !== 'success' || !json.data) return;
            applyCssVars(json.data);
            applySidebar(json.data);
            window.__colegioBranding = json.data;
        } catch (e) {
            console.warn('Branding no cargado:', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadBranding);
    } else {
        loadBranding();
    }

    window.PanelBranding = { reload: loadBranding, apply: applySidebar };
})();
