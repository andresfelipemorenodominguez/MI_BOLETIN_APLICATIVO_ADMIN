document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('passwordRequestForm');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const backToLoginBtn = document.getElementById('backToLogin');
    const newRequestBtn = document.getElementById('newRequest');
    const tryAgainBtn = document.getElementById('tryAgain');
    const successMessageText = document.getElementById('successMessageText');
    const errorMessageText = document.getElementById('errorMessageText');
    const backFromSuccessBtn = document.getElementById('backFromSuccess');

    const userIdentifier = document.getElementById('userIdentifier');
    const userEmail = document.getElementById('userEmail');
    const requestReason = document.getElementById('requestReason');

    const userIdentifierError = document.getElementById('userIdentifierError');
    const userEmailError = document.getElementById('userEmailError');
    const requestReasonError = document.getElementById('requestReasonError');
    const colegioError = document.getElementById('colegioError');

    const adminIdInput = document.getElementById('adminId');
    const adminNameInput = document.getElementById('adminName');
    const adminEmailInput = document.getElementById('adminEmail');

    const colegioSearch = document.getElementById('colegioSearch');
    const idColegioInput = document.getElementById('id_colegio');
    const colegioSeleccionado = document.getElementById('colegioSeleccionado');
    const colegioSelNombre = document.getElementById('colegioSelNombre');
    const colegioSelCodigo = document.getElementById('colegioSelCodigo');
    const colegioResultados = document.getElementById('colegioResultados');
    const colegioCambiar = document.getElementById('colegioCambiar');

    let tipoUsuario = null;
    let nombreUsuario = null;
    let codigoUsuario = null;
    let idUsuario = null;
    let colegioSearchTimer;

    function getIdColegio() {
        const fromUrl = new URLSearchParams(window.location.search).get('id_colegio');
        if (fromUrl) {
            return parseInt(fromUrl, 10);
        }
        const fromInput = idColegioInput.value.trim();
        return fromInput ? parseInt(fromInput, 10) : null;
    }

    async function cargarAdminColegio(idColegio) {
        const response = await fetch('/api/colegio/admin?id_colegio=' + encodeURIComponent(idColegio));
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            throw new Error(data.message || 'No se pudo cargar el administrador del colegio.');
        }
        adminIdInput.value = data.admin_id;
        adminNameInput.value = data.admin_name;
        adminEmailInput.value = data.admin_email;
    }

    function mostrarColegioSeleccionado(c) {
        idColegioInput.value = c.id_colegio;
        colegioSelNombre.textContent = c.nombre_oficial;
        colegioSelCodigo.textContent = c.codigo_colegio;
        colegioSeleccionado.style.display = 'block';
        colegioSearch.style.display = 'none';
        colegioSearch.value = '';
        colegioResultados.style.display = 'none';
        colegioResultados.innerHTML = '';
        colegioError.textContent = '';
    }

    async function seleccionarColegio(c) {
        mostrarColegioSeleccionado(c);
        try {
            await cargarAdminColegio(c.id_colegio);
        } catch (error) {
            colegioError.textContent = error.message;
        }
    }

    function reiniciarBusquedaColegio() {
        idColegioInput.value = '';
        colegioSeleccionado.style.display = 'none';
        colegioSearch.style.display = 'block';
        colegioSearch.value = '';
        colegioSearch.focus();
        colegioError.textContent = '';
    }

    async function buscarColegios(q) {
        const response = await fetch('/api/colegios?q=' + encodeURIComponent(q || ''));
        const data = await response.json();
        const items = data.data || [];

        if (!items.length) {
            colegioResultados.innerHTML = '<li style="padding:10px;color:#718096;font-size:13px;">No se encontraron colegios</li>';
            colegioResultados.style.display = 'block';
            return;
        }

        colegioResultados.innerHTML = items.map(function(c) {
            return '<li data-id="' + c.id_colegio + '" data-nombre="' + c.nombre_oficial + '" data-codigo="' + c.codigo_colegio + '">' +
                '<strong>' + c.nombre_oficial + '</strong>' +
                '<span style="color:#718096;font-size:12px;margin-left:6px;">' + c.codigo_colegio + '</span>' +
                '</li>';
        }).join('');
        colegioResultados.style.display = 'block';

        colegioResultados.querySelectorAll('li[data-id]').forEach(function(li) {
            li.addEventListener('click', function() {
                seleccionarColegio({
                    id_colegio: li.dataset.id,
                    nombre_oficial: li.dataset.nombre,
                    codigo_colegio: li.dataset.codigo,
                });
            });
        });
    }

    if (idColegioInput.value) {
        colegioSearch.style.display = 'none';
    }

    colegioSearch.addEventListener('input', function() {
        clearTimeout(colegioSearchTimer);
        colegioSearchTimer = setTimeout(function() {
            buscarColegios(colegioSearch.value.trim());
        }, 250);
    });

    colegioSearch.addEventListener('focus', function() {
        buscarColegios(colegioSearch.value.trim());
    });

    colegioCambiar.addEventListener('click', reiniciarBusquedaColegio);

    function validateForm() {
        let isValid = true;

        userIdentifierError.textContent = '';
        userEmailError.textContent = '';
        requestReasonError.textContent = '';
        colegioError.textContent = '';

        if (!getIdColegio()) {
            colegioError.textContent = 'Selecciona tu colegio antes de enviar la solicitud.';
            isValid = false;
        }

        if (!userIdentifier.value.trim()) {
            userIdentifierError.textContent = 'El identificador de usuario es obligatorio';
            isValid = false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!userEmail.value.trim()) {
            userEmailError.textContent = 'El correo electrónico es obligatorio';
            isValid = false;
        } else if (!emailPattern.test(userEmail.value)) {
            userEmailError.textContent = 'Por favor, introduce un correo electrónico válido';
            isValid = false;
        }

        if (!requestReason.value.trim()) {
            requestReasonError.textContent = 'El motivo de la solicitud es obligatorio';
            isValid = false;
        } else if (requestReason.value.trim().length < 10) {
            requestReasonError.textContent = 'Por favor, proporciona una explicación más detallada (mínimo 10 caracteres)';
            isValid = false;
        }

        return isValid;
    }

    async function verificarUsuarioEnBD(userId, email) {
        const idColegio = getIdColegio();
        if (!idColegio) {
            throw new Error('Selecciona tu colegio antes de enviar la solicitud.');
        }

        const response = await fetch('/verificar_usuario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userIdentifier: userId,
                userEmail: email,
                id_colegio: idColegio,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al verificar usuario');
        }

        return await response.json();
    }

    async function guardarSolicitudEnBD(formData) {
        const response = await fetch('/guardar_solicitud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al guardar la solicitud');
        }

        return await response.json();
    }

    function showSuccessMessage(data) {
        const mensaje =
            'Tu solicitud (N° <strong>' + data.id_solicitud + '</strong>) como ' +
            '<strong>' + data.tipo_usuario + '</strong> (<strong>' + data.nombre_usuario + '</strong>) ' +
            'ha sido enviada al administrador del sistema ' +
            '(<strong>' + data.admin_name + '</strong>, ' + data.admin_email + ').' +
            '<br><br><small>Fecha de solicitud: ' + data.fecha_solicitud + '</small>';

        successMessageText.innerHTML = mensaje;
        form.classList.add('hidden');
        errorMessage.classList.add('hidden');
        successMessage.classList.remove('hidden');
    }

    function showErrorMessage(mensaje) {
        if (mensaje) {
            errorMessageText.textContent = mensaje;
        }
        form.classList.add('hidden');
        successMessage.classList.add('hidden');
        errorMessage.classList.remove('hidden');
    }

    function showForm() {
        form.classList.remove('hidden');
        successMessage.classList.add('hidden');
        errorMessage.classList.add('hidden');
    }

    function resetForm() {
        const savedColegio = idColegioInput.value;
        const hadColegio = Boolean(savedColegio);
        form.reset();
        if (hadColegio) {
            idColegioInput.value = savedColegio;
        } else {
            reiniciarBusquedaColegio();
        }
        tipoUsuario = null;
        nombreUsuario = null;
        codigoUsuario = null;
        idUsuario = null;
        userIdentifierError.textContent = '';
        userEmailError.textContent = '';
        requestReasonError.textContent = '';
        colegioError.textContent = '';
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        submitButton.disabled = true;

        try {
            const verificationResult = await verificarUsuarioEnBD(
                userIdentifier.value.trim(),
                userEmail.value.trim()
            );

            if (verificationResult.status === 'success') {
                tipoUsuario = verificationResult.tipo;
                nombreUsuario = verificationResult.nombre;
                codigoUsuario = verificationResult.codigo;
                idUsuario = verificationResult.id;

                const formData = {
                    userIdentifier: userIdentifier.value.trim(),
                    userEmail: userEmail.value.trim(),
                    requestReason: requestReason.value.trim(),
                    adminId: adminIdInput.value,
                };

                const saveResult = await guardarSolicitudEnBD(formData);

                if (saveResult.status === 'success') {
                    showSuccessMessage(saveResult);
                } else {
                    throw new Error(saveResult.message || 'Error al guardar la solicitud');
                }
            } else {
                showErrorMessage('Usuario no encontrado. Verifica tu identificador y correo electrónico.');
            }
        } catch (error) {
            showErrorMessage(error.message || 'Error al procesar la solicitud. Por favor, inténtalo de nuevo.');
            console.error('Error al enviar la solicitud:', error);
        } finally {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    });

    backToLoginBtn.addEventListener('click', function() {
        window.location.href = '/loginuser';
    });

    newRequestBtn.addEventListener('click', function() {
        resetForm();
        showForm();
    });

    tryAgainBtn.addEventListener('click', function() {
        showForm();
    });

    backFromSuccessBtn.addEventListener('click', function() {
        window.location.href = '/loginuser';
    });

    userIdentifier.addEventListener('blur', function() {
        userIdentifierError.textContent = userIdentifier.value.trim()
            ? ''
            : 'El identificador de usuario es obligatorio';
    });

    userEmail.addEventListener('blur', function() {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!userEmail.value.trim()) {
            userEmailError.textContent = 'El correo electrónico es obligatorio';
        } else if (!emailPattern.test(userEmail.value)) {
            userEmailError.textContent = 'Por favor, introduce un correo electrónico válido';
        } else {
            userEmailError.textContent = '';
        }
    });

    requestReason.addEventListener('blur', function() {
        if (!requestReason.value.trim()) {
            requestReasonError.textContent = 'El motivo de la solicitud es obligatorio';
        } else if (requestReason.value.trim().length < 10) {
            requestReasonError.textContent = 'Por favor, proporciona una explicación más detallada (mínimo 10 caracteres)';
        } else {
            requestReasonError.textContent = '';
        }
    });

    window.addEventListener('beforeunload', function() {
        fetch('/limpiar_sesion', { method: 'POST' });
    });
});
