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
  'internet-computer': '/logos/internet-computer.svg',
  'exchange': '/logos/exchange-logo.svg',
  // Дополнительные популярные монеты
  'tether': '/logos/tether.svg',
  'usd-coin': '/logos/usd-coin.svg',
  'binance-usd': '/logos/binance-usd.svg',
  'dai': '/logos/dai.svg',
  'tron': '/logos/tron.svg',
  'chainlink': '/logos/chainlink.svg',
  'polygon': '/logos/polygon.svg',
  'wrapped-bitcoin': '/logos/wrapped-bitcoin.svg',
  'uniswap': '/logos/uniswap.svg',
  'leo-token': '/logos/leo-token.svg',
  'okb': '/logos/okb.svg',
  'crypto-com-chain': '/logos/crypto-com-chain.svg',
  'stellar': '/logos/stellar.svg',
  'monero': '/logos/monero.svg',
  'ethereum-classic': '/logos/ethereum-classic.svg',
  'bitcoin-cash': '/logos/bitcoin-cash.svg',
  'eos': '/logos/eos.svg',
  'tezos': '/logos/tezos.svg',
  'neo': '/logos/neo.svg',
  'iota': '/logos/iota.svg',
  'dash': '/logos/dash.svg',
  'zcash': '/logos/zcash.svg',
  'nem': '/logos/nem.svg',
  'qtum': '/logos/qtum.svg',
  'omisego': '/logos/omisego.svg',
  'icon': '/logos/icon.svg',
  'nano': '/logos/nano.svg',
  'decred': '/logos/decred.svg',
  'verge': '/logos/verge.svg',
  'siacoin': '/logos/siacoin.svg',
  'steem': '/logos/steem.svg',
  'waves': '/logos/waves.svg',
  'stratis': '/logos/stratis.svg',
  'ardor': '/logos/ardor.svg',
  'ark': '/logos/ark.svg',
  'lisk': '/logos/lisk.svg',
  'factom': '/logos/factom.svg',
  'pivx': '/logos/pivx.svg',
  'komodo': '/logos/komodo.svg',
  'vertcoin': '/logos/vertcoin.svg',
  'digibyte': '/logos/digibyte.svg',
  'syscoin': '/logos/syscoin.svg',
  'bytecoin': '/logos/bytecoin.svg',
  'zcoin': '/logos/zcoin.svg',
  'nav-coin': '/logos/nav-coin.svg',
  'emercoin': '/logos/emercoin.svg',
  'clams': '/logos/clams.svg',
  'peercoin': '/logos/peercoin.svg',
  'namecoin': '/logos/namecoin.svg',
  'feathercoin': '/logos/feathercoin.svg',
  'novacoin': '/logos/novacoin.svg',
  'freicoin': '/logos/freicoin.svg',
  'ixcoin': '/logos/ixcoin.svg',
  'terracoin': '/logos/terracoin.svg',
  'devcoin': '/logos/devcoin.svg',
  'coinye': '/logos/coinye.svg',
  'mintcoin': '/logos/mintcoin.svg',
  'auroracoin': '/logos/auroracoin.svg',
  'potcoin': '/logos/potcoin.svg',
  'sexcoin': '/logos/sexcoin.svg',
  'dopecoin': '/logos/dopecoin.svg',
  'tittiecoin': '/logos/tittiecoin.svg',
  'dank': '/logos/dank.svg',
  '420coin': '/logos/420coin.svg',
  'weedcoin': '/logos/weedcoin.svg',
  'cannabiscoin': '/logos/cannabiscoin.svg',
  'hempcoin': '/logos/hempcoin.svg',
  'marijuanacoin': '/logos/marijuanacoin.svg',
  'ganjacoin': '/logos/ganjacoin.svg',
  'kushcoin': '/logos/kushcoin.svg',
  'hashcoin': '/logos/hashcoin.svg',
  'blazeit': '/logos/blazeit.svg',
  'yolo': '/logos/yolo.svg',
  'swag': '/logos/swag.svg',
  'dankmemes': '/logos/dankmemes.svg',
  'pepe': '/logos/pepe.svg',
  'wojak': '/logos/wojak.svg',
  'doge': '/logos/doge.svg',
  'shib': '/logos/shib.svg',
  'floki': '/logos/floki.svg',
  'baby-doge-coin': '/logos/baby-doge-coin.svg',
  'dogelon-mars': '/logos/dogelon-mars.svg',
  'safe-moon': '/logos/safe-moon.svg',
  'bonfire': '/logos/bonfire.svg',
  'moon': '/logos/moon.svg',
  'mars': '/logos/mars.svg',
  'jupiter': '/logos/jupiter.svg',
  'saturn': '/logos/saturn.svg',
  'uranus': '/logos/uranus.svg',
  'neptune': '/logos/neptune.svg',
  'pluto': '/logos/pluto.svg',
  'sun': '/logos/sun.svg',
  'earth': '/logos/earth.svg',
  'galaxy': '/logos/galaxy.svg',
  'universe': '/logos/universe.svg',
  'cosmos': '/logos/cosmos.svg',
  'nebula': '/logos/nebula.svg',
  'quasar': '/logos/quasar.svg',
  'pulsar': '/logos/pulsar.svg',
  'blackhole': '/logos/blackhole.svg',
  'wormhole': '/logos/wormhole.svg',
  'time-machine': '/logos/time-machine.svg',
  'teleport': '/logos/teleport.svg',
  'dimension': '/logos/dimension.svg',
  'parallel': '/logos/parallel.svg',
  'multiverse': '/logos/multiverse.svg',
  'quantum': '/logos/quantum.svg',
  'string-theory': '/logos/string-theory.svg',
  'relativity': '/logos/relativity.svg',
  'gravity': '/logos/gravity.svg',
  'magnetism': '/logos/magnetism.svg',
  'electricity': '/logos/electricity.svg',
  'nuclear': '/logos/nuclear.svg',
  'fusion': '/logos/fusion.svg',
  'fission': '/logos/fission.svg',
  'plasma': '/logos/plasma.svg',
  'laser': '/logos/laser.svg',
  'photon': '/logos/photon.svg',
  'electron': '/logos/electron.svg',
  'proton': '/logos/proton.svg',
  'neutron': '/logos/neutron.svg',
  'quark': '/logos/quark.svg',
  'lepton': '/logos/lepton.svg',
  'boson': '/logos/boson.svg',
  'fermion': '/logos/fermion.svg',
  'gluon': '/logos/gluon.svg',
  'w-boson': '/logos/w-boson.svg',
  'z-boson': '/logos/z-boson.svg',
  'higgs': '/logos/higgs.svg',
  'graviton': '/logos/graviton.svg',
  'tachyon': '/logos/tachyon.svg',
  'luxon': '/logos/luxon.svg',
  'bradyon': '/logos/bradyon.svg',
  'tardyon': '/logos/tardyon.svg',
  'tachyon': '/logos/tachyon.svg',
  'luxon': '/logos/luxon.svg',
  'bradyon': '/logos/bradyon.svg',
  'tardyon': '/logos/tardyon.svg'
};

// Function to get logo URL by coin ID or symbol
function getCoinLogo(coinId) {
  return cryptoLogos[coinId] || '/logos/default.svg';
}

// Function to get logo by symbol (for backward compatibility)
function getCoinLogoBySymbol(symbol) {
  const symbolMap = {
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
    // Дополнительные популярные монеты
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'BUSD': 'binance-usd',
    'DAI': 'dai',
    'TRX': 'tron',
    'WBTC': 'wrapped-bitcoin',
    'LEO': 'leo-token',
    'OKB': 'okb',
    'CRO': 'crypto-com-chain',
    'ETC': 'ethereum-classic',
    'BCH': 'bitcoin-cash',
    'EOS': 'eos',
    'XTZ': 'tezos',
    'NEO': 'neo',
    'MIOTA': 'iota',
    'DASH': 'dash',
    'ZEC': 'zcash',
    'XEM': 'nem',
    'QTUM': 'qtum',
    'OMG': 'omisego',
    'ICX': 'icon',
    'NANO': 'nano',
    'DCR': 'decred',
    'XVG': 'verge',
    'SC': 'siacoin',
    'STEEM': 'steem',
    'WAVES': 'waves',
    'STRAT': 'stratis',
    'ARDR': 'ardor',
    'ARK': 'ark',
    'LSK': 'lisk',
    'FCT': 'factom',
    'PIVX': 'pivx',
    'KMD': 'komodo',
    'VTC': 'vertcoin',
    'DGB': 'digibyte',
    'SYS': 'syscoin',
    'BCN': 'bytecoin',
    'XZC': 'zcoin',
    'NAV': 'nav-coin',
    'EMC': 'emercoin',
    'CLAM': 'clams',
    'PPC': 'peercoin',
    'NMC': 'namecoin',
    'FTC': 'feathercoin',
    'NVC': 'novacoin',
    'FRC': 'freicoin',
    'IXC': 'ixcoin',
    'TRC': 'terracoin',
    'DVC': 'devcoin',
    'COYE': 'coinye',
    'MINT': 'mintcoin',
    'AUR': 'auroracoin',
    'POT': 'potcoin',
    'SXC': 'sexcoin',
    'DOPE': 'dopecoin',
    'TIT': 'tittiecoin',
    'DANK': 'dank',
    '420': '420coin',
    'WEED': 'weedcoin',
    'CANN': 'cannabiscoin',
    'HEMP': 'hempcoin',
    'MAR': 'marijuanacoin',
    'GANJA': 'ganjacoin',
    'KUSH': 'kushcoin',
    'HASH': 'hashcoin',
    'BLAZE': 'blazeit',
    'YOLO': 'yolo',
    'SWAG': 'swag',
    'DANKMEMES': 'dankmemes',
    'PEPE': 'pepe',
    'WOJAK': 'wojak',
    'SHIB': 'shib',
    'FLOKI': 'floki',
    'BABYDOGE': 'baby-doge-coin',
    'ELON': 'dogelon-mars',
    'SAFEMOON': 'safe-moon',
    'BONFIRE': 'bonfire',
    'MOON': 'moon',
    'MARS': 'mars',
    'JUP': 'jupiter',
    'SAT': 'saturn',
    'URANUS': 'uranus',
    'NEPTUNE': 'neptune',
    'PLUTO': 'pluto',
    'SUN': 'sun',
    'EARTH': 'earth',
    'GALAXY': 'galaxy',
    'UNIVERSE': 'universe',
    'NEBULA': 'nebula',
    'QUASAR': 'quasar',
    'PULSAR': 'pulsar',
    'BLACKHOLE': 'blackhole',
    'WORMHOLE': 'wormhole',
    'TIME': 'time-machine',
    'TELEPORT': 'teleport',
    'DIMENSION': 'dimension',
    'PARALLEL': 'parallel',
    'MULTIVERSE': 'multiverse',
    'QUANTUM': 'quantum',
    'STRING': 'string-theory',
    'RELATIVITY': 'relativity',
    'GRAVITY': 'gravity',
    'MAGNETISM': 'magnetism',
    'ELECTRICITY': 'electricity',
    'NUCLEAR': 'nuclear',
    'FUSION': 'fusion',
    'FISSION': 'fission',
    'PLASMA': 'plasma',
    'LASER': 'laser',
    'PHOTON': 'photon',
    'ELECTRON': 'electron',
    'PROTON': 'proton',
    'NEUTRON': 'neutron',
    'QUARK': 'quark',
    'LEPTON': 'lepton',
    'BOSON': 'boson',
    'FERMION': 'fermion',
    'GLUON': 'gluon',
    'WBOSON': 'w-boson',
    'ZBOSON': 'z-boson',
    'HIGGS': 'higgs',
    'GRAVITON': 'graviton',
    'TACHYON': 'tachyon',
    'LUXON': 'luxon',
    'BRADYON': 'bradyon',
    'TARDYON': 'tardyon'
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
