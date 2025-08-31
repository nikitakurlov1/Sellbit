// Sale Page JavaScript

class SalePage {
    constructor() {
        this.selectedAsset = null;
        this.sellAmount = 0;
        this.feeRate = 0.01; // 1.0%
        this.userBalance = 0;
        this.portfolio = [
            {
                id: 'bitcoin',
                name: 'Bitcoin',
                symbol: 'BTC',
                balance: 0.125,
                price: 116697.95,
                icon: 'fab fa-bitcoin',
                color: '#F7931A',
                change: 3.80,
                value: 14587.24
            },
            {
                id: 'ethereum',
                name: 'Ethereum',
                symbol: 'ETH',
                balance: 1.85,
                price: 4842.60,
                icon: 'fab fa-ethereum',
                color: '#627EEA',
                change: 14.16,
                value: 8958.81
            },
            {
                id: 'binancecoin',
                name: 'BNB',
                symbol: 'BNB',
                balance: 5.5,
                price: 856.37,
                icon: 'fas fa-coins',
                color: '#f3ba2f',
                change: -0.78,
                value: 4710.04
            },
            {
                id: 'solana',
                name: 'Solana',
                symbol: 'SOL',
                balance: 25,
                price: 198.49,
                icon: 'fas fa-bolt',
                color: '#9945FF',
                change: 9.80,
                value: 4962.25
            },
            {
                id: 'cardano',
                name: 'Cardano',
                symbol: 'ADA',
                balance: 5000,
                price: 0.865718,
                icon: 'fas fa-chart-line',
                color: '#0033AD',
                change: 0.10,
                value: 4328.59
            }
        ];
        // Загружаем продажи из localStorage или используем пустой массив
        this.recentSales = JSON.parse(localStorage.getItem('userSales')) || [];
    }

    async init() {
        this.loadUserBalance();
        await this.loadUserPortfolio();
        await this.loadAssetFromURL();
        this.loadCurrentPrices();
        this.bindEvents();
        this.loadRecentSales();
        
        // Обновляем цены каждые 30 секунд
        setInterval(() => {
            this.loadCurrentPrices();
        }, 30000);
        
        // Обновляем портфель каждые 60 секунд
        setInterval(() => {
            this.loadUserPortfolio();
        }, 60000);
    }

    async loadAssetFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const coinId = urlParams.get('coin');
        
        if (coinId) {
            // Сначала загружаем портфель из базы данных
            await this.loadUserPortfolio();
            
            // Затем ищем актив в обновленном портфеле
            const asset = this.portfolio.find(a => a.id === coinId);
            if (asset) {
                this.selectAsset(asset);
            } else {
                // Если актив не найден в портфеле, показываем сообщение
                this.showToast(`У вас нет ${coinId.toUpperCase()} в портфеле`, 'info');
            }
        }
    }

    loadUserBalance() {
        // Получаем баланс пользователя из localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        this.userBalance = user ? user.balance : 0;
    }

    async loadCurrentPrices() {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.warn('Нет токена авторизации для загрузки цен');
                return;
            }

            const response = await fetch('/api/coins/exchange', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.coins.length > 0) {
                    // Обновляем цены в портфеле
                    result.coins.forEach(apiCoin => {
                        const portfolioAsset = this.portfolio.find(a => a.symbol === apiCoin.symbol);
                        if (portfolioAsset) {
                            portfolioAsset.price = apiCoin.price;
                            portfolioAsset.change = apiCoin.priceChange || 0;
                            portfolioAsset.value = portfolioAsset.balance * apiCoin.price;
                        }
                    });

                    // Обновляем отображение выбранного актива
                    if (this.selectedAsset) {
                        this.updateSelectedAssetDisplay();
                        this.updateCalculations();
                    }

                    console.log('Цены портфеля обновлены из API');
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки цен:', error);
        }
    }

    async loadUserPortfolio() {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.warn('Нет токена авторизации для загрузки портфеля');
                return;
            }

            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const userId = payload.userId;

            const response = await fetch(`/api/users/${userId}/portfolio`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.portfolio) {
                    // Обновляем портфель с данными из базы
                    this.portfolio = result.portfolio.map(item => ({
                        id: item.coinSymbol.toLowerCase(),
                        name: item.coinName,
                        symbol: item.coinSymbol,
                        balance: item.balance,
                        price: item.currentPrice || 0,
                        icon: this.getCoinIcon(item.coinSymbol),
                        color: this.getCoinColor(item.coinSymbol),
                        change: item.priceChange || 0,
                        value: item.currentValue || 0,
                        averageBuyPrice: item.averageBuyPrice,
                        totalInvested: item.totalInvested,
                        profitLossPercent: item.profitLossPercent
                    }));

                    // Обновляем отображение выбранного актива
                    if (this.selectedAsset) {
                        this.updateSelectedAssetDisplay();
                        this.updateCalculations();
                    }

                    console.log('Портфель загружен из базы данных');
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки портфеля:', error);
        }
    }

    getCoinIcon(symbol) {
        const iconMap = {
            'BTC': 'fab fa-bitcoin',
            'ETH': 'fab fa-ethereum',
            'BNB': 'fas fa-coins',
            'SOL': 'fas fa-bolt',
            'ADA': 'fas fa-chart-line'
        };
        return iconMap[symbol] || 'fas fa-coins';
    }

    getCoinColor(symbol) {
        const colorMap = {
            'BTC': '#F7931A',
            'ETH': '#627EEA',
            'BNB': '#f3ba2f',
            'SOL': '#9945FF',
            'ADA': '#0033AD'
        };
        return colorMap[symbol] || '#6c757d';
    }

    bindEvents() {
        // Back button
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.goBack();
            });
        }

        // History button
        const historyBtn = document.querySelector('.header-right .icon-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.showHistory();
            });
        }

        // Sell amount input
        const sellAmount = document.getElementById('sellAmount');
        if (sellAmount) {
            sellAmount.addEventListener('input', () => {
                this.updateCalculations();
            });
        }

        // Quick amount buttons
        const quickBtns = document.querySelectorAll('.quick-btn');
        quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const percent = parseFloat(e.target.dataset.percent);
                this.setSellAmountByPercent(percent);
            });
        });


    }



    selectAsset(asset) {
        this.selectedAsset = asset;
        this.updateSelectedAssetDisplay();
        this.updateCalculations();
        this.loadRecentSales();
        
        // Update page title
        document.title = `Продажа ${asset.name} - SellBit`;
    }

    updateSelectedAssetDisplay() {
        if (!this.selectedAsset) return;

        const assetIcon = document.getElementById('selectedAssetIcon');
        const assetName = document.getElementById('selectedAssetName');
        const assetSymbol = document.getElementById('selectedAssetSymbol');
        const currentPrice = document.getElementById('currentPrice');
        const availableBalance = document.getElementById('availableBalance');
        const balanceValue = document.getElementById('balanceValue');

        if (assetIcon) {
            assetIcon.innerHTML = `<i class="${this.selectedAsset.icon}"></i>`;
            assetIcon.style.backgroundColor = this.selectedAsset.color;
        }

        if (assetName) assetName.textContent = this.selectedAsset.name;
        if (assetSymbol) assetSymbol.textContent = this.selectedAsset.symbol;
        if (currentPrice) currentPrice.textContent = `$${this.selectedAsset.price.toLocaleString()}`;
        if (availableBalance) availableBalance.textContent = `${this.selectedAsset.balance.toFixed(8)} ${this.selectedAsset.symbol}`;
        if (balanceValue) balanceValue.textContent = `$${this.selectedAsset.value.toLocaleString()}`;
    }



    setSellAmountByPercent(percent) {
        if (!this.selectedAsset) return;

        const amount = (this.selectedAsset.balance * percent) / 100;
        const sellAmount = document.getElementById('sellAmount');
        if (sellAmount) {
            sellAmount.value = amount.toFixed(8);
            this.sellAmount = amount;
            this.updateCalculations();
        }
    }

    updateCalculations() {
        const sellAmount = parseFloat(document.getElementById('sellAmount')?.value) || 0;
        this.sellAmount = sellAmount;

        if (!this.selectedAsset || sellAmount <= 0) {
            this.resetCalculations();
            return;
        }

        if (sellAmount > this.selectedAsset.balance) {
            this.showToast('Недостаточно средств для продажи', 'error');
            this.resetCalculations();
            return;
        }

        const usdValue = sellAmount * this.selectedAsset.price;
        const fee = usdValue * this.feeRate;
        const total = usdValue - fee;

        // Update calculation display
        const feeAmount = document.getElementById('feeAmount');
        const totalAmount = document.getElementById('totalAmount');
        const coinAmount = document.getElementById('coinAmount');
        const sellBtnAmount = document.getElementById('sellBtnAmount');

        if (feeAmount) feeAmount.textContent = `$${fee.toFixed(2)}`;
        if (totalAmount) totalAmount.textContent = `$${total.toFixed(2)}`;
        if (coinAmount) coinAmount.textContent = `${sellAmount.toFixed(8)} ${this.selectedAsset.symbol}`;
        if (sellBtnAmount) sellBtnAmount.textContent = `$${total.toFixed(2)}`;

        // Enable/disable sell button
        const sellBtn = document.querySelector('.sell-btn');
        if (sellBtn) {
            const hasEnoughBalance = sellAmount <= this.selectedAsset.balance;
            const isMinAmount = sellAmount > 0;
            sellBtn.disabled = !hasEnoughBalance || !isMinAmount;
            
            if (!hasEnoughBalance) {
                sellBtn.title = 'Недостаточно средств для продажи';
            } else if (!isMinAmount) {
                sellBtn.title = 'Введите количество для продажи';
            } else {
                sellBtn.title = '';
            }
        }
    }

    resetCalculations() {
        const feeAmount = document.getElementById('feeAmount');
        const totalAmount = document.getElementById('totalAmount');
        const coinAmount = document.getElementById('coinAmount');
        const sellBtnAmount = document.getElementById('sellBtnAmount');

        if (feeAmount) feeAmount.textContent = '$0.00';
        if (totalAmount) totalAmount.textContent = '$0.00';
        if (coinAmount) coinAmount.textContent = `0.00000000 ${this.selectedAsset?.symbol || 'BTC'}`;
        if (sellBtnAmount) sellBtnAmount.textContent = '$0.00';

        const sellBtn = document.querySelector('.sell-btn');
        if (sellBtn) {
            sellBtn.disabled = true;
        }
    }



    processSale() {
        if (!this.selectedAsset) {
            this.showToast('Актив не выбран', 'error');
            return;
        }

        if (this.sellAmount <= 0) {
            this.showToast('Введите количество для продажи', 'error');
            return;
        }

        if (this.sellAmount > this.selectedAsset.balance) {
            this.showToast('Недостаточно средств для продажи', 'error');
            return;
        }

        this.executeSale();
    }

    async executeSale() {
        this.showToast('Выполняется продажа...', 'info');
        
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                this.showToast('Ошибка авторизации', 'error');
                return;
            }

            // Получаем данные пользователя
            const user = JSON.parse(localStorage.getItem('user'));
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const userId = payload.userId;
            
            // Проверяем баланс актива еще раз перед продажей
            if (this.sellAmount > this.selectedAsset.balance) {
                this.showToast('Недостаточно средств для продажи', 'error');
                return;
            }
            
            // Рассчитываем стоимость продажи
            const usdValue = this.sellAmount * this.selectedAsset.price;
            const fee = usdValue * this.feeRate;
            const total = usdValue - fee;
            
            // Выполняем продажу через API
            const response = await fetch(`/api/users/${userId}/portfolio/sell`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    coinSymbol: this.selectedAsset.symbol,
                    amount: this.sellAmount,
                    price: this.selectedAsset.price,
                    fee: fee
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.errors?.[0] || 'Ошибка при продаже');
            }

            const result = await response.json();
            
            // Обновляем локальный баланс
            user.balance += total;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Обновляем баланс актива
            this.selectedAsset.balance -= this.sellAmount;
            this.selectedAsset.value = this.selectedAsset.balance * this.selectedAsset.price;
            
            // Обновляем отображение
            this.updateSelectedAssetDisplay();
            
            // Добавляем в историю продаж
            this.addToRecentSales();
            
            // Добавляем в общую историю транзакций
            this.addToTransactionHistory('sell', total, 'USD', this.selectedAsset.symbol);
            
            this.showSuccessModal();
            
            // Очищаем форму
            document.getElementById('sellAmount').value = '';
            this.updateCalculations();
            
            this.showToast('Продажа успешно выполнена!', 'success');
        } catch (error) {
            console.error('Ошибка при продаже:', error);
            this.showToast(error.message || 'Ошибка при выполнении продажи', 'error');
        }
    }

    addToTransactionHistory(type, amount, currency, coinSymbol) {
        const transaction = {
            id: `tx_${Date.now()}`,
            type: type,
            amount: amount,
            currency: currency,
            coinSymbol: coinSymbol,
            date: new Date().toISOString(),
            status: 'completed',
            description: type === 'sell' ? `Продажа ${coinSymbol}` : `Покупка ${coinSymbol}`
        };
        
        // Получаем существующую историю или создаем новую
        const history = JSON.parse(localStorage.getItem('transactionHistory')) || [];
        history.unshift(transaction);
        
        // Ограничиваем историю 100 последними транзакциями
        if (history.length > 100) {
            history.splice(100);
        }
        
        localStorage.setItem('transactionHistory', JSON.stringify(history));
    }





    showSuccessModal() {
        const modal = document.getElementById('successModal');
        if (!modal) return;

        const usdValue = this.sellAmount * this.selectedAsset.price;
        const fee = usdValue * this.feeRate;
        const total = usdValue - fee;

        const successAmount = document.getElementById('successAmount');
        const transactionId = document.getElementById('transactionId');
        const transactionTime = document.getElementById('transactionTime');

        if (successAmount) successAmount.textContent = `$${total.toFixed(2)}`;
        if (transactionId) transactionId.textContent = `TX${Date.now()}`;
        if (transactionTime) transactionTime.textContent = new Date().toLocaleTimeString();

        modal.style.display = 'flex';
    }

    addToRecentSales() {
        const usdValue = this.sellAmount * this.selectedAsset.price;
        const newSale = {
            id: `sale${Date.now()}`,
            coin: this.selectedAsset.name,
            symbol: this.selectedAsset.symbol,
            amount: this.sellAmount,
            usdAmount: usdValue,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            icon: this.selectedAsset.icon,
            color: this.selectedAsset.color
        };

        this.recentSales.unshift(newSale);
        
        // Сохраняем продажи в localStorage
        localStorage.setItem('userSales', JSON.stringify(this.recentSales));
        
        this.loadRecentSales();
    }

    loadRecentSales() {
        const salesList = document.getElementById('recentSales');
        const recentSalesSection = document.querySelector('.recent-sales');
        if (!salesList || !recentSalesSection) return;

        // Фильтруем продажи только для текущего актива
        const currentAssetSales = this.recentSales.filter(sale => 
            sale.symbol === this.selectedAsset?.symbol
        );

        // Если нет продаж для этого актива, скрываем секцию
        if (currentAssetSales.length === 0) {
            recentSalesSection.style.display = 'none';
            return;
        }

        // Показываем секцию и загружаем продажи
        recentSalesSection.style.display = 'block';
        salesList.innerHTML = '';

        currentAssetSales.slice(0, 3).forEach(sale => {
            const saleItem = document.createElement('div');
            saleItem.className = 'sale-item';
            saleItem.innerHTML = `
                <div class="sale-icon">
                    <i class="fas fa-arrow-down"></i>
                </div>
                <div class="sale-info">
                    <div class="sale-title">${sale.coin}</div>
                    <div class="sale-details">${sale.date} ${sale.time}</div>
                </div>
                <div class="sale-amount">
                    $${sale.usdAmount.toFixed(2)}
                </div>
            `;

            salesList.appendChild(saleItem);
        });
    }

    showHistory() {
        if (this.recentSales.length === 0) {
            this.showToast('История продаж пуста', 'info');
        } else {
            this.showToast(`История продаж: ${this.recentSales.length} операций`, 'info');
        }
    }

    showAllSales() {
        if (this.recentSales.length === 0) {
            this.showToast('У вас пока нет продаж', 'info');
        } else {
            this.showToast(`Всего продаж: ${this.recentSales.length}`, 'info');
        }
    }

    goBack() {
        window.history.back();
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// Global functions for onclick handlers
function goBack() {
    window.history.back();
}

function processSale() {
    if (window.salePage) {
        window.salePage.processSale();
    }
}

function closeModal(modalId) {
    if (window.salePage) {
        window.salePage.closeModal(modalId);
    }
}

function showHistory() {
    if (window.salePage) {
        window.salePage.showHistory();
    }
}

function showAllSales() {
    if (window.salePage) {
        window.salePage.showAllSales();
    }
}

// Initialize sale page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.salePage = new SalePage();
    await window.salePage.init();
});