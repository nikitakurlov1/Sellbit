// Общая функция выхода из аккаунта
function handleLogout() {
    if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
        // Показываем уведомление о выходе
        if (typeof showToast === 'function') {
            showToast('Выход из аккаунта...', 'info');
        }
        
        setTimeout(() => {
            // Очищаем данные пользователя из localStorage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userStats');
            localStorage.removeItem('balanceHidden');
            localStorage.removeItem('walletSettings');
            
            // Показываем уведомление об успешном выходе
            if (typeof showToast === 'function') {
                showToast('Вы вышли из аккаунта', 'success');
            }
            
            // Перенаправляем на страницу входа
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        }, 1000);
    }
}
