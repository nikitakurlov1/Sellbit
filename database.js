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
            console.log('Database initialized successfully');
            resolve();
        });
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
    closeDatabase
};
