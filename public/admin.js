// Global variables
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('user'));

// DOM elements
const currentUserElement = document.getElementById('currentUser');
const logoutBtn = document.getElementById('logoutBtn');
const addAdminBtn = document.getElementById('addAdminBtn');
const addAdminModal = document.getElementById('addAdminModal');
const closeModal = document.getElementById('closeModal');
const cancelAdd = document.getElementById('cancelAdd');
const addAdminForm = document.getElementById('addAdminForm');
const adminsTableBody = document.getElementById('adminsTableBody');
const loadingOverlay = document.getElementById('loadingOverlay');
const notificationContainer = document.getElementById('notificationContainer');

// Stats elements
const totalAdminsElement = document.getElementById('totalAdmins');
const activeAdminsElement = document.getElementById('activeAdmins');
const totalRolesElement = document.getElementById('totalRoles');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
    loadAdminsData();
    loadStats();
});

// Check authentication
function checkAuth() {
    if (!authToken || !currentUser) {
        window.location.href = '/';
        return;
    }
    
    // Check if user has any admin role
    if (!currentUser.roles || !(currentUser.roles.includes('Админ') || 
                               currentUser.roles.includes('Аналитик') || 
                               currentUser.roles.includes('Менеджер') || 
                               currentUser.roles.includes('Тим-лидер') || 
                               currentUser.roles.includes('Хед'))) {
        showNotification('Ошибка доступа', 'У вас нет прав для доступа к этой странице', 'error');
        window.location.href = '/coin.html';
        return;
    }
    
    currentUserElement.textContent = currentUser.username || currentUser.email;
}

// Setup event listeners
function setupEventListeners() {
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Add admin modal
    addAdminBtn.addEventListener('click', () => {
        addAdminModal.classList.add('show');
    });
    
    closeModal.addEventListener('click', () => {
        addAdminModal.classList.remove('show');
    });
    
    cancelAdd.addEventListener('click', () => {
        addAdminModal.classList.remove('show');
    });
    
    // Add admin form
    addAdminForm.addEventListener('submit', handleAddAdmin);
    
    // Close modal on outside click
    addAdminModal.addEventListener('click', (e) => {
        if (e.target === addAdminModal) {
            addAdminModal.classList.remove('show');
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && addAdminModal.classList.contains('show')) {
            addAdminModal.classList.remove('show');
        }
    });
}

// Load admins data
async function loadAdminsData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                displayAdmins(result.users);
            } else {
                showNotification('Ошибка!', result.errors.join(', '), 'error');
            }
        } else {
            const errorData = await response.json();
            showNotification('Ошибка!', errorData.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Error loading admins:', error);
        showNotification('Ошибка!', 'Не удалось загрузить данные администраторов', 'error');
    } finally {
        showLoading(false);
    }
}

// Display admins in table
function displayAdmins(users) {
    adminsTableBody.innerHTML = '';
    
    // Filter users with roles (admins)
    const admins = users.filter(user => user.roles && user.roles.length > 0);
    
    if (admins.length === 0) {
        adminsTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: #666;">
                    Нет администраторов в системе
                </td>
            </tr>
        `;
        return;
    }
    
    admins.forEach(admin => {
        const row = document.createElement('tr');
        
        const roles = admin.roles.map(role => {
            const roleClass = getRoleClass(role);
            return `<span class="role-badge ${roleClass}">${role}</span>`;
        }).join(' ');
        
        const statusClass = admin.status === 'active' ? 'active' : 'inactive';
        
        row.innerHTML = `
            <td>
                <div class="admin-info">
                    <div class="admin-avatar">
                        ${admin.username.charAt(0).toUpperCase()}
                    </div>
                    <div class="admin-details">
                        <span class="admin-name">${admin.username}</span>
                        <span class="admin-username">ID: ${admin.id}</span>
                    </div>
                </div>
            </td>
            <td>${admin.email}</td>
            <td>${roles}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${getStatusDisplayName(admin.status)}
                </span>
            </td>
            <td>${formatDate(admin.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit btn-sm" onclick="editAdmin('${admin.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-sm" onclick="deleteAdmin('${admin.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        adminsTableBody.appendChild(row);
    });
}

// Load stats
async function loadStats() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const users = result.users;
                const admins = users.filter(user => user.roles && user.roles.length > 0);
                const activeAdmins = admins.filter(admin => admin.status === 'active');
                
                totalAdminsElement.textContent = admins.length;
                activeAdminsElement.textContent = activeAdmins.length;
                totalRolesElement.textContent = '5'; // Fixed number of roles
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Handle add admin form submission
async function handleAddAdmin(e) {
    e.preventDefault();
    
    const formData = new FormData(addAdminForm);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        roleId: formData.get('roleId'),
        notes: formData.get('notes')
    };
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Успешно!', 'Администратор успешно создан', 'success');
            addAdminModal.classList.remove('show');
            addAdminForm.reset();
            loadAdminsData();
            loadStats();
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
        showNotification('Ошибка!', 'Не удалось создать администратора', 'error');
    } finally {
        showLoading(false);
    }
}

// Edit admin function
function editAdmin(adminId) {
    showNotification('Информация', 'Функция редактирования будет добавлена в следующем обновлении', 'info');
}

// Delete admin function
function deleteAdmin(adminId) {
    if (confirm('Вы уверены, что хотите удалить этого администратора?')) {
        showNotification('Информация', 'Функция удаления будет добавлена в следующем обновлении', 'info');
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Utility functions
function getRoleClass(role) {
    const roleClasses = {
        'Админ': 'admin',
        'Аналитик': 'analyst',
        'Менеджер': 'manager',
        'Тим-лидер': 'team-lead',
        'Хед': 'head'
    };
    return roleClasses[role] || 'admin';
}

function getStatusDisplayName(status) {
    const statuses = {
        'active': 'Активный',
        'inactive': 'Неактивный',
        'pending': 'Ожидающий'
    };
    return statuses[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Loading and notification functions
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

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
        notification.remove();
    }, 5000);
    
    // Remove on click
    notification.addEventListener('click', () => {
        notification.remove();
    });
}
