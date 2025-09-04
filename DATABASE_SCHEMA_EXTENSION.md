# Расширение схемы базы данных SellBit

## Обзор изменений

Схема базы данных SellBit была расширена для поддержки системы покупки/продажи монет с полным логированием операций и оптимизацией производительности.

## Новые таблицы

### 1. Таблица `portfolio`
Хранит портфели пользователей с криптовалютами.

```sql
CREATE TABLE IF NOT EXISTS portfolio (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    coin_id TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    avg_price REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, coin_id)
);
```

**Поля:**
- `id` - Уникальный идентификатор записи портфеля
- `user_id` - ID пользователя (FK к users.id)
- `coin_id` - ID монеты
- `amount` - Количество монет в портфеле
- `avg_price` - Средняя цена покупки
- `created_at` - Дата создания записи
- `updated_at` - Дата последнего обновления (автоматически обновляется триггером)

### 2. Таблица `operation_logs`
Логирует все торговые операции для аудита и отладки.

```sql
CREATE TABLE IF NOT EXISTS operation_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    data TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

**Поля:**
- `id` - Уникальный идентификатор операции
- `user_id` - ID пользователя (FK к users.id)
- `operation` - Тип операции ('buy', 'sell', etc.)
- `data` - JSON данные операции (количество, цена, баланс до/после, портфель до/после, IP, User-Agent)
- `status` - Статус операции ('completed', 'failed', 'pending')
- `created_at` - Дата и время операции

## Расширенные таблицы

### Таблица `transactions`
Расширена для поддержки торговых операций.

```sql
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    coin_id TEXT,           -- НОВОЕ ПОЛЕ
    amount REAL,            -- НОВОЕ ПОЛЕ
    price REAL,             -- НОВОЕ ПОЛЕ
    total_value REAL,       -- НОВОЕ ПОЛЕ
    fee REAL NOT NULL DEFAULT 0,
    balance REAL,
    timestamp TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TEXT NOT NULL,  -- НОВОЕ ПОЛЕ
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

**Новые поля:**
- `coin_id` - ID монеты для торговых операций
- `amount` - Количество монет
- `price` - Цена за единицу
- `total_value` - Общая стоимость операции
- `created_at` - Дата создания записи

## Индексы для оптимизации

### Индексы таблицы `portfolio`
```sql
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_coin_id ON portfolio(coin_id);
```

### Индексы таблицы `transactions`
```sql
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_coin_id ON transactions(coin_id);
```

### Индексы таблицы `operation_logs`
```sql
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation ON operation_logs(operation);
```

## Триггеры

### Триггер для автоматического обновления `updated_at`
```sql
CREATE TRIGGER IF NOT EXISTS update_portfolio_timestamp 
AFTER UPDATE ON portfolio
BEGIN
    UPDATE portfolio SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

## Миграции

Система поддерживает автоматические миграции для добавления новых полей в существующие таблицы:

```sql
-- Добавление новых полей в transactions
ALTER TABLE transactions ADD COLUMN coin_id TEXT;
ALTER TABLE transactions ADD COLUMN amount REAL;
ALTER TABLE transactions ADD COLUMN price REAL;
ALTER TABLE transactions ADD COLUMN total_value REAL;
ALTER TABLE transactions ADD COLUMN created_at TEXT;
```

## Функции базы данных

### Portfolio Operations
- `getUserPortfolio(userId)` - Получить портфель пользователя
- `addToPortfolio(userId, coinId, amount, avgPrice)` - Добавить монеты в портфель
- `removeFromPortfolio(userId, coinId, amount)` - Удалить монеты из портфеля

### Operation Logging
- `logOperation(operationData)` - Записать операцию в лог

## Структура данных operation_logs.data

Поле `data` содержит JSON с полной информацией об операции:

```json
{
  "coin_id": "bitcoin",
  "amount": 0.001,
  "price": 45000.00,
  "total_value": 45.00,
  "balance_before": 1000.00,
  "balance_after": 955.00,
  "portfolio_before": "[{...}]",
  "portfolio_after": "[{...}]",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

## Преимущества новой схемы

1. **Производительность**: Индексы оптимизируют запросы по user_id, coin_id, type
2. **Аудит**: Полное логирование всех операций с деталями
3. **Целостность**: Триггеры автоматически обновляют timestamps
4. **Масштабируемость**: Поддержка миграций для будущих изменений
5. **Гибкость**: JSON поле в operation_logs позволяет хранить любые дополнительные данные

## Совместимость

- Все изменения обратно совместимы
- Существующие данные сохраняются
- Новые поля добавляются автоматически при инициализации
- Старые функции продолжают работать с обновленной схемой
