// Global variables
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let requisites = [];
let editingRequisiteId = null;

// DOM elements
const requisitesTableBody = document.getElementById('requisitesTableBody');
const addRequisiteBtn = document.getElementById('addRequisiteBtn');
const refreshRequisitesBtn = document.getElementById('refreshRequisitesBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserSpan = document.getElementById('currentUser');
const loadingOverlay = document.getElementById('loadingOverlay');
const notificationContainer = document.getElementById('notificationContainer');

// Modal elements
const requisiteModal = document.getElementById('requisiteModal');
const modalTitle = document.getElementById('modalTitle');
const requisiteForm = document.getElementById('requisiteForm');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');

// Filter elements
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const typeFilter = document.getElementById('typeFilter');

// Stats elements
const totalRequisites = document.getElementById('totalRequisites');
const activeRequisites = document.getElementById('activeRequisites');
const totalAmount = document.getElementById('totalAmount');
const pendingRequisites = document.getElementById('pendingRequisites');

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    setupEventListeners();
    loadRequisites();
});

// Authentication check
async function checkAuth() {
    if (!authToken) {
        window.location.href = '/index.html';
        return;
    }

    try {
        // Get current user info and permissions
        const response = await fetch('/api/user/permissions', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get user permissions');
        }

        const data = await response.json();
        currentUser = data.data;
        
        currentUserSpan.textContent = currentUser.user.username || 'Пользователь';

        // Check if user has access to requisites section
        if (!currentUser.permissions.requisites?.read) {
            showNotification('Ошибка доступа', 'У вас нет прав для доступа к этой странице', 'error');
            window.location.href = '/coin.html';
            return;
        }

        // Show/hide admin link based on roles
        const adminLink = document.getElementById('adminLink');
        if (adminLink) {
            if (currentUser.user && currentUser.user.roles && 
                (currentUser.user.roles.includes('Админ') || 
                 currentUser.user.roles.includes('Аналитик') || 
                 currentUser.user.roles.includes('Менеджер') || 
                 currentUser.user.roles.includes('Тим-лидер') || 
                 currentUser.user.roles.includes('Хед'))) {
                adminLink.style.display = 'flex';
            } else {
                adminLink.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Error checking auth:', error);
        // Fallback to localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            currentUser = JSON.parse(userData);
            currentUserSpan.textContent = currentUser.username || 'Пользователь';
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Buttons
    addRequisiteBtn.addEventListener('click', openAddModal);
    refreshRequisitesBtn.addEventListener('click', loadRequisites);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Modal
    closeModal.addEventListener('click', closeModalHandler);
    cancelBtn.addEventListener('click', closeModalHandler);
    requisiteForm.addEventListener('submit', handleFormSubmit);
    
    // Filters
    searchInput.addEventListener('input', filterRequisites);
    statusFilter.addEventListener('change', filterRequisites);
    typeFilter.addEventListener('change', filterRequisites);
    
    // Close modal on outside click
    requisiteModal.addEventListener('click', function(e) {
        if (e.target === requisiteModal) {
            closeModalHandler();
        }
    });
}

// Load requisites from server
async function loadRequisites() {
    try {
        showLoading(true);
        const response = await fetch('/api/requisites', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                requisites = result.requisites || [];
                updateStats();
                renderRequisitesTable();
            } else {
                showNotification('Ошибка!', result.errors.join(', '), 'error');
            }
        } else {
            throw new Error('Failed to load requisites');
        }
    } catch (error) {
        console.error('Error loading requisites:', error);
        showNotification('Ошибка!', 'Не удалось загрузить реквизиты', 'error');
    } finally {
        showLoading(false);
    }
}

// Update statistics
function updateStats() {
    const total = requisites.length;
    const active = requisites.filter(r => r.status === 'active').length;
    const pending = requisites.filter(r => r.status === 'pending').length;
    
    totalRequisites.textContent = total;
    activeRequisites.textContent = active;
    pendingRequisites.textContent = pending;
    totalAmount.textContent = `₽${calculateTotalAmount()}`;
}

// Calculate total amount (placeholder function)
function calculateTotalAmount() {
    // This would be calculated based on actual transaction data
    return '0';
}

// Render requisites table
function renderRequisitesTable() {
    requisitesTableBody.innerHTML = '';
    
    if (requisites.length === 0) {
        requisitesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-credit-card" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #ddd;"></i>
                    <p>Реквизиты не найдены</p>
                    <button class="btn btn-primary" onclick="openAddModal()" style="margin-top: 1rem;">
                        <i class="fas fa-plus"></i>
                        <span>Добавить первый реквизит</span>
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    requisites.forEach(requisite => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="type-icon type-${requisite.type}">
                    <i class="fas ${getTypeIcon(requisite.type)}"></i>
                    <span>${getTypeLabel(requisite.type)}</span>
                </div>
            </td>
            <td>
                <div>
                    <div style="font-weight: 500;">${requisite.name}</div>
                    ${requisite.description ? `<div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">${requisite.description}</div>` : ''}
                </div>
            </td>
            <td>
                <div style="font-family: monospace; font-size: 0.9rem;">
                    ${maskNumber(requisite.number)}
                </div>
            </td>
            <td>${requisite.bank}</td>
            <td>
                <span class="status-badge status-${requisite.status}">
                    ${getStatusLabel(requisite.status)}
                </span>
            </td>
            <td>${formatDate(requisite.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-secondary" onclick="editRequisite('${requisite.id}')" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="copyRequisite('${requisite.id}')" title="Копировать">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRequisite('${requisite.id}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        requisitesTableBody.appendChild(row);
    });
}

// Get type icon
function getTypeIcon(type) {
    const icons = {
        'card': 'fa-credit-card',
        'account': 'fa-university',
        'crypto': 'fa-bitcoin'
    };
    return icons[type] || 'fa-credit-card';
}

// Get type label
function getTypeLabel(type) {
    const labels = {
        'card': 'Карта',
        'account': 'Счет',
        'crypto': 'Крипто'
    };
    return labels[type] || 'Неизвестно';
}

// Get status label
function getStatusLabel(status) {
    const labels = {
        'active': 'Активные',
        'inactive': 'Неактивные',
        'pending': 'Ожидающие'
    };
    return labels[status] || 'Неизвестно';
}

// Mask number for security
function maskNumber(number) {
    if (!number) return '';
    if (number.length <= 8) return number;
    return number.substring(0, 4) + ' **** **** ' + number.substring(number.length - 4);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Filter requisites
function filterRequisites() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilterValue = statusFilter.value;
    const typeFilterValue = typeFilter.value;
    
    const filteredRequisites = requisites.filter(requisite => {
        const matchesSearch = !searchTerm || 
            requisite.name.toLowerCase().includes(searchTerm) ||
            requisite.bank.toLowerCase().includes(searchTerm) ||
            requisite.number.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilterValue || requisite.status === statusFilterValue;
        const matchesType = !typeFilterValue || requisite.type === typeFilterValue;
        
        return matchesSearch && matchesStatus && matchesType;
    });
    
    renderFilteredRequisites(filteredRequisites);
}

// Render filtered requisites
function renderFilteredRequisites(filteredRequisites) {
    requisitesTableBody.innerHTML = '';
    
    if (filteredRequisites.length === 0) {
        requisitesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #ddd;"></i>
                    <p>По вашему запросу ничего не найдено</p>
                </td>
            </tr>
        `;
        return;
    }
    
    filteredRequisites.forEach(requisite => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="type-icon type-${requisite.type}">
                    <i class="fas ${getTypeIcon(requisite.type)}"></i>
                    <span>${getTypeLabel(requisite.type)}</span>
                </div>
            </td>
            <td>
                <div>
                    <div style="font-weight: 500;">${requisite.name}</div>
                    ${requisite.description ? `<div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">${requisite.description}</div>` : ''}
                </div>
            </td>
            <td>
                <div style="font-family: monospace; font-size: 0.9rem;">
                    ${maskNumber(requisite.number)}
                </div>
            </td>
            <td>${requisite.bank}</td>
            <td>
                <span class="status-badge status-${requisite.status}">
                    ${getStatusLabel(requisite.status)}
                </span>
            </td>
            <td>${formatDate(requisite.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-secondary" onclick="editRequisite('${requisite.id}')" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="copyRequisite('${requisite.id}')" title="Копировать">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRequisite('${requisite.id}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        requisitesTableBody.appendChild(row);
    });
}

// Open add modal
function openAddModal() {
    editingRequisiteId = null;
    modalTitle.textContent = 'Добавить реквизиты';
    requisiteForm.reset();
    requisiteModal.classList.remove('hidden');
}

// Edit requisite
function editRequisite(id) {
    const requisite = requisites.find(r => r.id === id);
    if (!requisite) return;
    
    editingRequisiteId = id;
    modalTitle.textContent = 'Редактировать реквизиты';
    
    // Fill form with existing data
    document.getElementById('requisiteType').value = requisite.type;
    document.getElementById('requisiteName').value = requisite.name;
    document.getElementById('requisiteNumber').value = requisite.number;
    document.getElementById('requisiteBank').value = requisite.bank;
    document.getElementById('requisiteHolder').value = requisite.holder;
    document.getElementById('requisiteStatus').value = requisite.status;
    document.getElementById('requisiteDescription').value = requisite.description || '';
    
    requisiteModal.classList.remove('hidden');
}

// Copy requisite
async function copyRequisite(id) {
    const requisite = requisites.find(r => r.id === id);
    if (!requisite) return;
    
    try {
        const textToCopy = `
Реквизиты для пополнения:
Тип: ${getTypeLabel(requisite.type)}
Название: ${requisite.name}
Номер: ${requisite.number}
Банк: ${requisite.bank}
Получатель: ${requisite.holder}
${requisite.description ? `Описание: ${requisite.description}` : ''}
        `.trim();
        
        await navigator.clipboard.writeText(textToCopy);
        showNotification('Успешно!', 'Реквизиты скопированы в буфер обмена', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showNotification('Ошибка!', 'Не удалось скопировать реквизиты', 'error');
    }
}

// Delete requisite
async function deleteRequisite(id) {
    if (!confirm('Вы уверены, что хотите удалить эти реквизиты?')) {
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch(`/api/requisites/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showNotification('Успешно!', 'Реквизиты удалены', 'success');
                loadRequisites();
            } else {
                showNotification('Ошибка!', result.errors.join(', '), 'error');
            }
        } else {
            throw new Error('Failed to delete requisite');
        }
    } catch (error) {
        console.error('Error deleting requisite:', error);
        showNotification('Ошибка!', 'Не удалось удалить реквизиты', 'error');
    } finally {
        showLoading(false);
    }
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(requisiteForm);
    const data = {
        type: formData.get('type'),
        name: formData.get('name'),
        number: formData.get('number'),
        bank: formData.get('bank'),
        holder: formData.get('holder'),
        status: formData.get('status'),
        description: formData.get('description')
    };
    
    // Validation
    if (!validateRequisiteData(data)) {
        return;
    }
    
    try {
        showLoading(true);
        const url = editingRequisiteId ? `/api/requisites/${editingRequisiteId}` : '/api/requisites';
        const method = editingRequisiteId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const message = editingRequisiteId ? 'Реквизиты обновлены' : 'Реквизиты добавлены';
                showNotification('Успешно!', message, 'success');
                closeModalHandler();
                loadRequisites();
            } else {
                showNotification('Ошибка!', result.errors.join(', '), 'error');
            }
        } else {
            throw new Error('Failed to save requisite');
        }
    } catch (error) {
        console.error('Error saving requisite:', error);
        showNotification('Ошибка!', 'Не удалось сохранить реквизиты', 'error');
    } finally {
        showLoading(false);
    }
}

// Validate requisite data
function validateRequisiteData(data) {
    const errors = [];
    
    if (!data.type) {
        errors.push('Выберите тип реквизитов');
    }
    
    if (!data.name || data.name.trim().length < 3) {
        errors.push('Название должно содержать минимум 3 символа');
    }
    
    if (!data.number || data.number.trim().length < 5) {
        errors.push('Номер должен содержать минимум 5 символов');
    }
    
    if (!data.bank || data.bank.trim().length < 2) {
        errors.push('Укажите банк или сеть');
    }
    
    if (!data.holder || data.holder.trim().length < 2) {
        errors.push('Укажите получателя');
    }
    
    if (!data.status) {
        errors.push('Выберите статус');
    }
    
    if (errors.length > 0) {
        showNotification('Ошибка валидации!', errors.join(', '), 'error');
        return false;
    }
    
    return true;
}

// Close modal
function closeModalHandler() {
    requisiteModal.classList.add('hidden');
    editingRequisiteId = null;
    requisiteForm.reset();
}

// Handle logout
function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    showNotification('Информация', 'Вы вышли из аккаунта', 'info');
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 1000);
}

// Show loading
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// Show notification
function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;

    notificationContainer.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}
