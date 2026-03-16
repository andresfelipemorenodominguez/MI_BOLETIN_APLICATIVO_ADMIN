const editBtn = document.querySelector(".btn"); 
const editModal = document.getElementById("editModal");
const closeEdit = document.getElementById("closeEdit");
const cancelEdit = document.getElementById("cancelEdit");

const saveBtn = document.getElementById("saveProfile");

const nameInput = document.getElementById("editName");
const emailInput = document.getElementById("editEmail");

const profileName = document.querySelector(".profile-name");
const profileEmail = document.querySelector(".profile-email");

const previewAvatar = document.getElementById("previewAvatar");
const photoInput = document.getElementById("photoInput");

// Profile modal elements
const profileButton = document.getElementById('profileButton');
const profileModal = document.getElementById('profileModal');
const closeModal = document.getElementById('closeModal');
const openEdit = document.getElementById('openEdit');
const openPassword = document.getElementById('openPassword');

// Password modal elements
const passwordModal = document.getElementById('passwordModal');
const closePassword = document.getElementById('closePassword');
const cancelPassword = document.getElementById('cancelPassword');
const savePassword = document.getElementById('savePassword');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');

// Navigation
const menuItems = Array.from(document.querySelectorAll('.menu-item'));
const content = document.getElementById('content');

const sections = {
  inicio: {
    title: 'Inicio',
    body: 'Gracias por utilizar MiBoletín. Utiliza el menú para navegar.'
  },
  estudiante: {
    title: 'Subir Notas',
    body: 'Aquí podrías añadir un formulario para subir notas de estudiantes.'
  },
  profesor: {
    title: 'Reportes Aprendiz',
    body: 'Aquí podrías mostrar reportes de aprendizaje.'
  },
  reportes: {
    title: 'Reporte General',
    body: 'Muestra gráficos e información sobre el desempeño general.'
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

function syncProfileFields() {
  const modalName = document.getElementById('modalName');
  const modalEmail = document.getElementById('modalEmail');
  const modalAvatar = document.getElementById('modalAvatar');
  const mainAvatar = document.getElementById('mainAvatar');
  const mainName = document.getElementById('mainName');
  const mainEmail = document.getElementById('mainEmail');

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
    profileName.textContent = newName;
    document.getElementById('modalName').textContent = newName;
  }

  if (newEmail) {
    profileEmail.textContent = newEmail;
    document.getElementById('modalEmail').textContent = newEmail;
  }

  closeEditModal();
}

function changePassword() {
  const current = currentPassword.value;
  const newPass = newPassword.value;
  const confirm = confirmPassword.value;

  if (!current || !newPass || !confirm) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  if (newPass !== confirm) {
    alert('La nueva contraseña y la confirmación no coinciden.');
    return;
  }

  // Aquí iría la lógica para cambiar la contraseña, por ahora solo alert
  alert('Contraseña cambiada exitosamente.');
  closePasswordModal();
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
}

function updateAvatarPreview(url) {
  const value = `url(${url})`;
  document.getElementById('mainAvatar').style.backgroundImage = value;
  document.getElementById('modalAvatar').style.backgroundImage = value;
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

// Profile modal events
profileButton.addEventListener('click', openProfileModal);
closeModal.addEventListener('click', closeProfileModal);
openEdit.addEventListener('click', openEditModal);
openPassword.addEventListener('click', openPasswordModal);

// Password modal events
closePassword.addEventListener('click', closePasswordModal);
cancelPassword.addEventListener('click', closePasswordModal);
savePassword.addEventListener('click', changePassword);

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