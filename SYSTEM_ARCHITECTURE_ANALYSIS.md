# Анализ архитектуры системы SellBit

## Обзор системы

SellBit - это криптовалютная торговая платформа, состоящая из клиентской части (PWA) и серверной части (Node.js + SQLite). Система поддерживает торговлю криптовалютами, создание сделок на рост/падение, управление портфелем и отслеживание истории операций.

## 1. Система баланса

### 1.1 Класс BalanceSync (balance-sync.js)

**Основные функции:**
- Автоматическая синхронизация баланса каждые 5 секунд
- Синхронизация между localStorage и базой данных
- Обновление отображения баланса в реальном времени
- Уведомления об изменениях баланса

**Ключевые методы:**

```javascript
// Синхронизация баланса с сервером
async syncBalance() {
    const response = await fetch(`/api/users/${payload.userId}/balance`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    // Обновление localStorage и отображения
}

// Обновление баланса на сервере
static async updateServerBalance(newBalance) {
    const response = await fetch(`/api/users/${payload.userId}/balance`, {
        method: 'PUT',
        body: JSON.stringify({ balance: newBalance })
    });
}
```

**Схема работы:**
```
localStorage ←→ BalanceSync ←→ API Server ←→ SQLite Database
     ↓
DOM Elements (totalBalance, availableBalance)
```

### 1.2 Обновление отображения

```javascript
updateBalanceDisplay(newBalance) {
    const balanceElement = document.getElementById('totalBalance');
    const isBalanceHidden = localStorage.getItem('balanceHidden') === 'true';
    
    if (isBalanceHidden) {
        balanceElement.textContent = '$****.**';
    } else {
        balanceElement.textContent = `$${newBalance.toLocaleString()}`;
    }
}
```

## 2. Система цен монет

### 2.1 Получение цен (server.js)

**Основные функции:**
- `fetchCoinPrices()` - получение цен с внешних API
- `generatePricePattern()` - генерация паттернов цен
- `startSimulation()` - запуск симуляции цен
- `updateSimulationPrice()` - обновление цен в реальном времени

**WebSocket система:**
```javascript
const broadcastUpdate = (type, data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, data }));
        }
    });
};
```

### 2.2 Обновление цен в реальном времени

```javascript
// В coininfo.js
initializeWebSocket() {
    this.ws = new WebSocket(wsUrl);
    this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'price_update') {
            this.currentPrice = message.data.price;
            this.updatePriceDisplay();
            this.updateChartWithRealTimeData(message.data.price);
        }
    };
}
```

## 3. Система портфеля

### 3.1 Отображение активов (home.js)

**Два режима отображения:**

1. **Топ активов** (`loadTopAssets()`):
```javascript
async loadTopAssets() {
    const response = await fetch('/api/coins/public');
    const data = await response.json();
    const topCoins = data.data
        .sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0))
        .slice(0, 3);
    displayTopAssets(container, topCoins);
}
```

2. **Мои активы** (`loadMyAssets()`):
```javascript
async loadMyAssets() {
    const response = await fetch(`/api/users/${userId}/portfolio`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (data.portfolio && data.portfolio.length > 0) {
        displayMyAssets(container, data.portfolio);
    } else {
        showAssetsEmpty(container, 'Нет активов');
    }
}
```

### 3.2 Сообщение "Нет активов"

```html
<div class="assets-empty">
    <i class="fas fa-wallet"></i>
    <h3>Нет активов</h3>
    <p>У вас пока нет активов в портфеле</p>
    <button class="text-btn" onclick="window.location.href='coins.html'">
        Начать торговлю
    </button>
</div>
```

## 4. Торговая система

### 4.1 Создание сделок (coininfo.js)

**Процесс создания сделки:**

```javascript
handleStake() {
    const stake = {
        id: Date.now() + Math.random(),
        coinId: this.currentCoin.id,
        amount: amount,
        direction: direction, // 'up' или 'down'
        timeHours: timeHours,
        startPrice: this.currentPrice,
        startTime: new Date(),
        endTime: new Date(Date.now() + timeHours * 60 * 60 * 1000),
        status: 'active',
        baseMultiplier: this.getWinMultiplier(timeHours, 0)
    };
    
    // Сохранение в localStorage
    this.activeStakes.push(stake);
    localStorage.setItem('activeStakes', JSON.stringify(this.activeStakes));
    
    // Списание с баланса
    user.balance -= amount;
    localStorage.setItem('user', JSON.stringify(user));
}
```

### 4.2 Расчет прибыли

**Базовые множители:**
```javascript
const baseMultipliers = {
    0.083: 1.05, // 5 минут - 5% прибыль
    1: 1.15,     // 1 час - 15% прибыль
    3: 1.25,     // 3 часа - 25% прибыль
    6: 1.35,     // 6 часов - 35% прибыль
    12: 1.45,    // 12 часов - 45% прибыль
    24: 1.55     // 24 часа - 55% прибыль
};
```

**Динамические коэффициенты:**
```javascript
getWinMultiplier(timeHours, priceChangePercent = 0) {
    const baseMultiplier = baseMultipliers[timeHours] || 1.15;
    const absChangePercent = Math.abs(priceChangePercent);
    
    let additionalMultiplier = 0;
    if (absChangePercent >= 5) {
        additionalMultiplier = 0.5; // +50% за 5%+ изменение
    } else if (absChangePercent >= 2) {
        additionalMultiplier = 0.2; // +20% за 2%+ изменение
    }
    
    return baseMultiplier + additionalMultiplier;
}
```

### 4.3 Проверка результатов

```javascript
checkStakeResults() {
    const now = new Date();
    this.activeStakes.forEach(stake => {
        if (stake.status === 'active' && now >= stake.endTime) {
            const result = this.calculateStakeResult(stake);
            stake.status = 'completed';
            stake.result = result;
            this.processStakeResult(stake);
        }
    });
}

calculateStakeResult(stake) {
    const priceChangePercent = ((this.currentPrice - stake.startPrice) / stake.startPrice) * 100;
    
    if (stake.direction === 'up') {
        return priceChangePercent > 0 ? 'win' : 'loss';
    } else {
        return priceChangePercent < 0 ? 'win' : 'loss';
    }
}
```

## 5. История операций

### 5.1 Загрузка транзакций (History.js)

```javascript
loadTransactions() {
    const allTransactions = [];
    
    // Покупки
    const purchases = JSON.parse(localStorage.getItem('purchases')) || [];
    purchases.forEach(purchase => {
        allTransactions.push({
            type: 'buy',
            title: `Покупка ${purchase.coinName}`,
            amount: -purchase.amount,
            date: purchase.date
        });
    });
    
    // Продажи, ставки, пополнения, выводы...
    
    // Сортировка по дате
    const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
}
```

### 5.2 Отображение транзакций

```javascript
createTransactionElement(transaction) {
    const transactionInfo = getTransactionInfo(transaction);
    return `
        <div class="transaction-item ${transactionInfo.color}">
            <div class="transaction-icon">
                <i class="fas ${transactionInfo.icon}"></i>
            </div>
            <div class="transaction-info">
                <div class="transaction-type">${transactionInfo.typeText}</div>
                <div class="transaction-date">${formatDate(transaction.date)}</div>
            </div>
            <div class="transaction-amount">
                ${transaction.amount >= 0 ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}
            </div>
        </div>
    `;
}
```

## 6. Калькулятор прибыли

### 6.1 Расчет потенциальной прибыли (coininfo.js)

```javascript
calculateStakePotential() {
    const amount = parseFloat(document.getElementById('stakeAmount').value) || 0;
    const timeHours = parseFloat(document.getElementById('stakeTime').value) || 1;
    
    const baseMultiplier = baseMultipliers[timeHours] || 1.15;
    const exampleMultiplier = baseMultiplier + 0.2; // Пример при 2% изменении
    const potentialWin = amount * exampleMultiplier;
    
    // Обновление отображения
    document.getElementById('potentialWin').textContent = 
        `$${potentialWin.toFixed(2)} (при 2% изменении)`;
    document.getElementById('potentialLoss').textContent = 
        `$${amount.toFixed(2)}`;
}
```

### 6.2 Отображение коэффициентов

```javascript
updateMultiplierInfo(examples, amount) {
    let html = '<div class="multiplier-title">Коэффициенты выигрыша:</div>';
    html += '<div class="multiplier-subtitle">Чем больше изменение цены, тем выше выигрыш</div>';
    
    examples.forEach(example => {
        const winAmount = amount * example.multiplier;
        const profit = winAmount - amount;
        html += `
            <div class="multiplier-example">
                <div class="example-left">
                    <span class="percent-change">+${example.percent}%</span>
                    <span class="multiplier-value">x${example.multiplier.toFixed(2)}</span>
                </div>
                <div class="example-right">
                    <span class="win-amount">$${winAmount.toFixed(2)}</span>
                    <span class="profit-amount">+$${profit.toFixed(2)}</span>
                </div>
            </div>
        `;
    });
}
```

## 7. База данных и API

### 7.1 Структура базы данных (SQLite)

**Основные таблицы:**
- `users` - пользователи системы
- `coins` - информация о криптовалютах
- `transactions` - история транзакций
- `stakes` - активные и завершенные ставки
- `price_history` - история цен монет

### 7.2 API эндпоинты

```javascript
// Баланс пользователя
GET /api/users/${userId}/balance
PUT /api/users/${userId}/balance

// Портфель пользователя
GET /api/users/${userId}/portfolio

// Данные о монетах
GET /api/coins/public
GET /api/coins/exchange
GET /api/coins/${coinId}/price-history

// Транзакции
GET /api/users/${userId}/transactions
POST /api/users/${userId}/transactions
```

## 8. WebSocket система

### 8.1 Реальное время обновлений

```javascript
// Серверная часть
const broadcastUpdate = (type, data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, data }));
        }
    });
};

// Клиентская часть
this.ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'price_update') {
        this.currentPrice = message.data.price;
        this.updatePriceDisplay();
    }
};
```

## 9. Схема работы системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Клиент (PWA)  │    │   Сервер API    │    │   База данных   │
│                 │    │                 │    │   (SQLite)      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • home.js       │◄──►│ • server.js     │◄──►│ • users         │
│ • coininfo.js   │    │ • WebSocket     │    │ • coins         │
│ • balance-sync  │    │ • API routes    │    │ • transactions  │
│ • localStorage  │    │ • Price updates │    │ • price_history │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Внешние API   │    │   WebSocket     │
│ • CoinGecko     │    │   Broadcast     │
│ • Price feeds   │    │   Real-time     │
└─────────────────┘    └─────────────────┘
```

## 10. Ключевые особенности

### 10.1 Синхронизация данных
- Автоматическая синхронизация баланса каждые 5 секунд
- WebSocket для обновления цен в реальном времени
- localStorage для кэширования данных клиента

### 10.2 Торговая система
- Динамические коэффициенты выигрыша
- Автоматическая проверка результатов сделок
- Поддержка сделок на рост и падение

### 10.3 Пользовательский интерфейс
- Адаптивный дизайн для мобильных устройств
- PWA функциональность
- Интуитивная навигация

### 10.4 Безопасность
- JWT токены для авторизации
- Проверка разрешений на сервере
- Валидация данных на клиенте и сервере

## Заключение

Система SellBit представляет собой полнофункциональную криптовалютную торговую платформу с современной архитектурой, включающей реальное время обновлений, автоматическую синхронизацию данных и интуитивный пользовательский интерфейс. Все компоненты системы тесно интегрированы и обеспечивают стабильную работу торговых операций.
