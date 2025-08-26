// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// DOM elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const switchFormLinks = document.querySelectorAll('.switch-form');
const loadingOverlay = document.getElementById('loadingOverlay');
const notificationContainer = document.getElementById('notificationContainer');

// Form containers
const loginContainer = document.getElementById('login-form');
const registerContainer = document.getElementById('register-form');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupPasswordToggles();
    
    // Check if user is already logged in
    if (authToken) {
        checkAuthStatus();
    }
});

function initializeApp() {
    // Show login form by default
    showView('login');
}

function setupEventListeners() {
    // Switch form links
    switchFormLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.target;
            showView(target);
        });
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegistration);
}

function setupPasswordToggles() {
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const input = toggle.parentElement.querySelector('input');
            const icon = toggle.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// View management
function showView(view) {
    // Hide all containers
    loginContainer.classList.add('hidden');
    registerContainer.classList.add('hidden');

    // Show selected view
    switch (view) {
        case 'login':
            loginContainer.classList.remove('hidden');
            break;
        case 'register':
            registerContainer.classList.remove('hidden');
            break;
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        showLoading(true);
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showNotification('Успешно!', 'Вход выполнен успешно', 'success');
            
            // Check user roles and redirect accordingly
            if (currentUser.roles && currentUser.roles.length > 0) {
                // User has roles - redirect to CRM
                if (currentUser.roles.includes('Админ') || currentUser.roles.includes('Аналитик') || 
                    currentUser.roles.includes('Менеджер') || currentUser.roles.includes('Тим-лидер') || 
                    currentUser.roles.includes('Хед')) {
                    window.location.href = '/coin.html';
                } else {
                    // Regular user - redirect to main exchange page
                    if (currentUser.status !== 'active') {
                        showAccountStatusMessage(currentUser.status);
                    }
                    window.location.href = '/coin.html';
                }
            } else if (currentUser.username === 'AdminNKcoin') {
                // Fallback for AdminNKcoin without roles
                window.location.href = '/coin.html';
            } else {
                // Regular user without roles
                if (currentUser.status !== 'active') {
                    showAccountStatusMessage(currentUser.status);
                }
                window.location.href = '/coin.html';
            }
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Ошибка!', 'Произошла ошибка при входе', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(registerForm);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    };

    // Client-side validation
    if (!validateRegistrationData(data)) {
        return;
    }

    try {
        showLoading(true);
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showNotification('Успешно!', 'Аккаунт создан успешно. Ожидайте подтверждения от администратора.', 'success');
            // Redirect to main exchange page
            window.location.href = '/coin.html';
        } else {
            showNotification('Ошибка!', result.errors.join(', '), 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Ошибка!', 'Произошла ошибка при регистрации', 'error');
    } finally {
        showLoading(false);
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/account', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                currentUser = JSON.parse(localStorage.getItem('user'));
                
                // Check user status
                if (currentUser.username !== 'AdminNKcoin' && currentUser.status !== 'active') {
                    showAccountStatusMessage(currentUser.status);
                }
                
                // Redirect based on user roles
                if (currentUser.roles && currentUser.roles.length > 0) {
                    // User has roles - redirect to CRM
                    if (currentUser.roles.includes('Админ') || currentUser.roles.includes('Аналитик') || 
                        currentUser.roles.includes('Менеджер') || currentUser.roles.includes('Тим-лидер') || 
                        currentUser.roles.includes('Хед')) {
                        window.location.href = '/coin.html';
                    } else {
                        window.location.href = '/coin.html';
                    }
                } else if (currentUser.username === 'AdminNKcoin') {
                    // Fallback for AdminNKcoin without roles
                    window.location.href = '/coin.html';
                } else {
                    window.location.href = '/coin.html';
                }
                return;
            }
        } else if (response.status === 403) {
            const result = await response.json();
            showNotification('Аккаунт не активен', result.errors[0], 'error');
            handleLogout();
            return;
        }
        
        // If auth check fails, clear stored data
        handleLogout();
    } catch (error) {
        console.error('Auth check error:', error);
        handleLogout();
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    showNotification('Информация', 'Вы вышли из аккаунта', 'info');
    showView('login');
}

function showAccountStatusMessage(status) {
    const statusMessages = {
        'pending': 'Ваш аккаунт находится на рассмотрении. Ожидайте подтверждения от администратора.',
        'rejected': 'Ваш аккаунт был отклонен. Обратитесь к администратору для уточнения деталей.',
        'processing': 'Ваш аккаунт находится в обработке. Ожидайте решения от администратора.'
    };
    
    const message = statusMessages[status] || 'Ваш аккаунт не активен. Обратитесь к администратору.';
    showNotification('Статус аккаунта', message, 'info');
}

// Validation functions
function validateRegistrationData(data) {
    const errors = [];

    if (!data.username || data.username.length < 3) {
        errors.push('Имя пользователя должно содержать минимум 3 символа');
    }

    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Введите корректный email');
    }

    if (!data.password || data.password.length < 6) {
        errors.push('Пароль должен содержать минимум 6 символов');
    }

    if (data.password !== data.confirmPassword) {
        errors.push('Пароли не совпадают');
    }

    if (errors.length > 0) {
        showNotification('Ошибка валидации!', errors.join(', '), 'error');
        return false;
    }

    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Utility functions
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeForm = document.querySelector('.auth-form:not(.hidden)');
        if (activeForm) {
            activeForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to close notifications
    if (e.key === 'Escape') {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => notification.remove());
    }
});
