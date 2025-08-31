// Authentic cryptocurrency logos mapping
const cryptoLogos = {
  // Major cryptocurrencies with authentic logos
  'bitcoin': '/logos/bitcoin.svg',
  'ethereum': '/logos/ethereum.svg',
  'binancecoin': '/logos/binancecoin.svg',
  'solana': '/logos/solana-sol-logo .svg',
  'cardano': '/logos/cardano-ada-logo.svg',
  'ripple': '/logos/ripple.svg',
  'polkadot': '/logos/polkadot-new-dot-logo.svg',
  'dogecoin': '/logos/dogecoin.svg',
  'avalanche-2': '/logos/avalanche-avax-logo.svg',
  'chainlink': '/logos/chainlink-link-logo.svg',
  'polygon': '/logos/polygon.svg',
  'uniswap': '/logos/uniswap-uni-logo.svg',
  'litecoin': '/logos/litecoin-ltc-logo.svg',
  'stellar': '/logos/stellar-xlm-logo.svg',
  'cosmos': '/logos/cosmos-atom-logo.svg',
  'monero': '/logos/monero-xmr-logo.svg',
  'algorand': '/logos/algorand-algo-logo.svg',
  'vechain': '/logos/vechain-vet-logo.svg',
  'filecoin': '/logos/filecoin-fil-logo.svg',
  'internet-computer': '/logos/internet-computer-icp-logo.svg',
  'tron': '/logos/tron.svg',
  'tether': '/logos/tether.svg',
  'usd-coin': '/logos/usd-coin.svg',
  'binance-usd': '/logos/binance-usd.svg',
  'dai': '/logos/dai.svg',
  'wrapped-bitcoin': '/logos/wrapped-bitcoin.svg',
  'exchange': '/logos/exchange-logo.svg'
};

// Function to get logo URL by coin ID or symbol
function getCoinLogo(coinId) {
  return cryptoLogos[coinId] || '/logos/default.svg';
}

// Function to get logo by symbol (for backward compatibility)
function getCoinLogoBySymbol(symbol) {
  const symbolMap = {
    // Major authentic cryptocurrencies
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'ADA': 'cardano',
    'XRP': 'ripple',
    'DOT': 'polkadot',
    'DOGE': 'dogecoin',
    'AVAX': 'avalanche-2',
    'LINK': 'chainlink',
    'MATIC': 'polygon',
    'UNI': 'uniswap',
    'LTC': 'litecoin',
    'XLM': 'stellar',
    'ATOM': 'cosmos',
    'XMR': 'monero',
    'ALGO': 'algorand',
    'VET': 'vechain',
    'FIL': 'filecoin',
    'ICP': 'internet-computer',
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'BUSD': 'binance-usd',
    'DAI': 'dai',
    'TRX': 'tron',
    'WBTC': 'wrapped-bitcoin'
  };
  
  const coinId = symbolMap[symbol] || symbol.toLowerCase();
  const logoUrl = getCoinLogo(coinId);
  
  // Проверяем, существует ли файл логотипа
  return logoUrl;
}

// Function to create logo element
function createCoinLogo(coinId, size = 24, className = '') {
  const logoUrl = getCoinLogo(coinId);
  const img = document.createElement('img');
  img.src = logoUrl;
  img.alt = `${coinId} logo`;
  img.width = size;
  img.height = size;
  img.className = className;
  img.style.borderRadius = '50%';
  img.style.objectFit = 'cover';
  img.style.display = 'block';
  return img;
}

// Function to create logo element by symbol
function createCoinLogoBySymbol(symbol, size = 24, className = '') {
  const logoUrl = getCoinLogoBySymbol(symbol);
  const img = document.createElement('img');
  img.src = logoUrl;
  img.alt = `${symbol} logo`;
  img.width = size;
  img.height = size;
  img.className = className;
  img.style.borderRadius = '50%';
  img.style.objectFit = 'cover';
  img.style.display = 'block';
  
  // Обработка ошибки загрузки изображения
  img.onerror = function() {
    this.src = '/logos/default.svg';
    this.onerror = null; // Предотвращаем бесконечный цикл
  };
  
  return img;
}

// Function to replace icon with logo
function replaceIconWithLogo(iconElement, symbol, size = 24) {
  if (!iconElement) return;
  
  const logo = createCoinLogoBySymbol(symbol, size, 'coin-logo');
  logo.style.width = `${size}px`;
  logo.style.height = `${size}px`;
  
  // Replace the icon element with logo
  iconElement.parentNode.replaceChild(logo, iconElement);
}

// Function to update existing logo elements
function updateCoinLogos() {
  const logoElements = document.querySelectorAll('[data-coin-logo]');
  logoElements.forEach(element => {
    const coinId = element.getAttribute('data-coin-logo');
    const size = element.getAttribute('data-logo-size') || 24;
    const className = element.getAttribute('data-logo-class') || '';
    
    const logo = createCoinLogo(coinId, parseInt(size), className);
    element.innerHTML = '';
    element.appendChild(logo);
  });
}

// Function to add logo to coin display
function addLogoToCoinDisplay(coinId, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (container) {
    const logo = createCoinLogo(coinId, 20, 'coin-logo');
    container.insertBefore(logo, container.firstChild);
  }
}

// Function to create coin display with logo
function createCoinDisplayWithLogo(coin, size = 24) {
  const logo = createCoinLogoBySymbol(coin.symbol, size, 'coin-logo');
  const container = document.createElement('div');
  container.className = 'coin-display';
  container.appendChild(logo);
  
  const info = document.createElement('div');
  info.className = 'coin-info';
  info.innerHTML = `
    <div class="coin-name">${coin.name}</div>
    <div class="coin-symbol">${coin.symbol}</div>
  `;
  container.appendChild(info);
  
  return container;
}

// Export functions for use in other scripts
window.CryptoLogos = {
  getCoinLogo,
  getCoinLogoBySymbol,
  createCoinLogo,
  createCoinLogoBySymbol,
  replaceIconWithLogo,
  updateCoinLogos,
  addLogoToCoinDisplay,
  createCoinDisplayWithLogo
};

// Auto-update logos when DOM is loaded
document.addEventListener('DOMContentLoaded', updateCoinLogos);
