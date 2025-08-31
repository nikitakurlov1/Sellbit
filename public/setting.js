// Settings Page JavaScript

class SettingsPage {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
    }

    bindEvents() {
        // Back button
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.history.back();
            });
        }

        // Setting items
        const settingItems = document.querySelectorAll('.setting-item');
        settingItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleSettingClick(item, e);
            });
        });

        // Toggle switches
        const toggleSwitches = document.querySelectorAll('.toggle-switch input');
        toggleSwitches.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.handleToggleChange(e.target);
            });
        });

        // Logout button
        const logoutItem = document.querySelector('.logout-item');
        if (logoutItem) {
            logoutItem.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Search button
        const searchBtn = document.querySelector('.header-right .icon-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.showToast('Поиск по настройкам', 'info');
            });
        }
    }

    handleSettingClick(item, event) {
        // Don't trigger if clicking on toggle switch
        if (event.target.closest('.toggle-switch')) {
            return;
        }

        const title = item.querySelector('.setting-title')?.textContent;
        
        switch (title) {
            case 'Скрыть баланс':
                // Toggle is handled separately
                break;
            case 'Сменить пароль':
                this.openChangePasswordModal();
                break;
            case 'Очистить историю':
                this.clearHistory();
                break;
            case 'Экспорт данных':
                this.exportData();
                break;
            case 'Сбросить приложение':
                this.resetApp();
                break;
            case 'Связаться с поддержкой':
                window.location.href = 'support.html';
                break;
            case 'О приложении':
                this.showAppInfo();
                break;
            default:
                this.showToast('Функция в разработке', 'info');
                break;
        }
    }

    handleToggleChange(toggle) {
        const settingItem = toggle.closest('.setting-item');
        const title = settingItem.querySelector('.setting-title')?.textContent;
        const isChecked = toggle.checked;

        switch (title) {
            case 'Скрыть баланс':
                this.saveSetting('hideBalance', isChecked);
                this.showToast(
                    isChecked ? 'Баланс скрыт' : 'Баланс отображается',
                    'success'
                );
                this.updateBalanceVisibility(isChecked);
                break;
            case 'Уведомления':
                this.saveSetting('notifications', isChecked);
                this.showToast(
                    isChecked ? 'Уведомления включены' : 'Уведомления отключены',
                    'success'
                );
                break;
            case 'Автообновление':
                this.saveSetting('autoUpdate', isChecked);
                this.showToast(
                    isChecked ? 'Автообновление включено' : 'Автообновление отключено',
                    'success'
                );
                break;
            default:
                this.showToast('Настройка изменена', 'success');
                break;
        }
    }

    saveSetting(key, value) {
        localStorage.setItem(key, value);
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    handleLogout() {
        if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    }

    openChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.style.display = 'block';
            this.bindPasswordForm();
        }
    }

    bindPasswordForm() {
        const form = document.getElementById('changePasswordForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }
    }

    handlePasswordChange() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Простая валидация
        if (newPassword.length < 6) {
            this.showToast('Новый пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showToast('Пароли не совпадают', 'error');
            return;
        }

        // Симулируем смену пароля
        this.showToast('Пароль успешно изменен', 'success');
        this.closeModal('changePasswordModal');
        
        // Очищаем форму
        document.getElementById('changePasswordForm').reset();
    }

    clearHistory() {
        if (confirm('Вы уверены, что хотите очистить всю историю транзакций? Это действие нельзя отменить.')) {
            // Очищаем все типы истории
            localStorage.removeItem('purchases');
            localStorage.removeItem('sales');
            localStorage.removeItem('activeStakes');
            localStorage.removeItem('stakeHistory');
            localStorage.removeItem('deposits');
            localStorage.removeItem('withdrawals');
            
            this.showToast('История транзакций очищена', 'success');
        }
    }

    resetApp() {
        if (confirm('Вы уверены, что хотите сбросить все данные приложения? Это действие нельзя отменить.')) {
            // Очищаем все данные
            localStorage.clear();
            this.showToast('Приложение сброшено', 'success');
            
            // Перезагружаем страницу
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    exportData() {
        // Собираем все данные пользователя
        const userData = {
            user: JSON.parse(localStorage.getItem('user') || '{}'),
            purchases: JSON.parse(localStorage.getItem('purchases') || '[]'),
            sales: JSON.parse(localStorage.getItem('sales') || '[]'),
            activeStakes: JSON.parse(localStorage.getItem('activeStakes') || '[]'),
            stakeHistory: JSON.parse(localStorage.getItem('stakeHistory') || '[]'),
            deposits: JSON.parse(localStorage.getItem('deposits') || '[]'),
            withdrawals: JSON.parse(localStorage.getItem('withdrawals') || '[]'),
            exportDate: new Date().toISOString()
        };

        // Создаем JSON файл для скачивания
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `sellbit_data_${new Date().toISOString().split('T')[0]}.json`;
        
        // Скачиваем файл
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Данные экспортированы', 'success');
    }

    showAppInfo() {
        const appInfo = {
            name: 'SellBit',
            version: '1.0.0',
            description: '🚀 Инновационная криптовалютная биржа нового поколения',
            features: [
                '💎 Торговля 50+ криптовалютами с минимальными комиссиями',
                '🎯 Уникальный стейкинг с предсказанием движения цен',
                '🔒 Максимальная безопасность: холодное хранение, 2FA, шифрование',
                '⚡ Мгновенные транзакции с высокой пропускной способностью',
                '📱 Современный адаптивный интерфейс для всех устройств',
                '🌍 Поддержка пользователей 24/7 на русском языке',
                '📊 Продвинутая аналитика и графики в реальном времени',
                '🎮 Геймификация: зарабатывайте на предсказании трендов'
            ],
            stats: {
                users: '100,000+',
                volume: '$50M+',
                coins: '50+',
                uptime: '99.9%'
            }
        };

        const message = `
            ${appInfo.name} v${appInfo.version}
            
            ${appInfo.description}
            
            📈 Статистика платформы:
            👥 Пользователей: ${appInfo.stats.users}
            💰 Объем торгов: ${appInfo.stats.volume}
            🪙 Криптовалют: ${appInfo.stats.coins}
            ⏰ Время работы: ${appInfo.stats.uptime}
            
            🎯 Ключевые возможности:
            ${appInfo.features.map(feature => `${feature}`).join('\n')}
            
            🔮 Будущее криптотрейдинга уже здесь!
        `;

        this.showToast(message, 'info');
    }

    updateBalanceVisibility(hideBalance) {
        // Сохраняем настройку в localStorage
        localStorage.setItem('hideBalance', hideBalance);
        
        // Обновляем отображение баланса на текущей странице
        const balanceElements = document.querySelectorAll('.balance-amount, .balance-value, #totalBalance');
        balanceElements.forEach(element => {
            if (hideBalance) {
                element.textContent = '***';
            } else {
                // Восстанавливаем реальный баланс
                const user = JSON.parse(localStorage.getItem('user')) || {};
                element.textContent = `$${user.balance ? user.balance.toFixed(2) : '0.00'}`;
            }
        });
    }

    loadSettings() {
        // Загружаем сохраненные настройки
        const hideBalance = localStorage.getItem('hideBalance') === 'true';
        const notifications = localStorage.getItem('notifications') !== 'false';
        const autoUpdate = localStorage.getItem('autoUpdate') !== 'false';

        const hideBalanceToggle = document.getElementById('hideBalanceToggle');
        const notificationsToggle = document.getElementById('notificationsToggle');
        const autoUpdateToggle = document.getElementById('autoUpdateToggle');

        if (hideBalanceToggle) {
            hideBalanceToggle.checked = hideBalance;
            this.updateBalanceVisibility(hideBalance);
        }
        if (notificationsToggle) {
            notificationsToggle.checked = notifications;
        }
        if (autoUpdateToggle) {
            autoUpdateToggle.checked = autoUpdate;
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Глобальные функции для работы с модальными окнами
function openChangePasswordModal() {
    const settingsPage = window.settingsPage;
    if (settingsPage) {
        settingsPage.openChangePasswordModal();
    }
}

function closeModal(modalId) {
    const settingsPage = window.settingsPage;
    if (settingsPage) {
        settingsPage.closeModal(modalId);
    }
}

function clearHistory() {
    const settingsPage = window.settingsPage;
    if (settingsPage) {
        settingsPage.clearHistory();
    }
}

function exportData() {
    const settingsPage = window.settingsPage;
    if (settingsPage) {
        settingsPage.exportData();
    }
}

function resetApp() {
    const settingsPage = window.settingsPage;
    if (settingsPage) {
        settingsPage.resetApp();
    }
}

// Initialize settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.settingsPage = new SettingsPage();
});
