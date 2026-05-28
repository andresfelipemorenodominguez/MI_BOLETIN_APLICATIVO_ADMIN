// Interactividad para la plantilla de prueba

const profileButton = document.getElementById('profileButton');
const profileModal = document.getElementById('profileModal');
const closeModal = document.getElementById('closeModal');
const openEdit = document.getElementById('openEdit');

const editModal = document.getElementById('editModal');
const closeEdit = document.getElementById('closeEdit');
const cancelEdit = document.getElementById('cancelEdit');
const saveProfile = document.getElementById('saveProfile');

const openPassword = document.getElementById('openPassword');
const passwordModal = document.getElementById('passwordModal');
const closePassword = document.getElementById('closePassword');
const cancelPassword = document.getElementById('cancelPassword');
const savePassword = document.getElementById('savePassword');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');

const nameInput = document.getElementById('editName');
const emailInput = document.getElementById('editEmail');
const photoInput = document.getElementById('photoInput');

const previewAvatar = document.getElementById('previewAvatar');
const mainAvatar = document.getElementById('mainAvatar');
const modalAvatar = document.getElementById('modalAvatar');

const mainName = document.getElementById('mainName');
const mainEmail = document.getElementById('mainEmail');
const modalName = document.getElementById('modalName');
const modalEmail = document.getElementById('modalEmail');

const menuItems = Array.from(document.querySelectorAll('.menu-item'));
const content = document.getElementById('content');

const sections = {
  inicio: {
    title: 'Inicio',
    body: 'Este es un ejemplo de panel interactivo. Utiliza el menú para navegar.'
  },
  estudiante: {
    title: 'Agregar Estudiante',
    body: 'Aquí podrías añadir un formulario para registrar un estudiante.'
  },
  profesor: {
    title: 'Agregar Profesor',
    body: 'Aquí podrías añadir un formulario para registrar un profesor.'
  },
  reportes: {
    title: 'Reportes',
    body: 'Muestra gráficos e información sobre el desempeño.'
  }
};

function setActiveSection(sectionKey) {
  const section = sections[sectionKey] || sections.inicio;
  content.innerHTML = `
    <div class="card">
      <h2>${section.title}</h2>
      <p>${section.body}</p>
    </div>
  `;

  menuItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.section === sectionKey);
  });
}

function toggleModal(modal, show) {
  if (!modal) return;
  modal.classList.toggle('active', show);
  modal.setAttribute('aria-hidden', String(!show));
}

function openProfileModal() {
  toggleModal(profileModal, true);
}

function closeProfileModal() {
  toggleModal(profileModal, false);
}

function openEditModal() {
  closeProfileModal();
  toggleModal(editModal, true);
}

function closeEditModal() {
  toggleModal(editModal, false);
}

function openPasswordModal() {
  closeProfileModal();
  toggleModal(passwordModal, true);
}

function closePasswordModal() {
  toggleModal(passwordModal, false);
}

function handlePasswordChange() {
  const current = currentPassword.value.trim();
  const newPass = newPassword.value.trim();
  const confirm = confirmPassword.value.trim();

  if (!current || !newPass || !confirm) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  if (newPass !== confirm) {
    alert('La nueva contraseña y la confirmación no coinciden.');
    return;
  }

  if (newPass.length < 6) {
    alert('La nueva contraseña debe tener al menos 6 caracteres.');
    return;
  }

  // Since no backend, just simulate success
  alert('Contraseña cambiada exitosamente.');
  closePasswordModal();
  // Clear fields
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
}

function syncProfileFields() {
  modalName.textContent = mainName.textContent;
  modalEmail.textContent = mainEmail.textContent;
  const avatar = mainAvatar.style.backgroundImage || '';
  modalAvatar.style.backgroundImage = avatar;
  previewAvatar.style.backgroundImage = avatar;
  previewAvatar.textContent = '';
}

function applyProfileChanges() {
  const newName = nameInput.value.trim();
  const newEmail = emailInput.value.trim();

  if (newName) {
    mainName.textContent = newName;
    modalName.textContent = newName;
  }

  if (newEmail) {
    mainEmail.textContent = newEmail;
    modalEmail.textContent = newEmail;
  }

  closeEditModal();
}

function updateAvatarPreview(url) {
  const value = `url(${url})`;
  mainAvatar.style.backgroundImage = value;
  modalAvatar.style.backgroundImage = value;
  previewAvatar.style.backgroundImage = value;
  previewAvatar.textContent = '';
}

function handleFileChange() {
  const file = photoInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    updateAvatarPreview(e.target.result);
  };
  reader.readAsDataURL(file);
}

// Eventos
profileButton.addEventListener('click', openProfileModal);
closeModal.addEventListener('click', closeProfileModal);
openEdit.addEventListener('click', openEditModal);

closeEdit.addEventListener('click', closeEditModal);
cancelEdit.addEventListener('click', closeEditModal);

saveProfile.addEventListener('click', applyProfileChanges);
photoInput.addEventListener('change', handleFileChange);

openPassword.addEventListener('click', openPasswordModal);
closePassword.addEventListener('click', closePasswordModal);
cancelPassword.addEventListener('click', closePasswordModal);
savePassword.addEventListener('click', handlePasswordChange);

// Cerrar modales con ESC
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeEditModal();
    closeProfileModal();
    closePasswordModal();
  }
});

// Cerrar modal al hacer clic fuera del contenido
profileModal.addEventListener('click', (event) => {
  if (event.target === profileModal) {
    closeProfileModal();
  }
});

editModal.addEventListener('click', (event) => {
  if (event.target === editModal) {
    closeEditModal();
  }
});

passwordModal.addEventListener('click', (event) => {
  if (event.target === passwordModal) {
    closePasswordModal();
  }
});

menuItems.forEach((item) => {
  item.addEventListener('click', (event) => {
    const section = event.currentTarget.dataset.section;
    if (section) setActiveSection(section);
  });
});

// Inicialización
syncProfileFields();
setActiveSection('inicio');

