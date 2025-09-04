const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'crypto_data.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                notes TEXT,
                lastLogin TEXT,
                createdAt TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
                reject(err);
                return;
            }
        });

        // Create accounts table
        db.run(`
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                balance TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating accounts table:', err);
                reject(err);
                return;
            }
        });

        // Create coins table
        db.run(`
            CREATE TABLE IF NOT EXISTS coins (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                symbol TEXT NOT NULL,
                price REAL NOT NULL,
                priceChange REAL,
                marketCap REAL,
                volume REAL,
                category TEXT,
                status TEXT DEFAULT 'active',
                description TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating coins table:', err);
                reject(err);
                return;
            }
        });

        // Create price_history table for tracking price changes
        db.run(`
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                coinId TEXT NOT NULL,
                price REAL NOT NULL,
                priceChange REAL,
                marketCap REAL,
                volume REAL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (coinId) REFERENCES coins (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating price_history table:', err);
                reject(err);
                return;
            }
        });

        // Create portfolio table for storing user's cryptocurrency holdings
        db.run(`
            CREATE TABLE IF NOT EXISTS portfolio (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                coin_id TEXT NOT NULL,
                amount REAL NOT NULL DEFAULT 0,
                avg_price REAL NOT NULL DEFAULT 0,
                logo TEXT DEFAULT '/logos/default.svg',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, coin_id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating portfolio table:', err);
                reject(err);
                return;
            }
        });

        // Create transactions table for tracking all operations
        db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                coin_id TEXT,
                amount REAL,
                price REAL,
                total_value REAL,
                fee REAL NOT NULL DEFAULT 0,
                balance REAL,
                timestamp TEXT NOT NULL,
                status TEXT DEFAULT 'completed',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating transactions table:', err);
                reject(err);
                return;
            }
        });

        // Create requisites table
        db.run(`
            CREATE TABLE IF NOT EXISTS requisites (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                number TEXT NOT NULL,
                bank TEXT NOT NULL,
                holder TEXT NOT NULL,
                status TEXT NOT NULL,
                description TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating requisites table:', err);
                reject(err);
                return;
            }
        });

        // Create roles table
        db.run(`
            CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                permissions TEXT NOT NULL,
                createdAt TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating roles table:', err);
                reject(err);
                return;
            }
        });

        // Create user_roles table
        db.run(`
            CREATE TABLE IF NOT EXISTS user_roles (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                roleId TEXT NOT NULL,
                assignedBy TEXT NOT NULL,
                assignedAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users (id),
                FOREIGN KEY (roleId) REFERENCES roles (id),
                FOREIGN KEY (assignedBy) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating user_roles table:', err);
                reject(err);
                return;
            }
        });

        // Create activity_log table
        db.run(`
            CREATE TABLE IF NOT EXISTS activity_log (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                action TEXT NOT NULL,
                entityType TEXT NOT NULL,
                entityId TEXT,
                details TEXT,
                ipAddress TEXT,
                userAgent TEXT,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating activity_log table:', err);
                reject(err);
                return;
            }
        });

        // Create operation_logs table for trading operations
        db.run(`
            CREATE TABLE IF NOT EXISTS operation_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                operation TEXT NOT NULL,
                data TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'completed',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating operation_logs table:', err);
                reject(err);
                return;
            }
        });

        // Create indexes for performance optimization
        db.run(`CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id)`, (err) => {
            if (err) console.error('Error creating portfolio user_id index:', err);
        });

        db.run(`CREATE INDEX IF NOT EXISTS idx_portfolio_coin_id ON portfolio(coin_id)`, (err) => {
            if (err) console.error('Error creating portfolio coin_id index:', err);
        });

        db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`, (err) => {
            if (err) console.error('Error creating transactions user_id index:', err);
        });

        db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`, (err) => {
            if (err) console.error('Error creating transactions type index:', err);
        });

        db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_coin_id ON transactions(coin_id)`, (err) => {
            if (err) console.error('Error creating transactions coin_id index:', err);
        });

        db.run(`CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id)`, (err) => {
            if (err) console.error('Error creating operation_logs user_id index:', err);
        });

        db.run(`CREATE INDEX IF NOT EXISTS idx_operation_logs_operation ON operation_logs(operation)`, (err) => {
            if (err) console.error('Error creating operation_logs operation index:', err);
        });

        // Create trigger for portfolio updated_at
        db.run(`
            CREATE TRIGGER IF NOT EXISTS update_portfolio_timestamp 
            AFTER UPDATE ON portfolio
            BEGIN
                UPDATE portfolio SET updated_at = datetime('now') WHERE id = NEW.id;
            END
        `, (err) => {
            if (err) {
                console.error('Error creating portfolio trigger:', err);
                reject(err);
                return;
            }
        });

        // Migration support - Add new columns to existing tables if they don't exist
        db.run(`ALTER TABLE transactions ADD COLUMN coin_id TEXT`, (err) => {
            // Ignore error if column already exists
        });

        db.run(`ALTER TABLE transactions ADD COLUMN amount REAL`, (err) => {
            // Ignore error if column already exists
        });

        db.run(`ALTER TABLE transactions ADD COLUMN price REAL`, (err) => {
            // Ignore error if column already exists
        });

        db.run(`ALTER TABLE transactions ADD COLUMN total_value REAL`, (err) => {
            // Ignore error if column already exists
        });

        db.run(`ALTER TABLE transactions ADD COLUMN created_at TEXT`, (err) => {
            // Ignore error if column already exists
        });

        db.run(`ALTER TABLE portfolio ADD COLUMN logo TEXT DEFAULT '/logos/default.svg'`, (err) => {
            // Ignore error if column already exists
        });

        console.log('Database initialized successfully');
        resolve();
    });
};

// User operations
const createUser = (user) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT OR REPLACE INTO users (id, username, email, password, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user.id, user.username, user.email, user.password, user.status || 'pending', user.notes || null, user.createdAt],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
};

const getUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE email = ?',
            [email],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });
};

const getUserByUsername = (username) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE username = ?',
            [username],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });
};

const getUserById = (id) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE id = ?',
            [id],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });
};

const getAllUsers = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users ORDER BY createdAt DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const updateUser = (id, updates) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(id);

        db.run(
            `UPDATE users SET ${fields} WHERE id = ?`,
            values,
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

const deleteUser = (id) => {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM users WHERE id = ?',
            [id],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

const updateUserLastLogin = (id) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET lastLogin = ? WHERE id = ?',
            [new Date().toISOString(), id],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

// Account operations
const createAccount = (account) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT OR REPLACE INTO accounts (id, userId, balance, createdAt) VALUES (?, ?, ?, ?)',
            [account.id, account.userId, JSON.stringify(account.balance), account.createdAt],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
};

const getAccountByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM accounts WHERE userId = ?',
            [userId],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        row.balance = JSON.parse(row.balance);
                    }
                    resolve(row);
                }
            }
        );
    });
};

// Update account balance
const updateAccount = (userId, newBalance) => {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();
        
        db.run(`
            UPDATE accounts 
            SET balance = ?
            WHERE userId = ?
        `, [newBalance, userId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, updatedRows: this.changes });
            }
        });
    });
};

// Coin operations
const saveCoin = (coin) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO coins 
            (id, name, symbol, price, priceChange, marketCap, volume, category, status, description, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                coin.id, coin.name, coin.symbol, coin.price, coin.priceChange,
                coin.marketCap, coin.volume, coin.category, coin.status,
                coin.description, coin.createdAt, coin.updatedAt
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
};

const getAllCoins = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM coins ORDER BY marketCap DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getCoinById = (id) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM coins WHERE id = ?',
            [id],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });
};

const updateCoin = (id, updates) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(id);

        db.run(
            `UPDATE coins SET ${fields} WHERE id = ?`,
            values,
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

const deleteCoin = (id) => {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM coins WHERE id = ?',
            [id],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

// Price history operations
const savePriceHistory = (coinId, priceData) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO price_history 
            (coinId, price, priceChange, marketCap, volume, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                coinId, priceData.price, priceData.priceChange,
                priceData.marketCap, priceData.volume, new Date().toISOString()
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
};

const getPriceHistory = (coinId, limit = 100) => {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM price_history WHERE coinId = ? ORDER BY timestamp DESC LIMIT ?',
            [coinId, limit],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
};

const getPriceHistoryByDateRange = (coinId, startDate, endDate) => {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM price_history WHERE coinId = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp ASC',
            [coinId, startDate, endDate],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
};

// Cleanup old price history (keep last 30 days)
const cleanupOldPriceHistory = () => {
    return new Promise((resolve, reject) => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        db.run(
            'DELETE FROM price_history WHERE timestamp < ?',
            [thirtyDaysAgo],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Cleaned up ${this.changes} old price history records`);
                    resolve(this.changes);
                }
            }
        );
    });
};

// Requisites operations
const createRequisite = (requisite) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO requisites (id, type, name, number, bank, holder, status, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [requisite.id, requisite.type, requisite.name, requisite.number, requisite.bank, requisite.holder, requisite.status, requisite.description, requisite.createdAt, requisite.updatedAt],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
};

const getAllRequisites = () => {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM requisites ORDER BY createdAt DESC',
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
};

const getRequisiteById = (id) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM requisites WHERE id = ?',
            [id],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });
};

const updateRequisite = (id, requisite) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE requisites SET type = ?, name = ?, number = ?, bank = ?, holder = ?, status = ?, description = ?, updatedAt = ? WHERE id = ?',
            [requisite.type, requisite.name, requisite.number, requisite.bank, requisite.holder, requisite.status, requisite.description, requisite.updatedAt, id],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

const deleteRequisite = (id) => {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM requisites WHERE id = ?',
            [id],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

// Role operations
const createRole = (role) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT OR REPLACE INTO roles (id, name, description, permissions, createdAt) VALUES (?, ?, ?, ?, ?)',
            [role.id, role.name, role.description, JSON.stringify(role.permissions), role.createdAt],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
};

const getAllRoles = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM roles ORDER BY createdAt DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => ({
                    ...row,
                    permissions: JSON.parse(row.permissions)
                })));
            }
        });
    });
};

const getRoleById = (id) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM roles WHERE id = ?',
            [id],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        row.permissions = JSON.parse(row.permissions);
                    }
                    resolve(row);
                }
            }
        );
    });
};

const getRoleByName = (name) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM roles WHERE name = ?',
            [name],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        row.permissions = JSON.parse(row.permissions);
                    }
                    resolve(row);
                }
            }
        );
    });
};

const updateRole = (id, updates) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        if (updates.permissions) {
            updates.permissions = JSON.stringify(updates.permissions);
        }
        
        db.run(
            `UPDATE roles SET ${fields} WHERE id = ?`,
            [...values, id],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

const deleteRole = (id) => {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM roles WHERE id = ?',
            [id],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

// User roles operations
const assignRoleToUser = (userRole) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT OR REPLACE INTO user_roles (id, userId, roleId, assignedBy, assignedAt) VALUES (?, ?, ?, ?, ?)',
            [userRole.id, userRole.userId, userRole.roleId, userRole.assignedBy, userRole.assignedAt],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
};

const getUserRoles = (userId) => {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT ur.*, r.name as roleName, r.description as roleDescription, r.permissions
            FROM user_roles ur
            JOIN roles r ON ur.roleId = r.id
            WHERE ur.userId = ?
        `, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => ({
                    ...row,
                    permissions: JSON.parse(row.permissions)
                })));
            }
        });
    });
};

const removeRoleFromUser = (userId, roleId) => {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM user_roles WHERE userId = ? AND roleId = ?',
            [userId, roleId],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
};

const getUserWithRoles = (userId) => {
    return new Promise((resolve, reject) => {
        // First get the user
        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (!user) {
                resolve(null);
                return;
            }
            
            // Then get user roles
            db.all(`
                SELECT ur.*, r.name as roleName, r.description as roleDescription, r.permissions
                FROM user_roles ur
                JOIN roles r ON ur.roleId = r.id
                WHERE ur.userId = ?
            `, [userId], (err, userRoles) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Combine user data with roles and permissions
                const result = {
                    ...user,
                    roles: userRoles.map(role => role.roleName),
                    userRoles: userRoles
                };
                
                // Combine all permissions
                const allPermissions = {};
                userRoles.forEach(role => {
                    if (role.permissions) {
                        const permissions = JSON.parse(role.permissions);
                        Object.assign(allPermissions, permissions);
                    }
                });
                
                result.allPermissions = allPermissions;
                resolve(result);
            });
        });
    });
};

// Activity log operations
const logActivity = (activity) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO activity_log (id, userId, action, entityType, entityId, details, ipAddress, userAgent, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [activity.id, activity.userId, activity.action, activity.entityType, activity.entityId || null, JSON.stringify(activity.details), activity.ipAddress || null, activity.userAgent || null, activity.createdAt],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
};

const getActivityLog = (filters = {}) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT al.*, u.username, u.email
            FROM activity_log al
            JOIN users u ON al.userId = u.id
        `;
        
        const conditions = [];
        const params = [];
        
        if (filters.userId) {
            conditions.push('al.userId = ?');
            params.push(filters.userId);
        }
        
        if (filters.action) {
            conditions.push('al.action = ?');
            params.push(filters.action);
        }
        
        if (filters.entityType) {
            conditions.push('al.entityType = ?');
            params.push(filters.entityType);
        }
        
        if (filters.startDate) {
            conditions.push('al.createdAt >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            conditions.push('al.createdAt <= ?');
            params.push(filters.endDate);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY al.createdAt DESC';
        
        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }
        
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => ({
                    ...row,
                    details: JSON.parse(row.details || '{}')
                })));
            }
        });
    });
};

// Portfolio Management Functions

// Get user's portfolio
const getUserPortfolio = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                up.id,
                up.coinSymbol,
                up.coinName,
                up.balance,
                up.averageBuyPrice,
                up.totalInvested,
                up.lastUpdated,
                c.price as currentPrice,
                c.priceChange,
                (up.balance * c.price) as currentValue,
                ((c.price - up.averageBuyPrice) / up.averageBuyPrice * 100) as profitLossPercent
            FROM user_portfolio up
            LEFT JOIN coins c ON up.coinSymbol = c.symbol
            WHERE up.userId = ? AND up.balance > 0
            ORDER BY up.lastUpdated DESC
        `;
        
        db.all(query, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Add coins to portfolio (buy operation)
const addToPortfolio = (userId, coinSymbol, coinName, amount, price, fee = 0) => {
    return new Promise((resolve, reject) => {
        const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        const totalValue = amount * price;
        
        // First, check if user already has this coin in portfolio
        db.get('SELECT * FROM user_portfolio WHERE userId = ? AND coinSymbol = ?', 
            [userId, coinSymbol], (err, existing) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (existing) {
                    // Update existing portfolio entry
                    const newBalance = existing.balance + amount;
                    const newTotalInvested = existing.totalInvested + totalValue;
                    const newAveragePrice = newTotalInvested / newBalance;
                    
                    db.run(`
                        UPDATE user_portfolio 
                        SET balance = ?, averageBuyPrice = ?, totalInvested = ?, lastUpdated = ?
                        WHERE userId = ? AND coinSymbol = ?
                    `, [newBalance, newAveragePrice, newTotalInvested, timestamp, userId, coinSymbol], function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // Add transaction record
                        addPortfolioTransaction(transactionId, userId, coinSymbol, 'buy', amount, price, totalValue, fee, newBalance, timestamp)
                            .then(() => resolve({ success: true, newBalance, averagePrice: newAveragePrice }))
                            .catch(reject);
                    });
                } else {
                    // Create new portfolio entry
                    const portfolioId = `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    db.run(`
                        INSERT INTO user_portfolio (id, userId, coinSymbol, coinName, balance, averageBuyPrice, totalInvested, lastUpdated, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [portfolioId, userId, coinSymbol, coinName, amount, price, totalValue, timestamp, timestamp], function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // Add transaction record
                        addPortfolioTransaction(transactionId, userId, coinSymbol, 'buy', amount, price, totalValue, fee, amount, timestamp)
                            .then(() => resolve({ success: true, newBalance: amount, averagePrice: price }))
                            .catch(reject);
                    });
                }
            });
    });
};

// Remove coins from portfolio (sell operation)
const removeFromPortfolio = (userId, coinSymbol, amount, price, fee = 0) => {
    return new Promise((resolve, reject) => {
        const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        const totalValue = amount * price;
        
        // Check if user has enough coins
        db.get('SELECT * FROM user_portfolio WHERE userId = ? AND coinSymbol = ?', 
            [userId, coinSymbol], (err, existing) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!existing || existing.balance < amount) {
                    reject(new Error('Insufficient coins in portfolio'));
                    return;
                }
                
                const newBalance = existing.balance - amount;
                
                if (newBalance === 0) {
                    // Remove portfolio entry completely
                    db.run('DELETE FROM user_portfolio WHERE userId = ? AND coinSymbol = ?', 
                        [userId, coinSymbol], function(err) {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            // Add transaction record
                            addPortfolioTransaction(transactionId, userId, coinSymbol, 'sell', amount, price, totalValue, fee, 0, timestamp)
                                .then(() => resolve({ success: true, newBalance: 0, soldAmount: amount }))
                                .catch(reject);
                        });
                } else {
                    // Update portfolio entry
                    db.run(`
                        UPDATE user_portfolio 
                        SET balance = ?, lastUpdated = ?
                        WHERE userId = ? AND coinSymbol = ?
                    `, [newBalance, timestamp, userId, coinSymbol], function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // Add transaction record
                        addPortfolioTransaction(transactionId, userId, coinSymbol, 'sell', amount, price, totalValue, fee, newBalance, timestamp)
                            .then(() => resolve({ success: true, newBalance, soldAmount: amount }))
                            .catch(reject);
                    });
                }
            });
    });
};

// Update portfolio balance (for price updates)
const updatePortfolioBalance = (userId, coinSymbol, newBalance) => {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();
        
        db.run(`
            UPDATE user_portfolio 
            SET balance = ?, lastUpdated = ?
            WHERE userId = ? AND coinSymbol = ?
        `, [newBalance, timestamp, userId, coinSymbol], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, updatedRows: this.changes });
            }
        });
    });
};

// Add portfolio transaction record
const addPortfolioTransaction = (transactionId, userId, coinSymbol, transactionType, amount, price, totalValue, fee, balance, timestamp) => {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO portfolio_transactions (id, userId, coinSymbol, transactionType, amount, price, totalValue, fee, balance, timestamp, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [transactionId, userId, coinSymbol, transactionType, amount, price, totalValue, fee, balance, timestamp, 'completed'], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, transactionId });
            }
        });
    });
};

// Get portfolio transaction by ID
const getPortfolioTransaction = (transactionId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM portfolio_transactions WHERE id = ?', [transactionId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Get user's portfolio transactions
const getPortfolioTransactions = (userId, filters = {}) => {
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM portfolio_transactions WHERE userId = ?';
        const params = [userId];
        
        if (filters.coinSymbol) {
            query += ' AND coinSymbol = ?';
            params.push(filters.coinSymbol);
        }
        
        if (filters.transactionType) {
            query += ' AND transactionType = ?';
            params.push(filters.transactionType);
        }
        
        if (filters.startDate) {
            query += ' AND timestamp >= ?';
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            query += ' AND timestamp <= ?';
            params.push(filters.endDate);
        }
        
        query += ' ORDER BY timestamp DESC';
        
        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }
        
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Get total portfolio value
const getPortfolioValue = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                SUM(up.balance * c.price) as totalValue,
                SUM(up.totalInvested) as totalInvested,
                COUNT(*) as coinCount
            FROM user_portfolio up
            LEFT JOIN coins c ON up.coinSymbol = c.symbol
            WHERE up.userId = ? AND up.balance > 0
        `;
        
        db.get(query, [userId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    totalValue: row.totalValue || 0,
                    totalInvested: row.totalInvested || 0,
                    coinCount: row.coinCount || 0,
                    profitLoss: (row.totalValue || 0) - (row.totalInvested || 0)
                });
            }
        });
    });
};

// Close database connection
const closeDatabase = () => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('Database connection closed');
                resolve();
            }
        });
    });
};

// Portfolio operations (Updated for new schema) - Function already defined above

// addToPortfolio function already defined above

// removeFromPortfolio function already defined above

// Operation logs (Updated for new schema)
const logOperation = (operationData) => {
    return new Promise((resolve, reject) => {
        const id = `op_${operationData.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const data = JSON.stringify({
            coin_id: operationData.coin_id,
            amount: operationData.amount,
            price: operationData.price,
            total_value: operationData.total_value,
            balance_before: operationData.balance_before,
            balance_after: operationData.balance_after,
            portfolio_before: operationData.portfolio_before,
            portfolio_after: operationData.portfolio_after,
            ip_address: operationData.ip_address,
            user_agent: operationData.user_agent
        });
        
        db.run(
            'INSERT INTO operation_logs (id, user_id, operation, data, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [
                id,
                operationData.userId,
                operationData.operation_type,
                data,
                'completed',
                operationData.created_at
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(id);
                }
            }
        );
    });
};

module.exports = {
    initializeDatabase,
    createUser,
    getUserByEmail,
    getUserByUsername,
    getUserById,
    getAllUsers,
    updateUser,
    deleteUser,
    updateUserLastLogin,
    createAccount,
    getAccountByUserId,
    updateAccount,
    saveCoin,
    getAllCoins,
    getCoinById,
    updateCoin,
    deleteCoin,
    savePriceHistory,
    getPriceHistory,
    getPriceHistoryByDateRange,
    cleanupOldPriceHistory,
    createRequisite,
    getAllRequisites,
    getRequisiteById,
    updateRequisite,
    deleteRequisite,
    // Role operations
    createRole,
    getAllRoles,
    getRoleById,
    getRoleByName,
    updateRole,
    deleteRole,
    assignRoleToUser,
    getUserRoles,
    removeRoleFromUser,
    getUserWithRoles,
    // Activity log operations
    logActivity,
    getActivityLog,
    // Portfolio operations
    getUserPortfolio,
    addToPortfolio,
    removeFromPortfolio,
    updatePortfolioBalance,
    getPortfolioTransaction,
    addPortfolioTransaction,
    getPortfolioTransactions,
    getPortfolioValue,
    // Operation logs
    logOperation,
    closeDatabase
};
