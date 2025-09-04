// Система синхронизации баланса между CRM и биржей

class BalanceSync {
    constructor() {
        this.syncInterval = null;
        this.isOnline = navigator.onLine;
        this.consecutiveFailures = 0;
        this.maxRetries = 5;
        this.baseDelay = 5000; // 5 seconds
        this.maxDelay = 300000; // 5 minutes
        this.currentDelay = this.baseDelay;
        this.init();
    }

    init() {
        // Слушаем изменения состояния сети
        this.setupNetworkListeners();
        
        // Запускаем синхронизацию с учетом состояния сети
        this.startSync();
        
        // Слушаем изменения в localStorage
        this.listenToLocalStorageChanges();
    }

    startSync() {
        if (!this.isOnline) {
            console.log('Offline mode - sync paused');
            return;
        }
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (this.isOnline) {
                this.syncBalance();
            }
        }, this.currentDelay);
    }

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Синхронизация баланса с сервером
    async syncBalance() {
        if (!this.isOnline) {
            return;
        }
        
        try {
            const currentUser = JSON.parse(localStorage.getItem('user'));
            const authToken = localStorage.getItem('authToken');
            
            if (!currentUser || !authToken) {
                return;
            }

            // Получаем актуальный баланс с сервера (из базы данных)
            // Используем userId из JWT токена
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const response = await fetch(`/api/users/${payload.userId}/balance`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Reset failure counter on success
                    this.consecutiveFailures = 0;
                    this.currentDelay = this.baseDelay;
                    
                    const serverBalance = result.balance;
                    const localBalance = currentUser.balance || 0;

                    // Если баланс на сервере отличается от локального, обновляем
                    if (Math.abs(serverBalance - localBalance) > 0.01) {
                        currentUser.balance = serverBalance;
                        localStorage.setItem('user', JSON.stringify(currentUser));
                        
                        // Обновляем отображение баланса
                        this.updateBalanceDisplay(serverBalance);
                        
                        console.log(`Баланс синхронизирован из БД: ${localBalance} -> ${serverBalance}`);
                        
                        // Показываем уведомление об изменении баланса
                        const change = serverBalance - localBalance;
                        if (Math.abs(change) > 0.01) {
                            const changeText = change > 0 ? `+$${change.toFixed(2)}` : `-$${Math.abs(change).toFixed(2)}`;
                            this.showNotification(
                                'Баланс обновлен',
                                `Ваш баланс изменен на ${changeText}`,
                                change > 0 ? 'success' : 'info'
                            );
                        }
                    }
                }
            } else {
                this.handleSyncFailure();
            }
        } catch (error) {
            this.handleSyncFailure(error);
        }
    }

    // Обновление отображения баланса на странице
    updateBalanceDisplay(newBalance) {
        // Обновляем на главной странице биржи
        const balanceElement = document.getElementById('totalBalance');
        if (balanceElement) {
            const isBalanceHidden = localStorage.getItem('balanceHidden') === 'true';
            if (isBalanceHidden) {
                balanceElement.textContent = '$****.**';
            } else {
                balanceElement.textContent = `$${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
        }

        // Обновляем в других местах где отображается баланс
        const availableBalanceElements = document.querySelectorAll('[id*="availableBalance"]');
        availableBalanceElements.forEach(element => {
            element.textContent = `$${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        });

        // Вызываем функцию обновления статистики если она существует
        if (typeof updateStats === 'function') {
            updateStats();
        }
    }

    // Слушаем изменения в localStorage
    listenToLocalStorageChanges() {
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            originalSetItem.apply(this, arguments);
            
            // Если изменился баланс пользователя, синхронизируем с сервером
            if (key === 'user') {
                try {
                    const user = JSON.parse(value);
                    if (user && user.balance !== undefined) {
                        // Отправляем обновление на сервер
                        BalanceSync.updateServerBalance(user.balance);
                    }
                } catch (error) {
                    console.error('Ошибка парсинга пользователя:', error);
                }
            }
        };
    }

    // Обновление баланса на сервере
    static async updateServerBalance(newBalance) {
        if (!navigator.onLine) {
            console.log('Offline - balance update queued');
            return false;
        }
        
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) return false;

            // Используем userId из JWT токена
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const response = await fetch(`/api/users/${payload.userId}/balance`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ balance: newBalance }),
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log(`Баланс обновлен на сервере: ${newBalance}`);
                    return true;
                }
            }
            return false;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Balance update timeout');
            } else {
                console.error('Ошибка обновления баланса на сервере:', error.message);
            }
            return false;
        }
    }

    // Обновление баланса пользователя (вызывается из CRM)
    static async updateUserBalance(newBalance) {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) return;

            // Используем userId из JWT токена
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const response = await fetch(`/api/users/${payload.userId}/balance`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ balance: newBalance })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Обновляем локальный баланс текущего пользователя
                    const currentUser = JSON.parse(localStorage.getItem('user'));
                    if (currentUser) {
                        currentUser.balance = newBalance;
                        localStorage.setItem('user', JSON.stringify(currentUser));
                        
                        // Обновляем отображение
                        const balanceSync = new BalanceSync();
                        balanceSync.updateBalanceDisplay(newBalance);
                    }
                    
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Ошибка обновления баланса пользователя:', error);
            return false;
        }
    }

    // Получение актуального баланса пользователя
    static async getUserBalance() {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) return null;

            // Используем userId из JWT токена
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const response = await fetch(`/api/users/${payload.userId}/balance`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    return result.balance;
                }
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения баланса пользователя:', error);
            return null;
        }
    }

    // Показ уведомлений
    showNotification(title, message, type = 'info') {
        // Проверяем, есть ли функция showToast
        if (typeof showToast === 'function') {
            showToast(title, message, type);
        } else if (typeof showNotification === 'function') {
            showNotification(title, message, type);
        } else {
            // Создаем простое уведомление
            const notification = document.createElement('div');
            notification.className = `balance-notification ${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
                color: white;
                padding: 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                max-width: 300px;
                animation: slideIn 0.3s ease;
            `;
            notification.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
                <div style="font-size: 14px;">${message}</div>
            `;
            
            document.body.appendChild(notification);
            
            // Удаляем через 5 секунд
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 5000);
        }
    }

    // Обработка неудачных попыток синхронизации
    handleSyncFailure(error = null) {
        this.consecutiveFailures++;
        
        // Логируем только первые несколько ошибок, чтобы не засорять консоль
        if (this.consecutiveFailures <= 3) {
            if (error) {
                console.warn(`Sync failure #${this.consecutiveFailures}:`, error.message || error);
            } else {
                console.warn(`Sync failure #${this.consecutiveFailures}: Server error`);
            }
        }
        
        // Увеличиваем задержку экспоненциально
        if (this.consecutiveFailures >= this.maxRetries) {
            this.currentDelay = Math.min(this.currentDelay * 2, this.maxDelay);
            console.warn(`Increasing sync delay to ${this.currentDelay / 1000} seconds`);
            this.restartSync();
        }
    }
    
    // Настройка слушателей состояния сети
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            this.isOnline = true;
            this.consecutiveFailures = 0;
            this.currentDelay = this.baseDelay;
            this.startSync();
        });
        
        window.addEventListener('offline', () => {
            console.log('Network connection lost');
            this.isOnline = false;
            this.stopSync();
        });
    }
    
    // Перезапуск синхронизации с новой задержкой
    restartSync() {
        this.stopSync();
        this.startSync();
    }
}

// Инициализация синхронизации при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что мы на странице биржи (не в CRM)
    if (window.location.pathname.includes('home.html') || 
        window.location.pathname.includes('coins.html') ||
        window.location.pathname.includes('Buy.html') ||
        window.location.pathname.includes('Sale.html') ||
        window.location.pathname.includes('Dep.html') ||
        window.location.pathname.includes('vivod.html')) {
        
        window.balanceSync = new BalanceSync();
    }
});

// Экспортируем для использования в других файлах
window.BalanceSync = BalanceSync;
