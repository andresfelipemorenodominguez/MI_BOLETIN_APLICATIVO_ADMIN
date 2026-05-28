document.addEventListener('DOMContentLoaded', function() {
    // Obtener elementos DOM
    const registerForm = document.getElementById('registerForm');
    const fullnameInput = document.getElementById('fullname');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');
    const messageElement = document.getElementById('message');
    const messageText = document.getElementById('message-text');
    const closeMessageBtn = document.getElementById('close-message');

    // Alternar visibilidad de contraseña
    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    toggleConfirmPasswordBtn.addEventListener('click', function() {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);

        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // Comprobador de fortaleza de contraseña
    function checkPasswordStrength(password) {
        let strength = 0;

        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

        return strength;
    }

    function updatePasswordStrength() {
        const password = passwordInput.value;
        const strength = checkPasswordStrength(password);

        let width = 0;
        let color = '#dc3232';
        let text = 'Muy débil';

        if (password.length === 0) {
            width = 0;
            text = 'Fortaleza de la contraseña: Muy débil';
        } else if (strength <= 2) {
            width = 25;
            color = '#dc3232';
            text = 'Fortaleza de la contraseña: Débil';
        } else if (strength <= 4) {
            width = 50;
            color = '#ffb900';
            text = 'Fortaleza de la contraseña: Regular';
        } else if (strength <= 5) {
            width = 75;
            color = '#46b450';
            text = 'Fortaleza de la contraseña: Buena';
        } else {
            width = 100;
            color = '#46b450';
            text = 'Fortaleza de la contraseña: Fuerte';
        }

        strengthFill.style.width = width + '%';
        strengthFill.style.backgroundColor = color;
        strengthText.textContent = text;
        strengthText.style.color = password.length === 0 ? '#666' : color;
    }

    passwordInput.addEventListener('input', updatePasswordStrength);

    // Mostrar mensajes
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

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // ---------------------------
    //  📌 MODIFICAR: ENVIAR A FLASK
    // ---------------------------
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();

        const fullname = fullnameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        const termsAccepted = termsCheckbox.checked;

        let isValid = true;

        if (!fullname) {
            showError('fullname-error', 'Por favor, ingresa tu nombre completo.');
            isValid = false;
        } else if (fullname.length < 2) {
            showError('fullname-error', 'El nombre completo debe tener al menos 2 caracteres.');
            isValid = false;
        }

        if (!email) {
            showError('email-error', 'Por favor, ingresa tu dirección de correo electrónico.');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('email-error', 'Por favor, ingresa una dirección de correo electrónico válida.');
            isValid = false;
        }

        if (!password) {
            showError('password-error', 'Por favor, crea una contraseña.');
            isValid = false;
        } else if (password.length < 8) {
            showError('password-error', 'La contraseña debe tener al menos 8 caracteres.');
            isValid = false;
        }

        if (!confirmPassword) {
            showError('confirmPassword-error', 'Por favor, confirma tu contraseña.');
            isValid = false;
        } else if (password !== confirmPassword) {
            showError('confirmPassword-error', 'Las contraseñas no coinciden.');
            isValid = false;
        }

        if (!termsAccepted) {
            showError('terms-error', 'Debes aceptar los Términos de Servicio y la Política de Privacidad.');
            isValid = false;
        }

        if (!isValid) return;

        // ---------------------------
        //  📡 ENVÍO AL SERVIDOR
        // ---------------------------
        try {
            const response = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullname,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (data.status === "success") {
                showMessage("¡Registro exitoso! Redirigiendo a verificación de correo...", "success");
                
                // ✅ GUARDA EL EMAIL EN SESSIONSTORAGE ANTES DE REDIRIGIR
                // Usamos sessionStorage para que solo dure la sesión actual
                sessionStorage.setItem('registeredEmail', email);
                
                // ✅ VERIFICA SI HAY REDIRECCIÓN Y REDIRIGE
                if (data.redirect) {
                    // Espera 1.5 segundos para mostrar el mensaje de éxito antes de redirigir
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 1500);
                } else {
                    // Si no hay redirección, solo resetea el formulario (comportamiento original)
                    registerForm.reset();
                    strengthFill.style.width = '0%';
                    strengthText.textContent = 'Fortaleza de la contraseña: Muy débil';
                    strengthText.style.color = '#666';
                }
            } else {
                showMessage(data.message, "error");
            }

        } catch (err) {
            showMessage("Error del servidor. Intenta nuevamente más tarde.", "error");
        }
    });

    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;

        const inputElement = errorElement.closest('.form-group').querySelector('input, #terms');
        if (inputElement && inputElement.type !== 'checkbox') {
            inputElement.style.borderColor = '#dc3232';
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

    fullnameInput.addEventListener('input', function() {
        const fullname = this.value.trim();
        const errorElement = document.getElementById('fullname-error');

        if (fullname && fullname.length < 2) {
            errorElement.textContent = 'El nombre completo debe tener al menos 2 caracteres.';
            this.style.borderColor = '#dc3232';
        } else {
            errorElement.textContent = '';
            this.style.borderColor = fullname ? '#0073aa' : '#ddd';
        }
    });

    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        const errorElement = document.getElementById('email-error');

        if (email && !isValidEmail(email)) {
            errorElement.textContent = 'Por favor, ingresa una dirección de correo electrónico válida.';
            this.style.borderColor = '#dc3232';
        } else {
            errorElement.textContent = '';
            this.style.borderColor = email ? '#0073aa' : '#ddd';
        }
    });

    confirmPasswordInput.addEventListener('input', function() {
        const confirmPassword = this.value.trim();
        const password = passwordInput.value.trim();
        const errorElement = document.getElementById('confirmPassword-error');

        if (confirmPassword && password !== confirmPassword) {
            errorElement.textContent = 'Las contraseñas no coinciden.';
            this.style.borderColor = '#dc3232';
        } else {
            errorElement.textContent = '';
            this.style.borderColor = confirmPassword ? '#0073aa' : '#ddd';
        }
    });

    passwordInput.addEventListener('input', function() {
        const confirmPassword = confirmPasswordInput.value.trim();
        const password = this.value.trim();
        const errorElement = document.getElementById('confirmPassword-error');

        if (confirmPassword && password !== confirmPassword) {
            errorElement.textContent = 'Las contraseñas no coinciden.';
            confirmPasswordInput.style.borderColor = '#dc3232';
        } else if (confirmPassword) {
            errorElement.textContent = '';
            confirmPasswordInput.style.borderColor = '#0073aa';
        }
    });

    updatePasswordStrength();
});