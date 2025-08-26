// Crypto logos mapping
const cryptoLogos = {
  'bitcoin': '/logos/bitcoin.svg',
  'ethereum': '/logos/ethereum.svg',
  'binancecoin': '/logos/binancecoin.svg',
  'solana': '/logos/solana.svg',
  'cardano': '/logos/cardano.svg',
  'ripple': '/logos/ripple.svg',
  'polkadot': '/logos/polkadot.svg',
  'dogecoin': '/logos/dogecoin.svg',
  'avalanche-2': '/logos/avalanche.svg',
  'chainlink': '/logos/chainlink.svg',
  'polygon': '/logos/polygon.svg',
  'uniswap': '/logos/uniswap.svg',
  'litecoin': '/logos/litecoin.svg',
  'stellar': '/logos/stellar.svg',
  'cosmos': '/logos/cosmos.svg',
  'monero': '/logos/monero.svg',
  'algorand': '/logos/algorand.svg',
  'vechain': '/logos/vechain.svg',
  'filecoin': '/logos/filecoin.svg',
  'internet-computer': '/logos/internet-computer.svg'
};

// Function to get logo URL by coin ID
function getCoinLogo(coinId) {
  return cryptoLogos[coinId] || '/logos/default.svg';
}

// Function to create logo element
function createCoinLogo(coinId, size = 32, className = '') {
  const logoUrl = getCoinLogo(coinId);
  const img = document.createElement('img');
  img.src = logoUrl;
  img.alt = `${coinId} logo`;
  img.width = size;
  img.height = size;
  img.className = className;
  img.style.borderRadius = '50%';
  img.style.objectFit = 'cover';
  return img;
}

// Function to update existing logo elements
function updateCoinLogos() {
  const logoElements = document.querySelectorAll('[data-coin-logo]');
  logoElements.forEach(element => {
    const coinId = element.getAttribute('data-coin-logo');
    const size = element.getAttribute('data-logo-size') || 32;
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
    const logo = createCoinLogo(coinId, 24, 'coin-logo');
    container.insertBefore(logo, container.firstChild);
  }
}

// Export functions for use in other scripts
window.CryptoLogos = {
  getCoinLogo,
  createCoinLogo,
  updateCoinLogos,
  addLogoToCoinDisplay
};

// Auto-update logos when DOM is loaded
document.addEventListener('DOMContentLoaded', updateCoinLogos);
