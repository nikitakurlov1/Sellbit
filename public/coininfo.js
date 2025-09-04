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
        
        // Проверяем результаты сделок каждые 30 секунд
        setInterval(() => {
            this.checkStakeResults();
        }, 30000);
        
        // Обновляем отображение активных сделок каждую минуту
        setInterval(() => {
            this.updateActiveStakesDisplay();
        }, 60000);
        
        // Инициализируем ползунок времени
        this.initializeTimeSlider();
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

        // Buy form submission
        const buyForm = document.getElementById('buyForm');
        if (buyForm) {
            buyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const usdAmount = parseFloat(document.getElementById('buyAmountUSD').value);
                this.handleBuy(usdAmount);
            });
        }

        // Sell form submission
        const sellForm = document.getElementById('sellForm');
        if (sellForm) {
            sellForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const amount = parseFloat(document.getElementById('sellAmount').value);
                this.handleSell(amount);
            });
        }

        // Stake amount input
        const stakeAmount = document.getElementById('stakeAmount');
        if (stakeAmount) {
            stakeAmount.addEventListener('input', () => {
                this.calculateStakePotential();
            });
        }

        // Time slider
        const timeSlider = document.getElementById('timeSlider');
        if (timeSlider) {
            timeSlider.addEventListener('input', (e) => {
                this.updateTimeSlider(e.target.value);
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
        const timeHours = parseFloat(document.getElementById('stakeTime').value) || 1;
        
        // Базовые коэффициенты выигрыша зависят от времени ставки
        const baseMultipliers = {
            0.083: 1.05, // 5 минут - базовая прибыль 5%
            1: 1.15,     // 1 час - базовая прибыль 15%
            3: 1.25,     // 3 часа - базовая прибыль 25%
            6: 1.35,     // 6 часов - базовая прибыль 35%
            12: 1.45,    // 12 часов - базовая прибыль 45%
            24: 1.55     // 24 часа - базовая прибыль 55%
        };
        
        const baseMultiplier = baseMultipliers[timeHours] || 1.15;
        
        // Показываем примеры выигрышей при разных процентах изменения цены
        const examples = [
            { percent: 0.5, multiplier: baseMultiplier + 0.05 },
            { percent: 1, multiplier: baseMultiplier + 0.1 },
            { percent: 2, multiplier: baseMultiplier + 0.2 },
            { percent: 5, multiplier: baseMultiplier + 0.5 }
        ];
        
        // Обновляем отображение с примерами
        const potentialWinElement = document.getElementById('potentialWin');
        const potentialLossElement = document.getElementById('potentialLoss');
        
        if (potentialWinElement) {
            // Показываем пример при 2% изменении цены
            const exampleMultiplier = baseMultiplier + 0.2;
            const potentialWin = amount * exampleMultiplier;
            potentialWinElement.textContent = `$${potentialWin.toFixed(2)} (при 2% изменении)`;
            potentialWinElement.className = 'result-value positive';
        }
        
        if (potentialLossElement) {
            potentialLossElement.textContent = `$${amount.toFixed(2)}`;
            potentialLossElement.className = 'result-value negative';
        }
        
        // Добавляем информацию о динамических коэффициентах
        this.updateMultiplierInfo(examples, amount);
    }

    handleStake() {
        const amount = parseFloat(document.getElementById('stakeAmount').value);
        const timeHours = parseFloat(document.getElementById('stakeTime').value);
        const direction = this.stakeDirection;
        
        if (amount < 10) {
            this.showToast('Минимальная сумма сделки: $10', 'error');
            return;
        }

        // Проверяем баланс
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.balance < amount) {
            this.showToast('Недостаточно средств на балансе', 'error');
            return;
        }

        this.showToast('Создание сделки...', 'info');
        
        // Создаем сделку
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
            baseMultiplier: this.getWinMultiplier(timeHours, 0), // Базовый множитель
            dynamicMultiplier: true // Флаг для динамического расчета
        };
        
        // Добавляем сделку в список активных
        this.activeStakes.push(stake);
        localStorage.setItem('activeStakes', JSON.stringify(this.activeStakes));
        
        // Списываем средства с баланса
        user.balance -= amount;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Синхронизируем с сервером
        if (window.BalanceSync) {
            window.BalanceSync.updateServerBalance(user.balance);
        }
        
        this.showToast(`Сделка на ${direction === 'up' ? 'рост' : 'падение'} создана!`, 'success');
        this.closeModal('stakeModal');
        document.getElementById('stakeAmount').value = '';
        this.calculateStakePotential();
        
        // Обновляем отображение активных сделок
        this.updateActiveStakesDisplay();
        this.updateStakesCount();
    }

    // Обновление ползунка времени
    updateTimeSlider(value) {
        const timeValues = [0.083, 1, 3, 6, 12, 24]; // в часах
        const timeLabels = [
            { value: 5, unit: 'минут' },
            { value: 1, unit: 'час' },
            { value: 3, unit: 'часа' },
            { value: 6, unit: 'часов' },
            { value: 12, unit: 'часов' },
            { value: 24, unit: 'часа' }
        ];
        
        const index = parseInt(value);
        const timeValue = timeValues[index];
        const timeLabel = timeLabels[index];
        
        // Обновляем отображение времени
        const currentTimeValue = document.getElementById('currentTimeValue');
        const currentTimeUnit = document.getElementById('currentTimeUnit');
        if (currentTimeValue && currentTimeUnit) {
            currentTimeValue.textContent = timeLabel.value;
            currentTimeUnit.textContent = timeLabel.unit;
        }
        
        // Обновляем активные метки
        const timeLabelsElements = document.querySelectorAll('.time-label');
        timeLabelsElements.forEach((label, i) => {
            label.classList.toggle('active', i === index);
        });
        
        // Обновляем значение скрытого input
        const stakeTimeInput = document.getElementById('stakeTime');
        if (stakeTimeInput) {
            stakeTimeInput.value = timeValue;
        }
        
        // Пересчитываем потенциальный выигрыш
        this.calculateStakePotential();
    }

    // Инициализация ползунка времени
    initializeTimeSlider() {
        const timeSlider = document.getElementById('timeSlider');
        if (timeSlider) {
            // Устанавливаем начальное значение
            this.updateTimeSlider(0);
        }
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
            modalTitle.textContent = `Торговля - Сделка на ${direction === 'up' ? 'рост' : 'падение'}`;
        }
        
        // Обновляем кнопку отправки
        const submitBtn = document.getElementById('stakeSubmitBtn');
        if (submitBtn) {
            submitBtn.textContent = `Создать сделку на ${direction === 'up' ? 'рост' : 'падение'}`;
        }
        
        this.calculateStakePotential();
    }

    // Обновление информации о динамических коэффициентах
    updateMultiplierInfo(examples, amount) {
        // Создаем или обновляем элемент с информацией о коэффициентах
        let multiplierInfo = document.getElementById('multiplierInfo');
        if (!multiplierInfo) {
            multiplierInfo = document.createElement('div');
            multiplierInfo.id = 'multiplierInfo';
            multiplierInfo.className = 'multiplier-info';
            
            // Вставляем после potential-results
            const potentialResults = document.querySelector('.potential-results');
            if (potentialResults) {
                potentialResults.parentNode.insertBefore(multiplierInfo, potentialResults.nextSibling);
            }
        }
        
        let html = '<div class="multiplier-title">Коэффициенты выигрыша:</div>';
        html += '<div class="multiplier-subtitle">Чем больше изменение цены, тем выше выигрыш</div>';
        html += '<div class="multiplier-examples">';
        
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
        
        html += '</div>';
        html += '<div class="multiplier-note">* Коэффициенты зависят от времени ставки и изменения цены</div>';
        multiplierInfo.innerHTML = html;
    }

    // Получение коэффициента выигрыша на основе процента изменения цены
    getWinMultiplier(timeHours, priceChangePercent = 0) {
        // Базовые коэффициенты
        const baseMultipliers = {
            0.083: 1.05, // 5 минут - базовая прибыль 5%
            1: 1.15,     // 1 час - базовая прибыль 15%
            3: 1.25,     // 3 часа - базовая прибыль 25%
            6: 1.35,     // 6 часов - базовая прибыль 35%
            12: 1.45,    // 12 часов - базовая прибыль 45%
            24: 1.55     // 24 часа - базовая прибыль 55%
        };
        
        const baseMultiplier = baseMultipliers[timeHours] || 1.15;
        
        // Дополнительный множитель на основе процента изменения
        let additionalMultiplier = 0;
        const absChangePercent = Math.abs(priceChangePercent);
        
        if (absChangePercent >= 5) {
            additionalMultiplier = 0.5; // +50% за 5%+ изменение
        } else if (absChangePercent >= 2) {
            additionalMultiplier = 0.2; // +20% за 2%+ изменение
        } else if (absChangePercent >= 1) {
            additionalMultiplier = 0.1; // +10% за 1%+ изменение
        } else if (absChangePercent >= 0.5) {
            additionalMultiplier = 0.05; // +5% за 0.5%+ изменение
        }
        
        return baseMultiplier + additionalMultiplier;
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
        
        // Обрабатываем завершенные сделки
        completedStakes.forEach(stake => {
            this.processStakeResult(stake);
        });
        
        // Обновляем список сделок
        if (completedStakes.length > 0) {
            localStorage.setItem('activeStakes', JSON.stringify(this.activeStakes));
            this.updateActiveStakesDisplay();
            this.updateStakesCount();
        }
    }

    // Расчет результата сделки
    calculateStakeResult(stake) {
        const priceChange = this.currentPrice - stake.startPrice;
        const priceChangePercent = (priceChange / stake.startPrice) * 100;
        
        if (stake.direction === 'up') {
            return priceChangePercent > 0 ? 'win' : 'loss';
        } else {
            return priceChangePercent < 0 ? 'win' : 'loss';
        }
    }

    // Обработка результата сделки
    processStakeResult(stake) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        
        let winAmount = 0;
        let profit = 0;
        let finalMultiplier = stake.baseMultiplier;
        let priceChangePercent = 0;
        
        if (stake.result === 'win') {
            // Рассчитываем процент изменения цены
            priceChangePercent = ((stake.endPrice - stake.startPrice) / stake.startPrice) * 100;
            
            // Если ставка на падение, инвертируем процент
            if (stake.direction === 'down') {
                priceChangePercent = -priceChangePercent;
            }
            
            // Рассчитываем финальный множитель на основе процента изменения
            finalMultiplier = this.getWinMultiplier(stake.timeHours, priceChangePercent);
            
            // Выигрыш
            winAmount = stake.amount * finalMultiplier;
            profit = winAmount - stake.amount;
            user.balance += winAmount;
            
            this.showToast(
                `Поздравляем! Сделка на ${stake.direction === 'up' ? 'рост' : 'падение'} выиграла! ` +
                `Изменение цены: ${priceChangePercent.toFixed(2)}% ` +
                `Множитель: x${finalMultiplier.toFixed(2)} ` +
                `Выигрыш: +$${winAmount.toFixed(2)}`,
                'success'
            );
        } else {
            // Проигрыш
            profit = -stake.amount;
            this.showToast(
                `Сделка на ${stake.direction === 'up' ? 'рост' : 'падение'} проиграла. Потеряно: $${stake.amount.toFixed(2)}`,
                'error'
            );
        }
        
        // Сохраняем сделку в историю с дополнительной информацией
        this.saveStakeToHistory(stake, winAmount, profit, finalMultiplier, priceChangePercent);
        
        localStorage.setItem('user', JSON.stringify(user));
        
        // Синхронизируем с сервером
        if (window.BalanceSync) {
            window.BalanceSync.updateServerBalance(user.balance);
        }
    }

    // Сохранение сделки в историю
    saveStakeToHistory(stake, winAmount, profit, finalMultiplier, priceChangePercent) {
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
            baseMultiplier: stake.baseMultiplier,
            finalMultiplier: finalMultiplier,
            priceChangePercent: priceChangePercent,
            dynamicMultiplier: stake.dynamicMultiplier,
            createdAt: new Date().toISOString()
        };
        
        stakeHistory.push(historyEntry);
        localStorage.setItem('stakeHistory', JSON.stringify(stakeHistory));
        
        console.log('Сделка сохранена в историю:', historyEntry);
    }

    // Обновление отображения активных сделок
    updateActiveStakesDisplay() {
        const activeStakesList = document.getElementById('activeStakesList');
        if (!activeStakesList) return;
        
        const activeStakes = this.activeStakes.filter(stake => stake.status === 'active');
        
        if (activeStakes.length === 0) {
            activeStakesList.innerHTML = '<p class="no-stakes">У вас нет активных сделок</p>';
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
                        <div class="stake-multiplier">x${stake.baseMultiplier.toFixed(1)} (базовый)</div>
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
        // Используем новую систему уведомлений
        if (window.notificationManager) {
            return window.notificationManager.show(message, type, {
                duration: 5000
            });
        }
        
        // Fallback для старой системы
        console.log(`[${type.toUpperCase()}] ${message}`);
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
                    // Находим нужную монету по ID или символу
                    let coin = result.coins.find(c => c.id === coinId);
                    if (!coin) {
                        // Пробуем найти по символу
                        coin = result.coins.find(c => c.symbol?.toLowerCase() === coinId?.toLowerCase());
                    }
                    if (!coin) {
                        // Пробуем найти по названию
                        coin = result.coins.find(c => c.name?.toLowerCase() === coinId?.toLowerCase());
                    }
                    
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
        const coinIcon = document.querySelector('.coin-icon');
        const coinName = document.querySelector('.coin-name');
        const coinSymbol = document.querySelector('.coin-symbol');
        
        if (coinIcon) {
            // Заменяем иконку на логотип
            coinIcon.innerHTML = `<img src="${window.CryptoLogos.getCoinLogoBySymbol(this.currentCoin.symbol)}" alt="${this.currentCoin.symbol}" class="coin-logo" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.src='/logos/default.svg'">`;
        }
        if (coinName) coinName.textContent = this.currentCoin.name;
        if (coinSymbol) coinSymbol.textContent = this.currentCoin.symbol;
        
        // Обновляем логотип в основном отображении цены
        const coinLogoElement = document.getElementById('coinLogo');
        if (coinLogoElement && window.CryptoLogos) {
            coinLogoElement.src = window.CryptoLogos.getCoinLogoBySymbol(this.currentCoin.symbol);
            coinLogoElement.alt = this.currentCoin.symbol;
        }
        
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
        
        // Обновляем информацию о монете из базы данных
        this.updateAboutSection();
        
        // Обновляем заголовок модального окна торговли
        const stakeModalTitle = document.getElementById('stakeModalTitle');
        if (stakeModalTitle) {
            stakeModalTitle.textContent = `Торговля - Сделка на ${this.stakeDirection === 'up' ? 'рост' : 'падение'}`;
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

    // Обновление секции "О монете" с реальной информацией
    updateAboutSection() {
        if (!this.currentCoin) return;
        
        // Получаем ID монеты для поиска в базе данных
        let coinId = this.currentCoin.id || this.currentCoin.symbol?.toLowerCase();
        
        // Сопоставляем ID монет с нашей базой данных
        const coinMapping = {
            'bitcoin': 'bitcoin',
            'ethereum': 'ethereum',
            'binancecoin': 'binancecoin',
            'solana': 'solana',
            'cardano': 'cardano',
            'ripple': 'ripple',
            'polkadot': 'polkadot',
            'dogecoin': 'dogecoin',
            'avalanche-2': 'avalanche',
            'chainlink': 'chainlink',
            'matic-network': 'matic-network',
            'uniswap': 'uniswap',
            'litecoin': 'litecoin',
            'stellar': 'stellar',
            'cosmos': 'cosmos',
            'monero': 'monero',
            'algorand': 'algorand',
            'vechain': 'vechain',
            'filecoin': 'filecoin',
            'internet-computer': 'internet-computer'
        };
        
        // Пробуем найти монету по различным вариантам ID
        let coinInfo = null;
        
        // 1. Прямое сопоставление
        if (coinMapping[coinId]) {
            coinInfo = window.getCoinInfo(coinMapping[coinId]);
        }
        
        // 2. По символу
        if (!coinInfo && this.currentCoin.symbol) {
            const symbolMapping = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'BNB': 'binancecoin',
                'SOL': 'solana',
                'ADA': 'cardano',
                'XRP': 'ripple',
                'DOT': 'polkadot',
                'DOGE': 'dogecoin',
                'AVAX': 'avalanche',
                'LINK': 'chainlink',
                'MATIC': 'matic-network',
                'UNI': 'uniswap',
                'LTC': 'litecoin',
                'XLM': 'stellar',
                'ATOM': 'cosmos',
                'XMR': 'monero',
                'ALGO': 'algorand',
                'VET': 'vechain',
                'FIL': 'filecoin',
                'ICP': 'internet-computer'
            };
            
            if (symbolMapping[this.currentCoin.symbol]) {
                coinInfo = window.getCoinInfo(symbolMapping[this.currentCoin.symbol]);
            }
        }
        
        // 3. Если ничего не найдено, используем дефолтную информацию
        if (!coinInfo) {
            coinInfo = {
                name: this.currentCoin.name || 'Неизвестная монета',
                symbol: this.currentCoin.symbol || '???',
                description: `Информация о ${this.currentCoin.name || 'этой монете'} пока недоступна.`,
                algorithm: 'N/A',
                maxSupply: 'N/A',
                blockTime: 'N/A',
                creator: 'N/A',
                founded: 'N/A',
                consensus: 'N/A',
                features: []
            };
        }
        
        // Обновляем заголовок секции
        const aboutTitle = document.getElementById('aboutSectionTitle');
        if (aboutTitle) {
            aboutTitle.textContent = `О ${coinInfo.name}`;
        }
        
        // Обновляем описание
        const aboutDescription = document.getElementById('aboutSectionDescription');
        if (aboutDescription) {
            aboutDescription.textContent = coinInfo.description;
        }
        
        // Обновляем статистику
        const algorithmElement = document.getElementById('aboutAlgorithm');
        const maxSupplyElement = document.getElementById('aboutMaxSupply');
        const blockTimeElement = document.getElementById('aboutBlockTime');
        const creatorElement = document.getElementById('aboutCreator');
        
        if (algorithmElement) algorithmElement.textContent = coinInfo.algorithm;
        if (maxSupplyElement) maxSupplyElement.textContent = coinInfo.maxSupply;
        if (blockTimeElement) blockTimeElement.textContent = coinInfo.blockTime;
        if (creatorElement) creatorElement.textContent = coinInfo.creator;
        
        console.log('About section updated for:', coinInfo.name);
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
                        
                        // Update trading modals if open
                        this.updateTradingModals();
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
        
        // Keep only last 50 points for better performance
        if (this.chart.data.labels.length > 50) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
        }
        
        // Update chart with smooth animation
        this.chart.update('none'); // Update without animation for real-time feel
    }

    animatePriceChange() {
        // Убираем случайные скачки цены - цена будет обновляться только через WebSocket
        // от реальных данных с сервера
        console.log('Price animation disabled - using real-time data from server');
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

        // Create gradient for chart background
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 212, 170, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 212, 170, 0.05)');

        // Initialize with empty data, will be updated when real data is loaded
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Цена (USD)',
                    data: [],
                    borderColor: '#00d4aa',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#00d4aa',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
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
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#00d4aa',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return 'Цена: $' + context.parsed.y.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                });
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
                            maxRotation: 0,
                            minRotation: 0,
                            color: '#8E8E93',
                            font: {
                                size: 11
                            },
                            maxTicksLimit: 8
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(142, 142, 147, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#8E8E93',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '$' + value.toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                });
                            },
                            maxTicksLimit: 6
                        },
                        border: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    line: {
                        tension: 0.3
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                hover: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }

    async loadChartData(period = '1D') {
        if (!this.currentCoin) return;

        // Show loading animation
        this.showChartLoading();

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
        } finally {
            // Hide loading animation
            this.hideChartLoading();
        }
    }

    showChartLoading() {
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.classList.add('chart-loading');
        }
    }

    hideChartLoading() {
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.classList.remove('chart-loading');
        }
    }

    updateChartWithRealData(priceHistory, period) {
        if (!this.chart || !priceHistory.length) return;

        // Filter data based on period
        const now = new Date();
        const filteredData = this.filterDataByPeriod(priceHistory, period, now);

        // Sort by timestamp (oldest first)
        filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Sample data to reduce number of points for better performance
        const sampledData = this.sampleData(filteredData, period);

        // Prepare chart data
        const labels = sampledData.map(item => this.formatChartLabel(new Date(item.timestamp)));
        const prices = sampledData.map(item => item.price);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = prices;
        this.chart.data.datasets[0].label = `Цена ${this.currentCoin.symbol}`;
        this.chart.update();
        
        console.log(`Chart updated with ${sampledData.length} data points for period ${period}`);
    }

    sampleData(data, period) {
        if (data.length <= 50) return data; // Если данных мало, возвращаем как есть

        const maxPoints = {
            '1D': 24,   // 24 точки за день (каждый час)
            '1W': 7,    // 7 точек за неделю (каждый день)
            '1M': 15,   // 15 точек за месяц (каждые 2 дня)
            '3M': 20,   // 20 точек за 3 месяца (каждые 4 дня)
            '1Y': 12,   // 12 точек за год (каждый месяц)
            'ALL': 15   // 15 точек за все время
        };

        const targetPoints = maxPoints[period] || 20;
        
        if (data.length <= targetPoints) return data;

        // Простое сэмплирование - берем равномерно распределенные точки
        const step = Math.floor(data.length / targetPoints);
        const sampled = [];
        
        for (let i = 0; i < data.length; i += step) {
            if (sampled.length < targetPoints) {
                sampled.push(data[i]);
            }
        }

        // Всегда добавляем последнюю точку
        if (sampled.length > 0 && sampled[sampled.length - 1] !== data[data.length - 1]) {
            sampled.push(data[data.length - 1]);
        }

        return sampled;
    }

    // Format chart label with better formatting
    formatChartLabel(date) {
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            // Сегодня - показываем время
            return date.toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diffInHours < 168) { // 7 дней
            // На этой неделе - показываем день недели
            const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            return days[date.getDay()];
        } else if (diffInHours < 720) { // 30 дней
            // В этом месяце - показываем дату
            return date.getDate().toString();
        } else {
            // Больше месяца - показываем месяц
            const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            return months[date.getMonth()];
        }
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
            '1D': { points: 12, interval: 2 }, // 12 точек за день (каждые 2 часа)
            '1W': { points: 7, interval: 1 },  // 7 точек за неделю (каждый день)
            '1M': { points: 15, interval: 2 }, // 15 точек за месяц (каждые 2 дня)
            '3M': { points: 20, interval: 4 }, // 20 точек за 3 месяца (каждые 4 дня)
            '1Y': { points: 12, interval: 30 }, // 12 точек за год (каждый месяц)
            'ALL': { points: 15, interval: 30 } // 15 точек за все время
        };

        const periodConfig = periods[period] || periods['1D'];
        const labels = [];
        const prices = [];
        const basePrice = this.currentPrice || 43250.00;
        const volatility = 0.015; // Уменьшенная волатильность для более плавного графика

        // Генерируем более реалистичные данные с трендом
        let currentPrice = basePrice;
        const trend = (Math.random() - 0.5) * 0.1; // Случайный тренд

        for (let i = 0; i < periodConfig.points; i++) {
            // Добавляем тренд и случайные колебания
            const trendChange = trend * (i / periodConfig.points);
            const randomChange = (Math.random() - 0.5) * volatility;
            currentPrice = currentPrice * (1 + trendChange + randomChange);
            
            // Форматируем метку времени
            let label;
            switch (period) {
                case '1D':
                    label = `${i * 2}:00`;
                    break;
                case '1W':
                    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                    label = days[i % 7];
                    break;
                case '1M':
                    label = `${i * 2 + 1} дн`;
                    break;
                case '3M':
                    label = `${i * 4 + 1} дн`;
                    break;
                case '1Y':
                    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                    label = months[i % 12];
                    break;
                default:
                    label = `${i + 1}`;
            }
            
            labels.push(label);
            prices.push(parseFloat(currentPrice.toFixed(2)));
        }

        return { labels, prices };
    }

    changeTimePeriod(period) {
        this.currentPeriod = period;
        
        // Update active button with smooth transition
        const timeBtns = document.querySelectorAll('.time-btn');
        timeBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.period === period) {
                btn.classList.add('active');
            }
        });

        // Add smooth fade transition
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.style.opacity = '0.7';
            chartContainer.style.transform = 'scale(0.98)';
        }

        // Update chart with real data for the new period
        this.loadChartData(period);
        
        // Restore opacity after a short delay
        setTimeout(() => {
            if (chartContainer) {
                chartContainer.style.opacity = '1';
                chartContainer.style.transform = 'scale(1)';
            }
        }, 300);

        this.showToast(`График обновлен: ${period}`, 'info');
    }

    // ===== TRADING METHODS =====
    
    // Открытие модала покупки
    openBuyModal() {
        const modal = document.getElementById('buyModal');
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user) {
            this.showToast('Пользователь не авторизован', 'error');
            return;
        }
        
        // Обновление отображения
        document.getElementById('buyCoinName').textContent = this.currentCoin.name;
        document.getElementById('buyAccountBalance').textContent = `$${user.balance.toFixed(2)}`;
        document.getElementById('buyCurrentPrice').textContent = `$${this.currentPrice.toFixed(2)}`;
        document.getElementById('buyPricePerCoin').textContent = `$${this.currentPrice.toFixed(2)}`;
        
        // Сброс формы
        document.getElementById('buyAmountUSD').value = '';
        document.getElementById('buyCoinAmount').textContent = '0.00000000';
        
        modal.style.display = 'block';
        
        // Обработчик изменения суммы в USD
        const buyAmountInput = document.getElementById('buyAmountUSD');
        buyAmountInput.removeEventListener('input', this.calculateBuyFromUSD);
        buyAmountInput.addEventListener('input', this.calculateBuyFromUSD.bind(this));
    }

    // Открытие модала продажи
    openSellModal() {
        const modal = document.getElementById('sellModal');
        const portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
        const coinInPortfolio = portfolio.find(item => item.coinId === this.currentCoin.id);
        
        if (!coinInPortfolio || coinInPortfolio.amount <= 0) {
            this.showToast('У вас нет этой монеты в портфеле', 'error');
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
        const sellAmountInput = document.getElementById('sellAmount');
        sellAmountInput.removeEventListener('input', this.calculateSellTotal);
        sellAmountInput.addEventListener('input', this.calculateSellTotal.bind(this));
    }

    // Расчет количества монет от суммы в USD
    calculateBuyFromUSD() {
        const usdAmount = parseFloat(document.getElementById('buyAmountUSD').value) || 0;
        const coinAmount = usdAmount / this.currentPrice;
        
        // Обновляем отображение количества монет
        document.getElementById('buyCoinAmount').textContent = coinAmount.toFixed(8);
        
        // Обновляем цену за монету (может измениться в реальном времени)
        document.getElementById('buyPricePerCoin').textContent = `$${this.currentPrice.toFixed(2)}`;
    }

    // Расчет общей суммы продажи
    calculateSellTotal() {
        const amount = parseFloat(document.getElementById('sellAmount').value) || 0;
        const total = amount * this.currentPrice;
        document.getElementById('sellTotal').textContent = `$${total.toFixed(2)}`;
    }

    // Обработка покупки
    async handleBuy(usdAmount) {
        const user = JSON.parse(localStorage.getItem('user'));
        const coinAmount = usdAmount / this.currentPrice;
        
        // Валидация
        if (usdAmount > user.balance) {
            this.showToast('Недостаточно средств на балансе', 'error');
            return;
        }
        
        if (usdAmount < 0.01) {
            this.showToast('Минимальная сумма покупки: $0.01', 'error');
            return;
        }
        
        if (coinAmount <= 0) {
            this.showToast('Введите корректную сумму', 'error');
            return;
        }
        
        try {
            // Показываем спиннер
            const submitBtn = document.getElementById('buySubmitBtn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Покупка...';
            submitBtn.disabled = true;
            
            // Списание с баланса
            user.balance -= usdAmount;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Добавление в портфель
            this.addToPortfolio(this.currentCoin.id, coinAmount, this.currentPrice);
            
            // Добавление в историю транзакций
            this.addTransactionToHistory('buy', this.currentCoin.name, usdAmount, coinAmount);
            
            // Синхронизация с сервером
            await this.syncBuyTransaction(coinAmount, this.currentPrice, usdAmount);
            
            // Обновление отображения
            this.updateBalanceDisplay();
            this.showToast(`Куплено ${coinAmount.toFixed(8)} ${this.currentCoin.symbol} за $${usdAmount.toFixed(2)}`, 'success');
            
            // Закрытие модала
            closeModal('buyModal');
            
        } catch (error) {
            console.error('Ошибка при покупке:', error);
            this.showToast('Ошибка при покупке', 'error');
        } finally {
            // Восстанавливаем кнопку
            const submitBtn = document.getElementById('buySubmitBtn');
            submitBtn.textContent = 'Купить';
            submitBtn.disabled = false;
        }
    }

    // Обработка продажи
    async handleSell(amount) {
        const portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
        const coinInPortfolio = portfolio.find(item => item.coinId === this.currentCoin.id);
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Валидация
        if (!coinInPortfolio || coinInPortfolio.amount < amount) {
            this.showToast('Недостаточно монет в портфеле', 'error');
            return;
        }
        
        if (amount <= 0) {
            this.showToast('Введите корректное количество', 'error');
            return;
        }
        
        try {
            const totalValue = amount * this.currentPrice;
            
            // Добавление на баланс
            user.balance += totalValue;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Удаление из портфеля
            this.removeFromPortfolio(this.currentCoin.id, amount);
            
            // Добавление в историю транзакций
            this.addTransactionToHistory('sell', this.currentCoin.name, totalValue, amount);
            
            // Синхронизация с сервером
            await this.syncSellTransaction(amount, this.currentPrice);
            
            // Обновление отображения
            this.updateBalanceDisplay();
            this.showToast(`Продано ${amount.toFixed(8)} ${this.currentCoin.symbol}`, 'success');
            
            // Закрытие модала
            closeModal('sellModal');
            
        } catch (error) {
            console.error('Ошибка при продаже:', error);
            this.showToast('Ошибка при продаже', 'error');
        }
    }

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
                name: this.currentCoin.name,
                logo: this.currentCoin.logo || window.CryptoLogos.getCoinLogoBySymbol(this.currentCoin.symbol) || '/logos/default.svg'
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

    // Добавление транзакции в историю
    addTransactionToHistory(type, coinName, amount, coinAmount) {
        const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        const transaction = {
            id: Date.now() + Math.random(),
            type: type,
            coinName: coinName,
            amount: type === 'buy' ? -amount : amount,
            coinAmount: coinAmount,
            date: new Date().toISOString(),
            price: this.currentPrice
        };
        
        transactions.unshift(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    // Синхронизация покупки с сервером
    async syncBuyTransaction(coinAmount, price, usdAmount) {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('authToken');
        
        try {
            const response = await fetch(`/api/users/${user.id}/portfolio/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    coinId: this.currentCoin.id,
                    coinAmount: coinAmount,
                    usdAmount: usdAmount,
                    price: price,
                    coinSymbol: this.currentCoin.symbol,
                    coinName: this.currentCoin.name,
                    coinLogo: this.currentCoin.logo || window.CryptoLogos.getCoinLogoBySymbol(this.currentCoin.symbol) || '/logos/default.svg'
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка синхронизации покупки');
            }
            
            // Обновление баланса через BalanceSync
            if (window.balanceSync) {
                await window.balanceSync.syncBalance();
            }
        } catch (error) {
            console.error('Ошибка синхронизации покупки:', error);
            // Не показываем ошибку пользователю, так как операция уже выполнена локально
        }
    }

    // Синхронизация продажи с сервером
    async syncSellTransaction(amount, price) {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('authToken');
        
        try {
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
        } catch (error) {
            console.error('Ошибка синхронизации продажи:', error);
            // Не показываем ошибку пользователю, так как операция уже выполнена локально
        }
    }

    // Обновление модалов торговли при изменении цены
    updateTradingModals() {
        // Обновление модала покупки
        const buyModal = document.getElementById('buyModal');
        if (buyModal && buyModal.style.display !== 'none') {
            document.getElementById('buyCurrentPrice').textContent = `$${this.currentPrice.toFixed(2)}`;
            document.getElementById('buyPricePerCoin').textContent = `$${this.currentPrice.toFixed(2)}`;
            // Пересчет количества монет если введена сумма в USD
            const buyAmountUSD = document.getElementById('buyAmountUSD').value;
            if (buyAmountUSD) {
                this.calculateBuyFromUSD();
            }
        }

        // Обновление модала продажи
        const sellModal = document.getElementById('sellModal');
        if (sellModal && sellModal.style.display !== 'none') {
            document.getElementById('sellCurrentPrice').textContent = `$${this.currentPrice.toFixed(2)}`;
            // Пересчет общей суммы если введено количество
            const sellAmount = document.getElementById('sellAmount').value;
            if (sellAmount) {
                this.calculateSellTotal();
            }
        }
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    window.coinInfoPage = new CoinInfoPage();
    
    // Добавляем обработчик для кнопки "Назад" браузера
    window.addEventListener('popstate', (event) => {
        console.log('popstate event triggered');
        // Если пользователь нажал кнопку "Назад" браузера, 
        // мы можем обработать это событие здесь
    });
    
    // Добавляем обработчик для предотвращения случайного выхода
    window.addEventListener('beforeunload', (event) => {
        // Это событие срабатывает при попытке покинуть страницу
        // Но мы не будем показывать диалог подтверждения, 
        // так как это может раздражать пользователей
        console.log('beforeunload event triggered');
    });
});

// Global functions for HTML onclick handlers
function goBack() {
    console.log('goBack() вызвана');
    console.log('document.referrer:', document.referrer);
    console.log('window.location.href:', window.location.href);
    console.log('window.history.length:', window.history.length);
    
    try {
        // Проверяем, есть ли referrer (страница, с которой пришел пользователь)
        if (document.referrer && document.referrer !== window.location.href) {
            console.log('Возвращаемся назад по referrer');
            // Если есть referrer, возвращаемся назад
            window.history.back();
        } else if (window.history.length > 1) {
            console.log('Возвращаемся назад по истории браузера');
            // Если нет referrer, но есть история браузера
            window.history.back();
        } else {
            console.log('Перенаправляем на главную страницу');
            // Если нет ни referrer, ни истории, перенаправляем на главную страницу
            // Но сначала проверим, может быть пользователь пришел со страницы монет
            if (document.referrer && document.referrer.includes('coins.html')) {
                window.location.href = '/coins.html';
            } else {
                window.location.href = '/home.html';
            }
        }
    } catch (error) {
        console.error('Ошибка при навигации назад:', error);
        // В случае ошибки, перенаправляем на главную страницу
        window.location.href = '/home.html';
    }
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

function openBuyModal() {
    if (window.coinInfoPage) {
        window.coinInfoPage.openBuyModal();
    }
}

function openSellModal() {
    if (window.coinInfoPage) {
        window.coinInfoPage.openSellModal();
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

function setMaxBuyAmount() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.balance > 0) {
        const buyAmountUSD = document.getElementById('buyAmountUSD');
        if (buyAmountUSD) {
            buyAmountUSD.value = user.balance.toFixed(2);
            // Триггерим событие input для пересчета
            buyAmountUSD.dispatchEvent(new Event('input'));
        }
    }
}
