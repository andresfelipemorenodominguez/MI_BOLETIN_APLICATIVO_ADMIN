document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const form = document.getElementById('passwordRequestForm');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const backToLoginBtn = document.getElementById('backToLogin');
    const newRequestBtn = document.getElementById('newRequest');
    const tryAgainBtn = document.getElementById('tryAgain');
    const successMessageText = document.getElementById('successMessageText');
    const errorMessageText = document.getElementById('errorMessageText');
    const backFromSuccessBtn = document.getElementById('backFromSuccess');
    
    // Campos del formulario
    const userIdentifier = document.getElementById('userIdentifier');
    const userEmail = document.getElementById('userEmail');
    const requestReason = document.getElementById('requestReason');
    
    // Elementos para mostrar errores
    const userIdentifierError = document.getElementById('userIdentifierError');
    const userEmailError = document.getElementById('userEmailError');
    const requestReasonError = document.getElementById('requestReasonError');
    
    // Datos del administrador (desde HTML)
    const adminId = document.getElementById('adminId').value;
    const adminName = document.getElementById('adminName').value;
    const adminEmail = document.getElementById('adminEmail').value;
    
    // Variable para almacenar tipo de usuario identificado
    let tipoUsuario = null;
    let nombreUsuario = null;
    let codigoUsuario = null;
    let idUsuario = null;
    
    // Función para validar el formulario
    function validateForm() {
        let isValid = true;
        
        // Resetear mensajes de error
        userIdentifierError.textContent = '';
        userEmailError.textContent = '';
        requestReasonError.textContent = '';
        
        // Validar identificador de usuario
        if (!userIdentifier.value.trim()) {
            userIdentifierError.textContent = 'El identificador de usuario es obligatorio';
            isValid = false;
        }
        
        // Validar correo electrónico
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!userEmail.value.trim()) {
            userEmailError.textContent = 'El correo electrónico es obligatorio';
            isValid = false;
        } else if (!emailPattern.test(userEmail.value)) {
            userEmailError.textContent = 'Por favor, introduce un correo electrónico válido';
            isValid = false;
        }
        
        // Validar motivo de la solicitud
        if (!requestReason.value.trim()) {
            requestReasonError.textContent = 'El motivo de la solicitud es obligatorio';
            isValid = false;
        } else if (requestReason.value.trim().length < 10) {
            requestReasonError.textContent = 'Por favor, proporciona una explicación más detallada (mínimo 10 caracteres)';
            isValid = false;
        }
        
        return isValid;
    }
    
    // Función para verificar usuario en la base de datos
    async function verificarUsuarioEnBD(userId, userEmail) {
        try {
            const response = await fetch('/verificar_usuario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userIdentifier: userId,
                    userEmail: userEmail
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al verificar usuario');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error al verificar usuario:', error);
            throw error;
        }
    }
    
    // Función para guardar la solicitud en la base de datos
    async function guardarSolicitudEnBD(formData) {
        try {
            const response = await fetch('/guardar_solicitud', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar la solicitud');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error al guardar solicitud:', error);
            throw error;
        }
    }
    
    // Función para mostrar mensaje de éxito
    function showSuccessMessage(data) {
        const mensaje = `
            Tu solicitud (N° <strong>${data.id_solicitud}</strong>) como 
            <strong>${data.tipo_usuario}</strong> (<strong>${data.nombre_usuario}</strong>) 
            ha sido enviada al administrador del sistema 
            (<strong>${data.admin_name}</strong>, ${data.admin_email}).
            <br><br>
            <small>Fecha de solicitud: ${data.fecha_solicitud}</small>
        `;
        
        successMessageText.innerHTML = mensaje;
        form.classList.add('hidden');
        errorMessage.classList.add('hidden');
        successMessage.classList.remove('hidden');
    }
    
    // Función para mostrar mensaje de error
    function showErrorMessage(mensaje) {
        if (mensaje) {
            errorMessageText.textContent = mensaje;
        }
        form.classList.add('hidden');
        successMessage.classList.add('hidden');
        errorMessage.classList.remove('hidden');
    }
    
    // Función para mostrar formulario
    function showForm() {
        form.classList.remove('hidden');
        successMessage.classList.add('hidden');
        errorMessage.classList.add('hidden');
    }
    
    // Función para resetear formulario
    function resetForm() {
        form.reset();
        tipoUsuario = null;
        nombreUsuario = null;
        codigoUsuario = null;
        idUsuario = null;
        userIdentifierError.textContent = '';
        userEmailError.textContent = '';
        requestReasonError.textContent = '';
    }
    
    // Manejar envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar formulario
        if (!validateForm()) {
            return;
        }
        
        // Deshabilitar botones durante el envío
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        submitButton.disabled = true;
        
        try {
            // Primero verificar si el usuario existe en la BD
            const verificationResult = await verificarUsuarioEnBD(
                userIdentifier.value.trim(),
                userEmail.value.trim()
            );
            
            if (verificationResult.status === 'success') {
                // Usuario verificado correctamente
                tipoUsuario = verificationResult.tipo;
                nombreUsuario = verificationResult.nombre;
                codigoUsuario = verificationResult.codigo;
                idUsuario = verificationResult.id;
                
                // Crear objeto con los datos del formulario
                const formData = {
                    userIdentifier: userIdentifier.value.trim(),
                    userEmail: userEmail.value.trim(),
                    requestReason: requestReason.value.trim(),
                    adminId: adminId
                };
                
                // Guardar la solicitud en la base de datos
                const saveResult = await guardarSolicitudEnBD(formData);
                
                if (saveResult.status === 'success') {
                    // Mostrar mensaje de éxito con información específica
                    showSuccessMessage(saveResult);
                    
                    // Enviar notificación por correo (opcional, implementación futura)
                    console.log('Solicitud guardada en la base de datos:', saveResult);
                } else {
                    throw new Error(saveResult.message || 'Error al guardar la solicitud');
                }
                
            } else {
                // Usuario no encontrado
                showErrorMessage('Usuario no encontrado. Verifica tu identificador y correo electrónico.');
            }
            
        } catch (error) {
            // Mostrar mensaje de error
            showErrorMessage(error.message || 'Error al procesar la solicitud. Por favor, inténtalo de nuevo.');
            console.error('Error al enviar la solicitud:', error);
        } finally {
            // Restaurar botón
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    });
    
    // Resto del código permanece igual...
    // Manejar clic en "Volver a Iniciar Sesión"
    backToLoginBtn.addEventListener('click', function() {
        window.location.href = '/loginuser';
    });
    
    // Manejar clic en "Nueva Solicitud"
    newRequestBtn.addEventListener('click', function() {
        resetForm();
        showForm();
    });
    
    // Manejar clic en "Intentar de nuevo"
    tryAgainBtn.addEventListener('click', function() {
        showForm();
    });
    
    backFromSuccessBtn.addEventListener('click', function() {
        window.location.href = '/loginuser';
    });

    // Validación en tiempo real para mejorar la experiencia de usuario
    userIdentifier.addEventListener('blur', function() {
        if (!userIdentifier.value.trim()) {
            userIdentifierError.textContent = 'El identificador de usuario es obligatorio';
        } else {
            userIdentifierError.textContent = '';
        }
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
    
    // Limpiar sesión al cargar la página
    window.addEventListener('beforeunload', function() {
        fetch('/limpiar_sesion', { method: 'POST' });
    });
});