import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    base: '/subtracker/',
    plugins: [
        VitePWA({
            registerType: 'prompt',
            includeAssets: ['favicon.svg'],
            manifest: {
                name: '订阅记账 - SubTracker',
                short_name: 'SubTracker',
                description: '管理你的月度固定支出和订阅',
                theme_color: '#0f0a1e',
                background_color: '#0f0a1e',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/subtracker/',
                start_url: '/subtracker/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
            }
        })
    ]
});
