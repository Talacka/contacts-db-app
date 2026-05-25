// API Base URL (runs on the same port since Express serves this folder)
const API_BASE = '/api';

// Application State
const state = {
  people: [],
  selectedPersonId: null,
  searchQuery: '',
  activeInspectorTable: 'people' // 'people' or 'contacts'
};

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const elPeopleList = document.getElementById('people-list');
const elSearchInput = document.getElementById('input-search');

const elDetailsEmpty = document.getElementById('details-empty');
const elDetailsContent = document.getElementById('details-content');
const elPersonAvatar = document.getElementById('person-avatar');
const elPersonFullName = document.getElementById('person-fullname');
const elPersonCompany = document.getElementById('person-company');
const elContactsList = document.getElementById('contacts-list');

const elBtnDeletePerson = document.getElementById('btn-delete-person');
const elBtnReseed = document.getElementById('btn-reseed');

const elFormNewPerson = document.getElementById('form-new-person');
const elFormNewContact = document.getElementById('form-new-contact');

const elStatPeopleCount = document.getElementById('stat-people-count');
const elStatContactsCount = document.getElementById('stat-contacts-count');

const elTabBtnPeople = document.getElementById('tab-btn-people');
const elTabBtnContacts = document.getElementById('tab-btn-contacts');
const elInspectorTable = document.getElementById('inspector-table');

const elToast = document.getElementById('toast');

// ==========================================================================
// API CLIENT METHODS
// ==========================================================================
async function apiRequest(url, method = 'GET', body = null) {
  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (body) config.body = JSON.stringify(body);
    
    const response = await fetch(`${API_BASE}${url}`, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`API Error (${method} ${url}):`, err.message);
    showToast(`Error: ${err.message}`, true);
    throw err;
  }
}

// Fetch all people with aggregated contact data
async function loadPeople() {
  try {
    state.people = await apiRequest('/people');
    renderPeopleList();
    updateStats();
    
    // If a person was selected, make sure they still exist and refresh details
    if (state.selectedPersonId) {
      const exists = state.people.find(p => p.id === state.selectedPersonId);
      if (exists) {
        renderPersonDetails(exists);
      } else {
        closeDetails();
      }
    }
  } catch (err) {
    elPeopleList.innerHTML = `<div class="loading-spinner" style="color: var(--danger)">Connection to API failed. Make sure server is running.</div>`;
  }
}

// Fetch raw tables for the database inspector view
async function loadInspectorData() {
  try {
    const data = await apiRequest(`/inspect/${state.activeInspectorTable}`);
    renderInspectorTable(data);
  } catch (err) {
    elInspectorTable.innerHTML = `<tr><td style="color: var(--danger)">Failed to load inspector data.</td></tr>`;
  }
}

// ==========================================================================
// RENDER METHODS
// ==========================================================================
function renderPeopleList() {
  const filtered = state.people.filter(p => {
    const search = state.searchQuery.toLowerCase();
    const nameMatch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(search);
    const companyMatch = (p.company || '').toLowerCase().includes(search);
    return nameMatch || companyMatch;
  });

  if (filtered.length === 0) {
    elPeopleList.innerHTML = `<div class="loading-spinner">No results found.</div>`;
    return;
  }

  elPeopleList.innerHTML = '';
  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = `people-card ${p.id === state.selectedPersonId ? 'active' : ''}`;
    card.addEventListener('click', () => selectPerson(p.id));

    // Get initials
    const initials = `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
    const contactsCount = p.contacts.length;

    card.innerHTML = `
      <div class="avatar-circle" style="background-color: ${p.avatarColor || 'var(--primary)'}">
        ${initials}
      </div>
      <div class="card-meta">
        <span class="card-name">${p.firstName} ${p.lastName}</span>
        <span class="card-company">${p.company || '<span class="text-muted">No Company</span>'}</span>
      </div>
      <div class="contacts-count-tag">
        ${contactsCount} linked
      </div>
    `;

    elPeopleList.appendChild(card);
  });
}

function selectPerson(id) {
  state.selectedPersonId = id;
  const person = state.people.find(p => p.id === id);
  if (person) {
    renderPersonDetails(person);
    renderPeopleList(); // Refresh list to update active card styling
  }
}

function closeDetails() {
  state.selectedPersonId = null;
  elDetailsContent.classList.add('hidden');
  elDetailsEmpty.classList.remove('hidden');
  renderPeopleList();
}

function renderPersonDetails(person) {
  elDetailsEmpty.classList.add('hidden');
  elDetailsContent.classList.remove('hidden');

  // Fill in name & company
  elPersonFullName.textContent = `${person.firstName} ${person.lastName}`;
  elPersonCompany.innerHTML = person.company 
    ? person.company 
    : `<span style="color: var(--text-muted); font-style: italic;">No company associated</span>`;
  
  // Set avatar color & initial
  elPersonAvatar.textContent = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
  elPersonAvatar.style.backgroundColor = person.avatarColor || 'var(--primary)';
  
  // Setup delete button handler
  elBtnDeletePerson.onclick = () => handleDeletePerson(person);

  // Fill in linked contacts list
  elContactsList.innerHTML = '';
  if (person.contacts.length === 0) {
    elContactsList.innerHTML = `
      <div class="contact-row" style="justify-content: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
        No contact methods linked yet. Create one below!
      </div>
    `;
    return;
  }

  person.contacts.forEach(c => {
    const row = document.createElement('div');
    row.className = 'contact-row';

    let badgeClass = 'badge-email';
    if (c.type === 'Phone') badgeClass = 'badge-phone';
    else if (c.type === 'Social') badgeClass = 'badge-social';
    else if (c.type === 'Address') badgeClass = 'badge-address';

    row.innerHTML = `
      <div class="contact-main">
        <div class="contact-icon-badge ${badgeClass}">${c.type.substring(0, 2).toUpperCase()}</div>
        <div class="contact-details">
          <span class="contact-label-tag">${c.label}</span>
          <span class="contact-value-text" title="${c.value}">${c.value}</span>
        </div>
      </div>
      <button class="btn-delete-contact" title="Unlink Contact">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    row.querySelector('.btn-delete-contact').addEventListener('click', () => handleDeleteContact(c.id));
    elContactsList.appendChild(row);
  });
}

function renderInspectorTable(data) {
  const thead = elInspectorTable.querySelector('thead');
  const tbody = elInspectorTable.querySelector('tbody');
  
  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    thead.innerHTML = `<tr><th>Table is empty</th></tr>`;
    tbody.innerHTML = `<tr><td>No records stored. Click "Reset & Reseed" to populate data.</td></tr>`;
    return;
  }

  // Get columns from first item keys
  const columns = Object.keys(data[0]);
  
  // Build header row
  const headerTr = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerTr.appendChild(th);
  });
  thead.appendChild(headerTr);

  // Build body rows
  data.forEach(row => {
    const tr = document.createElement('tr');
    
    // Highlight connection columns to emphasize relational linking
    columns.forEach(col => {
      const td = document.createElement('td');
      td.textContent = row[col] === null ? 'NULL' : row[col];
      
      // Visual styling for foreign and primary keys in database
      if (col === 'id') {
        td.style.color = 'var(--accent-gold)';
        td.style.fontWeight = 'bold';
      } else if (col === 'person_id') {
        td.style.color = 'var(--accent-cyan)';
        td.style.fontWeight = 'bold';
      }
      
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function updateStats() {
  elStatPeopleCount.textContent = state.people.length;
  
  const contactsCount = state.people.reduce((sum, p) => sum + p.contacts.length, 0);
  elStatContactsCount.textContent = contactsCount;
}

// ==========================================================================
// ACTIONS & EVENT HANDLERS
// ==========================================================================
async function handleDeletePerson(person) {
  if (confirm(`Are you sure you want to delete ${person.firstName} ${person.lastName}? This will CASCADE and delete all their linked contact methods in the database!`)) {
    try {
      await apiRequest(`/people/${person.id}`, 'DELETE');
      showToast('Person and all linked contacts deleted (cascade).');
      closeDetails();
      await loadPeople();
      await loadInspectorData();
    } catch (err) {
      showToast('Failed to delete person.', true);
    }
  }
}

async function handleDeleteContact(contactId) {
  if (confirm('Unlink this contact details?')) {
    try {
      await apiRequest(`/contacts/${contactId}`, 'DELETE');
      showToast('Contact detail deleted.');
      await loadPeople();
      await loadInspectorData();
    } catch (err) {
      showToast('Failed to delete contact.', true);
    }
  }
}

// Reseed Database Handler
async function handleReseed() {
  elBtnReseed.disabled = true;
  elBtnReseed.innerHTML = `
    <svg class="icon-spin-hover" style="animation: spin 1s linear infinite" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
    Reseeding...
  `;

  try {
    const res = await apiRequest('/db/reseed', 'POST');
    showToast(res.message);
    
    // Reset state & reload
    state.selectedPersonId = null;
    closeDetails();
    await loadPeople();
    await loadInspectorData();
  } catch (err) {
    showToast('Reseed operation failed.', true);
  } finally {
    elBtnReseed.disabled = false;
    elBtnReseed.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-spin-hover"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
      Reset & Reseed
    `;
  }
}

// Toast System
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
// INITIALIZATION & ATTACH LISTENERS
// ==========================================================================
function init() {
  // Search box listener
  elSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderPeopleList();
  });

  // Reseed button listener
  elBtnReseed.addEventListener('click', handleReseed);

  // New Person Form Submit
  elFormNewPerson.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('input-firstname').value.trim();
    const lastName = document.getElementById('input-lastname').value.trim();
    const company = document.getElementById('input-company').value.trim();
    
    const checkedRadio = document.querySelector('input[name="avatar-color"]:checked');
    const avatarColor = checkedRadio ? checkedRadio.value : '#6366f1';

    try {
      const newPerson = await apiRequest('/people', 'POST', { firstName, lastName, company, avatarColor });
      showToast('Person added to database.');
      elFormNewPerson.reset();
      
      await loadPeople();
      selectPerson(newPerson.id);
      await loadInspectorData();
    } catch (err) {
      showToast('Failed to add person.', true);
    }
  });

  // New Contact Form Submit
  elFormNewContact.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.selectedPersonId) return;

    const type = document.getElementById('select-contact-type').value;
    const label = document.getElementById('input-contact-label').value.trim();
    const value = document.getElementById('input-contact-value').value.trim();

    try {
      await apiRequest(`/people/${state.selectedPersonId}/contacts`, 'POST', { type, label, value });
      showToast('Contact linked to person in database.');
      elFormNewContact.reset();
      
      await loadPeople();
      await loadInspectorData();
    } catch (err) {
      showToast('Failed to link contact.', true);
    }
  });

  // Inspector Tab Toggle Listeners
  elTabBtnPeople.addEventListener('click', () => {
    elTabBtnPeople.classList.add('active');
    elTabBtnContacts.classList.remove('active');
    state.activeInspectorTable = 'people';
    loadInspectorData();
  });

  elTabBtnContacts.addEventListener('click', () => {
    elTabBtnContacts.classList.add('active');
    elTabBtnPeople.classList.remove('active');
    state.activeInspectorTable = 'contacts';
    loadInspectorData();
  });

  // Initial Data Load
  loadPeople();
  loadInspectorData();
}

// Start application
document.addEventListener('DOMContentLoaded', init);
