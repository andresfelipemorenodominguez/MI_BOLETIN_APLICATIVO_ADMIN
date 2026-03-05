document.addEventListener('DOMContentLoaded', function() {
    // Obtener elementos DOM
    const requestForm = document.getElementById('requestPasswordForm');
    const emailInput = document.getElementById('email');
    const submitBtn = document.querySelector('.submit-btn');
    const successModal = document.getElementById('success-modal');
    const timerModal = document.getElementById('timer-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const resendBtn = document.getElementById('resend-btn');
    const closeTimerModalBtn = document.getElementById('close-timer-modal');
    const sentEmailDisplay = document.getElementById('sent-email-display');
    const countdownTimer = document.getElementById('countdown-timer');
    const messageElement = document.getElementById('message');
    const messageText = document.getElementById('message-text');
    const closeMessageBtn = document.getElementById('close-message');
    
    // Variables de estado
    let lastRequestTime = 0;
    let canResendAfter = 60; // segundos
    let countdownInterval;
    
    // Inicializar
    function init() {
        // Cargar última hora de solicitud de localStorage si existe
        const savedTime = localStorage.getItem('lastPasswordRequestTime');
        if (savedTime) {
            lastRequestTime = parseInt(savedTime);
            checkIfCanResend();
        }
        
        // Configurar event listeners
        requestForm.addEventListener('submit', handleSubmit);
        closeModalBtn.addEventListener('click', () => successModal.classList.add('hidden'));
        resendBtn.addEventListener('click', handleResend);
        closeTimerModalBtn.addEventListener('click', () => timerModal.classList.add('hidden'));
        closeMessageBtn.addEventListener('click', () => messageElement.classList.add('hidden'));
        
        // Validación de correo en tiempo real
        emailInput.addEventListener('input', validateEmailInRealTime);
    }
    
    // Validar correo en tiempo real
    function validateEmailInRealTime() {
        const email = emailInput.value.trim();
        const errorElement = document.getElementById('email-error');
        
        if (!email) {
            errorElement.textContent = '';
            emailInput.style.borderColor = '#ddd';
            return;
        }
        
        if (!isValidEmail(email)) {
            errorElement.textContent = 'Por favor, ingresa un correo electrónico válido.';
            emailInput.style.borderColor = '#dc3232';
        } else {
            errorElement.textContent = '';
            emailInput.style.borderColor = '#0073aa';
        }
    }
    
    // Validar formato de correo
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Verificar si el usuario puede reenviar la solicitud
    function checkIfCanResend() {
        const now = Math.floor(Date.now() / 1000);
        const timeSinceLastRequest = now - lastRequestTime;
        
        if (timeSinceLastRequest < canResendAfter && lastRequestTime > 0) {
            // El usuario necesita esperar
            const remainingTime = canResendAfter - timeSinceLastRequest;
            showResendTimer(remainingTime);
            return false;
        }
        
        return true;
    }
    
    // Mostrar temporizador de reenvío
    function showResendTimer(seconds) {
        countdownTimer.textContent = seconds;
        timerModal.classList.remove('hidden');
        
        // Iniciar cuenta regresiva
        let timeLeft = seconds;
        countdownInterval = setInterval(() => {
            timeLeft--;
            countdownTimer.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                timerModal.classList.add('hidden');
            }
        }, 1000);
    }
    
    // Manejar envío del formulario
    async function handleSubmit(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        // Validar correo
        if (!email) {
            showError('Por favor, ingresa tu correo electrónico.');
            emailInput.style.borderColor = '#dc3232';
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('Por favor, ingresa un correo electrónico válido.');
            emailInput.style.borderColor = '#dc3232';
            return;
        }
        
        // Verificar si el usuario necesita esperar
        if (!checkIfCanResend()) {
            return;
        }
        
        // Deshabilitar botón de envío
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        // Mostrar mensaje de carga
        showMessage('Enviando enlace de recuperación...', 'success');
        
        try {
            // Enviar solicitud al backend
            const response = await fetch('/request-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Guardar hora de solicitud
                lastRequestTime = Math.floor(Date.now() / 1000);
                localStorage.setItem('lastPasswordRequestTime', lastRequestTime.toString());
                
                // Actualizar modal de éxito
                sentEmailDisplay.textContent = email;
                
                // Mostrar modal de éxito
                successModal.classList.remove('hidden');
                
                // Mostrar mensaje de éxito
                showMessage(data.message, 'success');
            } else {
                // Mostrar error
                showMessage(data.message, data.status);
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión. Por favor, intenta nuevamente.', 'error');
        } finally {
            // Reiniciar formulario y botón
            emailInput.value = '';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Enlace de Recuperación';
            
            // Limpiar cualquier error
            document.getElementById('email-error').textContent = '';
            emailInput.style.borderColor = '#ddd';
        }
    }
    
    // Manejar reenvío de solicitud
    async function handleResend() {
        if (!checkIfCanResend()) {
            return;
        }
        
        const email = sentEmailDisplay.textContent;
        
        // Cerrar modal de éxito
        successModal.classList.add('hidden');
        
        // Mostrar mensaje de carga
        showMessage('Reenviando enlace de recuperación...', 'success');
        
        try {
            // Enviar solicitud de reenvío al backend
            const response = await fetch('/request-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Guardar nueva hora de solicitud
                lastRequestTime = Math.floor(Date.now() / 1000);
                localStorage.setItem('lastPasswordRequestTime', lastRequestTime.toString());
                
                // Mostrar nuevo modal de éxito
                successModal.classList.remove('hidden');
                
                // Mostrar mensaje de éxito
                showMessage(data.message, 'success');
            } else {
                showMessage(data.message, data.status);
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión. Por favor, intenta nuevamente.', 'error');
        }
    }
    
    // Mostrar mensaje de error
    function showError(message) {
        document.getElementById('email-error').textContent = message;
    }
    
    // Mostrar notificación de mensaje
    function showMessage(text, type) {
        messageText.textContent = text;
        messageElement.className = `message ${type}`;
        messageElement.classList.remove('hidden');
        
        // Ocultar automáticamente después del tiempo apropiado
        const timeout = type === 'success' ? 5000 : 7000;
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, timeout);
    }
    
    // Inicializar la página
    init();
});