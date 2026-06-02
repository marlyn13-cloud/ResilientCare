// ResilientCare PWA Installation & Engagement Manager

class PWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = null;
    this.installPrompt = null;
    this.init();
  }

  init() {
    // Register service worker
    this.registerServiceWorker();

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => this.handleBeforeInstallPrompt(e));

    // Listen for app installed event
    window.addEventListener('appinstalled', (e) => this.handleAppInstalled(e));

    // Set up install button if it exists
    this.setupInstallButton();

    // Check if app is installed
    this.checkIfInstalled();

    // Set up periodic tasks
    this.setupPeriodicTasks();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./service-worker.js', {
          scope: '/ResilientCare/'
        })
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }
  }

  handleBeforeInstallPrompt(event) {
    console.log('[PWA] Install prompt triggered');
    event.preventDefault();
    this.deferredPrompt = event;

    // Show install button if it exists
    if (this.installButton) {
      this.installButton.style.display = 'block';
    }

    // Show custom install prompt
    this.showCustomInstallPrompt();
  }

  handleAppInstalled() {
    console.log('[PWA] App installed successfully');
    this.deferredPrompt = null;

    // Hide install button
    if (this.installButton) {
      this.installButton.style.display = 'none';
    }

    // Hide custom prompt
    if (this.installPrompt) {
      this.installPrompt.style.display = 'none';
    }

    // Show success message
    this.showNotification('ResilientCare installed! You can now use it offline.');
  }

  setupInstallButton() {
    const button = document.getElementById('pwa-install-btn');
    if (button) {
      this.installButton = button;
      button.addEventListener('click', () => this.promptInstall());
      button.style.display = 'none'; // Hidden by default
    }
  }

  promptInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted install prompt');
        } else {
          console.log('[PWA] User dismissed install prompt');
        }
        this.deferredPrompt = null;
      });
    }
  }

  showCustomInstallPrompt() {
    // Create custom install prompt if it doesn't exist
    if (!this.installPrompt) {
      this.installPrompt = document.createElement('div');
      this.installPrompt.id = 'pwa-install-prompt';
      this.installPrompt.innerHTML = `
        <div class="pwa-prompt-content">
          <div class="pwa-prompt-header">
            <h3>Install ResilientCare</h3>
            <button class="pwa-prompt-close" onclick="document.getElementById('pwa-install-prompt').style.display='none'">✕</button>
          </div>
          <p>Get ResilientCare on your home screen for quick access, even offline!</p>
          <div class="pwa-prompt-actions">
            <button class="pwa-btn-install" onclick="pwaManager.promptInstall()">Install Now</button>
            <button class="pwa-btn-dismiss" onclick="document.getElementById('pwa-install-prompt').style.display='none'">Maybe Later</button>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.innerHTML = `
        #pwa-install-prompt {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          padding: 16px;
          max-width: 320px;
          z-index: 9999;
          font-family: 'Outfit', sans-serif;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .pwa-prompt-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pwa-prompt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .pwa-prompt-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .pwa-prompt-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #999;
          padding: 0;
        }

        .pwa-prompt-close:hover {
          color: #333;
        }

        #pwa-install-prompt p {
          margin: 0;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        }

        .pwa-prompt-actions {
          display: flex;
          gap: 8px;
        }

        .pwa-btn-install,
        .pwa-btn-dismiss {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pwa-btn-install {
          background: #4a90e2;
          color: white;
        }

        .pwa-btn-install:hover {
          background: #357abd;
          transform: translateY(-2px);
        }

        .pwa-btn-dismiss {
          background: #f0f0f0;
          color: #333;
        }

        .pwa-btn-dismiss:hover {
          background: #e0e0e0;
        }

        @media (max-width: 640px) {
          #pwa-install-prompt {
            left: 10px;
            right: 10px;
            max-width: none;
          }
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(this.installPrompt);
    }
  }

  checkIfInstalled() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA] App is running in standalone mode');
      document.body.classList.add('app-installed');
    }

    // Check if running on a PWA
    if (navigator.standalone === true) {
      console.log('[PWA] App is running on iOS PWA');
      document.body.classList.add('app-installed');
    }
  }

  setupPeriodicTasks() {
    if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // Register periodic check-in reminders (24 hours)
        registration.periodicSync
          .register('check-in-reminder', { minInterval: 24 * 60 * 60 * 1000 })
          .then(() => console.log('[PWA] Periodic sync registered'))
          .catch((error) => console.log('[PWA] Periodic sync not supported:', error));
      });
    }
  }

  showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ResilientCare', {
        body: message,
        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect fill=%22%234a90e2%22 width=%22192%22 height=%22192%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%22100%22 font-weight=%22bold%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22central%22>RC</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect fill=%22%234a90e2%22 width=%22192%22 height=%22192%22/></svg>'
      });
    }
  }

  // Request notification permission
  static requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('[PWA] Notification permission:', permission);
      });
    }
  }

  // Update available handler
  handleUpdateAvailable() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available');
              this.showNotification('ResilientCare has been updated. Refresh to get the latest version.');
            }
          });
        });
      });
    }
  }
}

// Initialize PWA manager
const pwaManager = new PWAInstallManager();

// Request notification permission on page load (optional)
window.addEventListener('load', () => {
  PWAInstallManager.requestNotificationPermission();
  pwaManager.handleUpdateAvailable();
});
