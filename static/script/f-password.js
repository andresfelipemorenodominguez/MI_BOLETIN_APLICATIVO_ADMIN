document.addEventListener('DOMContentLoaded', function() {
    // Verificar en qué página estamos
    const isForgotPasswordPage = document.getElementById('forgotPasswordForm');
    const isResetPasswordPage = document.getElementById('resetPasswordForm');
    
    if (isResetPasswordPage) {
        initResetPasswordPage();
    } else if (isForgotPasswordPage) {
        // Para compatibilidad con versiones anteriores
        initForgotPasswordPage();
    }
    
    // Inicialización común para ambas páginas
    function initCommon() {
        // Manejo de mensajes
        const messageElement = document.getElementById('message');
        const messageText = document.getElementById('message-text');
        const closeMessageBtn = document.getElementById('close-message');
        
        if (closeMessageBtn) {
            closeMessageBtn.addEventListener('click', () => {
                messageElement.classList.add('hidden');
            });
        }
        
        // Función para mostrar mensaje
        window.showMessage = function(text, type) {
            messageText.textContent = text;
            messageElement.className = `message ${type}`;
            messageElement.classList.remove('hidden');
            
            // Ocultar automáticamente después de 5 segundos para éxito, 7 segundos para error
            const timeout = type === 'success' ? 5000 : 7000;
            setTimeout(() => {
                messageElement.classList.add('hidden');
            }, timeout);
        };
    }
    
    // Inicializar página de Restablecer Contraseña (con token)
    function initResetPasswordPage() {
        initCommon();
        
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const togglePasswordBtn = document.getElementById('togglePassword');
        const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');
        const successModal = document.getElementById('success-modal');
        const goToLoginBtn = document.getElementById('go-to-login');
        const recoveryTokenInput = document.getElementById('recovery-token');
        
        // Elementos de requisitos de contraseña
        const reqLength = document.getElementById('req-length');
        const reqLowercase = document.getElementById('req-lowercase');
        const reqUppercase = document.getElementById('req-uppercase');
        const reqNumber = document.getElementById('req-number');
        const reqSpecial = document.getElementById('req-special');
        
        // Verificar si hay token de recuperación
        const recoveryToken = recoveryTokenInput ? recoveryTokenInput.value : null;
        if (!recoveryToken) {
            showMessage('Enlace de recuperación inválido o expirado. Solicita uno nuevo.', 'error');
            
            // Deshabilitar formulario si no hay token válido
            if (resetPasswordForm) {
                resetPasswordForm.querySelectorAll('input, button').forEach(element => {
                    element.disabled = true;
                });
            }
        }
        
        // Alternar visibilidad de contraseña
        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', function() {
                const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                newPasswordInput.setAttribute('type', type);
                
                // Alternar icono de ojo
                const icon = this.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        }
        
        if (toggleConfirmPasswordBtn) {
            toggleConfirmPasswordBtn.addEventListener('click', function() {
                const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                confirmPasswordInput.setAttribute('type', type);
                
                // Alternar icono de ojo
                const icon = this.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        }
        
        // Verificar requisitos de contraseña
        function checkPasswordRequirements(password) {
            const requirements = {
                length: password.length >= 8,
                lowercase: /[a-z]/.test(password),
                uppercase: /[A-Z]/.test(password),
                number: /[0-9]/.test(password),
                special: /[^a-zA-Z0-9]/.test(password)
            };
            
            return requirements;
        }
        
        // Actualizar indicador de fortaleza de contraseña
        function updatePasswordStrength() {
            const password = newPasswordInput.value;
            const requirements = checkPasswordRequirements(password);
            
            // Actualizar indicadores de requisitos
            updateRequirementIndicator(reqLength, requirements.length);
            updateRequirementIndicator(reqLowercase, requirements.lowercase);
            updateRequirementIndicator(reqUppercase, requirements.uppercase);
            updateRequirementIndicator(reqNumber, requirements.number);
            updateRequirementIndicator(reqSpecial, requirements.special);
            
            // Calcular puntaje de fortaleza
            let strength = 0;
            Object.values(requirements).forEach(met => {
                if (met) strength += 1;
            });
            
            // Actualizar barra de fortaleza
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
            } else if (strength <= 3) {
                width = 50;
                color = '#ffb900';
                text = 'Fortaleza de la contraseña: Regular';
            } else if (strength <= 4) {
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
            
            return strength;
        }
        
        // Actualizar indicador de requisito
        function updateRequirementIndicator(element, met) {
            if (met) {
                element.classList.add('requirement-met');
                element.querySelector('i').className = 'fas fa-check-circle';
            } else {
                element.classList.remove('requirement-met');
                element.querySelector('i').className = 'fas fa-circle';
            }
        }
        
        // Validar contraseña
        function validatePassword(password) {
            const requirements = checkPasswordRequirements(password);
            const errors = [];
            
            if (!requirements.length) errors.push('al menos 8 caracteres');
            if (!requirements.lowercase) errors.push('una letra minúscula');
            if (!requirements.uppercase) errors.push('una letra mayúscula');
            if (!requirements.number) errors.push('un número');
            if (!requirements.special) errors.push('un carácter especial');
            
            return {
                isValid: Object.values(requirements).every(met => met),
                errors: errors
            };
        }
        
        // Escuchar entrada de contraseña para actualizar fortaleza
        newPasswordInput.addEventListener('input', function() {
            updatePasswordStrength();
            
            // Limpiar error cuando el usuario comienza a escribir
            document.getElementById('new-password-error').textContent = '';
            this.style.borderColor = '#ddd';
            
            // Verificar coincidencia de confirmación de contraseña en tiempo real
            const confirmPassword = confirmPasswordInput.value;
            if (confirmPassword && this.value !== confirmPassword) {
                document.getElementById('confirm-password-error').textContent = 'Las contraseñas no coinciden.';
                confirmPasswordInput.style.borderColor = '#dc3232';
            } else if (confirmPassword) {
                document.getElementById('confirm-password-error').textContent = '';
                confirmPasswordInput.style.borderColor = '#ddd';
            }
        });
        
        // Escuchar entrada de confirmación de contraseña
        confirmPasswordInput.addEventListener('input', function() {
            const newPassword = newPasswordInput.value;
            const confirmPassword = this.value;
            
            if (confirmPassword && newPassword !== confirmPassword) {
                document.getElementById('confirm-password-error').textContent = 'Las contraseñas no coinciden.';
                this.style.borderColor = '#dc3232';
            } else {
                document.getElementById('confirm-password-error').textContent = '';
                this.style.borderColor = '#ddd';
            }
        });
        
        // Envío del formulario
        resetPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Limpiar errores anteriores
            document.getElementById('new-password-error').textContent = '';
            document.getElementById('confirm-password-error').textContent = '';
            newPasswordInput.style.borderColor = '#ddd';
            confirmPasswordInput.style.borderColor = '#ddd';
            
            let isValid = true;
            
            // Validar nueva contraseña
            const passwordValidation = validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                document.getElementById('new-password-error').textContent = 
                    `La contraseña debe contener: ${passwordValidation.errors.join(', ')}.`;
                newPasswordInput.style.borderColor = '#dc3232';
                isValid = false;
            }
            
            // Validar confirmación de contraseña
            if (!confirmPassword) {
                document.getElementById('confirm-password-error').textContent = 'Por favor, confirma tu nueva contraseña.';
                confirmPasswordInput.style.borderColor = '#dc3232';
                isValid = false;
            } else if (newPassword !== confirmPassword) {
                document.getElementById('confirm-password-error').textContent = 'Las contraseñas no coinciden.';
                confirmPasswordInput.style.borderColor = '#dc3232';
                isValid = false;
            }
            
            // Si es válido, enviar al backend
            if (isValid && recoveryToken) {
                showMessage('Restableciendo tu contraseña...', 'success');
                
                try {
                    // Enviar solicitud al backend
                    const response = await fetch('/reset-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            token: recoveryToken,
                            new_password: newPassword,
                            confirm_password: confirmPassword
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.status === 'success') {
                        // Mostrar modal de éxito
                        successModal.classList.remove('hidden');
                        
                        // Redirigir después de 3 segundos
                        setTimeout(() => {
                            if (data.redirect) {
                                window.location.href = data.redirect;
                            } else {
                                window.location.href = '/login';
                            }
                        }, 3000);
                    } else {
                        showMessage(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showMessage('Error de conexión. Por favor, intenta nuevamente.', 'error');
                } finally {
                    // Reiniciar formulario
                    resetPasswordForm.reset();
                    
                    // Reiniciar indicador de fortaleza
                    strengthFill.style.width = '0%';
                    strengthText.textContent = 'Fortaleza de la contraseña: Muy débil';
                    strengthText.style.color = '#666';
                    
                    // Reiniciar indicadores de requisitos
                    [reqLength, reqLowercase, reqUppercase, reqNumber, reqSpecial].forEach(el => {
                        el.classList.remove('requirement-met');
                        el.querySelector('i').className = 'fas fa-circle';
                    });
                }
            } else if (!recoveryToken) {
                showMessage('Token de recuperación no válido. Solicita un nuevo enlace.', 'error');
            }
        });
        
        // Botón para ir a inicio de sesión
        if (goToLoginBtn) {
            goToLoginBtn.addEventListener('click', () => {
                window.location.href = '/login';
            });
        }
        
        // Inicializar fortaleza de contraseña
        updatePasswordStrength();
    }
    
    // Función de compatibilidad para versión anterior
    function initForgotPasswordPage() {
        initCommon();
        
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const identifierInput = document.getElementById('user-identifier');
        const successModal = document.getElementById('success-modal');
        const closeSuccessModal = document.getElementById('close-success-modal');
        const sentEmailElement = document.getElementById('sent-email');
        
        // Envío del formulario
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const identifier = identifierInput.value.trim();
            
            // Validar entrada
            if (!identifier) {
                document.getElementById('identifier-error').textContent = 'Por favor, ingresa tu dirección de correo o nombre de usuario.';
                identifierInput.style.borderColor = '#dc3232';
                return;
            }
            
            // Limpiar error
            document.getElementById('identifier-error').textContent = '';
            identifierInput.style.borderColor = '#ddd';
            
            // Simular envío de enlace de restablecimiento
            showMessage('Enviando enlace de restablecimiento de contraseña...', 'success');
            
            // Simular llamada a API
            setTimeout(() => {
                // Actualizar correo en modal de éxito
                sentEmailElement.textContent = identifier.includes('@') ? identifier : 'tu correo registrado';
                
                // Mostrar modal de éxito
                successModal.classList.remove('hidden');
                
                // Reiniciar formulario
                forgotPasswordForm.reset();
            }, 1500);
        });
        
        // Cerrar modal de éxito
        closeSuccessModal.addEventListener('click', () => {
            successModal.classList.add('hidden');
        });
        
        // Validación en tiempo real
        identifierInput.addEventListener('input', function() {
            const identifier = this.value.trim();
            const errorElement = document.getElementById('identifier-error');
            
            if (identifier) {
                errorElement.textContent = '';
                this.style.borderColor = '#0073aa';
            } else {
                this.style.borderColor = '#ddd';
            }
        });
    }
    
    // Inicializar funcionalidad común
    initCommon();
});