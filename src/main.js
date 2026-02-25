// ===== SubTracker — Main Entry =====
import './style.css';
import { initApp } from './app.js';

// Initialize app
initApp().catch(console.error);

// ===== Request Persistent Storage =====
async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const granted = await navigator.storage.persist();
        if (granted) {
            console.log('✅ 持久化存储已获批准，数据不会被自动清除');
        } else {
            console.log('⚠️ 持久化存储未获批准');
        }
    }
}
requestPersistentStorage();

// ===== PWA Update Prompt =====
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
    onNeedRefresh() {
        // Show update banner
        showUpdateBanner();
    },
    onOfflineReady() {
        console.log('📱 App 已准备好离线使用');
    },
});

function showUpdateBanner() {
    // Remove existing banner if any
    const existing = document.getElementById('update-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
    <div class="update-banner">
      <span class="update-banner__text">🆕 有新版本可用</span>
      <button class="update-banner__btn" id="update-btn">立即更新</button>
      <button class="update-banner__close" id="update-dismiss">✕</button>
    </div>
  `;
    document.body.appendChild(banner);

    document.getElementById('update-btn').addEventListener('click', () => {
        updateSW(true); // Skip waiting and activate new SW
    });

    document.getElementById('update-dismiss').addEventListener('click', () => {
        banner.remove();
    });
}
