# Внедрение системы покупки/продажи монет в SellBit

## Обзор внедрения

Это описание внедрения функционала покупки и продажи криптовалютных монет в существующую систему SellBit. Функционал будет реализован в модальных окнах на странице `coininfo.html`. Все операции будут синхронизированы с сервером, базой данных (SQLite) и отражаться в портфеле пользователя, балансе, истории транзакций и на главной странице (`home.html`).

## Ключевые требования

- **Покупка монет**: снимает средства с баланса, добавляет монету в портфель
- **Продажа монет**: добавляет средства на баланс, удаляет/уменьшает количество монет в портфеле
- **Отображение**: баланс аккаунта, текущая цена монеты в модальных окнах; обновление портфеля в `home.html`
- **Хранение**: все данные сохраняются в базе данных; история транзакций обновляется
- **Синхронизация**: использование localStorage для кэша, автоматическая синхронизация баланса через `BalanceSync`, WebSocket для реального времени
- **Безопасность**: авторизация через JWT-токены, валидация на клиенте и сервере

## 1. Изменения в клиентской части (PWA)

### 1.1 Модальные окна в `coininfo.html`

#### HTML-структура модальных окон

Добавить два новых модальных окна после существующего `activeStakesModal`:

```html
<!-- Buy Modal -->
<div class="modal" id="buyModal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="buyModalTitle">Покупка <span id="buyCoinName">Bitcoin</span></h3>
            <button class="icon-btn" onclick="closeModal('buyModal')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <!-- Account Balance Display -->
            <div class="balance-display">
                <div class="balance-item">
                    <span class="balance-label">Баланс аккаунта:</span>
                    <span class="balance-value" id="buyAccountBalance">$0.00</span>
                </div>
                <div class="balance-item">
                    <span class="balance-label">Текущая цена:</span>
                    <span class="balance-value" id="buyCurrentPrice">$0.00</span>
                </div>
            </div>

            <form id="buyForm">
                <div class="amount-input-container">
                    <label class="amount-label">Количество монет</label>
                    <input type="number" id="buyAmount" class="amount-input" placeholder="0.001" min="0.00000001" step="0.00000001" required>
                </div>
                
                <div class="total-display">
                    <div class="total-item">
                        <span class="total-label">Общая сумма:</span>
                        <span class="total-value" id="buyTotal">$0.00</span>
                    </div>
                </div>

                <button type="submit" class="trade-btn primary" id="buySubmitBtn">Купить</button>
            </form>
        </div>
    </div>
</div>

<!-- Sell Modal -->
<div class="modal" id="sellModal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="sellModalTitle">Продажа <span id="sellCoinName">Bitcoin</span></h3>
            <button class="icon-btn" onclick="closeModal('sellModal')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <!-- Portfolio Balance Display -->
            <div class="balance-display">
                <div class="balance-item">
                    <span class="balance-label">В портфеле:</span>
                    <span class="balance-value" id="sellPortfolioBalance">0.00000000 BTC</span>
                </div>
                <div class="balance-item">
                    <span class="balance-label">Текущая цена:</span>
                    <span class="balance-value" id="sellCurrentPrice">$0.00</span>
                </div>
            </div>

            <form id="sellForm">
                <div class="amount-input-container">
                    <label class="amount-label">Количество монет</label>
                    <input type="number" id="sellAmount" class="amount-input" placeholder="0.001" min="0.00000001" step="0.00000001" required>
                </div>
                
                <div class="total-display">
                    <div class="total-item">
                        <span class="total-label">Получите:</span>
                        <span class="total-value" id="sellTotal">$0.00</span>
                    </div>
                </div>

                <button type="submit" class="trade-btn primary" id="sellSubmitBtn">Продать</button>
            </form>
        </div>
    </div>
</div>
```

#### Обновление кнопок торговли

Заменить существующую кнопку "Торговля" на две отдельные кнопки:

```html
<!-- Trading Buttons -->
<section class="action-section">
    <div class="trading-buttons-container">
        <button class="trading-btn buy-btn" onclick="openBuyModal()">
            <div class="trading-btn-content">
                <i class="fas fa-arrow-up"></i>
                <div class="trading-btn-text">
                    <span class="trading-title">Купить</span>
                    <span class="trading-subtitle">Приобрести монеты</span>
                </div>
            </div>
        </button>
        
        <button class="trading-btn sell-btn" onclick="openSellModal()">
            <div class="trading-btn-content">
                <i class="fas fa-arrow-down"></i>
                <div class="trading-btn-text">
                    <span class="trading-title">Продать</span>
                    <span class="trading-subtitle">Продать монеты</span>
                </div>
            </div>
        </button>
    </div>
    
    <div class="active-stakes-link">
        <button class="active-stakes-btn" onclick="openActiveStakesModal()">
            <i class="fas fa-clock"></i>
            <span>Активные сделки</span>
            <span class="stakes-count" id="stakesCount">0</span>
        </button>
    </div>
</section>
```

### 1.2 Логика в `coininfo.js`

#### Новые методы для модальных окон

```javascript
// Открытие модала покупки
openBuyModal() {
    const modal = document.getElementById('buyModal');
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Обновление отображения
    document.getElementById('buyCoinName').textContent = this.currentCoin.name;
    document.getElementById('buyAccountBalance').textContent = `$${user.balance.toFixed(2)}`;
    document.getElementById('buyCurrentPrice').textContent = `$${this.currentPrice.toFixed(2)}`;
    
    // Сброс формы
    document.getElementById('buyAmount').value = '';
    document.getElementById('buyTotal').textContent = '$0.00';
    
    modal.style.display = 'block';
    
    // Обработчик изменения количества
    document.getElementById('buyAmount').addEventListener('input', this.calculateBuyTotal.bind(this));
}

// Открытие модала продажи
openSellModal() {
    const modal = document.getElementById('sellModal');
    const portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
    const coinInPortfolio = portfolio.find(item => item.coinId === this.currentCoin.id);
    
    if (!coinInPortfolio || coinInPortfolio.amount <= 0) {
        this.showNotification('У вас нет этой монеты в портфеле', 'error');
        return;
    }
    
    // Обновление отображения
    document.getElementById('sellCoinName').textContent = this.currentCoin.name;
    document.getElementById('sellPortfolioBalance').textContent = `${coinInPortfolio.amount.toFixed(8)} ${this.currentCoin.symbol}`;
    document.getElementById('sellCurrentPrice').textContent = `$${this.currentPrice.toFixed(2)}`;
    
    // Сброс формы
    document.getElementById('sellAmount').value = '';
    document.getElementById('sellTotal').textContent = '$0.00';
    
    modal.style.display = 'block';
    
    // Обработчик изменения количества
    document.getElementById('sellAmount').addEventListener('input', this.calculateSellTotal.bind(this));
}

// Расчет общей суммы покупки
calculateBuyTotal() {
    const amount = parseFloat(document.getElementById('buyAmount').value) || 0;
    const total = amount * this.currentPrice;
    document.getElementById('buyTotal').textContent = `$${total.toFixed(2)}`;
}

// Расчет общей суммы продажи
calculateSellTotal() {
    const amount = parseFloat(document.getElementById('sellAmount').value) || 0;
    const total = amount * this.currentPrice;
    document.getElementById('sellTotal').textContent = `$${total.toFixed(2)}`;
}
```

#### Обработчики форм

```javascript
// Инициализация обработчиков форм
initTradingHandlers() {
    // Обработчик покупки
    document.getElementById('buyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('buyAmount').value);
        this.handleBuy(amount);
    });
    
    // Обработчик продажи
    document.getElementById('sellForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('sellAmount').value);
        this.handleSell(amount);
    });
}

// Обработка покупки
async handleBuy(amount) {
    const user = JSON.parse(localStorage.getItem('user'));
    const totalCost = amount * this.currentPrice;
    
    // Валидация
    if (totalCost > user.balance) {
        this.showNotification('Недостаточно средств на балансе', 'error');
        return;
    }
    
    if (amount <= 0) {
        this.showNotification('Введите корректное количество', 'error');
        return;
    }
    
    try {
        // Списание с баланса
        user.balance -= totalCost;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Добавление в портфель
        this.addToPortfolio(this.currentCoin.id, amount, this.currentPrice);
        
        // Синхронизация с сервером
        await this.syncBuyTransaction(amount, this.currentPrice);
        
        // Обновление отображения
        this.updateBalanceDisplay();
        this.showNotification(`Куплено ${amount.toFixed(8)} ${this.currentCoin.symbol}`, 'success');
        
        // Закрытие модала
        closeModal('buyModal');
        
    } catch (error) {
        console.error('Ошибка при покупке:', error);
        this.showNotification('Ошибка при покупке', 'error');
    }
}

// Обработка продажи
async handleSell(amount) {
    const portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
    const coinInPortfolio = portfolio.find(item => item.coinId === this.currentCoin.id);
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Валидация
    if (!coinInPortfolio || coinInPortfolio.amount < amount) {
        this.showNotification('Недостаточно монет в портфеле', 'error');
        return;
    }
    
    if (amount <= 0) {
        this.showNotification('Введите корректное количество', 'error');
        return;
    }
    
    try {
        const totalValue = amount * this.currentPrice;
        
        // Добавление на баланс
        user.balance += totalValue;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Удаление из портфеля
        this.removeFromPortfolio(this.currentCoin.id, amount);
        
        // Синхронизация с сервером
        await this.syncSellTransaction(amount, this.currentPrice);
        
        // Обновление отображения
        this.updateBalanceDisplay();
        this.showNotification(`Продано ${amount.toFixed(8)} ${this.currentCoin.symbol}`, 'success');
        
        // Закрытие модала
        closeModal('sellModal');
        
    } catch (error) {
        console.error('Ошибка при продаже:', error);
        this.showNotification('Ошибка при продаже', 'error');
    }
}
```

#### Управление портфелем

```javascript
// Добавление в портфель
addToPortfolio(coinId, amount, price) {
    let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
    const existingCoin = portfolio.find(item => item.coinId === coinId);
    
    if (existingCoin) {
        // Пересчет средней цены
        const totalAmount = existingCoin.amount + amount;
        const totalCost = (existingCoin.amount * existingCoin.avgPrice) + (amount * price);
        existingCoin.avgPrice = totalCost / totalAmount;
        existingCoin.amount = totalAmount;
    } else {
        // Новая монета в портфеле
        portfolio.push({
            coinId: coinId,
            amount: amount,
            avgPrice: price,
            symbol: this.currentCoin.symbol,
            name: this.currentCoin.name
        });
    }
    
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
}

// Удаление из портфеля
removeFromPortfolio(coinId, amount) {
    let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
    const coinIndex = portfolio.findIndex(item => item.coinId === coinId);
    
    if (coinIndex !== -1) {
        portfolio[coinIndex].amount -= amount;
        
        // Удаление если количество стало 0
        if (portfolio[coinIndex].amount <= 0) {
            portfolio.splice(coinIndex, 1);
        }
    }
    
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
}
```

#### Синхронизация с сервером

```javascript
// Синхронизация покупки
async syncBuyTransaction(amount, price) {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`/api/users/${user.id}/portfolio/buy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            coinId: this.currentCoin.id,
            amount: amount,
            price: price
        })
    });
    
    if (!response.ok) {
        throw new Error('Ошибка синхронизации покупки');
    }
    
    // Обновление баланса через BalanceSync
    if (window.balanceSync) {
        await window.balanceSync.syncBalance();
    }
}

// Синхронизация продажи
async syncSellTransaction(amount, price) {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`/api/users/${user.id}/portfolio/sell`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            coinId: this.currentCoin.id,
            amount: amount,
            price: price
        })
    });
    
    if (!response.ok) {
        throw new Error('Ошибка синхронизации продажи');
    }
    
    // Обновление баланса через BalanceSync
    if (window.balanceSync) {
        await window.balanceSync.syncBalance();
    }
}
```

### 1.3 Обновление портфеля в `home.js`

#### Модификация `loadMyAssets()`

```javascript
async loadMyAssets() {
    const container = document.getElementById('myAssetsContainer');
    const portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
    
    if (portfolio.length === 0) {
        showAssetsEmpty(container, 'Нет активов');
        return;
    }
    
    try {
        // Получение актуальных цен
        const response = await fetch('/api/coins/public');
        const data = await response.json();
        const coinsData = data.data;
        
        // Объединение портфеля с актуальными ценами
        const portfolioWithPrices = portfolio.map(portfolioItem => {
            const coinData = coinsData.find(coin => coin.id === portfolioItem.coinId);
            return {
                ...portfolioItem,
                currentPrice: coinData ? coinData.price : 0,
                priceChange: coinData ? coinData.priceChange : 0,
                logo: coinData ? coinData.logo : '/logos/default.svg'
            };
        });
        
        displayMyAssets(container, portfolioWithPrices);
        
    } catch (error) {
        console.error('Ошибка загрузки портфеля:', error);
        showAssetsEmpty(container, 'Ошибка загрузки');
    }
}

// Отображение активов портфеля
function displayMyAssets(container, portfolio) {
    container.innerHTML = '';
    
    portfolio.forEach(asset => {
        const totalValue = asset.amount * asset.currentPrice;
        const profitLoss = totalValue - (asset.amount * asset.avgPrice);
        const profitLossPercent = ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100;
        
        const assetElement = document.createElement('div');
        assetElement.className = 'asset-item';
        assetElement.innerHTML = `
            <div class="asset-icon">
                <img src="${asset.logo}" alt="${asset.symbol}" onerror="this.src='/logos/default.svg'">
            </div>
            <div class="asset-info">
                <div class="asset-name">${asset.name}</div>
                <div class="asset-symbol">${asset.symbol}</div>
                <div class="asset-amount">${asset.amount.toFixed(8)}</div>
            </div>
            <div class="asset-value">
                <div class="asset-total">$${totalValue.toFixed(2)}</div>
                <div class="asset-change ${profitLoss >= 0 ? 'positive' : 'negative'}">
                    ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${profitLossPercent.toFixed(2)}%)
                </div>
            </div>
        `;
        
        // Клик для перехода к детальной информации
        assetElement.addEventListener('click', () => {
            window.location.href = `coininfo.html?coin=${asset.coinId}`;
        });
        
        container.appendChild(assetElement);
    });
}
```

### 1.4 История операций в `History.js`

#### Обновление `loadTransactions()`

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
            date: purchase.date,
            coinId: purchase.coinId,
            coinAmount: purchase.coinAmount
        });
    });
    
    // Продажи
    const sales = JSON.parse(localStorage.getItem('sales')) || [];
    sales.forEach(sale => {
        allTransactions.push({
            type: 'sell',
            title: `Продажа ${sale.coinName}`,
            amount: +sale.amount,
            date: sale.date,
            coinId: sale.coinId,
            coinAmount: sale.coinAmount
        });
    });
    
    // Существующие транзакции (ставки, пополнения, выводы...)
    // ... остальной код ...
    
    // Сортировка по дате
    const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
        
    this.displayTransactions(recentTransactions);
}

// Обновление getTransactionInfo для новых типов
function getTransactionInfo(transaction) {
    const transactionTypes = {
        buy: {
            typeText: 'Покупка',
            icon: 'fa-arrow-up',
            color: 'transaction-buy'
        },
        sell: {
            typeText: 'Продажа',
            icon: 'fa-arrow-down',
            color: 'transaction-sell'
        },
        // ... остальные типы
    };
    
    return transactionTypes[transaction.type] || transactionTypes.default;
}
```

## 2. Изменения в серверной части (Node.js)

### 2.1 API эндпоинты

#### Расширение существующих эндпоинтов

```javascript
// Обновление баланса пользователя
app.put('/api/users/:userId/balance', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { balance } = req.body;
        
        await db.run(
            'UPDATE users SET balance = ? WHERE id = ?',
            [balance, userId]
        );
        
        res.json({ success: true, balance });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка обновления баланса' });
    }
});

// Получение портфеля пользователя
app.get('/api/users/:userId/portfolio', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const portfolio = await db.all(
            'SELECT * FROM portfolio WHERE user_id = ?',
            [userId]
        );
        
        res.json({ success: true, portfolio });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения портфеля' });
    }
});
```

#### Новые эндпоинты для торговли

```javascript
// Покупка монет
app.post('/api/users/:userId/portfolio/buy', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { coinId, amount, price } = req.body;
        
        // Получение текущего баланса
        const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
        const totalCost = amount * price;
        
        if (user.balance < totalCost) {
            return res.status(400).json({ error: 'Недостаточно средств' });
        }
        
        // Начало транзакции
        await db.run('BEGIN TRANSACTION');
        
        try {
            // Списание с баланса
            await db.run(
                'UPDATE users SET balance = balance - ? WHERE id = ?',
                [totalCost, userId]
            );
            
            // Добавление/обновление в портфеле
            const existingCoin = await db.get(
                'SELECT * FROM portfolio WHERE user_id = ? AND coin_id = ?',
                [userId, coinId]
            );
            
            if (existingCoin) {
                // Пересчет средней цены
                const totalAmount = existingCoin.amount + amount;
                const totalCost = (existingCoin.amount * existingCoin.avg_price) + (amount * price);
                const newAvgPrice = totalCost / totalAmount;
                
                await db.run(
                    'UPDATE portfolio SET amount = ?, avg_price = ? WHERE user_id = ? AND coin_id = ?',
                    [totalAmount, newAvgPrice, userId, coinId]
                );
            } else {
                // Новая монета в портфеле
                await db.run(
                    'INSERT INTO portfolio (user_id, coin_id, amount, avg_price) VALUES (?, ?, ?, ?)',
                    [userId, coinId, amount, price]
                );
            }
            
            // Добавление транзакции
            await db.run(
                'INSERT INTO transactions (user_id, type, coin_id, amount, price, total_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, 'buy', coinId, amount, price, totalCost, new Date().toISOString()]
            );
            
            await db.run('COMMIT');
            
            // Бродкаст обновления
            broadcastUpdate('portfolio_update', { userId, type: 'buy', coinId, amount });
            
            res.json({ success: true, message: 'Покупка выполнена успешно' });
            
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Ошибка покупки:', error);
        res.status(500).json({ error: 'Ошибка при покупке' });
    }
});

// Продажа монет
app.post('/api/users/:userId/portfolio/sell', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { coinId, amount, price } = req.body;
        
        // Проверка наличия монет в портфеле
        const portfolioItem = await db.get(
            'SELECT * FROM portfolio WHERE user_id = ? AND coin_id = ?',
            [userId, coinId]
        );
        
        if (!portfolioItem || portfolioItem.amount < amount) {
            return res.status(400).json({ error: 'Недостаточно монет в портфеле' });
        }
        
        const totalValue = amount * price;
        
        // Начало транзакции
        await db.run('BEGIN TRANSACTION');
        
        try {
            // Добавление на баланс
            await db.run(
                'UPDATE users SET balance = balance + ? WHERE id = ?',
                [totalValue, userId]
            );
            
            // Обновление портфеля
            const newAmount = portfolioItem.amount - amount;
            
            if (newAmount <= 0) {
                // Удаление монеты из портфеля
                await db.run(
                    'DELETE FROM portfolio WHERE user_id = ? AND coin_id = ?',
                    [userId, coinId]
                );
            } else {
                // Уменьшение количества
                await db.run(
                    'UPDATE portfolio SET amount = ? WHERE user_id = ? AND coin_id = ?',
                    [newAmount, userId, coinId]
                );
            }
            
            // Добавление транзакции
            await db.run(
                'INSERT INTO transactions (user_id, type, coin_id, amount, price, total_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, 'sell', coinId, amount, price, totalValue, new Date().toISOString()]
            );
            
            await db.run('COMMIT');
            
            // Бродкаст обновления
            broadcastUpdate('portfolio_update', { userId, type: 'sell', coinId, amount });
            
            res.json({ success: true, message: 'Продажа выполнена успешно' });
            
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Ошибка продажи:', error);
        res.status(500).json({ error: 'Ошибка при продаже' });
    }
});
```

### 2.2 WebSocket обновления

```javascript
// Обработка WebSocket сообщений для портфеля
ws.on('message', (message) => {
    try {
        const data = JSON.parse(message);
        
        if (data.type === 'portfolio_update') {
            // Отправка обновления портфеля всем клиентам
            broadcastUpdate('portfolio_update', data);
        }
    } catch (error) {
        console.error('Ошибка обработки WebSocket сообщения:', error);
    }
});

// Обновленная функция бродкаста
const broadcastUpdate = (type, data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, data }));
        }
    });
};
```

## 3. Изменения в базе данных (SQLite)

### 3.1 Структура таблиц

#### Создание таблицы портфеля

```sql
-- Таблица портфеля пользователей
CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    coin_id TEXT NOT NULL,
    amount REAL NOT NULL,
    avg_price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, coin_id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_coin_id ON portfolio(coin_id);
```

#### Расширение таблицы транзакций

```sql
-- Добавление полей для торговых операций
ALTER TABLE transactions ADD COLUMN coin_id TEXT;
ALTER TABLE transactions ADD COLUMN amount REAL;
ALTER TABLE transactions ADD COLUMN price REAL;
ALTER TABLE transactions ADD COLUMN total_value REAL;

-- Индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_transactions_coin_id ON transactions(coin_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
```

### 3.2 Инициализация базы данных

```javascript
// Функция инициализации таблиц
async function initializeTradingTables() {
    try {
        // Создание таблицы портфеля
        await db.run(`
            CREATE TABLE IF NOT EXISTS portfolio (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                coin_id TEXT NOT NULL,
                amount REAL NOT NULL,
                avg_price REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, coin_id)
            )
        `);
        
        // Добавление полей в таблицу транзакций (если не существуют)
        try {
            await db.run('ALTER TABLE transactions ADD COLUMN coin_id TEXT');
        } catch (e) {
            // Поле уже существует
        }
        
        try {
            await db.run('ALTER TABLE transactions ADD COLUMN amount REAL');
        } catch (e) {
            // Поле уже существует
        }
        
        try {
            await db.run('ALTER TABLE transactions ADD COLUMN price REAL');
        } catch (e) {
            // Поле уже существует
        }
        
        try {
            await db.run('ALTER TABLE transactions ADD COLUMN total_value REAL');
        } catch (e) {
            // Поле уже существует
        }
        
        console.log('Таблицы торговли инициализированы');
        
    } catch (error) {
        console.error('Ошибка инициализации таблиц торговли:', error);
    }
}

// Вызов при запуске сервера
initializeTradingTables();
```

## 4. Синхронизация и безопасность

### 4.1 Синхронизация данных

#### Обновление BalanceSync

```javascript
// В balance-sync.js добавить методы для портфеля
class BalanceSync {
    // ... существующие методы ...
    
    // Синхронизация портфеля
    async syncPortfolio() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`/api/users/${user.id}/portfolio`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('portfolio', JSON.stringify(data.portfolio));
                this.updatePortfolioDisplay();
            }
        } catch (error) {
            console.error('Ошибка синхронизации портфеля:', error);
        }
    }
    
    // Обновление отображения портфеля
    updatePortfolioDisplay() {
        // Если мы на странице home.html, обновляем отображение
        if (window.loadMyAssets) {
            window.loadMyAssets();
        }
    }
    
    // Расширенная синхронизация
    async fullSync() {
        await this.syncBalance();
        await this.syncPortfolio();
    }
}

// Обновление интервала синхронизации
setInterval(() => {
    if (window.balanceSync) {
        window.balanceSync.fullSync();
    }
}, 5000);
```

### 4.2 Валидация и безопасность

#### Клиентская валидация

```javascript
// Валидация покупки
validateBuy(amount, price, balance) {
    const totalCost = amount * price;
    
    if (amount <= 0) {
        return { valid: false, message: 'Количество должно быть больше 0' };
    }
    
    if (totalCost > balance) {
        return { valid: false, message: 'Недостаточно средств на балансе' };
    }
    
    if (amount < 0.00000001) {
        return { valid: false, message: 'Минимальное количество: 0.00000001' };
    }
    
    return { valid: true };
}

// Валидация продажи
validateSell(amount, portfolioAmount) {
    if (amount <= 0) {
        return { valid: false, message: 'Количество должно быть больше 0' };
    }
    
    if (amount > portfolioAmount) {
        return { valid: false, message: 'Недостаточно монет в портфеле' };
    }
    
    if (amount < 0.00000001) {
        return { valid: false, message: 'Минимальное количество: 0.00000001' };
    }
    
    return { valid: true };
}
```

#### Серверная валидация

```javascript
// Middleware для валидации торговых операций
const validateTradingRequest = (req, res, next) => {
    const { coinId, amount, price } = req.body;
    
    if (!coinId || !amount || !price) {
        return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
    }
    
    if (amount <= 0 || price <= 0) {
        return res.status(400).json({ error: 'Количество и цена должны быть больше 0' });
    }
    
    if (amount < 0.00000001) {
        return res.status(400).json({ error: 'Минимальное количество: 0.00000001' });
    }
    
    next();
};

// Применение middleware
app.post('/api/users/:userId/portfolio/buy', authenticateToken, validateTradingRequest, ...);
app.post('/api/users/:userId/portfolio/sell', authenticateToken, validateTradingRequest, ...);
```

## 5. CSS стили

### 5.1 Стили для модальных окон торговли

```css
/* Стили для кнопок торговли */
.trading-buttons-container {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
}

.trading-btn {
    flex: 1;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 16px;
    padding: 16px;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.trading-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.trading-btn.buy-btn {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
}

.trading-btn.sell-btn {
    background: linear-gradient(135deg, #f44336 0%, #da190b 100%);
}

.trading-btn-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.trading-btn-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.trading-title {
    font-weight: 600;
    font-size: 16px;
}

.trading-subtitle {
    font-size: 12px;
    opacity: 0.8;
}

/* Стили для модальных окон */
.balance-display {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
}

.balance-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.balance-item:last-child {
    margin-bottom: 0;
}

.balance-label {
    font-size: 14px;
    color: #666;
}

.balance-value {
    font-weight: 600;
    font-size: 16px;
    color: #333;
}

.total-display {
    background: #e3f2fd;
    border-radius: 12px;
    padding: 16px;
    margin: 16px 0;
}

.total-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.total-label {
    font-size: 16px;
    font-weight: 500;
    color: #1976d2;
}

.total-value {
    font-size: 18px;
    font-weight: 700;
    color: #1976d2;
}

/* Стили для транзакций */
.transaction-buy {
    border-left: 4px solid #4CAF50;
}

.transaction-sell {
    border-left: 4px solid #f44336;
}

/* Стили для портфеля */
.asset-item {
    display: flex;
    align-items: center;
    padding: 16px;
    background: white;
    border-radius: 12px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.asset-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.asset-icon {
    width: 48px;
    height: 48px;
    margin-right: 16px;
}

.asset-icon img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
}

.asset-info {
    flex: 1;
}

.asset-name {
    font-weight: 600;
    font-size: 16px;
    color: #333;
    margin-bottom: 4px;
}

.asset-symbol {
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
}

.asset-amount {
    font-size: 12px;
    color: #999;
}

.asset-value {
    text-align: right;
}

.asset-total {
    font-weight: 600;
    font-size: 16px;
    color: #333;
    margin-bottom: 4px;
}

.asset-change {
    font-size: 14px;
    font-weight: 500;
}

.asset-change.positive {
    color: #4CAF50;
}

.asset-change.negative {
    color: #f44336;
}
```

## 6. Тестирование и запуск

### 6.1 Шаги тестирования

1. **Тестирование покупки:**
   - Открыть `coininfo.html` для любой монеты
   - Нажать кнопку "Купить"
   - Проверить отображение баланса и цены в модале
   - Ввести количество монет, проверить расчет общей суммы
   - Выполнить покупку, проверить списание с баланса
   - Проверить добавление в портфель на `home.html`
   - Проверить запись в истории транзакций

2. **Тестирование продажи:**
   - Убедиться, что в портфеле есть монеты
   - Открыть `coininfo.html` для монеты из портфеля
   - Нажать кнопку "Продать"
   - Проверить отображение количества в портфеле
   - Выполнить продажу, проверить добавление на баланс
   - Проверить обновление портфеля
   - Проверить запись в истории

3. **Тестирование синхронизации:**
   - Выполнить операцию на одном устройстве
   - Проверить обновление на другом устройстве
   - Проверить автоматическую синхронизацию через 5 секунд

4. **Тестирование валидации:**
   - Попытка купить на сумму больше баланса
   - Попытка продать больше монет, чем есть в портфеле
   - Ввод некорректных значений

### 6.2 Потенциальные улучшения

1. **Дополнительные функции:**
   - Калькулятор прибыли/убытка в модалах
   - Комиссии за транзакции
   - Лимиты на минимальные/максимальные суммы
   - Уведомления о значительных изменениях цен

2. **Улучшения UX:**
   - Анимации при покупке/продаже
   - Прогресс-бары для длительных операций
   - Подтверждение операций с PIN-кодом
   - Экспорт истории транзакций

3. **Аналитика:**
   - Графики портфеля
   - Статистика прибыли/убытка
   - Рекомендации по торговле
   - Анализ трендов

## Заключение

Данное внедрение системы покупки/продажи монет полностью интегрируется с существующей архитектурой SellBit, обеспечивая:

- **Стабильность**: не нарушает существующую функциональность
- **Синхронизацию**: все данные синхронизируются между клиентом и сервером
- **Безопасность**: валидация на всех уровнях, авторизация через JWT
- **Производительность**: эффективное использование localStorage и WebSocket
- **Масштабируемость**: легко добавлять новые функции и улучшения

Система готова к использованию и может быть расширена дополнительными функциями по мере необходимости.
