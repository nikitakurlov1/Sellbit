/**
 * Универсальная система уведомлений для SellBit
 * Поддерживает различные типы уведомлений с красивой анимацией
 */

class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.init();
    }

    /**
     * Инициализация системы уведомлений
     */
    init() {
        // Создаем контейнер для уведомлений
        this.createContainer();
        
        // Добавляем CSS стили
        this.addStyles();
        
        console.log('📢 Notification Manager initialized');
    }

    /**
     * Создание контейнера для уведомлений
     */
    createContainer() {
        // Удаляем старый контейнер если есть
        const oldContainer = document.getElementById('notification-system');
        if (oldContainer) {
            oldContainer.remove();
        }

        // Создаем новый контейнер
        this.container = document.createElement('div');
        this.container.id = 'notification-system';
        this.container.className = 'notification-system';
        document.body.appendChild(this.container);
    }

    /**
     * Добавление CSS стилей
     */
    addStyles() {
        // Проверяем, не добавлены ли уже стили
        if (document.getElementById('notification-system-styles')) {
            return;
        }

        const link = document.createElement('link');
        link.id = 'notification-system-styles';
        link.rel = 'stylesheet';
        link.href = 'notification-system.css';
        document.head.appendChild(link);
    }

    /**
     * Показать уведомление
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления (success, error, warning, info, sync, connection)
     * @param {Object} options - Дополнительные опции
     */
    show(message, type = 'info', options = {}) {
        const {
            title = this.getDefaultTitle(type),
            duration = this.getDefaultDuration(type),
            closable = true,
            actions = null,
            progress = null,
            id = null
        } = options;

        // Создаем уведомление
        const notification = this.createNotification({
            id: id || this.generateId(),
            title,
            message,
            type,
            closable,
            actions,
            progress,
            duration
        });

        // Добавляем в контейнер
        this.container.appendChild(notification);

        // Показываем с анимацией
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Автоматическое закрытие
        if (duration > 0) {
            this.autoClose(notification, duration);
        }

        return notification;
    }

    /**
     * Создание элемента уведомления
     */
    createNotification({ id, title, message, type, closable, actions, progress, duration = 0 }) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.dataset.id = id;

        // Иконка
        const icon = this.getIcon(type);

        // HTML структура
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="notification-text">
                    <div class="notification-title">${title}</div>
                    <div class="notification-message">${message}</div>
                    ${actions ? this.createActionsHTML(actions) : ''}
                    ${progress ? this.createProgressHTML(progress) : ''}
                </div>
                ${closable ? '<button class="notification-close" onclick="window.notificationManager.close(\'' + id + '\')"><i class="fas fa-times"></i></button>' : ''}
            </div>
            ${duration > 0 ? '<div class="notification-progress"><div class="notification-progress-bar" style="width: 100%; animation-duration: ' + duration + 'ms;"></div></div>' : ''}
        `;

        // Сохраняем в Map
        this.notifications.set(id, notification);

        return notification;
    }

    /**
     * Создание HTML для действий
     */
    createActionsHTML(actions) {
        const actionsHTML = actions.map(action => 
            `<button class="btn-${action.type || 'secondary'}" onclick="${action.onclick}">${action.text}</button>`
        ).join('');
        
        return `<div class="notification-action">${actionsHTML}</div>`;
    }

    /**
     * Создание HTML для прогресса
     */
    createProgressHTML(progress) {
        return `
            <div class="notification-progress-container">
                <div class="notification-progress-text">${progress.text || ''}</div>
                <div class="notification-progress-bar-container">
                    <div class="notification-progress-bar-fill" style="width: ${progress.value || 0}%"></div>
                </div>
            </div>
        `;
    }

    /**
     * Закрытие уведомления
     */
    close(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Анимация закрытия
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
            this.notifications.delete(id);
        }, 400);
    }

    /**
     * Автоматическое закрытие
     */
    autoClose(notification, duration) {
        const id = notification.dataset.id;
        setTimeout(() => {
            this.close(id);
        }, duration);
    }

    /**
     * Обновление прогресса
     */
    updateProgress(id, value, text = null) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const progressBar = notification.querySelector('.notification-progress-bar-fill');
        const progressText = notification.querySelector('.notification-progress-text');

        if (progressBar) {
            progressBar.style.width = `${value}%`;
        }

        if (progressText && text) {
            progressText.textContent = text;
        }
    }

    /**
     * Закрытие всех уведомлений
     */
    closeAll() {
        this.notifications.forEach((notification, id) => {
            this.close(id);
        });
    }

    /**
     * Получение иконки по типу
     */
    getIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle',
            sync: 'sync-alt',
            connection: 'wifi',
            loading: 'spinner'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Получение заголовка по умолчанию
     */
    getDefaultTitle(type) {
        const titles = {
            success: 'Успешно',
            error: 'Ошибка',
            warning: 'Предупреждение',
            info: 'Информация',
            sync: 'Синхронизация',
            connection: 'Подключение',
            loading: 'Загрузка'
        };
        return titles[type] || 'Уведомление';
    }

    /**
     * Получение длительности по умолчанию
     */
    getDefaultDuration(type) {
        const durations = {
            success: 3000,
            error: 5000,
            warning: 4000,
            info: 3000,
            sync: 2000,
            connection: 3000,
            loading: 0 // Не закрывается автоматически
        };
        return durations[type] || 3000;
    }

    /**
     * Генерация уникального ID
     */
    generateId() {
        return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ========================================
    // МЕТОДЫ ДЛЯ РАЗЛИЧНЫХ ТИПОВ УВЕДОМЛЕНИЙ
    // ========================================

    /**
     * Успешное уведомление
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Уведомление об ошибке
     */
    error(message, options = {}) {
        return this.show(message, 'error', { ...options, duration: 5000 });
    }

    /**
     * Предупреждение
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Информационное уведомление
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Уведомление о синхронизации
     */
    sync(message, options = {}) {
        return this.show(message, 'sync', { ...options, duration: 2000 });
    }

    /**
     * Уведомление о подключении
     */
    connection(message, options = {}) {
        return this.show(message, 'connection', options);
    }

    /**
     * Уведомление о загрузке
     */
    loading(message, options = {}) {
        return this.show(message, 'loading', { ...options, duration: 0, closable: false });
    }
}

// Создаем глобальный экземпляр
window.notificationManager = new NotificationManager();

// Экспортируем для использования в других модулях
window.NotificationManager = NotificationManager;

// ========================================
// УДОБНЫЕ ФУНКЦИИ ДЛЯ БЫСТРОГО ДОСТУПА
// ========================================

/**
 * Быстрые функции для показа уведомлений
 */
window.showNotification = (message, type = 'info', options = {}) => {
    return window.notificationManager.show(message, type, options);
};

window.showSuccess = (message, options = {}) => {
    return window.notificationManager.success(message, options);
};

window.showError = (message, options = {}) => {
    return window.notificationManager.error(message, options);
};

window.showWarning = (message, options = {}) => {
    return window.notificationManager.warning(message, options);
};

window.showInfo = (message, options = {}) => {
    return window.notificationManager.info(message, options);
};

window.showSync = (message, options = {}) => {
    return window.notificationManager.sync(message, options);
};

window.showConnection = (message, options = {}) => {
    return window.notificationManager.connection(message, options);
};

window.showLoading = (message, options = {}) => {
    return window.notificationManager.loading(message, options);
};

console.log('📢 Notification system loaded successfully');
