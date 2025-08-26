// Using built-in fetch in Node.js

async function testAdminAccess() {
    try {
        console.log('🧪 Тестирование доступа к админ панели...');
        
        // Step 1: Login
        console.log('1. Вход в систему...');
        const loginResponse = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@salebit.com',
                password: 'Zxcv1236'
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error('Ошибка входа');
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ Вход успешен');
        console.log('Токен:', loginData.token ? 'Получен' : 'Не получен');
        
        // Step 2: Get user permissions
        console.log('\n2. Получение прав пользователя...');
        const permissionsResponse = await fetch('http://localhost:3000/api/user/permissions', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });
        
        if (!permissionsResponse.ok) {
            throw new Error('Ошибка получения прав');
        }
        
        const permissionsData = await permissionsResponse.json();
        console.log('✅ Права получены');
        console.log('Пользователь:', permissionsData.data.user.username);
        console.log('Роли:', permissionsData.data.user.roles);
        console.log('Права:', permissionsData.data.permissions);
        
        // Step 3: Test admin endpoints
        console.log('\n3. Тестирование админ endpoints...');
        
        // Test roles endpoint
        const rolesResponse = await fetch('http://localhost:3000/api/roles', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });
        
        if (rolesResponse.ok) {
            const rolesData = await rolesResponse.json();
            console.log('✅ Роли получены:', rolesData.data.length, 'ролей');
        } else {
            console.log('❌ Ошибка получения ролей:', rolesResponse.status);
        }
        
        // Test admin users endpoint
        const adminUsersResponse = await fetch('http://localhost:3000/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });
        
        if (adminUsersResponse.ok) {
            const adminUsersData = await adminUsersResponse.json();
            console.log('✅ Пользователи админ панели получены:', adminUsersData.data.users.length, 'пользователей');
        } else {
            console.log('❌ Ошибка получения пользователей админ панели:', adminUsersResponse.status);
        }
        
        // Test activity log endpoint
        const activityResponse = await fetch('http://localhost:3000/api/admin/activity-log?limit=5', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });
        
        if (activityResponse.ok) {
            const activityData = await activityResponse.json();
            console.log('✅ История действий получена:', activityData.data.length, 'записей');
        } else {
            console.log('❌ Ошибка получения истории действий:', activityResponse.status);
        }
        
        console.log('\n✅ Тестирование завершено успешно!');
        console.log('🔑 Теперь можете войти в админ панель через браузер');
        
    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

testAdminAccess();
