// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
        
        // Проверяем обновления service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Новый service worker установлен, можно показать уведомление об обновлении
              console.log('New service worker installed. Refresh to update.');
              
              // Показываем уведомление пользователю о доступном обновлении
              if (confirm('Доступно обновление приложения. Обновить сейчас?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Глобальные переменные
let deferredPrompt;
let installButton = null;

// Функция для проверки статуса установки PWA
function checkPWAInstallStatus() {
  // Проверяем, не установлено ли уже приложение
  if (isPWAInstalled()) {
    console.log('PWA is already installed');
    return;
  }
  
  // Проверяем, не отклонил ли пользователь установку ранее
  if (localStorage.getItem('pwa-install-dismissed') === 'true') {
    console.log('User previously dismissed PWA install');
    return;
  }
  
  window.addEventListener('beforeinstallprompt', (e) => {
    // Предотвращаем автоматическое показ prompt
    e.preventDefault();
    // Сохраняем событие для использования позже
    deferredPrompt = e;
    
    // Показываем кнопку установки с задержкой
    setTimeout(() => {
      showInstallButton();
    }, 2000); // Показываем через 2 секунды после загрузки
  });
  
  // Проверяем, установлено ли уже приложение
  window.addEventListener('appinstalled', (evt) => {
    console.log('PWA installed successfully');
    localStorage.setItem('pwa-installed', 'true');
    hideInstallButton();
    
    // Уведомляем другие части приложения об установке
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
  
  // Проверяем, запущено ли приложение в standalone режиме
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true) {
    console.log('PWA is running in standalone mode');
    localStorage.setItem('pwa-installed', 'true');
    return;
  }
}

// Функция для проверки, установлено ли PWA
function isPWAInstalled() {
  return localStorage.getItem('pwa-installed') === 'true' ||
         window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Функция для показа кнопки установки
function showInstallButton() {
  // Проверяем, не установлено ли уже приложение
  if (isPWAInstalled()) {
    return;
  }
  
  // Проверяем, не отклонил ли пользователь установку
  if (localStorage.getItem('pwa-install-dismissed') === 'true') {
    return;
  }
  
  // Создаем кнопку установки, если её нет
  if (!document.getElementById('pwa-install-btn')) {
    installButton = document.createElement('div');
    installButton.id = 'pwa-install-btn';
    installButton.innerHTML = `
      <div class="pwa-install-content">
        <div class="pwa-install-icon">📱</div>
        <div class="pwa-install-text">
          <div class="pwa-install-title">Установить SellBit</div>
          <div class="pwa-install-subtitle">Быстрый доступ к криптобирже</div>
        </div>
        <button class="pwa-install-button">Установить</button>
        <button class="pwa-install-close">✕</button>
      </div>
    `;
    
    // Добавляем стили
    installButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #0066CC 0%, #004499 100%);
      color: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 102, 204, 0.3);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 320px;
      width: calc(100vw - 40px);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      overflow: hidden;
    `;
    
    // Добавляем стили для внутренних элементов
    const style = document.createElement('style');
    style.textContent = `
      .pwa-install-content {
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 12px;
      }
      
      .pwa-install-icon {
        font-size: 24px;
        flex-shrink: 0;
      }
      
      .pwa-install-text {
        flex: 1;
        min-width: 0;
      }
      
      .pwa-install-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 2px;
      }
      
      .pwa-install-subtitle {
        font-size: 12px;
        opacity: 0.8;
        line-height: 1.3;
      }
      
      .pwa-install-button {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .pwa-install-button:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }
      
      .pwa-install-close {
        background: none;
        color: rgba(255, 255, 255, 0.7);
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .pwa-install-close:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }
      
      @media (max-width: 480px) {
        #pwa-install-btn {
          top: 10px;
          right: 10px;
          left: 10px;
          width: auto;
        }
        
        .pwa-install-content {
          padding: 12px;
          gap: 8px;
        }
        
        .pwa-install-title {
          font-size: 13px;
        }
        
        .pwa-install-subtitle {
          font-size: 11px;
        }
        
        .pwa-install-button {
          padding: 6px 12px;
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Добавляем обработчики событий
    const installBtn = installButton.querySelector('.pwa-install-button');
    const closeBtn = installButton.querySelector('.pwa-install-close');
    
    installBtn.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            localStorage.setItem('pwa-installed', 'true');
          } else {
            console.log('User dismissed the install prompt');
            localStorage.setItem('pwa-install-dismissed', 'true');
          }
          deferredPrompt = null;
          hideInstallButton();
        });
      }
    });
    
    closeBtn.addEventListener('click', () => {
      localStorage.setItem('pwa-install-dismissed', 'true');
      hideInstallButton();
    });
    
    document.body.appendChild(installButton);
    
    // Анимация появления
    setTimeout(() => {
      installButton.style.transform = 'translateX(0)';
    }, 100);
  }
}

// Функция для скрытия кнопки установки
function hideInstallButton() {
  if (installButton) {
    installButton.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (installButton && installButton.parentNode) {
        installButton.remove();
        installButton = null;
      }
    }, 300);
  }
  
  // Скрываем кнопку в header
  hideHeaderInstallButton();
}

// Функция для скрытия кнопки установки в header
function hideHeaderInstallButton() {
  const headerBtn = document.getElementById('pwaInstallHeaderBtn');
  if (headerBtn) {
    headerBtn.style.display = 'none';
  }
}

// Функция для показа кнопки установки в header
function showHeaderInstallButton() {
  const headerBtn = document.getElementById('pwaInstallHeaderBtn');
  if (headerBtn && !isPWAInstalled()) {
    headerBtn.style.display = 'flex';
  }
}

// Функция для сброса состояния установки (для тестирования)
function resetPWAInstallState() {
  localStorage.removeItem('pwa-installed');
  localStorage.removeItem('pwa-install-dismissed');
  console.log('PWA install state reset');
}

// Инициализация PWA функциональности
document.addEventListener('DOMContentLoaded', () => {
  checkPWAInstallStatus();
});

// Экспорт функций для использования в других скриптах
window.PWA = {
  showInstallButton,
  hideInstallButton,
  checkPWAInstallStatus,
  isPWAInstalled,
  resetPWAInstallState,
  showHeaderInstallButton,
  hideHeaderInstallButton
};
