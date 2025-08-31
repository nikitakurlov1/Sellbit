// Модуль для синхронизации данных с сервером
class DataSync {
    constructor() {
        this.syncInterval = null;
        this.lastSync = null;
        this.syncInProgress = false;
        this.offlineData = new Map(); // Хранит данные для отправки при восстановлении связи
        
        this.init();
    }
    
    init() {
        // Слушаем изменения подключения
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Запускаем периодическую синхронизацию
        this.startPeriodicSync();
        
        // Слушаем события от server-connection
        window.addEventListener('server-connection-change', (event) => {
            if (event.detail.connected) {
                this.handleServerConnected();
            } else {
                this.handleServerDisconnected();
            }
        });
    }
    
    // Запуск периодической синхронизации
    startPeriodicSync() {
        // Синхронизируем каждые 30 секунд при наличии интернета
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && this.isServerConnected()) {
                this.syncData();
            }
        }, 30000);
    }
    
    // Остановка синхронизации
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    // Проверка подключения к серверу
    isServerConnected() {
        return window.serverConnection && window.serverConnection.getStatus();
    }
    
    // Основная функция синхронизации
    async syncData() {
        if (this.syncInProgress) {
            console.log('Синхронизация уже выполняется...');
            return;
        }
        
        this.syncInProgress = true;
        console.log('🔄 Начало синхронизации данных с сервером...');
        
        try {
            // Синхронизируем баланс
            await this.syncBalance();
            
            // Синхронизируем цены криптовалют
            await this.syncCryptoPrices();
            
            // Синхронизируем историю транзакций
            await this.syncTransactionHistory();
            
            // Отправляем накопленные оффлайн данные
            await this.sendOfflineData();
            
            this.lastSync = new Date();
            console.log('✅ Синхронизация завершена успешно');
            
            // Уведомляем пользователя
            this.showSyncNotification('Данные обновлены', 'success');
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            this.showSyncNotification('Ошибка обновления данных', 'error');
        } finally {
            this.syncInProgress = false;
        }
    }
    
    // Синхронизация баланса
    async syncBalance() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;
            
            // Получаем ID пользователя из токена или localStorage
            const userId = localStorage.getItem('userId') || 'current';
            
            const response = await fetch(`/api/users/${userId}/balance`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Получены данные баланса:', data);
                
                if (data.success) {
                    // Сервер возвращает { success: true, balance: value }
                    // Преобразуем в ожидаемый формат
                    const balanceData = {
                        total: data.balance || 0,
                        balance: data.balance || 0,
                        amount: data.balance || 0,
                        change: 0, // По умолчанию
                        changePercent: 0, // По умолчанию
                        monthlyChange: 0, // По умолчанию
                        assetsCount: 0, // По умолчанию
                        activeStakes: 0 // По умолчанию
                    };
                    
                    console.log('📊 Преобразованные данные баланса:', balanceData);
                    
                    // Обновляем баланс в UI
                    this.updateBalanceUI(balanceData);
                    console.log('💰 Баланс синхронизирован');
                } else {
                    console.warn('Сервер вернул ошибку при получении баланса:', data.errors || data.error);
                }
            } else if (response.status === 401) {
                console.log('Токен недействителен, требуется повторная авторизация');
                // Можно добавить логику для перенаправления на страницу входа
            } else {
                console.warn('Ошибка получения баланса:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Ошибка синхронизации баланса:', error);
        }
    }
    
    // Синхронизация цен криптовалют
    async syncCryptoPrices() {
        try {
            // Используем публичный API для получения данных о криптовалютах
            const response = await fetch('/api/coins/public', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Обновляем цены в UI
                    this.updatePricesUI(data.data);
                    console.log('📈 Цены криптовалют обновлены');
                } else {
                    console.warn('Сервер вернул ошибку при получении цен:', data.errors || data.error);
                }
            } else {
                console.warn('Ошибка получения цен криптовалют:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Ошибка синхронизации цен:', error);
        }
    }
    
    // Синхронизация истории транзакций
    async syncTransactionHistory() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;
            
            // Получаем ID пользователя из токена или localStorage
            const userId = localStorage.getItem('userId') || 'current';
            
            const response = await fetch(`/api/users/${userId}/portfolio/transactions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Обновляем историю в UI
                    this.updateTransactionHistoryUI(data.data);
                    console.log('📋 История транзакций обновлена');
                } else {
                    console.warn('Сервер вернул ошибку при получении истории транзакций:', data.error);
                }
            } else if (response.status === 401) {
                console.log('Токен недействителен, требуется повторная авторизация');
            } else if (response.status === 403) {
                console.log('Недостаточно прав для получения истории транзакций');
            } else if (response.status === 404) {
                console.log('История транзакций не найдена (возможно, пользователь новый)');
                // Для новых пользователей это нормально
            } else {
                console.warn('Ошибка получения истории транзакций:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Ошибка синхронизации истории:', error);
        }
    }
    
    // Отправка накопленных оффлайн данных
    async sendOfflineData() {
        if (this.offlineData.size === 0) return;
        
        console.log('📤 Отправка оффлайн данных...');
        
        for (const [key, data] of this.offlineData) {
            try {
                const response = await fetch(data.url, {
                    method: data.method,
                    headers: data.headers,
                    body: data.body
                });
                
                if (response.ok) {
                    this.offlineData.delete(key);
                    console.log(`✅ Оффлайн данные отправлены: ${key}`);
                }
            } catch (error) {
                console.error(`Ошибка отправки оффлайн данных ${key}:`, error);
            }
        }
    }
    
    // Сохранение данных для оффлайн отправки
    saveOfflineData(key, data) {
        this.offlineData.set(key, data);
        console.log(`💾 Данные сохранены для оффлайн отправки: ${key}`);
    }
    
    // Обновление UI баланса
    updateBalanceUI(balanceData) {
        // Проверяем, что balanceData существует и имеет нужную структуру
        if (!balanceData) {
            console.warn('balanceData is undefined or null');
            return;
        }
        
        const balanceElement = document.getElementById('totalBalance');
        if (balanceElement) {
            // Проверяем различные возможные структуры данных
            const total = balanceData.total || balanceData.balance || balanceData.amount || 0;
            balanceElement.textContent = `$${total.toFixed(2)}`;
        }
        
        const changeElement = document.getElementById('balanceChange');
        if (changeElement) {
            const change = balanceData.change || balanceData.dailyChange || 0;
            const changePercent = balanceData.changePercent || balanceData.dailyChangePercent || 0;
            const icon = change >= 0 ? 'fa-plus' : 'fa-minus';
            const color = change >= 0 ? 'positive' : 'negative';
            
            changeElement.innerHTML = `
                <i class="fas ${icon}"></i>
                $${Math.abs(change).toFixed(2)} (${Math.abs(changePercent).toFixed(2)}%)
            `;
            changeElement.className = `balance-change ${color}`;
        }
        
        // Обновляем другие элементы баланса
        this.updateBalanceStats(balanceData);
    }
    
    // Обновление статистики баланса
    updateBalanceStats(balanceData) {
        const monthlyChange = document.getElementById('monthlyChange');
        if (monthlyChange) {
            monthlyChange.textContent = `${balanceData.monthlyChange || 0}%`;
        }
        
        const assetsCount = document.getElementById('assetsCount');
        if (assetsCount) {
            assetsCount.textContent = balanceData.assetsCount || 0;
        }
        
        const activeStakes = document.getElementById('activeStakes');
        if (activeStakes) {
            activeStakes.textContent = balanceData.activeStakes || 0;
        }
    }
    
    // Обновление UI цен
    updatePricesUI(pricesData) {
        // Обновляем список криптовалют
        const topAssets = document.getElementById('topAssets');
        if (topAssets && pricesData.topAssets) {
            this.updateTopAssetsList(pricesData.topAssets);
        }
        
        // Обновляем цены в других местах
        this.updateAllPrices(pricesData.prices);
    }
    
    // Обновление списка топ активов
    updateTopAssetsList(assets) {
        const container = document.getElementById('topAssets');
        if (!container) return;
        
        container.innerHTML = assets.map(asset => `
            <div class="asset-item">
                <div class="asset-icon">
                    <img src="/logos/${asset.symbol.toLowerCase()}.svg" alt="${asset.name}">
                </div>
                <div class="asset-info">
                    <div class="asset-name">${asset.name}</div>
                    <div class="asset-price">$${asset.price.toFixed(2)}</div>
                </div>
                <div class="asset-change ${asset.change >= 0 ? 'positive' : 'negative'}">
                    ${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(2)}%
                </div>
            </div>
        `).join('');
    }
    
    // Обновление всех цен
    updateAllPrices(prices) {
        // Обновляем цены во всех местах приложения
        Object.keys(prices).forEach(symbol => {
            const price = prices[symbol];
            const elements = document.querySelectorAll(`[data-crypto="${symbol}"]`);
            
            elements.forEach(element => {
                if (element.dataset.priceType === 'current') {
                    element.textContent = `$${price.current.toFixed(2)}`;
                } else if (element.dataset.priceType === 'change') {
                    const change = price.change;
                    element.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                    element.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
                }
            });
        });
    }
    
    // Обновление UI истории транзакций
    updateTransactionHistoryUI(historyData) {
        // Обновляем историю транзакций в UI
        const historyContainer = document.getElementById('transactionHistory');
        if (historyContainer && historyData.transactions) {
            this.updateTransactionList(historyData.transactions);
        }
    }
    
    // Обновление списка транзакций
    updateTransactionList(transactions) {
        const container = document.getElementById('transactionHistory');
        if (!container) return;
        
        container.innerHTML = transactions.map(tx => `
            <div class="transaction-item">
                <div class="transaction-type ${tx.type}">
                    <i class="fas fa-${tx.type === 'buy' ? 'arrow-down' : 'arrow-up'}"></i>
                </div>
                <div class="transaction-info">
                    <div class="transaction-amount">${tx.amount} ${tx.crypto}</div>
                    <div class="transaction-date">${new Date(tx.date).toLocaleDateString()}</div>
                </div>
                <div class="transaction-status ${tx.status}">
                    ${tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌'}
                </div>
            </div>
        `).join('');
    }
    
    // Показ уведомления о синхронизации
    showSyncNotification(message, type = 'info') {
        // Используем новую систему уведомлений
        if (window.notificationManager) {
            return window.notificationManager.show(message, type, {
                title: type === 'success' ? 'Синхронизация завершена' : 
                       type === 'error' ? 'Ошибка синхронизации' : 'Синхронизация',
                duration: type === 'error' ? 5000 : 3000
            });
        }
        
        // Fallback для старой системы
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    // Обработчики событий
    handleOnline() {
        console.log('🌐 Интернет восстановлен - запуск синхронизации');
        this.startPeriodicSync();
        // Сразу синхронизируем данные
        setTimeout(() => this.syncData(), 1000);
    }
    
    handleOffline() {
        console.log('📡 Интернет потерян - остановка синхронизации');
        this.stopPeriodicSync();
    }
    
    handleServerConnected() {
        console.log('🔗 Сервер подключен - запуск синхронизации');
        this.startPeriodicSync();
        // Сразу синхронизируем данные
        setTimeout(() => this.syncData(), 1000);
    }
    
    handleServerDisconnected() {
        console.log('🔌 Сервер отключен - остановка синхронизации');
        this.stopPeriodicSync();
    }
    
    // Публичные методы
    forceSync() {
        return this.syncData();
    }
    
    getLastSync() {
        return this.lastSync;
    }
    
    isSyncInProgress() {
        return this.syncInProgress;
    }
}

// Создаем глобальный экземпляр
window.dataSync = new DataSync();

// Экспортируем для использования в других модулях
window.DataSync = DataSync;
