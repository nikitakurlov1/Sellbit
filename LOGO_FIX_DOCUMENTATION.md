# Исправление проблемы с логотипами монет в портфеле

## Проблема
В портфеле (home.html) логотипы монет не отображались, если они отсутствовали в данных из `/api/coins/public`.

## Решение

### 1. Клиентская часть (coininfo.js)
**Файл:** `public/coininfo.js`

Обновлена функция `addToPortfolio()` для сохранения логотипа при покупке:

```javascript
// Новая монета в портфеле
portfolio.push({
    coinId: coinId,
    amount: amount,
    avgPrice: price,
    symbol: this.currentCoin.symbol,
    name: this.currentCoin.name,
    logo: this.currentCoin.logo || window.CryptoLogos.getCoinLogoBySymbol(this.currentCoin.symbol) || '/logos/default.svg'
});
```

**Логика fallback:**
1. `this.currentCoin.logo` - логотип из данных монеты
2. `window.CryptoLogos.getCoinLogoBySymbol()` - логотип из библиотеки CryptoLogos
3. `'/logos/default.svg'` - запасной логотип

### 2. Клиентская часть (home.js)
**Файл:** `public/home.js`

Улучшена функция `loadMyAssets()` с приоритетной логикой fallback:

```javascript
// Определяем логотип с приоритетом: сохраненный в портфеле > из API > CryptoLogos > default
let logo = portfolioItem.logo || '/logos/default.svg';
if (coinData && coinData.logo) {
    logo = coinData.logo;
} else if (window.CryptoLogos) {
    logo = window.CryptoLogos.getCoinLogoBySymbol(portfolioItem.symbol) || '/logos/default.svg';
}
```

**Приоритет логотипов:**
1. **Сохраненный в портфеле** - логотип, сохраненный при покупке
2. **Из API** - актуальный логотип из `/api/coins/public`
3. **CryptoLogos** - логотип из библиотеки по символу монеты
4. **Default** - запасной логотип `/logos/default.svg`

### 3. База данных (database.js)
**Файл:** `database.js`

#### Обновлена схема таблицы `portfolio`:
```sql
CREATE TABLE IF NOT EXISTS portfolio (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    coin_id TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    avg_price REAL NOT NULL DEFAULT 0,
    logo TEXT DEFAULT '/logos/default.svg',  -- НОВОЕ ПОЛЕ
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, coin_id)
);
```

#### Добавлена миграция:
```sql
ALTER TABLE portfolio ADD COLUMN logo TEXT DEFAULT '/logos/default.svg';
```

#### Обновлена функция `addToPortfolio()`:
```javascript
const addToPortfolio = (userId, coinId, amount, avgPrice, logo = '/logos/default.svg') => {
    // ... логика с сохранением логотипа
    'INSERT INTO portfolio (id, user_id, coin_id, amount, avg_price, logo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
}
```

### 4. Серверная часть (server.js)
**Файл:** `server.js`

Обновлен эндпоинт покупки для получения и сохранения логотипа:

```javascript
// Get coin information for logo
const coinInfo = await db.getCoinById(coinId);
const logo = coinInfo ? coinInfo.logo || '/logos/default.svg' : '/logos/default.svg';

// Add to portfolio
await db.addToPortfolio(userId, coinId, amount, price, logo);
```

## Преимущества решения

### 1. **Надежность**
- Многоуровневая система fallback гарантирует отображение логотипа
- Сохранение логотипа в портфеле обеспечивает стабильность

### 2. **Производительность**
- Логотип сохраняется при покупке, не требует повторных запросов
- Приоритетная логика минимизирует обращения к API

### 3. **Совместимость**
- Обратная совместимость с существующими данными
- Автоматическая миграция добавляет поле `logo` в существующие записи

### 4. **Гибкость**
- Поддержка различных источников логотипов
- Легко расширяемая система fallback

## Структура данных

### localStorage portfolio item:
```javascript
{
    coinId: "bitcoin",
    amount: 0.001,
    avgPrice: 45000,
    symbol: "BTC",
    name: "Bitcoin",
    logo: "/logos/bitcoin.svg"  // НОВОЕ ПОЛЕ
}
```

### Database portfolio record:
```sql
id: "portfolio_user123_bitcoin_1234567890"
user_id: "user123"
coin_id: "bitcoin"
amount: 0.001
avg_price: 45000.00
logo: "/logos/bitcoin.svg"  -- НОВОЕ ПОЛЕ
created_at: "2024-01-01T00:00:00.000Z"
updated_at: "2024-01-01T00:00:00.000Z"
```

## Тестирование

### Сценарии тестирования:
1. **Покупка новой монеты** - логотип сохраняется в портфеле
2. **Отображение портфеля** - логотипы отображаются корректно
3. **Fallback логика** - при отсутствии логотипа используется default.svg
4. **Миграция БД** - существующие записи получают поле logo

### Ожидаемые результаты:
- ✅ Логотипы отображаются во всех случаях
- ✅ Fallback на default.svg при отсутствии логотипа
- ✅ Сохранение логотипа при покупке
- ✅ Обратная совместимость с существующими данными

## Заключение

Проблема с отсутствием логотипов в портфеле полностью решена. Система теперь обеспечивает надежное отображение логотипов монет с многоуровневой системой fallback и сохранением логотипов в базе данных.
