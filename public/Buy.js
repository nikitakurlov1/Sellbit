// Buy Page JavaScript

class BuyPage {
    constructor() {
        this.selectedCoin = null;
        this.purchaseAmount = 0;
        this.feeRate = 0.01; // 1.0%
        this.userBalance = 0;
        this.coins = [
            {
                id: 'bitcoin',
                name: 'Bitcoin',
                symbol: 'BTC',
                price: 43250.00,
                icon: 'fab fa-bitcoin',
                color: '#F7931A',
                change: 2.98
            },
            {
                id: 'ethereum',
                name: 'Ethereum',
                symbol: 'ETH',
                price: 4842.60,
                icon: 'fab fa-ethereum',
                color: '#627EEA',
                change: 14.16
            },
            {
                id: 'solana',
                name: 'Solana',
                symbol: 'SOL',
                price: 198.49,
                icon: 'fas fa-bolt',
                color: '#9945FF',
                change: 9.80
            },
            {
                id: 'cardano',
                name: 'Cardano',
                symbol: 'ADA',
                price: 0.68,
                icon: 'fas fa-circle',
                color: '#0033AD',
                change: -2.15
            },
            {
                id: 'polkadot',
                name: 'Polkadot',
                symbol: 'DOT',
                price: 8.45,
                icon: 'fas fa-circle',
                color: '#E6007A',
                change: 5.23
            },
            {
                id: 'chainlink',
                name: 'Chainlink',
                symbol: 'LINK',
                price: 18.92,
                icon: 'fas fa-link',
                color: '#2A5ADA',
                change: 7.45
            },
            {
                id: 'litecoin',
                name: 'Litecoin',
                symbol: 'LTC',
                price: 78.34,
                icon: 'fab fa-litecoin',
                color: '#A6A9AA',
                change: -1.23
            },
            {
                id: 'stellar',
                name: 'Stellar',
                symbol: 'XLM',
                price: 0.12,
                icon: 'fas fa-star',
                color: '#6366F1',
                change: 2.87
            },
            {
                id: 'uniswap',
                name: 'Uniswap',
                symbol: 'UNI',
                price: 12.45,
                icon: 'fas fa-exchange-alt',
                color: '#FF007A',
                change: 11.23
            },
            {
                id: 'avalanche',
                name: 'Avalanche',
                symbol: 'AVAX',
                price: 42.18,
                icon: 'fas fa-snowflake',
                color: '#E84142',
                change: 8.76
            }
        ];
        // Загружаем покупки из localStorage или используем пустой массив
        this.recentPurchases = JSON.parse(localStorage.getItem('userPurchases')) || [];
        this.init();
    }

    init() {
        this.loadCoinFromURL();
        this.loadUserBalance();
        this.bindEvents();
        this.loadRecentPurchases();
    }

    loadCoinFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const coinId = urlParams.get('coin');
        
        if (coinId) {
            const coin = this.coins.find(c => c.id === coinId);
            if (coin) {
                this.selectCoin(coin);
            }
        }
    }

    loadUserBalance() {
        // Получаем баланс пользователя из localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        this.userBalance = user ? user.balance : 0;
        
        // Обновляем отображение баланса
        const balanceElement = document.getElementById('availableBalance');
        if (balanceElement) {
            balanceElement.textContent = `$${this.userBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
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

        // Purchase amount input
        const purchaseAmount = document.getElementById('purchaseAmount');
        if (purchaseAmount) {
            purchaseAmount.addEventListener('input', () => {
                this.updateCalculations();
            });
        }

        // Quick amount buttons
        const quickBtns = document.querySelectorAll('.quick-btn');
        quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseFloat(e.target.dataset.amount);
                this.setPurchaseAmount(amount);
            });
        });
    }



    selectCoin(coin) {
        this.selectedCoin = coin;
        this.updateSelectedCoinDisplay();
        this.updateCalculations();
        this.loadRecentPurchases(); // Перезагружаем историю для новой монеты
        
        // Update page title
        document.title = `Покупка ${coin.name} - SaleBit`;
    }

    updateSelectedCoinDisplay() {
        if (!this.selectedCoin) return;

        const coinIcon = document.getElementById('selectedCoinIcon');
        const coinName = document.getElementById('selectedCoinName');
        const coinSymbol = document.getElementById('selectedCoinSymbol');
        const currentPrice = document.getElementById('currentPrice');

        if (coinIcon) {
            coinIcon.innerHTML = `<i class="${this.selectedCoin.icon}"></i>`;
            coinIcon.style.backgroundColor = this.selectedCoin.color;
        }

        if (coinName) coinName.textContent = this.selectedCoin.name;
        if (coinSymbol) coinSymbol.textContent = this.selectedCoin.symbol;
        if (currentPrice) currentPrice.textContent = `$${this.selectedCoin.price.toLocaleString()}`;
    }



    setPurchaseAmount(amount) {
        const purchaseAmount = document.getElementById('purchaseAmount');
        if (purchaseAmount) {
            purchaseAmount.value = amount;
            this.purchaseAmount = amount;
            this.updateCalculations();
        }
    }

    updateCalculations() {
        const purchaseAmount = parseFloat(document.getElementById('purchaseAmount')?.value) || 0;
        this.purchaseAmount = purchaseAmount;

        if (!this.selectedCoin || purchaseAmount <= 0) {
            this.resetCalculations();
            return;
        }

        const fee = purchaseAmount * this.feeRate;
        const total = purchaseAmount + fee;
        const coinAmount = purchaseAmount / this.selectedCoin.price;

        // Update calculation display
        const feeAmount = document.getElementById('feeAmount');
        const totalAmount = document.getElementById('totalAmount');
        const coinAmountEl = document.getElementById('coinAmount');
        const purchaseBtnAmount = document.getElementById('purchaseBtnAmount');

        if (feeAmount) feeAmount.textContent = `$${fee.toFixed(2)}`;
        if (totalAmount) totalAmount.textContent = `$${total.toFixed(2)}`;
        if (coinAmountEl) coinAmountEl.textContent = `${coinAmount.toFixed(8)} ${this.selectedCoin.symbol}`;
        if (purchaseBtnAmount) purchaseBtnAmount.textContent = `$${total.toFixed(2)}`;

        // Enable/disable purchase button based on balance
        const purchaseBtn = document.querySelector('.purchase-btn');
        if (purchaseBtn) {
            const hasEnoughBalance = total <= this.userBalance;
            const isMinAmount = purchaseAmount >= 10;
            purchaseBtn.disabled = !hasEnoughBalance || !isMinAmount;
            
            if (!hasEnoughBalance) {
                purchaseBtn.title = 'Недостаточно средств на балансе';
            } else if (!isMinAmount) {
                purchaseBtn.title = 'Минимальная сумма покупки: $10';
            } else {
                purchaseBtn.title = '';
            }
        }
    }

    resetCalculations() {
        const feeAmount = document.getElementById('feeAmount');
        const totalAmount = document.getElementById('totalAmount');
        const coinAmount = document.getElementById('coinAmount');
        const purchaseBtnAmount = document.getElementById('purchaseBtnAmount');

        if (feeAmount) feeAmount.textContent = '$0.00';
        if (totalAmount) totalAmount.textContent = '$0.00';
        if (coinAmount) coinAmount.textContent = `0.00000000 ${this.selectedCoin?.symbol || 'BTC'}`;
        if (purchaseBtnAmount) purchaseBtnAmount.textContent = '$0.00';

        const purchaseBtn = document.querySelector('.purchase-btn');
        if (purchaseBtn) {
            purchaseBtn.disabled = true;
        }
    }



    processPurchase() {
        if (!this.selectedCoin) {
            this.showToast('Монета не выбрана', 'error');
            return;
        }

        if (this.purchaseAmount < 10) {
            this.showToast('Минимальная сумма покупки: $10', 'error');
            return;
        }

        const fee = this.purchaseAmount * this.feeRate;
        const total = this.purchaseAmount + fee;

        if (total > this.userBalance) {
            this.showToast('Недостаточно средств на балансе', 'error');
            return;
        }

        this.executePurchase();
    }

    async executePurchase() {
        this.showToast('Выполняется покупка...', 'info');
        
        setTimeout(async () => {
            // Обновляем баланс пользователя
            const fee = this.purchaseAmount * this.feeRate;
            const total = this.purchaseAmount + fee;
            
            const user = JSON.parse(localStorage.getItem('user'));
            user.balance -= total;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Синхронизируем с сервером
            if (window.BalanceSync) {
                await window.BalanceSync.updateServerBalance(user.balance);
            }
            
            // Обновляем баланс на странице
            this.userBalance = user.balance;
            this.loadUserBalance();
            
            this.showSuccessModal();
            this.addToRecentPurchases();
            
            // Очищаем форму
            document.getElementById('purchaseAmount').value = '';
            this.updateCalculations();
        }, 2000);
    }



    showSuccessModal() {
        const modal = document.getElementById('successModal');
        if (!modal) return;

        const coinAmount = this.purchaseAmount / this.selectedCoin.price;
        const successCoinAmount = document.getElementById('successCoinAmount');
        const transactionId = document.getElementById('transactionId');
        const transactionTime = document.getElementById('transactionTime');

        if (successCoinAmount) successCoinAmount.textContent = `${coinAmount.toFixed(8)} ${this.selectedCoin.symbol}`;
        if (transactionId) transactionId.textContent = `TX${Date.now()}`;
        if (transactionTime) transactionTime.textContent = new Date().toLocaleTimeString();

        modal.style.display = 'flex';
    }

    addToRecentPurchases() {
        const coinAmount = this.purchaseAmount / this.selectedCoin.price;
        const newPurchase = {
            id: `purchase${Date.now()}`,
            coin: this.selectedCoin.name,
            symbol: this.selectedCoin.symbol,
            amount: coinAmount,
            usdAmount: this.purchaseAmount,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            icon: this.selectedCoin.icon,
            color: this.selectedCoin.color
        };

        this.recentPurchases.unshift(newPurchase);
        
        // Сохраняем покупки в localStorage
        localStorage.setItem('userPurchases', JSON.stringify(this.recentPurchases));
        
        this.loadRecentPurchases();
    }

    loadRecentPurchases() {
        const purchasesList = document.getElementById('recentPurchases');
        const recentPurchasesSection = document.querySelector('.recent-purchases');
        if (!purchasesList || !recentPurchasesSection) return;

        // Фильтруем покупки только для текущей монеты
        const currentCoinPurchases = this.recentPurchases.filter(purchase => 
            purchase.symbol === this.selectedCoin?.symbol
        );

        // Если нет покупок для этой монеты, скрываем секцию
        if (currentCoinPurchases.length === 0) {
            recentPurchasesSection.style.display = 'none';
            return;
        }

        // Показываем секцию и загружаем покупки
        recentPurchasesSection.style.display = 'block';
        purchasesList.innerHTML = '';

        currentCoinPurchases.slice(0, 3).forEach(purchase => {
            const coin = this.coins.find(c => c.symbol === purchase.symbol) || this.coins[0];
            const purchaseItem = document.createElement('div');
            purchaseItem.className = 'purchase-item';
            purchaseItem.innerHTML = `
                <div class="purchase-icon" style="background-color: ${purchase.color || coin.color}">
                    <i class="${purchase.icon || coin.icon}"></i>
                </div>
                <div class="purchase-info">
                    <div class="purchase-title">${purchase.coin}</div>
                    <div class="purchase-details">${purchase.date} ${purchase.time}</div>
                </div>
                <div class="purchase-amount">
                    ${purchase.amount.toFixed(8)} ${purchase.symbol}
                </div>
            `;

            purchasesList.appendChild(purchaseItem);
        });
    }

    showHistory() {
        if (this.recentPurchases.length === 0) {
            this.showToast('История покупок пуста', 'info');
        } else {
            this.showToast(`История покупок: ${this.recentPurchases.length} операций`, 'info');
        }
    }

    showAllPurchases() {
        if (this.recentPurchases.length === 0) {
            this.showToast('У вас пока нет покупок', 'info');
        } else {
            this.showToast(`Всего покупок: ${this.recentPurchases.length}`, 'info');
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

function processPurchase() {
    if (window.buyPage) {
        window.buyPage.processPurchase();
    }
}



function closeModal(modalId) {
    if (window.buyPage) {
        window.buyPage.closeModal(modalId);
    }
}

function showHistory() {
    if (window.buyPage) {
        window.buyPage.showHistory();
    }
}

function showAllPurchases() {
    if (window.buyPage) {
        window.buyPage.showAllPurchases();
    }
}

// Initialize buy page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.buyPage = new BuyPage();
});
