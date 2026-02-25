// ===== IndexedDB Database Module =====

const DB_NAME = 'subtracker';
const DB_VERSION = 1;
const STORE_NAME = 'subscriptions';

// Predefined categories
export const CATEGORIES = [
    { id: 'entertainment', name: '娱乐', icon: '🎬', gradient: 'var(--gradient-pink)' },
    { id: 'tools', name: '工具', icon: '🛠️', gradient: 'var(--gradient-blue)' },
    { id: 'living', name: '生活', icon: '🏠', gradient: 'var(--gradient-teal)' },
    { id: 'telecom', name: '通讯', icon: '📱', gradient: 'var(--gradient-amber)' },
    { id: 'fitness', name: '健身', icon: '💪', gradient: 'var(--gradient-green)' },
    { id: 'education', name: '教育', icon: '📚', gradient: 'var(--gradient-purple)' },
    { id: 'other', name: '其他', icon: '📦', gradient: 'var(--gradient-blue)' },
];

// Common emoji icons for quick picking
export const EMOJI_OPTIONS = [
    '🎬', '🎵', '🎮', '📺', '☁️', '💻',
    '🛠️', '📱', '🏠', '💡', '🚗', '🍕',
    '💪', '📚', '🎓', '📦', '💳', '🛡️',
    '🩺', '✈️', '🧹', '👔', '🐶', '🌐',
];

let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('active', 'active', { unique: false });
                store.createIndex('billingDay', 'billingDay', { unique: false });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        request.onerror = (e) => {
            reject(e.target.error);
        };
    });
}

export async function getAllSubscriptions() {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function addSubscription(sub) {
    const database = await openDB();
    const item = {
        id: crypto.randomUUID(),
        name: sub.name,
        amount: parseFloat(sub.amount),
        category: sub.category || 'other',
        icon: sub.icon || '📦',
        billingDay: parseInt(sub.billingDay) || 1,
        startDate: sub.startDate || new Date().toISOString().split('T')[0],
        notes: sub.notes || '',
        active: sub.active !== undefined ? sub.active : true,
        createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.add(item);
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
    });
}

export async function updateSubscription(id, updates) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const existing = getReq.result;
            if (!existing) return reject(new Error('Not found'));
            const updated = { ...existing, ...updates, updatedAt: Date.now() };
            if (updates.amount !== undefined) updated.amount = parseFloat(updates.amount);
            if (updates.billingDay !== undefined) updated.billingDay = parseInt(updates.billingDay);
            const putReq = store.put(updated);
            putReq.onsuccess = () => resolve(updated);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

export async function deleteSubscription(id) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export function getCategoryById(id) {
    return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
