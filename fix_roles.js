const db = require('./database');
const bcrypt = require('bcryptjs');

async function fixRoles() {
    try {
        console.log('🔧 Проверка и исправление системы ролей...');
        
        // Initialize database
        await db.initializeDatabase();
        console.log('✅ База данных инициализирована');
        
        // Check if roles exist
        const roles = await db.getAllRoles();
        console.log(`📋 Найдено ролей: ${roles.length}`);
        
        if (roles.length === 0) {
            console.log('⚠️ Роли не найдены, создаем...');
            
            // Create roles
            const rolesToCreate = [
                {
                    id: 'role_admin',
                    name: 'Админ',
                    description: 'Полный доступ ко всем разделам и функциям',
                    permissions: {
                        coins: { read: true, write: true, delete: true },
                        users: { read: true, write: true, delete: true },
                        requisites: { read: true, write: true, delete: true },
                        admin: { read: true, write: true, delete: true },
                        roles: { read: true, write: true, delete: true }
                    },
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'role_analyst',
                    name: 'Аналитик',
                    description: 'Доступ к разделам Монеты и Пользователи',
                    permissions: {
                        coins: { read: true, write: true, delete: false },
                        users: { read: true, write: true, delete: false },
                        requisites: { read: false, write: false, delete: false },
                        admin: { read: false, write: false, delete: false },
                        roles: { read: false, write: false, delete: false }
                    },
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'role_manager',
                    name: 'Менеджер',
                    description: 'Доступ только к управлению пользователями',
                    permissions: {
                        coins: { read: false, write: false, delete: false },
                        users: { read: true, write: true, delete: false },
                        requisites: { read: false, write: false, delete: false },
                        admin: { read: false, write: false, delete: false },
                        roles: { read: false, write: false, delete: false }
                    },
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'role_team_lead',
                    name: 'Тим-лидер',
                    description: 'Доступ только к управлению пользователями',
                    permissions: {
                        coins: { read: false, write: false, delete: false },
                        users: { read: true, write: true, delete: false },
                        requisites: { read: false, write: false, delete: false },
                        admin: { read: false, write: false, delete: false },
                        roles: { read: false, write: false, delete: false }
                    },
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'role_head',
                    name: 'Хед',
                    description: 'Доступ только к управлению пользователями',
                    permissions: {
                        coins: { read: false, write: false, delete: false },
                        users: { read: true, write: true, delete: false },
                        requisites: { read: false, write: false, delete: false },
                        admin: { read: false, write: false, delete: false },
                        roles: { read: false, write: false, delete: false }
                    },
                    createdAt: new Date().toISOString()
                }
            ];
            
            for (const role of rolesToCreate) {
                await db.createRole(role);
                console.log(`✅ Создана роль: ${role.name}`);
            }
        }
        
        // Check admin user
        const adminUser = await db.getUserByUsername('AdminNKcoin');
        if (!adminUser) {
            console.log('⚠️ Администратор не найден, создаем...');
            
            const hashedPassword = await bcrypt.hash('Zxcv1236', 12);
            const newAdmin = {
                id: 'admin_' + Date.now().toString(),
                username: 'AdminNKcoin',
                email: 'admin@salebit.com',
                password: hashedPassword,
                status: 'active',
                createdAt: new Date().toISOString()
            };
            
            await db.createUser(newAdmin);
            console.log('✅ Создан администратор: AdminNKcoin');
            
            // Create account for admin
            const adminAccount = {
                id: 'admin_account_' + Date.now().toString(),
                userId: newAdmin.id,
                balance: JSON.stringify({
                    USD: 0,
                    BTC: 0,
                    ETH: 0
                }),
                createdAt: new Date().toISOString()
            };
            
            await db.createAccount(adminAccount);
            console.log('✅ Создан аккаунт для администратора');
            
            // Assign admin role
            const adminRole = await db.getRoleByName('Админ');
            if (adminRole) {
                await db.assignRoleToUser({
                    id: 'admin_role_' + Date.now().toString(),
                    userId: newAdmin.id,
                    roleId: adminRole.id,
                    assignedBy: newAdmin.id,
                    assignedAt: new Date().toISOString()
                });
                console.log('✅ Назначена роль Админ');
            }
        } else {
            console.log('✅ Администратор найден: AdminNKcoin');
            
            // Check if admin has role
            const adminRoles = await db.getUserRoles(adminUser.id);
            if (adminRoles.length === 0) {
                console.log('⚠️ У администратора нет роли, назначаем...');
                
                const adminRole = await db.getRoleByName('Админ');
                if (adminRole) {
                    await db.assignRoleToUser({
                        id: 'admin_role_' + Date.now().toString(),
                        userId: adminUser.id,
                        roleId: adminRole.id,
                        assignedBy: adminUser.id,
                        assignedAt: new Date().toISOString()
                    });
                    console.log('✅ Назначена роль Админ');
                }
            } else {
                console.log(`✅ У администратора есть роли: ${adminRoles.map(r => r.roleName).join(', ')}`);
            }
        }
        
        // Test permissions
        console.log('\n🧪 Тестирование прав доступа...');
        const testUser = await db.getUserByUsername('AdminNKcoin');
        if (testUser) {
            const userWithRoles = await db.getUserWithRoles(testUser.id);
            console.log('Пользователь:', userWithRoles.username);
            console.log('Роли:', userWithRoles.roles);
            console.log('Права:', userWithRoles.allPermissions);
        }
        
        console.log('\n✅ Система ролей готова к работе!');
        console.log('🔑 Войдите в систему:');
        console.log('   Email: admin@salebit.com');
        console.log('   Пароль: Zxcv1236');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
    } finally {
        await db.closeDatabase();
    }
}

fixRoles();
