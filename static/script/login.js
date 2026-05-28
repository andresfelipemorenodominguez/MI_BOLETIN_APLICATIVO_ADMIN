document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const messageElement = document.getElementById('message');
    const messageText = document.getElementById('message-text');
    const closeMessageBtn = document.getElementById('close-message');

    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    function showMessage(text, type) {
        messageText.textContent = text;
        messageElement.className = `message ${type}`;
        messageElement.classList.remove('hidden');
        
        if (type === 'success') {
            setTimeout(() => {
                messageElement.classList.add('hidden');
            }, 5000);
        }
    }

    closeMessageBtn.addEventListener('click', function() {
        messageElement.classList.add('hidden');
    });

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        clearErrors();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        let isValid = true;
        
        if (!username) {
            showError('username-error', 'Por favor, ingresa un nombre de usuario o dirección de correo.');
            isValid = false;
        }
        
        if (!password) {
            showError('password-error', 'Por favor, ingresa tu contraseña.');
            isValid = false;
        }
        
        if (isValid) {
            showMessage('Iniciando sesión... Por favor, espera.', 'info');
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
                    
                    setTimeout(() => {
                        window.location.href = result.redirect || '/dashboard';
                    }, 1000);
                    
                } else {
                    showMessage(result.message, 'error');
                    
                    if (result.field === 'username') {
                        showError('username-error', result.message);
                    } else if (result.field === 'password') {
                        showError('password-error', result.message);
                    } else if (result.field === 'email') {
                        showError('username-error', result.message);
                    }
                }
                
            } catch (error) {
                console.error('Error al iniciar sesión:', error);
                showMessage('Error de conexión. Por favor, intenta nuevamente.', 'error');
            }
        }
    });

    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            
            const inputElement = errorElement.closest('.form-group').querySelector('input');
            if (inputElement) {
                inputElement.style.borderColor = '#dc3232';
            }
        }
    }

    function clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
        });
        
        const inputElements = document.querySelectorAll('.input-container input');
        inputElements.forEach(input => {
            input.style.borderColor = '#ddd';
        });
    }

    usernameInput.addEventListener('input', function() {
        const username = this.value.trim();
        const errorElement = document.getElementById('username-error');
        
        if (errorElement && errorElement.textContent === '') {
            this.style.borderColor = username ? '#0073aa' : '#ddd';
        }
    });

    passwordInput.addEventListener('input', function() {
        const password = this.value.trim();
        const errorElement = document.getElementById('password-error');
        
        if (errorElement && errorElement.textContent === '') {
            this.style.borderColor = password ? '#0073aa' : '#ddd';
        }
    });
});