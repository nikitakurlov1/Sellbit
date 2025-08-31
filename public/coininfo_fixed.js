// Coin Info Page JavaScript

class CoinInfoPage {
    constructor() {
        this.currentPrice = 0;
        this.priceChange = 0;
        this.priceChangePercent = 0;
        this.chart = null;
        this.currentPeriod = '1D';
        this.currentCoin = null;
        this.ws = null; // WebSocket connection
        this.balanceSync = null; // BalanceSync instance
        this.activeStakes = []; // Активные ставки
        this.stakeDirection = 'up'; // Направление ставки
        this.init();
    }

    async init() {
        await this.loadCoinFromURL();
        this.bindEvents();
        this.initChart();
        this.updateCalculations();
        await this.loadCoinData();
        
        // Инициализируем синхронизацию баланса
        this.initBalanceSync();
        
        // Загружаем активные ставки
        this.loadActiveStakes();
        
        // Автоматическое обновление баланса каждые 5 секунд
        setInterval(() => {
            this.updateBalanceDisplay();
        }, 5000);
        
        // Проверяем результаты ставок каждые 30 секунд
        setInterval(() => {
            this.checkStakeResults();
        }, 30000);
        
        // Обновляем отображение активных ставок каждую минуту
        setInterval(() => {
            this.updateActiveStakesDisplay();
        }, 60000);
    }

    bindEvents() {
        // Back button
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.goBack();
            });
        }

        // Time period buttons
        const timeBtns = document.querySelectorAll('.time-btn');
        timeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeTimePeriod(e.target.dataset.period);
            });
        });

        // Stake form submission
        const stakeForm = document.getElementById('stakeForm');
        if (stakeForm) {
            stakeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleStake();
            });
        }

        // Stake amount input
        const stakeAmount = document.getElementById('stakeAmount');
        if (stakeAmount) {
            stakeAmount.addEventListener('input', () => {
                this.calculateStakePotential();
            });
        }

        // Stake time selector
        const stakeTime = document.getElementById('stakeTime');
        if (stakeTime) {
            stakeTime.addEventListener('change', () => {
                this.calculateStakePotential();
            });
        }

        // Direction buttons
        const directionBtns = document.querySelectorAll('.direction-btn');
        directionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectDirection(e.target.closest('.direction-btn').dataset.direction);
            });
        });

        // Favorite and share buttons
        const favoriteBtn = document.querySelector('.header-right .icon-btn:first-child');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                this.toggleFavorite();
            });
        }

        const shareBtn = document.querySelector('.header-right .icon-btn:last-child');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareCoin();
            });
        }

        // Cleanup WebSocket on page unload
        window.addEventListener('beforeunload', () => {
            if (this.ws) {
                this.ws.close();
            }
        });
    }

    calculateStakePotential() {
        const amount = parseFloat(document.getElementById('stakeAmount').value) || 0;
        const timeHours = parseInt(document.getElementById('stakeTime').value) || 1;
        
        // Коэффициенты выигрыша зависят от времени ставки
        const winMultipliers = {
            1: 1.8,   // 1 час - 80% прибыль
            3: 2.2,   // 3 часа - 120% прибыль
            6: 2.8,   // 6 часов - 180% прибыль
            12: 3.5,  // 12 часов - 250% прибыль
            24: 4.0   // 24 часа - 300% прибыль
        };
        
        const multiplier = winMultipliers[timeHours] || 1.8;
        const potentialWin = amount * multiplier;
        const potentialLoss = amount; // При проигрыше теряем всю сумму
        
        // Обновляем отображение
        const potentialWinElement = document.getElementById('potentialWin');
        const potentialLossElement = document.getElementById('potentialLoss');
        
        if (potentialWinElement) {
            potentialWinElement.textContent = `$${potentialWin.toFixed(2)}`;
            potentialWinElement.className = 'result-value positive';
        }
        
        if (potentialLossElement) {
            potentialLossElement.textContent = `$${potentialLoss.toFixed(2)}`;
            potentialLossElement.className = 'result-value negative';
        }
    }

    handleStake() {
        const amount = parseFloat(document.getElementById('stakeAmount').value);
        const timeHours = parseInt(document.getElementById('stakeTime').value);
        const direction = this.stakeDirection;
        
        if (amount < 10) {
            this.showToast('Минимальная сумма ставки: $10', 'error');
            return;
        }

        // Проверяем баланс
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.balance < amount) {
            this.showToast('Недостаточно средств на балансе', 'error');
            return;
        }

        this.showToast('Создание ставки...', 'info');
        
        // Создаем ставку
        const stake = {
            id: Date.now() + Math.random(),
            coinId: this.currentCoin.id,
            coinSymbol: this.currentCoin.symbol,
            coinName: this.currentCoin.name,
            amount: amount,
            direction: direction,
            timeHours: timeHours,
            startPrice: this.currentPrice,
            startTime: new Date(),
            endTime: new Date(Date.now() + timeHours * 60 * 60 * 1000),
            status: 'active',
            winMultiplier: this.getWinMultiplier(timeHours)
        };
        
        // Добавляем ставку в список активных
        this.activeStakes.push(stake);
        localStorage.setItem('activeStakes', JSON.stringify(this.activeStakes));
        
        // Списываем средства с баланса
        user.balance -= amount;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Синхронизируем с сервером
        if (window.BalanceSync) {
            window.BalanceSync.updateServerBalance(user.balance);
        }
        
        this.showToast(`Ставка на ${direction === 'up' ? 'рост' : 'падение'} создана!`, 'success');
        this.closeModal('stakeModal');
        document.getElementById('stakeAmount').value = '';
        this.calculateStakePotential();
        
        // Обновляем отображение активных ставок
        this.updateActiveStakesDisplay();
        this.updateStakesCount();
    }

    // Выбор направления ставки
    selectDirection(direction) {
        this.stakeDirection = direction;
        
        // Обновляем активную кнопку
        const directionBtns = document.querySelectorAll('.direction-btn');
        directionBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.direction === direction) {
                btn.classList.add('active');
            }
        });
        
        // Обновляем заголовок модального окна
        const modalTitle = document.getElementById('stakeModalTitle');
        if (modalTitle) {
            modalTitle.textContent = `Стейкинг - Ставка на ${direction === 'up' ? 'рост' : 'падение'}`;
        }
        
        // Обновляем кнопку отправки
        const submitBtn = document.getElementById('stakeSubmitBtn');
        if (submitBtn) {
            submitBtn.textContent = `Создать ставку на ${direction === 'up' ? 'рост' : 'падение'}`;
        }
        
        this.calculateStakePotential();
    }

    // Получение коэффициента выигрыша
    getWinMultiplier(timeHours) {
        const multipliers = {
            1: 1.8,
            3: 2.2,
            6: 2.8,
            12: 3.5,
            24: 4.0
        };
        return multipliers[timeHours] || 1.8;
    }

    // Загрузка активных ставок
    loadActiveStakes() {
        const savedStakes = localStorage.getItem('activeStakes');
        if (savedStakes) {
            this.activeStakes = JSON.parse(savedStakes);
            // Конвертируем строки дат обратно в объекты Date
            this.activeStakes.forEach(stake => {
                stake.startTime = new Date(stake.startTime);
                stake.endTime = new Date(stake.endTime);
            });
        }
        this.updateStakesCount();
    }

    // Обновление счетчика активных ставок
    updateStakesCount() {
        const activeCount = this.activeStakes.filter(stake => stake.status === 'active').length;
        const stakesCountElement = document.getElementById('stakesCount');
        if (stakesCountElement) {
            stakesCountElement.textContent = activeCount;
        }
    }

    // Проверка результатов ставок
    checkStakeResults() {
        const now = new Date();
        const completedStakes = [];
        
        this.activeStakes.forEach(stake => {
            if (stake.status === 'active' && now >= stake.endTime) {
                const result = this.calculateStakeResult(stake);
                stake.status = 'completed';
                stake.result = result;
                stake.endPrice = this.currentPrice;
                completedStakes.push(stake);
            }
        });
        
        // Обрабатываем завершенные ставки
        completedStakes.forEach(stake => {
            this.processStakeResult(stake);
        });
        
        // Обновляем список ставок
        if (completedStakes.length > 0) {
            localStorage.setItem('activeStakes', JSON.stringify(this.activeStakes));
            this.updateActiveStakesDisplay();
            this.updateStakesCount();
        }
    }

    // Расчет результата ставки
    calculateStakeResult(stake) {
        const priceChange = this.currentPrice - stake.startPrice;
        const priceChangePercent = (priceChange / stake.startPrice) * 100;
        
        if (stake.direction === 'up') {
            return priceChangePercent > 0 ? 'win' : 'loss';
        } else {
            return priceChangePercent < 0 ? 'win' : 'loss';
        }
    }

    // Обработка результата ставки
    processStakeResult(stake) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        
        let winAmount = 0;
        let profit = 0;
        
        if (stake.result === 'win') {
            // Выигрыш
            winAmount = stake.amount * stake.winMultiplier;
            profit = winAmount - stake.amount;
            user.balance += winAmount;
            
            this.showToast(
                `Поздравляем! Ставка на ${stake.direction === 'up' ? 'рост' : 'падение'} выиграла! +$${winAmount.toFixed(2)}`,
                'success'
            );
        } else {
            // Проигрыш
            profit = -stake.amount;
            this.showToast(
                `Ставка на ${stake.direction === 'up' ? 'рост' : 'падение'} проиграла. Потеряно: $${stake.amount.toFixed(2)}`,
                'error'
            );
        }
        
        // Сохраняем ставку в историю
        this.saveStakeToHistory(stake, winAmount, profit);
        
        localStorage.setItem('user', JSON.stringify(user));
        
        // Синхронизируем с сервером
        if (window.BalanceSync) {
            window.BalanceSync.updateServerBalance(user.balance);
        }
    }

    // Сохранение ставки в историю
    saveStakeToHistory(stake, winAmount, profit) {
        const stakeHistory = JSON.parse(localStorage.getItem('stakeHistory')) || [];
        
        const historyEntry = {
            id: stake.id,
            coinId: stake.coinId,
            coinSymbol: stake.coinSymbol,
            coinName: stake.coinName,
            amount: stake.amount,
            direction: stake.direction,
            timeHours: stake.timeHours,
            startPrice: stake.startPrice,
            endPrice: stake.endPrice,
            startTime: stake.startTime,
            endTime: stake.endTime,
            status: stake.status,
            result: stake.result,
            winAmount: winAmount,
            profit: profit,
            winMultiplier: stake.winMultiplier,
            createdAt: new Date().toISOString()
        };
        
        stakeHistory.push(historyEntry);
        localStorage.setItem('stakeHistory', JSON.stringify(stakeHistory));
        
        console.log('Ставка сохранена в историю:', historyEntry);
    }

    // Обновление отображения активных ставок
    updateActiveStakesDisplay() {
        const activeStakesList = document.getElementById('activeStakesList');
        if (!activeStakesList) return;
        
        const activeStakes = this.activeStakes.filter(stake => stake.status === 'active');
        
        if (activeStakes.length === 0) {
            activeStakesList.innerHTML = '<p class="no-stakes">У вас нет активных ставок</p>';
            return;
        }
        
        let html = '';
        activeStakes.forEach(stake => {
            const timeLeft = this.getTimeLeft(stake.endTime);
            const progress = this.getStakeProgress(stake.startTime, stake.endTime);
            
            html += `
                <div class="stake-item">
                    <div class="stake-header">
                        <div class="stake-coin">
                            <span class="coin-symbol">${stake.coinSymbol}</span>
                            <span class="coin-name">${stake.coinName}</span>
                        </div>
                        <div class="stake-direction ${stake.direction}">
                            <i class="fas fa-arrow-${stake.direction === 'up' ? 'up' : 'down'}"></i>
                            <span>${stake.direction === 'up' ? 'Рост' : 'Падение'}</span>
                        </div>
                    </div>
                    <div class="stake-details">
                        <div class="stake-amount">$${stake.amount.toFixed(2)}</div>
                        <div class="stake-time">${stake.timeHours} ч</div>
                        <div class="stake-multiplier">x${stake.winMultiplier}</div>
                    </div>
                    <div class="stake-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="time-left">${timeLeft}</div>
                    </div>
                    <div class="stake-prices">
                        <div class="start-price">Начальная: $${stake.startPrice.toFixed(2)}</div>
                        <div class="current-price">Текущая: $${this.currentPrice.toFixed(2)}</div>
                    </div>
                </div>
            `;
        });
        
        activeStakesList.innerHTML = html;
    }

    // Получение оставшегося времени
    getTimeLeft(endTime) {
        const now = new Date();
        const timeLeft = endTime - now;
        
        if (timeLeft <= 0) return 'Завершено';
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}ч ${minutes}м`;
    }

    // Получение прогресса ставки
    getStakeProgress(startTime, endTime) {
        const now = new Date();
        const total = endTime - startTime;
        const elapsed = now - startTime;
        
        return Math.min(100, Math.max(0, (elapsed / total) * 100));
    }

    // Открытие модального окна активных ставок
    openActiveStakesModal() {
        this.updateActiveStakesDisplay();
        document.getElementById('activeStakesModal').style.display = 'flex';
    }

    updateCalculations() {
        this.calculateStakePotential();
    }

    goBack() {
        window.history.back();
    }

    openStakeModal(direction = 'up') {
        this.selectDirection(direction);
        document.getElementById('stakeModal').style.display = 'flex';
        this.updateBalanceDisplay();
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Обновление отображения баланса в модальных окнах
    updateBalanceDisplay() {
        const user = JSON.parse(localStorage.getItem('user'));
        const balance = user ? user.balance : 0;
        
        // Обновляем баланс в модальном окне ставки
        const accountBalanceElement = document.getElementById('accountBalance');
        if (accountBalanceElement) {
            accountBalanceElement.textContent = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        // Обновляем текущую цену в модальном окне
        const currentPriceDisplay = document.getElementById('currentPriceDisplay');
        if (currentPriceDisplay) {
            currentPriceDisplay.textContent = `$${this.currentPrice.toFixed(2)}`;
        }
        
        console.log(`Баланс обновлен в coininfo.js: $${balance}`);
    }

    // Инициализация синхронизации баланса
    initBalanceSync() {
        // Проверяем, есть ли BalanceSync в глобальной области
        if (window.BalanceSync) {
            this.balanceSync = new window.BalanceSync();
            console.log('BalanceSync инициализирован в coininfo.js');
        } else {
            console.warn('BalanceSync не найден в глобальной области');
        }
    }

    async loadCoinFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const coinId = urlParams.get('coin') || 'bitcoin';
        
        // Load coin data from CRM
        await this.loadCoinFromCRM(coinId);
    }

    async loadCoinFromCRM(coinId) {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.error('No auth token found');
                this.showToast('Ошибка', 'Необходима авторизация', 'error');
                return;
            }

            // Используем тот же API эндпоинт что и coins.js для обеспечения одинаковых данных
            const response = await fetch('/api/coins/exchange', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.coins) {
                    // Находим нужную монету по ID
                    const coin = result.coins.find(c => c.id === coinId);
                    if (coin) {
                        this.currentCoin = {
                            ...coin,
                            icon: this.getCoinIcon(coin.symbol),
                            color: this.getCoinColor(coin.symbol)
                        };
                        this.updateCoinInfo();
                    } else {
                        console.error('Coin not found:', coinId);
                        this.showToast('Ошибка', 'Монета не найдена', 'error');
                    }
                } else {
                    console.error('Failed to load coins data');
                    this.showToast('Ошибка', 'Не удалось загрузить данные монет', 'error');
                }
            } else {
                console.error('Failed to load coins:', response.status);
                this.showToast('Ошибка', 'Не удалось загрузить данные монет', 'error');
            }
        } catch (error) {
            console.error('Error loading coin from CRM:', error);
            this.showToast('Ошибка', 'Не удалось загрузить данные монет', 'error');
        }
    }

    getCoinIcon(symbol) {
        const iconMap = {
            'BTC': 'fab fa-bitcoin',
            'ETH': 'fab fa-ethereum',
            'BNB': 'fas fa-coins',
            'SOL': 'fas fa-bolt',
            'ADA': 'fas fa-chart-line',
            'XRP': 'fas fa-waves',
            'DOT': 'fas fa-circle',
            'DOGE': 'fas fa-dog',
            'AVAX': 'fas fa-mountain',
            'LINK': 'fas fa-link',
            'MATIC': 'fas fa-polygon',
            'UNI': 'fas fa-exchange-alt',
            'LTC': 'fas fa-coins',
            'XLM': 'fas fa-star',
            'ATOM': 'fas fa-atom',
            'XMR': 'fas fa-shield-alt',
            'ALGO': 'fas fa-chart-bar',
            'VET': 'fas fa-car',
            'FIL': 'fas fa-hdd',
            'ICP': 'fas fa-network-wired'
        };
        
        return iconMap[symbol] || 'fas fa-coins';
    }

    getCoinColor(symbol) {
        const colorMap = {
            'BTC': '#f7931a',
            'ETH': '#627eea',
            'BNB': '#f3ba2f',
            'SOL': '#9945ff',
            'ADA': '#0033ad',
            'XRP': '#23292f',
            'DOT': '#e6007a',
            'DOGE': '#c2a633',
            'AVAX': '#e84142',
            'LINK': '#2a5ada',
            'MATIC': '#8247e5',
            'UNI': '#ff007a',
            'LTC': '#a6a9aa',
            'XLM': '#000000',
            'ATOM': '#2e3148',
            'XMR': '#ff6600',
            'ALGO': '#000000',
            'VET': '#15bdff',
            'FIL': '#0090ff',
            'ICP': '#29a4ff'
        };
        
        return colorMap[symbol] || '#6c757d';
    }

    updateCoinInfo() {
        if (!this.currentCoin) return;
        
        // Обновляем заголовок страницы
        document.title = `${this.currentCoin.name} - SellBit`;
        
        // Обновляем информацию о монете в заголовке
        const coinIcon = document.querySelector('.coin-icon i');
        const coinName = document.querySelector('.coin-name');
        const coinSymbol = document.querySelector('.coin-symbol');
        
        if (coinIcon) {
            coinIcon.className = this.currentCoin.icon;
            coinIcon.parentElement.style.background = this.currentCoin.color;
        }
        if (coinName) coinName.textContent = this.currentCoin.name;
        if (coinSymbol) coinSymbol.textContent = this.currentCoin.symbol;
        
        // Обновляем цену и изменение
        this.currentPrice = this.currentCoin.price || 0;
        this.priceChange = this.currentCoin.priceChange || 0;
        this.priceChangePercent = this.currentCoin.priceChange ? (this.currentCoin.priceChange / this.currentPrice * 100) : 0;
        
        const priceElement = document.getElementById('currentPrice');
        const changeElement = document.getElementById('priceChange');
        
        if (priceElement) {
            priceElement.textContent = `$${this.formatCurrency(this.currentPrice)}`;
        }
        
        if (changeElement) {
            const isPositive = this.priceChangePercent >= 0;
            changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
            changeElement.innerHTML = `
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                ${isPositive ? '+' : ''}$${Math.abs(this.priceChange).toFixed(2)} (${isPositive ? '+' : ''}${this.priceChangePercent.toFixed(2)}%)
            `;
        }
        
        // Обновляем статистику
        const volumeElement = document.querySelector('.stat-item:nth-child(1) .stat-value');
        const marketCapElement = document.querySelector('.stat-item:nth-child(2) .stat-value');
        const circulatingElement = document.querySelector('.stat-item:nth-child(3) .stat-value');
        
        if (volumeElement) volumeElement.textContent = `$${this.formatMarketCap(this.currentCoin.volume || 0)}`;
        if (marketCapElement) marketCapElement.textContent = `$${this.formatMarketCap(this.currentCoin.marketCap || 0)}`;
        if (circulatingElement) circulatingElement.textContent = `${this.currentCoin.circulating || 'N/A'} ${this.currentCoin.symbol}`;
        
        // Обновляем информацию о монете (используем данные из CRM или дефолтные)
        const algorithmElement = document.querySelector('.about-stat:nth-child(1) .stat-value');
        const maxSupplyElement = document.querySelector('.about-stat:nth-child(2) .stat-value');
        const blockTimeElement = document.querySelector('.about-stat:nth-child(3) .stat-value');
        const creatorElement = document.querySelector('.about-stat:nth-child(4) .stat-value');
        
        if (algorithmElement) algorithmElement.textContent = this.currentCoin.algorithm || 'N/A';
        if (maxSupplyElement) maxSupplyElement.textContent = this.currentCoin.maxSupply || 'N/A';
        if (blockTimeElement) blockTimeElement.textContent = this.currentCoin.blockTime || 'N/A';
        if (creatorElement) creatorElement.textContent = this.currentCoin.creator || 'N/A';
        
        // Обновляем заголовок модального окна ставки
        const stakeModalTitle = document.getElementById('stakeModalTitle');
        if (stakeModalTitle) {
            stakeModalTitle.textContent = `Стейкинг - Ставка на ${this.stakeDirection === 'up' ? 'рост' : 'падение'}`;
        }
    }

    formatMarketCap(marketCap) {
        if (marketCap >= 1000000000000) {
            return (marketCap / 1000000000000).toFixed(1) + 'T';
        } else if (marketCap >= 1000000000) {
            return (marketCap / 1000000000).toFixed(1) + 'B';
        } else if (marketCap >= 1000000) {
            return (marketCap / 1000000).toFixed(1) + 'M';
        } else {
            return marketCap.toLocaleString();
        }
    }

    formatCurrency(amount) {
        if (amount >= 1000) {
            return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else if (amount >= 1) {
            return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
        } else {
            return amount.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
        }
    }

    async loadCoinData() {
        // Load chart data
        await this.loadChartData(this.currentPeriod);
        
        this.showToast('Данные загружены', 'info');
        
        // Update price with animation
        this.animatePriceChange();
        
        // Initialize WebSocket for real-time updates
        this.initializeWebSocket();
    }

    // Initialize WebSocket connection for real-time updates
    initializeWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            console.log('Initializing WebSocket for coininfo:', wsUrl);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connection established for coininfo');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'price_update' && this.currentCoin && message.data.coinId === this.currentCoin.id) {
                        // Update current coin price
                        this.currentPrice = message.data.price;
                        this.priceChange = message.data.priceChange;
                        this.priceChangePercent = (this.priceChange / this.currentPrice) * 100;
                        
                        // Update display
                        this.updatePriceDisplay();
                        
                        // Update chart if needed
                        this.updateChartWithRealTimeData(message.data.price);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket connection closed for coininfo');
                // Reconnect after 5 seconds
                setTimeout(() => this.initializeWebSocket(), 5000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error in coininfo:', error);
            };
        } catch (error) {
            console.error('Error initializing WebSocket in coininfo:', error);
        }
    }

    // Update price display with real-time data
    updatePriceDisplay() {
        const priceElement = document.getElementById('currentPrice');
        const changeElement = document.getElementById('priceChange');
        
        if (priceElement) {
            priceElement.textContent = `$${this.formatCurrency(this.currentPrice)}`;
        }
        
        if (changeElement) {
            const isPositive = this.priceChangePercent >= 0;
            changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
            changeElement.innerHTML = `
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                ${isPositive ? '+' : ''}$${Math.abs(this.priceChange).toFixed(2)} (${isPositive ? '+' : ''}${this.priceChangePercent.toFixed(2)}%)
            `;
        }
    }

    // Update chart with real-time price data
    updateChartWithRealTimeData(newPrice) {
        if (!this.chart) return;
        
        // Add new data point to chart
        const now = new Date();
        const timeLabel = this.formatChartLabel(now);
        
        // Add new data point
        this.chart.data.labels.push(timeLabel);
        this.chart.data.datasets[0].data.push(newPrice);
        
        // Keep only last 100 points
        if (this.chart.data.labels.length > 100) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
        }
        
        this.chart.update('none'); // Update without animation for real-time feel
    }

    animatePriceChange() {
        const priceElement = document.getElementById('currentPrice');
        const changeElement = document.getElementById('priceChange');
        
        if (priceElement && changeElement) {
            // Simulate price updates
            setInterval(() => {
                const change = (Math.random() - 0.5) * 100;
                const newPrice = this.currentPrice + change;
                const newChange = this.priceChange + change;
                const newChangePercent = (newChange / newPrice) * 100;
                
                this.currentPrice = newPrice;
                this.priceChange = newChange;
                this.priceChangePercent = newChangePercent;
                
                priceElement.textContent = `$${this.formatCurrency(newPrice)}`;
                
                const isPositive = newChangePercent >= 0;
                changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
                changeElement.innerHTML = `
                    <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                    ${isPositive ? '+' : ''}$${Math.abs(newChange).toFixed(2)} (${isPositive ? '+' : ''}${newChangePercent.toFixed(2)}%)
                `;
            }, 5000); // Update every 5 seconds
        }
    }

    toggleFavorite() {
        const favoriteBtn = document.querySelector('.header-right .icon-btn:first-child i');
        const isFavorite = favoriteBtn.classList.contains('fas');
        
        if (isFavorite) {
            favoriteBtn.classList.remove('fas');
            favoriteBtn.classList.add('far');
            this.showToast('Удалено из избранного', 'info');
        } else {
            favoriteBtn.classList.remove('far');
            favoriteBtn.classList.add('fas');
            this.showToast('Добавлено в избранное', 'success');
        }
    }

    shareCoin() {
        if (navigator.share) {
            navigator.share({
                title: `${this.currentCoin.name} (${this.currentCoin.symbol})`,
                text: `Текущая цена ${this.currentCoin.name}: $${this.currentPrice.toLocaleString()}`,
                url: window.location.href
            });
        } else {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard.writeText(`${this.currentCoin.name} (${this.currentCoin.symbol}): $${this.currentPrice.toLocaleString()}`);
            this.showToast('Ссылка скопирована в буфер обмена', 'success');
        }
    }

    initChart() {
        const ctx = document.getElementById('priceChart');
        if (!ctx) return;

        // Initialize with empty data, will be updated when real data is loaded
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Цена (USD)',
                    data: [],
                    borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return 'Цена: $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        grid: {
                            color: '#f0f0f0'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 2,
                        hoverRadius: 4
                    },
                    line: {
                        tension: 0.2 // Slightly reduce tension for more natural curves
                    }
                },
                animation: {
                    duration: 750 // Faster animations for more responsive feel
                }
            }
        });
    }

    async loadChartData(period = '1D') {
        if (!this.currentCoin) return;

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.error('No auth token found');
                // Показываем демо данные если нет токена
                this.updateChartWithGeneratedData(period);
                return;
            }

            // Get price history from CRM - exactly like in crmcoindetal.js
            const response = await fetch(`/api/coins/${this.currentCoin.id}/price-history?limit=100`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.priceHistory) {
                    this.updateChartWithRealData(result.priceHistory, period);
                } else {
                    // Fallback to generated data if no real data available
                    this.updateChartWithGeneratedData(period);
                }
            } else {
                console.error('Failed to load price history:', response.status);
                this.updateChartWithGeneratedData(period);
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.updateChartWithGeneratedData(period);
        }
    }

    updateChartWithRealData(priceHistory, period) {
        if (!this.chart || !priceHistory.length) return;

        // Filter data based on period
        const now = new Date();
        const filteredData = this.filterDataByPeriod(priceHistory, period, now);

        // Sort by timestamp (oldest first) - exactly like in CRM
        filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Prepare chart data - exactly like in CRM
        const labels = filteredData.map(item => this.formatChartLabel(new Date(item.timestamp)));
        const prices = filteredData.map(item => item.price);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = prices;
        this.chart.data.datasets[0].label = `Цена ${this.currentCoin.symbol}`;
        this.chart.update();
        
        console.log(`Chart updated with ${filteredData.length} data points for period ${period}`);
    }

    // Format chart label - exactly like in CRM
    formatChartLabel(date) {
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    filterDataByPeriod(priceHistory, period, now) {
        const periods = {
            '1D': 24 * 60 * 60 * 1000, // 24 hours
            '1W': 7 * 24 * 60 * 60 * 1000, // 7 days
            '1M': 30 * 24 * 60 * 60 * 1000, // 30 days
            '3M': 90 * 24 * 60 * 60 * 1000, // 90 days
            '1Y': 365 * 24 * 60 * 60 * 1000, // 365 days
            'ALL': Infinity
        };

        const timeLimit = periods[period] || periods['1D'];
        const cutoffTime = now.getTime() - timeLimit;

        return priceHistory
            .filter(entry => new Date(entry.timestamp).getTime() >= cutoffTime)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    updateChartWithGeneratedData(period) {
        const data = this.generateChartData(period);
        
        if (this.chart) {
            this.chart.data.labels = data.labels;
            this.chart.data.datasets[0].data = data.prices;
            this.chart.data.datasets[0].label = `Цена ${this.currentCoin?.symbol || 'BTC'}`;
            this.chart.update();
        }
    }

    generateChartData(period = '1D') {
        const periods = {
            '1D': { points: 24, interval: 1 },
            '1W': { points: 7, interval: 1 },
            '1M': { points: 30, interval: 1 },
            '3M': { points: 90, interval: 1 },
            '1Y': { points: 12, interval: 30 },
            'ALL': { points: 24, interval: 30 }
        };

        const periodConfig = periods[period] || periods['1D'];
        const labels = [];
        const prices = [];
        const basePrice = this.currentPrice || 43250.00;
        const volatility = 0.02;

        for (let i = 0; i < periodConfig.points; i++) {
            labels.push(i.toString());
            const randomChange = (Math.random() - 0.5) * volatility;
            const price = basePrice * (1 + randomChange);
            prices.push(price);
        }

        return { labels, prices };
    }

    changeTimePeriod(period) {
        this.currentPeriod = period;
        
        // Update active button
        const timeBtns = document.querySelectorAll('.time-btn');
        timeBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.period === period) {
                btn.classList.add('active');
            }
        });

        // Update chart with real data for the new period
        this.loadChartData(period);
        this.showToast(`График обновлен: ${period}`, 'info');
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    window.coinInfoPage = new CoinInfoPage();
});

// Global functions for HTML onclick handlers
function goBack() {
    window.history.back();
}

function openStakeModal(direction = 'up') {
    if (window.coinInfoPage) {
        window.coinInfoPage.openStakeModal(direction);
    }
}

function openActiveStakesModal() {
    if (window.coinInfoPage) {
        window.coinInfoPage.openActiveStakesModal();
    }
}

function selectDirection(direction) {
    if (window.coinInfoPage) {
        window.coinInfoPage.selectDirection(direction);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}
