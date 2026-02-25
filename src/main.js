// ===== SubTracker — Main Entry =====
import './style.css';
import { initApp } from './app.js';

// Initialize app
initApp().catch(console.error);

// Register service worker (handled by vite-plugin-pwa)
