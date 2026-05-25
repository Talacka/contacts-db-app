const API_BASE = '/api';

// Application State
const state = {
  people: [],
  searchQuery: '',
  expandedCardId: null // Keep track of which card is currently open
};

// DOM Elements
const elListRoot = document.getElementById('contacts-list-root');
const elSearchInput = document.getElementById('input-search');
const elBtnOpenAddPerson = document.getElementById('btn-open-add-person');

const elModalPerson = document.getElementById('modal-person');
const elModalContact = document.getElementById('modal-contact');

const elFormNewPerson = document.getElementById('form-new-person');
const elFormNewContact = document.getElementById('form-new-contact');
const elLinkPersonIdInput = document.getElementById('input-link-person-id');

const elToast = document.getElementById('toast');

// ==========================================================================
// API REQUEST HELPER
// ==========================================================================
async function apiRequest(url, method = 'GET', body = null) {
  try {
    const config = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) config.body = JSON.stringify(body);
    
    const response = await fetch(`${API_BASE}${url}`, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    showToast(`Error: ${err.message}`, true);
    throw err;
  }
}

// ==========================================================================
// DATA LOADING & RENDERING
// ==========================================================================
async function loadContacts() {
  try {
    state.people = await apiRequest('/people');
    renderContactsList();
  } catch (err) {
    elListRoot.innerHTML = `<div class="loading-spinner" style="color: var(--danger)">Connection to API failed. Make sure server is running.</div>`;
  }
}

function renderContactsList() {
  const filtered = state.people.filter(p => {
    const search = state.searchQuery.toLowerCase();
    const nameMatch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(search);
    const companyMatch = (p.company || '').toLowerCase().includes(search);
    const contactValueMatch = p.contacts.some(c => c.value.toLowerCase().includes(search));
    return nameMatch || companyMatch || contactValueMatch;
  });

  if (filtered.length === 0) {
    elListRoot.innerHTML = `<div class="loading-spinner">No contacts found.</div>`;
    return;
  }

  elListRoot.innerHTML = '';
  filtered.forEach(p => {
    const isExpanded = p.id === state.expandedCardId;
    const card = document.createElement('div');
    card.className = `minimal-card ${isExpanded ? 'expanded' : ''}`;
    card.dataset.id = p.id;

    const initials = `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
    const contactsCount = p.contacts.length;

    // Build the expanded contents
    let contactsHtml = '';
    if (p.contacts.length === 0) {
      contactsHtml = `
        <div style="padding: 16px 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
          No contact methods linked yet.
        </div>
      `;
    } else {
      contactsHtml = p.contacts.map(c => {
        let badgeClass = 'badge-email';
        if (c.type === 'Phone') badgeClass = 'badge-phone';
        else if (c.type === 'Social') badgeClass = 'badge-social';
        else if (c.type === 'Address') badgeClass = 'badge-address';

        return `
          <div class="contact-row" style="border: none; background: transparent; padding: 10px 20px;">
            <div class="contact-main">
              <div class="contact-icon-badge ${badgeClass}" style="width: 28px; height: 28px; font-size: 0.7rem;">${c.type.substring(0, 2).toUpperCase()}</div>
              <div class="contact-details">
                <span class="contact-label-tag" style="font-size: 0.6rem;">${c.label}</span>
                <span class="contact-value-text" style="font-size: 0.85rem; color: #e2e8f0;">${c.value}</span>
              </div>
            </div>
            <button class="btn-delete-contact" onclick="event.stopPropagation(); handleDeleteContact(${c.id})" title="Delete Contact">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        `;
      }).join('');
    }

    card.innerHTML = `
      <div class="card-trigger">
        <div class="avatar-circle" style="background-color: ${p.avatarColor || 'var(--primary)'}; width: 36px; height: 36px; font-size: 0.85rem;">
          ${initials}
        </div>
        <div class="card-meta">
          <span class="card-name" style="font-size: 0.9rem;">${p.firstName} ${p.lastName}</span>
          <span class="card-company" style="font-size: 0.7rem;">${p.company || '<span class="text-muted">No Company</span>'}</span>
        </div>
        <div class="contacts-count-tag" style="font-size: 0.65rem; padding: 2px 6px;">
          ${contactsCount} linked
        </div>
        <div class="card-chevron">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </div>
      <div class="card-expand-content">
        <div class="contacts-list-container" style="padding: 8px 0;">
          ${contactsHtml}
        </div>
        <hr class="divider">
        <div class="card-actions" style="padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.1);">
          <button class="btn btn-secondary" onclick="event.stopPropagation(); openAddContactModal(${p.id})" style="padding: 6px 12px; font-size: 0.75rem;">
            + Link Detail
          </button>
          <button class="btn btn-secondary" onclick="event.stopPropagation(); handleDeletePerson(${p.id}, '${p.firstName} ${p.lastName}')" style="padding: 6px 12px; font-size: 0.75rem; color: var(--danger); border-color: rgba(244, 63, 94, 0.15); background: rgba(244, 63, 94, 0.05);">
            Delete Profile
          </button>
        </div>
      </div>
    `;

    // Click handler to toggle accordion
    card.querySelector('.card-trigger').addEventListener('click', () => {
      toggleCard(p.id);
    });

    elListRoot.appendChild(card);
  });
}

function toggleCard(id) {
  if (state.expandedCardId === id) {
    state.expandedCardId = null;
  } else {
    state.expandedCardId = id;
  }
  renderContactsList();
}

// ==========================================================================
// MODAL MANAGEMENT
// ==========================================================================
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

window.closeModal = closeModal; // Expose to window for inline onclick attributes

function openAddContactModal(personId) {
  elLinkPersonIdInput.value = personId;
  openModal('modal-contact');
}
window.openAddContactModal = openAddContactModal;

// ==========================================================================
// CONTROLLER ACTIONS
// ==========================================================================
async function handleDeletePerson(id, fullname) {
  if (confirm(`Delete ${fullname}? This will cascade and delete all linked details.`)) {
    try {
      await apiRequest(`/people/${id}`, 'DELETE');
      showToast('Profile deleted successfully.');
      if (state.expandedCardId === id) state.expandedCardId = null;
      loadContacts();
    } catch (err) {
      showToast('Deletion failed.', true);
    }
  }
}
window.handleDeletePerson = handleDeletePerson;

async function handleDeleteContact(id) {
  if (confirm('Delete this contact detail?')) {
    try {
      await apiRequest(`/contacts/${id}`, 'DELETE');
      showToast('Contact detail deleted.');
      loadContacts();
    } catch (err) {
      showToast('Deletion failed.', true);
    }
  }
}
window.handleDeleteContact = handleDeleteContact;

// Toast Notification
function showToast(message, isError = false) {
  elToast.textContent = message;
  elToast.style.background = isError ? 'var(--danger)' : '#10b981';
  elToast.style.boxShadow = isError 
    ? '0 10px 25px -5px rgba(244, 63, 94, 0.4)' 
    : '0 10px 25px -5px rgba(16, 185, 129, 0.4)';
  elToast.classList.remove('hidden');
  
  setTimeout(() => {
    elToast.classList.add('hidden');
  }, 4000);
}

// ==========================================================================
// EVENTS & LISTENERS
// ==========================================================================
function init() {
  // Search filtering
  elSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderContactsList();
  });

  // Modal open
  elBtnOpenAddPerson.addEventListener('click', () => {
    openModal('modal-person');
  });

  // Form submit: Add Person
  elFormNewPerson.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('input-firstname').value.trim();
    const lastName = document.getElementById('input-lastname').value.trim();
    const company = document.getElementById('input-company').value.trim();
    
    const checkedRadio = document.querySelector('input[name="avatar-color"]:checked');
    const avatarColor = checkedRadio ? checkedRadio.value : '#6366f1';

    try {
      const newPerson = await apiRequest('/people', 'POST', { firstName, lastName, company, avatarColor });
      showToast('Contact profile created.');
      elFormNewPerson.reset();
      closeModal('modal-person');
      
      state.expandedCardId = newPerson.id; // Automatically expand the new person
      loadContacts();
    } catch (err) {
      showToast('Failed to create profile.', true);
    }
  });

  // Form submit: Add Contact Detail
  elFormNewContact.addEventListener('submit', async (e) => {
    e.preventDefault();
    const personId = elLinkPersonIdInput.value;
    const type = document.getElementById('select-contact-type').value;
    const label = document.getElementById('input-contact-label').value.trim();
    const value = document.getElementById('input-contact-value').value.trim();

    try {
      await apiRequest(`/people/${personId}/contacts`, 'POST', { type, label, value });
      showToast('Contact details linked.');
      elFormNewContact.reset();
      closeModal('modal-contact');
      loadContacts();
    } catch (err) {
      showToast('Failed to link details.', true);
    }
  });

  // Initial load
  loadContacts();
}

document.addEventListener('DOMContentLoaded', init);
