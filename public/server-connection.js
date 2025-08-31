// Модуль для проверки подключения к серверу
class ServerConnection {
    constructor() {
        this.isConnected = false;
        this.serverUrl = window.location.origin; // Используем текущий домен
        this.checkInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 секунды
        
        this.init();
    }
    
    init() {
        // Проверяем подключение при загрузке
        this.checkConnection();
        
        // Устанавливаем периодическую проверку
        this.startPeriodicCheck();
        
        // Слушаем события онлайн/оффлайн
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }
    
    async checkConnection() {
        try {
            // Проверяем подключение к серверу
            const response = await fetch(`${this.serverUrl}/api/health`, {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                this.setConnected(true);
                this.reconnectAttempts = 0;
                return true;
            } else {
                this.setConnected(false);
                return false;
            }
        } catch (error) {
            console.log('Ошибка подключения к серверу:', error.message);
            this.setConnected(false);
            return false;
        }
    }
    
    setConnected(status) {
        const wasConnected = this.isConnected;
        this.isConnected = status;
        
        // Уведомляем о изменении статуса
        if (wasConnected !== status) {
            this.notifyStatusChange(status);
        }
        
        // Обновляем UI
        this.updateUI(status);
    }
    
    updateUI(status) {
        // Обновляем индикатор подключения в header
        const connectionIndicator = document.getElementById('connectionIndicator');
        if (connectionIndicator) {
            if (status) {
                connectionIndicator.innerHTML = '<i class="fas fa-wifi"></i>';
                connectionIndicator.className = 'connection-indicator connected';
                connectionIndicator.title = 'Подключено к серверу';
            } else {
                connectionIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                connectionIndicator.className = 'connection-indicator disconnected';
                connectionIndicator.title = 'Нет подключения к серверу';
            }
        }
        
        // Показываем уведомление при потере соединения
        if (!status && this.reconnectAttempts === 0) {
            this.showConnectionNotification();
        }
    }
    
    showConnectionNotification() {
        // Используем новую систему уведомлений
        if (window.notificationManager) {
            return window.notificationManager.show(
                'Потеряно подключение к серверу. Попытка переподключения...',
                'error',
                {
                    title: 'Проблема с подключением',
                    duration: 5000
                }
            );
        }
        
        // Fallback для старой системы
        console.error('Потеряно подключение к серверу');
    }
    
    notifyStatusChange(status) {
        // Отправляем кастомное событие
        window.dispatchEvent(new CustomEvent('server-connection-change', {
            detail: { connected: status }
        }));
        
        console.log(`Статус подключения к серверу: ${status ? 'Подключено' : 'Отключено'}`);
    }
    
    handleOnline() {
        console.log('Интернет-соединение восстановлено');
        this.reconnectAttempts = 0;
        this.checkConnection();
    }
    
    handleOffline() {
        console.log('Интернет-соединение потеряно');
        this.setConnected(false);
    }
    
    startPeriodicCheck() {
        // Проверяем подключение каждые 30 секунд
        this.checkInterval = setInterval(() => {
            this.checkConnection();
        }, 30000);
    }
    
    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    
    async reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Достигнуто максимальное количество попыток переподключения');
            return false;
        }
        
        this.reconnectAttempts++;
        console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        // Ждем перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        
        const success = await this.checkConnection();
        if (success) {
            console.log('Переподключение успешно');
            return true;
        } else {
            // Рекурсивно пытаемся переподключиться
            return this.reconnect();
        }
    }
    
    // Публичные методы
    getStatus() {
        return this.isConnected;
    }
    
    forceCheck() {
        return this.checkConnection();
    }
}

// Создаем глобальный экземпляр
window.serverConnection = new ServerConnection();

// Экспортируем для использования в других модулях
window.ServerConnection = ServerConnection;
