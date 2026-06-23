/**
 * Shell compartido: sidebar móvil, modo oscuro y fecha (paneles profesor / estudiante).
 */
(function () {
    const html = document.documentElement;
    const KEY = 'miboletin_dark_mode';
    const sysDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

    function applyTheme(dark) {
        html.classList.toggle('dark-mode', dark);
        const chk = document.getElementById('dark-mode-toggle');
        if (chk) chk.checked = dark;
    }

    function resolveTheme() {
        const saved = localStorage.getItem(KEY);
        return saved !== null ? saved === 'true' : sysDark();
    }

    applyTheme(resolveTheme());

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem(KEY) === null) applyTheme(e.matches);
    });

    document.getElementById('profile-btn')?.addEventListener('click', () => {
        const chk = document.getElementById('dark-mode-toggle');
        if (chk) chk.checked = html.classList.contains('dark-mode');
    });

    document.addEventListener('change', (e) => {
        if (e.target.id !== 'dark-mode-toggle') return;
        localStorage.setItem(KEY, e.target.checked);
        applyTheme(e.target.checked);
    });

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

    window.closePanelSidebar = function () {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
    };

    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        function updateDateTime() {
            const now = new Date();
            const fecha = now.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            const hora = now.toLocaleTimeString('es-ES', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
            dateEl.textContent = `${fecha} · ${hora}`;
        }
        updateDateTime();
        setInterval(updateDateTime, 30000); // actualiza cada 30 s
    }
})();
