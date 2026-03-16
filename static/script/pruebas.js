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
const calendarContainer = document.getElementById('calendarContainer');

// Calendar variables
let currentDate = new Date();
let selectedDate = new Date();
let events = JSON.parse(localStorage.getItem('calendarEvents')) || {};

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
  },
  calendario: {
    title: 'Calendario',
    body: 'Calendario para gestionar tus citas y eventos.'
  }
};

function setActiveSection(sectionKey) {
  const section = sections[sectionKey] || sections.inicio;
  
  if (sectionKey === 'calendario') {
    content.style.display = 'none';
    calendarContainer.style.display = 'block';
    renderCalendar();
    updateEventsList();
  } else {
    calendarContainer.style.display = 'none';
    content.style.display = 'block';
    content.innerHTML = `
      <div class="card">
        <h2>${section.title}</h2>
        <p>${section.body}</p>
      </div>
    `;
  }

  menuItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.section === sectionKey);
  });
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Actualizar título
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  document.getElementById('monthName').textContent = monthNames[month];
  document.getElementById('yearName').textContent = year;

  // Obtener el primer día del mes y cantidad de días
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarBody = document.getElementById('calendarBody');
  calendarBody.innerHTML = '';

  const today = new Date();
  const dateRows = [];
  let row = document.createElement('tr');
  let dayCounter = 1;

  // Llenar primeros días del mes anterior
  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'calendar-table__item calendar-table__item--inactive';
    button.textContent = daysInPrevMonth - (firstDay - 1 - i);
    button.disabled = true;
    cell.appendChild(button);
    row.appendChild(cell);
  }

// Asegurarse de que selectedDate esté dentro del mes actual
    if (selectedDate.getFullYear() !== year || selectedDate.getMonth() !== month) {
      selectedDate = new Date(year, month, 1);
    }

    // Llenar días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      if (row.children.length === 7) {
        dateRows.push(row);
        row = document.createElement('tr');
      }

      const dateObj = new Date(year, month, day);
      const dateKey = getDateKey(dateObj);

      const cell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-table__item';
      button.textContent = day;

      // Marcar día de hoy
      if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
        button.classList.add('calendar-table__item--today');
      }

      // Marcar si tiene eventos
      if (events[dateKey] && events[dateKey].length > 0) {
        button.classList.add('calendar-table__item--event');
      }

      // Marcar día seleccionado
      if (dateObj.toDateString() === selectedDate.toDateString()) {
        button.classList.add('calendar-table__item--selected');
      }

      button.addEventListener('click', () => {
        document.querySelectorAll('.calendar-table__item--selected').forEach(el => el.classList.remove('calendar-table__item--selected'));
        button.classList.add('calendar-table__item--selected');
        selectedDate = dateObj;
        updateEventsList();
        document.getElementById('eventDate').valueAsDate = dateObj;
      });

      cell.appendChild(button);
    dayCounter += 1;
  }

  // Rellenar al final con días del mes siguiente
  while (row.children.length < 7) {
    const cell = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-table__item calendar-table__item--inactive';
    button.textContent = dayCounter - daysInMonth;
    button.disabled = true;
    cell.appendChild(button);
    row.appendChild(cell);
    dayCounter += 1;
  }

  dateRows.push(row);

  // Asegurar 6 filas visibles (como UI datepicker)
  while (dateRows.length < 6) {
    const emptyRow = document.createElement('tr');
    for (let i = 0; i < 7; i++) {
      const cell = document.createElement('td');
      const span = document.createElement('span');
      span.textContent = '';
      cell.appendChild(span);
      emptyRow.appendChild(cell);
    }
    dateRows.push(emptyRow);
  }

  dateRows.forEach(r => calendarBody.appendChild(r));

  // Mantener el evento seleccionado visible y actualizar lista
  document.getElementById('eventDate').valueAsDate = selectedDate;
  updateEventsList();
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar();
}

function getDateKey(date) {
  return date.toISOString().split('T')[0];
}

function addEvent(date, title, description) {
  const dateKey = getDateKey(date);
  if (!events[dateKey]) {
    events[dateKey] = [];
  }
  events[dateKey].push({
    id: Date.now(),
    title: title,
    description: description,
    date: dateKey
  });
  localStorage.setItem('calendarEvents', JSON.stringify(events));
  renderCalendar();
  updateEventsList();
}

function deleteEvent(dateKey, eventId) {
  if (events[dateKey]) {
    events[dateKey] = events[dateKey].filter(e => e.id !== eventId);
    if (events[dateKey].length === 0) {
      delete events[dateKey];
    }
    localStorage.setItem('calendarEvents', JSON.stringify(events));
    renderCalendar();
    updateEventsList();
  }
}

function updateEventsList() {
  const dateKey = getDateKey(selectedDate);
  const eventsList = document.getElementById('eventsList');
  const dayEvents = events[dateKey] || [];

  if (dayEvents.length === 0) {
    eventsList.innerHTML = '<p class="no-events">No hay eventos para este día</p>';
  } else {
    eventsList.innerHTML = dayEvents.map(event => `
      <div class="event-item">
        <p class="event-item-title">${event.title}</p>
        ${event.description ? `<p class="event-item-description">${event.description}</p>` : ''}
        <div class="event-item-date">${new Date(event.date).toLocaleDateString('es-ES')}</div>
        <button class="event-delete-btn" data-event-id="${event.id}" data-date-key="${dateKey}">✕</button>
      </div>
    `).join('');
    
    // Agregar event listeners a los botones de eliminar
    document.querySelectorAll('.event-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventId = parseInt(btn.dataset.eventId);
        const dateKey = btn.dataset.dateKey;
        deleteEvent(dateKey, eventId);
      });
    });
  }
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

// Calendar navigation events
document.getElementById('prevMonth').addEventListener('click', (e) => { e.preventDefault(); changeMonth(-1); });
document.getElementById('nextMonth').addEventListener('click', (e) => { e.preventDefault(); changeMonth(1); });

// Event form events
document.getElementById('addEventBtn').addEventListener('click', () => {
  const dateInput = document.getElementById('eventDate');
  const titleInput = document.getElementById('eventTitle');
  const descriptionInput = document.getElementById('eventDescription');
  
  if (!dateInput.value || !titleInput.value.trim()) {
    alert('Por favor completa la fecha y el título del evento.');
    return;
  }
  
  const date = new Date(dateInput.value + 'T00:00:00');
  addEvent(date, titleInput.value.trim(), descriptionInput.value.trim());
  
  // Limpiar formulario
  titleInput.value = '';
  descriptionInput.value = '';
  dateInput.value = '';
});

// Permitir Enter para agregar evento
document.getElementById('eventTitle').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('addEventBtn').click();
  }
});

// Inicialización
syncProfileFields();
setActiveSection('inicio');

// Establecer fecha actual en el input
const today = new Date().toISOString().split('T')[0];
document.getElementById('eventDate').value = today;