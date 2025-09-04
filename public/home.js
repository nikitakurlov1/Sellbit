// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Инициализация главной страницы...');
    
    // Проверяем авторизацию
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.log('Нет токена авторизации, перенаправляем на логин');
        window.location.href = '/index.html';
        return;
    }

    try {
        // Декодируем JWT токен
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        console.log('JWT payload:', payload);

        // Загружаем данные пользователя
        const user = JSON.parse(localStorage.getItem('user')) || {
            id: payload.userId,
            username: payload.username,
            balance: 0
        };

        // Если есть токен авторизации, загружаем актуальный баланс из базы данных
        try {
            const response = await api.get(`/api/users/${payload.userId}/balance`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const result = await response.json();
            if (result.success) {
                user.balance = result.balance;
                localStorage.setItem('user', JSON.stringify(user));
                console.log(`Баланс загружен из БД: $${user.balance}`);
            }
        } catch (error) {
            console.error('Ошибка загрузки баланса при инициализации:', error);
        }

        // Инициализируем интерфейс
        initializeBalanceToggle();
        await loadBalance();
        await loadAssets();
        await loadRecentTransactions();
        
        // Инициализируем состояние секций
        initializeSections();
        
        // Автоматическое обновление баланса каждые 10 секунд
        setInterval(async () => {
            await loadBalance();
        }, 10000);
        
        console.log('Главная страница инициализирована');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        // Если есть ошибка с токеном, перенаправляем на логин
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    }
});

async function initializeApp() {
    // Получаем пользователя из localStorage или устанавливаем по умолчанию
    let user = JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('currentUser'));
    const authToken = localStorage.getItem('authToken');
    
    if (!user) {
        // Если нет пользователя, попробуем получить из JWT токена
        if (authToken) {
            try {
                const payload = JSON.parse(atob(authToken.split('.')[1]));
                user = {
                    id: payload.userId,
                    name: 'Пользователь',
                    email: payload.email,
                    balance: 0
                };
                localStorage.setItem('user', JSON.stringify(user));
            } catch (error) {
                console.error('Ошибка декодирования JWT токена:', error);
                user = {
                    id: 1,
                    name: 'Пользователь',
                    email: 'user@example.com',
                    balance: 0
                };
            }
        } else {
            user = {
                id: 1,
                name: 'Пользователь',
                email: 'user@example.com',
                balance: 0
            };
        }
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    // Если есть токен авторизации, загружаем актуальный баланс из базы данных
    if (authToken && user.id) {
        try {
            // Используем userId из JWT токена
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const response = await api.get(`/api/users/${payload.userId}/balance`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const result = await response.json();
            if (result.success) {
                user.balance = result.balance;
                localStorage.setItem('user', JSON.stringify(user));
                console.log(`Баланс загружен из БД: $${user.balance}`);
            }
        } catch (error) {
            console.error('Ошибка загрузки баланса при инициализации:', error);
        }
    }
    
    // Инициализируем статистику пользователя
    const defaultStats = {
        monthlyChange: 0,
        assetsCount: 0,
        activeStakes: 0
    };
    
    localStorage.setItem('userStats', JSON.stringify(defaultStats));
    updateUserAvatar();
}

function updateUserAvatar() {
    const user = JSON.parse(localStorage.getItem('user'));
    const avatar = document.getElementById('userAvatar');
    if (user && avatar) {
        avatar.textContent = user.name.charAt(0).toUpperCase();
    }
}

function initializeBalanceToggle() {
    const eyeBtn = document.querySelector('.eye-btn');
    if (eyeBtn) {
        // Устанавливаем начальное состояние иконки
        updateEyeIcon();
        
        // Добавляем обработчик клика
        eyeBtn.addEventListener('click', toggleBalanceVisibility);
    }
}

function toggleBalanceVisibility() {
    const isCurrentlyHidden = localStorage.getItem('balanceHidden') === 'true';
    const newState = !isCurrentlyHidden;
    
    // Сохраняем новое состояние
    localStorage.setItem('balanceHidden', newState.toString());
    
    // Обновляем иконку
    updateEyeIcon();
    
    // Перезагружаем баланс с новым состоянием
    loadBalance();
}

function updateEyeIcon() {
    const eyeBtn = document.querySelector('.eye-btn i');
    const isHidden = localStorage.getItem('balanceHidden') === 'true';
    
    if (eyeBtn) {
        if (isHidden) {
            eyeBtn.className = 'fas fa-eye-slash';
        } else {
            eyeBtn.className = 'fas fa-eye';
        }
    }
}

function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = button.dataset.page;
            navigateToPage(page);
        });
    });
}

async function loadDashboardData() {
    await loadBalance();
    loadRecentTransactions();
    loadActiveStakes();
    updateStats();
}

async function loadBalance() {
    const user = JSON.parse(localStorage.getItem('user'));
    const authToken = localStorage.getItem('authToken');
    
    if (!user || !authToken) {
        return;
    }

    try {
        // Получаем актуальный баланс из базы данных
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
                // Обновляем баланс в localStorage
                user.balance = result.balance;
                localStorage.setItem('user', JSON.stringify(user));
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
    }

    const balance = user ? user.balance : 0;
    const balanceElement = document.getElementById('totalBalance');
    const changeElement = document.getElementById('balanceChange');
    const hideBalance = localStorage.getItem('hideBalance') === 'true';
    
    if (balanceElement) {
        if (hideBalance) {
            balanceElement.textContent = '***';
        } else {
            balanceElement.textContent = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }
    
    // Инициализируем/обновляем снэпшот для расчета изменения за месяц
    ensureMonthlySnapshot(balance);

    if (changeElement) {
        // Пока отображаем нейтральное изменение баланса (не месячное)
        if (balance <= 0) {
            changeElement.innerHTML = `<i class="fas fa-minus"></i> $0.00 (+0.00%)`;
            changeElement.className = `balance-change neutral`;
        } else {
            const icon = 'fa-minus';
            const color = 'neutral';
            changeElement.innerHTML = `<i class="fas ${icon}"></i> $0.00 (0.00%)`;
            changeElement.className = `balance-change ${color}`;
        }
    }
    
    // Обновляем статистику при изменении баланса
    updateStats();
}








function loadRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    if (!container) return;

    // Загружаем все типы транзакций из localStorage
    const allTransactions = [];
    
    // Покупки
    const purchases = JSON.parse(localStorage.getItem('purchases')) || [];
    purchases.forEach(purchase => {
        allTransactions.push({
            id: `buy_${purchase.id}`,
            type: 'buy',
            title: `Покупка ${purchase.coinName}`,
            amount: -purchase.amount,
            currency: purchase.currency,
            date: purchase.date || new Date().toISOString(),
            status: 'completed',
            details: `${purchase.coinAmount} ${purchase.coinSymbol}`,
            icon: 'fas fa-arrow-up'
        });
    });

    // Продажи
    const sales = JSON.parse(localStorage.getItem('sales')) || [];
    sales.forEach(sale => {
        allTransactions.push({
            id: `sell_${sale.id}`,
            type: 'sell',
            title: `Продажа ${sale.coinName}`,
            amount: sale.amount,
            currency: sale.currency,
            date: sale.date || new Date().toISOString(),
            status: 'completed',
            details: `${sale.coinAmount} ${sale.coinSymbol}`,
            icon: 'fas fa-arrow-down'
        });
    });

    // Активные ставки
    const activeStakes = JSON.parse(localStorage.getItem('activeStakes')) || [];
    activeStakes.forEach(stake => {
        allTransactions.push({
            id: `stake_active_${stake.id}`,
            type: 'stake',
            title: `Ставка ${stake.coinName}`,
            amount: -stake.amount,
            currency: 'USD',
            date: stake.startTime,
            status: 'pending',
            details: `${stake.direction === 'up' ? 'Рост' : 'Падение'} • ${stake.timeHours}ч • x${stake.winMultiplier}`,
            icon: 'fas fa-chart-line',
            profit: 0,
            isActive: true
        });
    });

    // Завершенные ставки из истории
    const stakeHistory = JSON.parse(localStorage.getItem('stakeHistory')) || [];
    stakeHistory.forEach(stake => {
        allTransactions.push({
            id: `stake_completed_${stake.id}`,
            type: 'stake',
            title: `Ставка ${stake.coinName}`,
            amount: stake.result === 'win' ? stake.winAmount : -stake.amount,
            currency: 'USD',
            date: stake.startTime,
            status: 'completed',
            details: `${stake.direction === 'up' ? 'Рост' : 'Падение'} • ${stake.timeHours}ч • ${stake.result === 'win' ? 'Победа' : 'Проигрыш'}`,
            icon: 'fas fa-chart-line',
            profit: stake.profit || 0,
            isActive: false,
            result: stake.result,
            winAmount: stake.winAmount
        });
    });

    // Пополнения
    const deposits = JSON.parse(localStorage.getItem('deposits')) || [];
    deposits.forEach(deposit => {
        allTransactions.push({
            id: `deposit_${deposit.id}`,
            type: 'deposit',
            title: 'Пополнение',
            amount: deposit.amount,
            currency: 'USD',
            date: deposit.date || new Date().toISOString(),
            status: 'completed',
            details: 'Пополнение баланса',
            icon: 'fas fa-plus'
        });
    });

    // Выводы
    const withdrawals = JSON.parse(localStorage.getItem('withdrawals')) || [];
    withdrawals.forEach(withdrawal => {
        allTransactions.push({
            id: `withdraw_${withdrawal.id}`,
            type: 'withdraw',
            title: 'Вывод',
            amount: -withdrawal.amount,
            currency: 'USD',
            date: withdrawal.date || new Date().toISOString(),
            status: 'completed',
            details: 'Вывод средств',
            icon: 'fas fa-minus'
        });
    });

    // Сортируем по дате (новые сначала) и берем последние 10
    const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    if (recentTransactions.length === 0) {
        container.innerHTML = `
            <div class="transactions-empty">
                <i class="fas fa-receipt"></i>
                <p>Нет операций</p>
                <button class="text-btn" onclick="window.location.href='coins.html'">
                    Начать торговлю
                </button>
            </div>
        `;
    } else {
        container.innerHTML = recentTransactions.map(tx => {
            const transactionInfo = getTransactionInfo(tx);
            const sign = transactionInfo.isPositive ? '+' : '';
            const formattedAmount = tx.currency === 'USD' 
                ? `$${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${Math.abs(tx.amount).toFixed(8)} ${tx.currency}`;
            
            return `
                <div class="transaction-item ${transactionInfo.color}" onclick="openTransactionDetails('${tx.type}', '${tx.amount}', '${tx.currency}')">
                    <div class="transaction-icon ${transactionInfo.color}">
                        <i class="fas ${transactionInfo.icon}"></i>
                    </div>
                    <div class="transaction-info">
                        <div class="transaction-details">
                            <div class="transaction-type">${transactionInfo.typeText}</div>
                            <div class="transaction-date">${formatDate(tx.date)}</div>
                        </div>
                    </div>
                    <div class="transaction-amount ${transactionInfo.color}">
                        ${sign}${formattedAmount}
                    </div>
                </div>
            `;
        }).join('');
    }
}

function getTransactionInfo(transaction) {
    switch (transaction.type) {
        case 'buy':
            return {
                typeText: `Покупка ${transaction.title.split(' ').pop()}`,
                icon: 'fa-arrow-up',
                color: 'negative',
                isPositive: false
            };
        case 'sell':
            return {
                typeText: `Продажа ${transaction.title.split(' ').pop()}`,
                icon: 'fa-arrow-down',
                color: 'positive',
                isPositive: true
            };
        case 'stake':
            if (transaction.isActive) {
                return {
                    typeText: `Ставка ${transaction.title.split(' ').pop()}`,
                    icon: 'fa-chart-line',
                    color: 'neutral',
                    isPositive: false
                };
            } else {
                return {
                    typeText: transaction.result === 'win' ? `Победа в ставке` : `Проигрыш в ставке`,
                    icon: transaction.result === 'win' ? 'fa-trophy' : 'fa-times',
                    color: transaction.result === 'win' ? 'positive' : 'negative',
                    isPositive: transaction.result === 'win'
                };
            }
        case 'deposit':
            return {
                typeText: 'Пополнение',
                icon: 'fa-plus',
                color: 'positive',
                isPositive: true
            };
        case 'withdraw':
            return {
                typeText: 'Вывод',
                icon: 'fa-minus',
                color: 'negative',
                isPositive: false
            };
        default:
            return {
                typeText: transaction.title || 'Операция',
                icon: 'fa-exchange-alt',
                color: 'neutral',
                isPositive: transaction.amount >= 0
            };
    }
}

function updateStats() {
    // Получаем данные пользователя
    const user = JSON.parse(localStorage.getItem('user'));
    const userBalance = user ? user.balance : 0;
    
    // Подсчитываем активные ставки
    const activeStakes = JSON.parse(localStorage.getItem('activeStakes')) || [];
    const activeStakesCount = activeStakes.filter(stake => stake.status === 'active').length;
    
    // Подсчитываем количество активов (покупки - продажи)
    const purchases = JSON.parse(localStorage.getItem('purchases')) || [];
    const sales = JSON.parse(localStorage.getItem('sales')) || [];
    const assetsCount = purchases.length - sales.length;
    
    // Рассчитываем изменение за месяц на основе снэпшота
    const snapshot = getMonthlySnapshot();
    let monthlyChange = 0;
    if (snapshot && snapshot.amount > 0) {
        monthlyChange = ((userBalance - snapshot.amount) / snapshot.amount) * 100;
    }
    
    // Обновляем отображение статистики
    const monthlyChangeElement = document.getElementById('monthlyChange');
    const assetsCountElement = document.getElementById('assetsCount');
    const activeStakesElement = document.getElementById('activeStakes');

    if (monthlyChangeElement) {
        const sign = monthlyChange >= 0 ? '+' : '';
        monthlyChangeElement.textContent = `${sign}${monthlyChange.toFixed(2)}%`;
    }
    if (assetsCountElement) {
        assetsCountElement.textContent = Math.max(0, assetsCount);
    }
    if (activeStakesElement) {
        activeStakesElement.textContent = activeStakesCount;
    }
}

function loadActiveStakes() {
    const savedStakes = localStorage.getItem('activeStakes');
    const activeStakes = savedStakes ? JSON.parse(savedStakes).filter(stake => stake.status === 'active') : [];
    
    // Обновляем счетчик активных ставок
    const userStats = JSON.parse(localStorage.getItem('userStats')) || {
        monthlyChange: 2.92,
        assetsCount: 5,
        activeStakes: 0
    };
    userStats.activeStakes = activeStakes.length;
    localStorage.setItem('userStats', JSON.stringify(userStats));
    
    // Обновляем отображение в статистике
    const activeStakesElement = document.getElementById('activeStakes');
    if (activeStakesElement) {
        activeStakesElement.textContent = activeStakes.length;
    }
    
    // Если есть активные ставки, показываем их в отдельной секции
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    // Удаляем существующую секцию активных ставок, если она есть
    const existingStakesSection = document.querySelector('.active-stakes-section');
    if (existingStakesSection) {
        existingStakesSection.remove();
    }
    
    if (activeStakes.length > 0) {
        // Создаем секцию активных ставок
        const stakesSection = document.createElement('section');
        stakesSection.className = 'active-stakes-section';
        stakesSection.innerHTML = `
            <div class="section-header">
                <h2>Активные ставки</h2>
                <span class="stakes-count">${activeStakes.length}</span>
            </div>
            <div class="stakes-list">
                ${activeStakes.map(stake => {
                    const timeLeft = new Date(stake.endTime) - new Date();
                    const minutes = Math.floor(timeLeft / (1000 * 60));
                    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                    
                    return `
                        <div class="stake-item" data-stake-id="${stake.id}">
                            <div class="stake-info">
                                <div class="stake-coin">${stake.coinName} (${stake.coinSymbol})</div>
                                <div class="stake-details">
                                    $${stake.amount.toFixed(2)} • ${getPeriodText(stake.period)}
                                </div>
                            </div>
                            <div class="stake-timer">
                                <div class="timer-value">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                                <div class="timer-label">Осталось</div>
                            </div>
                            <div class="stake-direction ${stake.direction}">
                                <i class="fas fa-arrow-${stake.direction === 'up' ? 'up' : 'down'}"></i>
                                <span>${stake.direction === 'up' ? 'Рост' : 'Падение'}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Вставляем секцию после секции статистики
        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            statsSection.parentNode.insertBefore(stakesSection, statsSection.nextSibling);
        }
        
        // Запускаем таймеры для обновления времени
        startStakesTimers(activeStakes);
    }
}

// Функция для обновления статистики при изменении баланса
function updateStatsOnBalanceChange() {
    const user = JSON.parse(localStorage.getItem('user'));
    const userBalance = user ? user.balance : 0;
    
    // Если баланс нулевой, показываем все нули
    if (userBalance <= 0) {
        const monthlyChangeElement = document.getElementById('monthlyChange');
        const assetsCountElement = document.getElementById('assetsCount');
        const activeStakesElement = document.getElementById('activeStakes');

        if (monthlyChangeElement) {
            monthlyChangeElement.textContent = '+0.00%';
        }
        if (assetsCountElement) {
            assetsCountElement.textContent = '0';
        }
        if (activeStakesElement) {
            activeStakesElement.textContent = '0';
        }
        return;
    }

    // Получаем настоящие данные из localStorage или используем значения по умолчанию
    const userStats = JSON.parse(localStorage.getItem('userStats')) || {
        monthlyChange: 2.92,
        assetsCount: 5,
        activeStakes: 0
    };

    // Обновляем отображение статистики
    const monthlyChangeElement = document.getElementById('monthlyChange');
    const assetsCountElement = document.getElementById('assetsCount');
    const activeStakesElement = document.getElementById('activeStakes');

    if (monthlyChangeElement) {
        monthlyChangeElement.textContent = `+${userStats.monthlyChange.toFixed(2)}%`;
    }
    if (assetsCountElement) {
        assetsCountElement.textContent = userStats.assetsCount;
    }
    if (activeStakesElement) {
        activeStakesElement.textContent = userStats.activeStakes;
    }
}

function startStakesTimers(stakes) {
    stakes.forEach(stake => {
        const timerId = setInterval(() => {
            const timeLeft = new Date(stake.endTime) - new Date();
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                // Ставка завершена, обновляем отображение
                loadActiveStakes();
            } else {
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                const timerElement = document.querySelector(`[data-stake-id="${stake.id}"] .timer-value`);
                if (timerElement) {
                    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }, 1000);
    });
}

function getPeriodText(minutes) {
    if (minutes < 60) {
        return `${minutes} мин`;
    } else if (minutes < 1440) {
        const hours = minutes / 60;
        return `${hours} ч`;
    } else {
        const days = minutes / 1440;
        return `${days} дн`;
    }
}


function openDepositModal() {
    window.location.href = 'Dep.html';
}

function openWithdrawModal() {
    window.location.href = 'vivod.html';
}

function openSupportModal() {
    window.location.href = 'support.html';
}

function contactSupport(type) {
    switch(type) {
        case 'email':
            window.open('mailto:support@sellbit.com?subject=Техническая поддержка', '_blank');
            break;
        case 'telegram':
            window.open('https://t.me/SaleBitAdmin', '_blank');
            break;
        case 'chat':
            showToast('Онлайн чат', 'Чат будет открыт в новом окне', 'info');
            // Здесь можно добавить интеграцию с чат-системой
            break;
    }
    closeModal('supportModal');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function navigateToPage(page) {
    if (page === 'home') {
        window.location.href = 'home.html';
    } else if (page === 'coins') {
        window.location.href = 'coins.html';
    } else if (page === 'news') {
        window.location.href = 'news.html';
    } else if (page === 'settings') {
        window.location.href = 'settings.html';
    } else if (page === 'history') {
        window.location.href = 'History.html';
    }
}

function formatCurrency(amount) {
    if (amount >= 1000) {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (amount >= 1) {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    } else {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

function openTransactionDetails(type, amount, currency) {
    const typeText = type === 'deposit' ? 'Пополнение' : type === 'buy' ? 'Покупка' : 'Продажа';
    showToast('Детали операции', `${typeText} ${amount} ${currency}`, 'info');
}

function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div><strong>${title}</strong></div>
        <div>${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Функции для обновления статистики
function updateMonthlyChange(newChange) {
    const userStats = JSON.parse(localStorage.getItem('userStats')) || {};
    userStats.monthlyChange = newChange;
    localStorage.setItem('userStats', JSON.stringify(userStats));
    updateStats();
}

function updateAssetsCount(newCount) {
    const userStats = JSON.parse(localStorage.getItem('userStats')) || {};
    userStats.assetsCount = newCount;
    localStorage.setItem('userStats', JSON.stringify(userStats));
    updateStats();
}

function updateActiveStakes(newStakes) {
    const userStats = JSON.parse(localStorage.getItem('userStats')) || {};
    userStats.activeStakes = newStakes;
    localStorage.setItem('userStats', JSON.stringify(userStats));
    updateStats();
}

// Функция для получения текущей статистики
function getCurrentStats() {
    const user = JSON.parse(localStorage.getItem('user'));
    const userBalance = user ? user.balance : 0;
    
    // Если баланс нулевой, возвращаем нули
    if (userBalance <= 0) {
        return {
            monthlyChange: 0,
            assetsCount: 0,
            activeStakes: 0
        };
    }
    
    return JSON.parse(localStorage.getItem('userStats')) || {
        monthlyChange: 2.92,
        assetsCount: 5,
        activeStakes: 3
    };
}

// Обработчики форм
document.addEventListener('DOMContentLoaded', function() {
    const depositForm = document.getElementById('depositForm');
    const withdrawForm = document.getElementById('withdrawForm');
    
            if (depositForm) {
            depositForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const amount = parseFloat(document.getElementById('depositAmount').value);
                const user = JSON.parse(localStorage.getItem('user'));
                user.balance += amount;
                localStorage.setItem('user', JSON.stringify(user));
                
                // Синхронизируем с сервером
                if (window.BalanceSync) {
                    await window.BalanceSync.updateServerBalance(user.balance);
                }
                
                // Пересчитываем показатели без случайностей
                ensureMonthlySnapshot(user.balance);
                loadBalance();
                closeModal('depositModal');
                showToast('Успех', `Баланс пополнен на $${amount.toFixed(2)}`, 'success');
            });
        }
    
            if (withdrawForm) {
            withdrawForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const amount = parseFloat(document.getElementById('withdrawAmount').value);
                const user = JSON.parse(localStorage.getItem('user'));
                
                if (amount > user.balance) {
                    showToast('Ошибка', 'Недостаточно средств', 'error');
                    return;
                }
                
                user.balance -= amount;
                localStorage.setItem('user', JSON.stringify(user));
                
                // Синхронизируем с сервером
                if (window.BalanceSync) {
                    await window.BalanceSync.updateServerBalance(user.balance);
                }
                
                // Пересчитываем показатели без случайностей
                ensureMonthlySnapshot(user.balance);
                loadBalance();
                closeModal('withdrawModal');
                showToast('Успех', `Выведено $${amount.toFixed(2)}`, 'success');
            });
        }
});



function openTransactionDetails(type, amount, currency) {
    // Можно добавить модальное окно с деталями транзакции
    console.log('Открытие деталей транзакции:', { type, amount, currency });
}

function scrollToTransactions() {
    const transactionsSection = document.querySelector('.transactions-section');
    if (transactionsSection) {
        transactionsSection.scrollIntoView({ behavior: 'smooth' });
        // Обновляем данные транзакций
        loadRecentTransactions();
        updateStats();
    }
}

// Обработчики для кнопок покупки, продажи и ставок
function openBuyModal() {
    // Переходим на страницу покупки
    window.location.href = 'Buy.html';
}

function openSellModal() {
    // Переходим на страницу продажи
    window.location.href = 'Sale.html';
}

function openStakeModal() {
    // Переходим на страницу ставок
    window.location.href = 'Stavka.html';
}

// Функция для возврата назад
function goBack() {
    window.history.back();
}

// Снэпшот баланса для расчета изменения за месяц
function getMonthlySnapshot() {
    try {
        const raw = localStorage.getItem('monthlySnapshot');
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

function setMonthlySnapshot(amount) {
    const snapshot = {
        amount: Number(amount) || 0,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('monthlySnapshot', JSON.stringify(snapshot));
    return snapshot;
}

function ensureMonthlySnapshot(currentBalance) {
    const snapshot = getMonthlySnapshot();
    const now = Date.now();
    if (!snapshot) {
        setMonthlySnapshot(currentBalance || 0);
        return;
    }
    const snapshotTime = new Date(snapshot.timestamp).getTime();
    const daysSince = (now - snapshotTime) / (1000 * 60 * 60 * 24);
    // Обновляем снэпшот, если старше 30 дней
    if (daysSince > 30) {
        setMonthlySnapshot(currentBalance || 0);
    }
}

// Assets Management Functions
let currentAssetsView = 'top'; // 'top' or 'my'

async function loadAssets() {
    if (currentAssetsView === 'top') {
        await loadTopAssets();
    } else {
        await loadMyAssets();
    }
}

async function loadTopAssets() {
    const container = document.getElementById('assetsList');
    if (!container) return;

    try {
        // Получаем данные о монетах из публичного API
        const response = await fetch('/api/coins/public', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && Array.isArray(data.data)) {
                // Сортируем по росту цены за день и берем топ-3
                const topCoins = data.data
                    .filter(coin => coin.priceChange !== undefined && coin.priceChange !== null)
                    .sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0))
                    .slice(0, 3);
                
                displayTopAssets(container, topCoins);
            } else {
                showAssetsEmpty(container, 'Ошибка загрузки данных');
            }
        } else {
            console.error('Ошибка API при загрузке топ активов:', response.status);
            showAssetsEmpty(container, 'Ошибка загрузки данных');
        }
    } catch (error) {
        console.error('Ошибка загрузки топ активов:', error);
        showAssetsEmpty(container, 'Ошибка загрузки данных');
    }
}

async function loadMyAssets() {
    const container = document.getElementById('assetsList');
    if (!container) return;

    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showAssetsEmpty(container, 'Нет активов');
            return;
        }

        // Получаем ID пользователя из JWT токена
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;

        // Получаем портфель пользователя
        const response = await fetch(`/api/users/${userId}/portfolio`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.portfolio && data.portfolio.length > 0) {
                displayMyAssets(container, data.portfolio);
            } else {
                showAssetsEmpty(container, 'Нет активов');
            }
        } else if (response.status === 404) {
            showAssetsEmpty(container, 'Нет активов');
        } else {
            console.error('Ошибка API при загрузке портфеля:', response.status);
            showAssetsEmpty(container, 'Ошибка загрузки данных');
        }
    } catch (error) {
        console.error('Ошибка загрузки моих активов:', error);
        showAssetsEmpty(container, 'Ошибка загрузки данных');
    }
}

function displayTopAssets(container, coins) {
    if (!coins || coins.length === 0) {
        showAssetsEmpty(container, 'Нет данных');
        return;
    }

    container.innerHTML = coins.map(coin => {
        const priceChange = coin.priceChange || 0;
        const changeClass = priceChange >= 0 ? 'positive' : 'negative';
        const changeIcon = priceChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <div class="asset-item" onclick="openAssetDetails('${coin.id || coin.symbol}')">
                <div class="asset-icon">
                    <img src="${window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(coin.symbol) : '/logos/default.svg'}" 
                         alt="${coin.name}" 
                         onerror="this.src='/logos/default.svg'">
                </div>
                <div class="asset-info">
                    <div class="asset-name">${coin.name || coin.symbol}</div>
                    <div class="asset-symbol">${coin.symbol}</div>
                    <div class="asset-price">$${formatCurrency(coin.price || 0)}</div>
                </div>
                <div class="asset-change ${changeClass}">
                    <i class="fas ${changeIcon}"></i>
                    ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%
                </div>
            </div>
        `;
    }).join('');
}

function displayMyAssets(container, portfolio) {
    if (!portfolio || portfolio.length === 0) {
        showAssetsEmpty(container, 'Нет активов');
        return;
    }

    container.innerHTML = portfolio.map(asset => {
        const profitLoss = asset.profitLossPercent || 0;
        const changeClass = profitLoss >= 0 ? 'positive' : 'negative';
        const changeIcon = profitLoss >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <div class="asset-item" onclick="openAssetDetails('${asset.coinSymbol}')">
                <div class="asset-icon">
                    <img src="${window.CryptoLogos ? window.CryptoLogos.getCoinLogoBySymbol(asset.coinSymbol) : '/logos/default.svg'}" 
                         alt="${asset.coinName}" 
                         onerror="this.src='/logos/default.svg'">
                </div>
                <div class="asset-info">
                    <div class="asset-name">${asset.coinName || asset.coinSymbol}</div>
                    <div class="asset-symbol">${asset.coinSymbol}</div>
                    <div class="asset-price">${asset.balance ? asset.balance.toFixed(8) : '0'} ${asset.coinSymbol}</div>
                </div>
                <div class="asset-change ${changeClass}">
                    <i class="fas ${changeIcon}"></i>
                    ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%
                </div>
            </div>
        `;
    }).join('');
}

function showAssetsEmpty(container, message) {
    container.innerHTML = `
        <div class="assets-empty">
            <i class="fas fa-wallet"></i>
            <h3>${message}</h3>
            <p>${message === 'Нет активов' ? 'У вас пока нет активов в портфеле' : 'Попробуйте обновить страницу'}</p>
            ${message === 'Нет активов' ? '<button class="text-btn" onclick="window.location.href=\'coins.html\'">Начать торговлю</button>' : ''}
        </div>
    `;
}

function switchAssetsView(view) {
    currentAssetsView = view;
    
    // Обновляем активные кнопки
    const topBtn = document.getElementById('topAssetsBtn');
    const myBtn = document.getElementById('myAssetsBtn');
    
    if (topBtn && myBtn) {
        topBtn.classList.toggle('active', view === 'top');
        myBtn.classList.toggle('active', view === 'my');
    }
    
    // Загружаем соответствующие данные
    loadAssets();
}

function openAssetDetails(assetId) {
    window.location.href = `coininfo.html?coin=${assetId}`;
}

// Initialize sections state
function initializeSections() {
    // По умолчанию секция транзакций свернута
    const transactionsList = document.getElementById('recentTransactions');
    const toggleIcon = document.getElementById('transactionsToggleIcon');
    
    if (transactionsList && toggleIcon) {
        transactionsList.classList.add('collapsed');
        toggleIcon.classList.remove('rotated');
    }
}

// Transactions Toggle Function
function toggleTransactions() {
    const transactionsList = document.getElementById('recentTransactions');
    const toggleIcon = document.getElementById('transactionsToggleIcon');
    
    if (transactionsList && toggleIcon) {
        const isCollapsed = transactionsList.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Разворачиваем - стрелочка вверх
            transactionsList.classList.remove('collapsed');
            toggleIcon.classList.add('rotated');
        } else {
            // Сворачиваем - стрелочка вниз
            transactionsList.classList.add('collapsed');
            toggleIcon.classList.remove('rotated');
        }
    }
}