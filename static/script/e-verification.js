document.addEventListener('DOMContentLoaded', function() {
    // Obtener elementos DOM
    const verificationForm = document.getElementById('verificationForm');
    const codeInputs = document.querySelectorAll('.code-input');
    const resendBtn = document.getElementById('resend-btn');
    const changeEmailBtn = document.getElementById('change-email-btn');
    const verifyBtn = document.querySelector('.verify-btn');
    const userEmailElement = document.getElementById('user-email');
    const countdownElement = document.getElementById('countdown');
    const resendTimerElement = document.getElementById('resend-timer');
    const messageElement = document.getElementById('message');
    const messageText = document.getElementById('message-text');
    const closeMessageBtn = document.getElementById('close-message');
    
    // Elementos del modal
    const changeEmailModal = document.getElementById('change-email-modal');
    const successModal = document.getElementById('success-modal');
    const modalClose = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('cancel-btn');
    const updateEmailBtn = document.getElementById('update-email-btn');
    const continueBtn = document.getElementById('continue-btn');
    const newEmailInput = document.getElementById('new-email');
    const newEmailError = document.getElementById('new-email-error');
    
    // Variables de estado
    let verificationCode = '';
    let countdownInterval;
    let resendCountdown = 60; // 60 segundos para botón de reenvío
    let mainCountdown = 300; // 5 minutos para expiración del código
    
    // ✅ OBTENER EL EMAIL DEL REGISTRO DESDE SESSIONSTORAGE
    let userEmail = sessionStorage.getItem('registeredEmail') || 'tu_correo@example.com';
    
    // Inicializar la página
    function initPage() {
        // Establecer el correo del usuario
        userEmailElement.textContent = userEmail;
        
        // Iniciar temporizadores de cuenta regresiva
        startCountdowns();
        
        // Configurar event listeners para entradas de código
        setupCodeInputs();
        
        // Configurar envío del formulario
        verificationForm.addEventListener('submit', handleVerification);
        
        // Configurar botón de reenvío
        resendBtn.addEventListener('click', handleResendCode);
        
        // Configurar botón de cambiar correo
        changeEmailBtn.addEventListener('click', () => {
            changeEmailModal.classList.remove('hidden');
            // Prellenar el modal con el correo actual
            newEmailInput.value = userEmail;
            newEmailError.textContent = ''; // Limpiar cualquier error anterior
        });
        
        // Configurar botones del modal
        modalClose.addEventListener('click', closeModals);
        cancelBtn.addEventListener('click', closeModals);
        updateEmailBtn.addEventListener('click', handleUpdateEmail);
        continueBtn.addEventListener('click', handleContinueToDashboard);
        
        // Configurar botón de cierre de mensaje
        closeMessageBtn.addEventListener('click', () => {
            messageElement.classList.add('hidden');
        });
        
        // Configurar tecla Enter para entrada de nuevo correo
        newEmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleUpdateEmail();
            }
        });
    }
    
    // Iniciar los temporizadores de cuenta regresiva
    function startCountdowns() {
        // Cuenta regresiva principal (5 minutos)
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            mainCountdown--;
            
            // Actualizar la visualización de cuenta regresiva
            const minutes = Math.floor(mainCountdown / 60);
            const seconds = mainCountdown % 60;
            countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Si se acaba el tiempo, deshabilitar verificación
            if (mainCountdown <= 0) {
                clearInterval(countdownInterval);
                countdownElement.textContent = '00:00';
                verifyBtn.disabled = true;
                verifyBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Código Expirado';
                showMessage('El código de verificación ha expirado. Por favor, solicita uno nuevo.', 'error');
            }
        }, 1000);
        
        // Cuenta regresiva del botón de reenvío (60 segundos)
        let resendInterval = setInterval(() => {
            resendCountdown--;
            resendTimerElement.textContent = `(${resendCountdown}s)`;
            
            if (resendCountdown <= 0) {
                clearInterval(resendInterval);
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Reenviar Código';
                resendTimerElement.textContent = '';
            }
        }, 1000);
    }
    
    // Configurar event listeners para entradas de código
    function setupCodeInputs() {
        codeInputs.forEach((input, index) => {
            // Manejar entrada
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                // Solo permitir dígitos
                if (!/^\d*$/.test(value)) {
                    e.target.value = '';
                    return;
                }
                
                // Si se ingresó un dígito, pasar al siguiente input
                if (value.length === 1 && index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                }
                
                // Actualizar estilos de entrada y limpiar cualquier error
                updateInputStyles();
                document.getElementById('code-error').textContent = '';
            });
            
            // Manejar retroceso
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && input.value === '' && index > 0) {
                    codeInputs[index - 1].focus();
                }
                
                // Manejar tecla Enter para enviar formulario
                if (e.key === 'Enter' && index === codeInputs.length - 1 && input.value !== '') {
                    verificationForm.dispatchEvent(new Event('submit'));
                }
            });
            
            // Manejar pegar
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').trim();
                
                // Solo aceptar dígitos
                if (/^\d+$/.test(pastedData) && pastedData.length === 6) {
                    // Llenar todas las entradas con el código pegado
                    for (let i = 0; i < 6; i++) {
                        codeInputs[i].value = pastedData[i] || '';
                    }
                    updateInputStyles();
                    document.getElementById('code-error').textContent = '';
                    codeInputs[5].focus();
                }
            });
            
            // Manejar enfoque para limpiar estilos de error
            input.addEventListener('focus', () => {
                input.classList.remove('error');
            });
        });
    }
    
    // Actualizar estilos de entrada basados en contenido
    function updateInputStyles() {
        codeInputs.forEach(input => {
            input.classList.remove('filled', 'error');
            if (input.value) {
                input.classList.add('filled');
            }
        });
    }
    
    // Manejar envío del formulario de verificación
    async function handleVerification(e) {
        e.preventDefault();
        
        // Obtener el código ingresado
        let enteredCode = '';
        codeInputs.forEach(input => {
            enteredCode += input.value;
        });
        
        // Validar el código
        if (enteredCode.length !== 6) {
            showError('Por favor, ingresa el código completo de 6 dígitos.');
            highlightErrorInputs();
            return;
        }
        
        // Deshabilitar botón y mostrar carga
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        
        try {
            // Enviar código al servidor para verificación
            const response = await fetch("/verify-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: userEmail,
                    code: enteredCode
                })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                // Éxito - mostrar modal de éxito
                successModal.classList.remove('hidden');
                clearInterval(countdownInterval);
                
                // ✅ Limpiar el email del sessionStorage después de verificar exitosamente
                sessionStorage.removeItem('registeredEmail');
                
                // Mostrar mensaje de éxito
                showMessage('¡Correo verificado exitosamente!', 'success');
            } else {
                // Error - mostrar mensaje de error
                showError(data.message || 'Código de verificación inválido. Por favor, intenta nuevamente.');
                highlightErrorInputs();
                
                // Animación de sacudida para código incorrecto
                const codeInputsContainer = document.getElementById('code-inputs');
                codeInputsContainer.style.animation = 'shake 0.5s';
                setTimeout(() => {
                    codeInputsContainer.style.animation = '';
                }, 500);
            }
        } catch (error) {
            showError('Error de red. Por favor, intenta nuevamente.');
        } finally {
            // Rehabilitar botón
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verificar Email';
        }
    }
    
    // Manejar clic en botón de reenviar código
    async function handleResendCode() {
        // Deshabilitar botón y mostrar carga
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        try {
            // Solicitar nuevo código al servidor
            const response = await fetch("/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: userEmail
                })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                // Reiniciar cuentas regresivas
                mainCountdown = 300;
                resendCountdown = 60;
                startCountdowns();
                
                // Limpiar entradas
                codeInputs.forEach(input => {
                    input.value = '';
                    input.classList.remove('filled', 'error');
                });
                codeInputs[0].focus();
                
                // Limpiar mensaje de error
                document.getElementById('code-error').textContent = '';
                
                // Mostrar mensaje de éxito
                showMessage(data.message, 'success');
                
                // Deshabilitar botón de reenvío nuevamente
                resendBtn.disabled = true;
                resendBtn.innerHTML = 'Reenviar Código';
            } else {
                showMessage(data.message || 'Error al reenviar el código. Por favor, intenta nuevamente.', 'error');
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Reenviar Código';
            }
        } catch (error) {
            showMessage('Error de red. Por favor, intenta nuevamente.', 'error');
            resendBtn.disabled = false;
            resendBtn.innerHTML = 'Reenviar Código';
        }
    }
    
    // Manejar clic en botón de actualizar correo
    async function handleUpdateEmail() {
        const newEmail = newEmailInput.value.trim();
        const oldEmail = userEmail; // El email actual
        
        // Limpiar error anterior
        newEmailError.textContent = '';
        
        // Validar correo
        if (!newEmail) {
            newEmailError.textContent = 'Por favor, ingresa una dirección de correo.';
            newEmailInput.focus();
            return;
        }
        
        if (!isValidEmail(newEmail)) {
            newEmailError.textContent = 'Por favor, ingresa una dirección de correo válida.';
            newEmailInput.focus();
            return;
        }
        
        if (newEmail === oldEmail) {
            newEmailError.textContent = 'El nuevo correo debe ser diferente al correo actual.';
            newEmailInput.focus();
            return;
        }
        
        // Deshabilitar botón y mostrar carga
        updateEmailBtn.disabled = true;
        updateEmailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        
        try {
            // Usar la nueva ruta /update-email
            const response = await fetch("/update-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    old_email: oldEmail,
                    new_email: newEmail
                })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                // Actualizar el correo en el frontend
                userEmail = newEmail;
                userEmailElement.textContent = newEmail;
                
                // ✅ ACTUALIZAR EL EMAIL EN SESSIONSTORAGE
                sessionStorage.setItem('registeredEmail', newEmail);
                
                // Reiniciar el formulario
                codeInputs.forEach(input => {
                    input.value = '';
                    input.classList.remove('filled', 'error');
                });
                codeInputs[0].focus();
                
                // Limpiar cualquier error de verificación
                document.getElementById('code-error').textContent = '';
                
                // Reiniciar cuentas regresivas
                mainCountdown = 300;
                resendCountdown = 60;
                startCountdowns();
                
                // Habilitar botón de verificar si estaba deshabilitado
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verificar Email';
                
                // Cerrar modal y mostrar mensaje
                closeModals();
                showMessage(data.message, 'success');
            } else {
                newEmailError.textContent = data.message || 'Error al actualizar el correo.';
                newEmailInput.focus();
            }
        } catch (error) {
            newEmailError.textContent = 'Error de red. Por favor, intenta nuevamente.';
            newEmailInput.focus();
        } finally {
            // Rehabilitar botón
            updateEmailBtn.disabled = false;
            updateEmailBtn.innerHTML = 'Actualizar Email';
        }
    }
    
    // Manejar botón de continuar al panel de control
    function handleContinueToDashboard() {
        // ✅ LIMPIAR EL EMAIL DE SESSIONSTORAGE ANTES DE REDIRIGIR
        sessionStorage.removeItem('registeredEmail');
        
        // Redirigir al panel de control
        showMessage('Redirigiendo a tu panel de control de MiBoletín.com...', 'success');
        setTimeout(() => {
            successModal.classList.add('hidden');
            window.location.href = '/dashboard';
        }, 1500);
    }
    
    // Cerrar todos los modales
    function closeModals() {
        changeEmailModal.classList.add('hidden');
        successModal.classList.add('hidden');
        newEmailError.textContent = '';
        newEmailInput.value = '';
    }
    
    // Mostrar mensaje de error en verificación de código
    function showError(message) {
        document.getElementById('code-error').textContent = message;
    }
    
    // Resaltar entradas con error
    function highlightErrorInputs() {
        codeInputs.forEach(input => {
            input.classList.add('error');
            input.classList.remove('filled');
        });
    }
    
    // Mostrar notificación de mensaje
    function showMessage(text, type) {
        messageText.textContent = text;
        messageElement.className = `message ${type}`;
        messageElement.classList.remove('hidden');
        
        // Ocultar automáticamente después de 5 segundos para éxito, 7 segundos para error
        const timeout = type === 'success' ? 5000 : 7000;
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, timeout);
    }
    
    // Validar formato de correo
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Agregar keyframes de animación de sacudida
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .code-input.error {
            border-color: #dc3545 !important;
            background-color: #fff5f5;
            animation: shake 0.5s;
        }
        
        .code-input.filled {
            border-color: #28a745 !important;
            background-color: #f8fff9;
        }
    `;
    document.head.appendChild(style);
    
    // Inicializar la página
    initPage();
});