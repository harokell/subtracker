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

// Billing cycles
export const BILLING_CYCLES = [
    { id: 'monthly', name: '月付', label: '/月', months: 1 },
    { id: 'quarterly', name: '季付', label: '/季', months: 3 },
    { id: 'yearly', name: '年付', label: '/年', months: 12 },
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
        billingCycle: sub.billingCycle || 'monthly',
        nextBillingDate: sub.nextBillingDate || sub.firstBillingDate || new Date().toISOString().split('T')[0],
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

export function getBillingCycleById(id) {
    return BILLING_CYCLES.find((c) => c.id === id) || BILLING_CYCLES[0];
}

// Get monthly equivalent amount
export function getMonthlyAmount(sub) {
    const cycle = getBillingCycleById(sub.billingCycle);
    return sub.amount / cycle.months;
}

// Calculate next billing date from nextBillingDate and cycle
export function getNextBillingDate(sub) {
    const cycle = getBillingCycleById(sub.billingCycle);
    // Prefer nextBillingDate, fallback to old firstBillingDate or startDate for backwards compat
    const baseDateStr = sub.nextBillingDate || sub.firstBillingDate || sub.startDate || new Date().toISOString().split('T')[0];
    const baseDate = new Date(baseDateStr);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let next = new Date(baseDate);
    next.setHours(0, 0, 0, 0);

    // If the configured next billing date string is already in the past, 
    // keep adding cycle months until we reach a date >= today
    while (next < today) {
        next.setMonth(next.getMonth() + cycle.months);
    }

    return next;
}

// Get days until next billing
export function getDaysUntilNextBilling(sub) {
    const next = getNextBillingDate(sub);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((next - today) / (1000 * 60 * 60 * 24));
    return diff;
}

// Calculate last billing date (one cycle before next billing)
export function getLastBillingDate(sub) {
    const cycle = getBillingCycleById(sub.billingCycle);
    const next = getNextBillingDate(sub);

    const last = new Date(next);
    last.setMonth(last.getMonth() - cycle.months);

    return last;
}

// Format date to readable string
export function formatBillingDate(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

// ===== LaTeX Export =====

function escapeLatex(str) {
    if (str === null || str === undefined) return '';
    // Strip emoji and other non-BMP characters first
    const stripped = String(str)
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .replace(/[\u2600-\u27BF]/g, '');
    // Escape all LaTeX special characters in a single pass to avoid ordering issues
    return stripped.replace(/[\\&%$#_{}~^]/g, (ch) => {
        switch (ch) {
            case '\\': return '\\textbackslash{}';
            case '&':  return '\\&';
            case '%':  return '\\%';
            case '$':  return '\\$';
            case '#':  return '\\#';
            case '_':  return '\\_';
            case '{':  return '\\{';
            case '}':  return '\\}';
            case '~':  return '\\textasciitilde{}';
            case '^':  return '\\textasciicircum{}';
            default:   return ch;
        }
    }).trim();
}

export async function exportLatex() {
    const subs = await getAllSubscriptions();
    const activeSubs = subs.filter((s) => s.active);
    const total = activeSubs.reduce((sum, s) => sum + getMonthlyAmount(s), 0);
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    const rows = subs
        .sort((a, b) => {
            if (a.active !== b.active) return b.active - a.active;
            return getMonthlyAmount(b) - getMonthlyAmount(a);
        })
        .map((s) => {
            const cat = getCategoryById(s.category);
            const cycle = getBillingCycleById(s.billingCycle);
            const monthly = getMonthlyAmount(s);
            const nextDate = getNextBillingDate(s);
            const nextStr = `${nextDate.getMonth() + 1}月${nextDate.getDate()}日`;
            const status = s.active ? '活跃' : '暂停';
            return `  ${escapeLatex(s.name)} & ${escapeLatex(cat.name)} & ${escapeLatex(cycle.name)} & \\yen${s.amount.toFixed(2)} & \\yen${monthly.toFixed(2)} & ${nextStr} & ${status} \\\\`;
        })
        .join('\n');

    return `% SubTracker 订阅支出报告
% 使用说明：在 Overleaf 中新建项目，上传此文件，编译器选择 XeLaTeX，点击编译即可生成 PDF。
\\documentclass[UTF8, a4paper]{ctexart}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{geometry}
\\usepackage{array}
\\usepackage{textcomp}
\\geometry{margin=2cm}

\\title{订阅支出报告}
\\date{${dateStr}}
\\author{SubTracker}

\\begin{document}
\\maketitle

\\section{概览}

\\begin{tabular}{ll}
\\toprule
项目 & 数值 \\\\
\\midrule
每月总支出   & \\yen${total.toFixed(2)} \\\\
活跃订阅数   & ${activeSubs.length} 项 \\\\
年度预估支出 & \\yen${(total * 12).toFixed(2)} \\\\
日均支出     & \\yen${(total / 30).toFixed(2)} \\\\
\\bottomrule
\\end{tabular}

\\section{订阅列表}

\\begin{longtable}{lllrrll}
\\toprule
名称 & 分类 & 周期 & 金额 & 月均 & 下次扣费 & 状态 \\\\
\\midrule
\\endfirsthead
\\multicolumn{7}{l}{\\small（续上页）} \\\\
\\toprule
名称 & 分类 & 周期 & 金额 & 月均 & 下次扣费 & 状态 \\\\
\\midrule
\\endhead
\\midrule
\\multicolumn{7}{r}{\\small（续下页）} \\\\
\\endfoot
\\bottomrule
\\endlastfoot
${rows}
\\end{longtable}

\\end{document}
`;
}

// ===== Backup & Restore =====

export async function exportData() {
    const subs = await getAllSubscriptions();
    const data = {
        app: 'SubTracker',
        version: DB_VERSION,
        exportDate: new Date().toISOString(),
        subscriptions: subs
    };
    return JSON.stringify(data, null, 2);
}

export async function importData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (!data || data.app !== 'SubTracker' || !Array.isArray(data.subscriptions)) {
            throw new Error('无效的备份文件');
        }

        const database = await openDB();

        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            // Clear existing data before import
            const clearReq = store.clear();

            clearReq.onsuccess = () => {
                let count = 0;
                if (data.subscriptions.length === 0) {
                    resolve(0);
                    return;
                }

                data.subscriptions.forEach(sub => {
                    const addReq = store.add(sub);
                    addReq.onsuccess = () => {
                        count++;
                        if (count === data.subscriptions.length) {
                            resolve(count);
                        }
                    };
                    addReq.onerror = () => {
                        reject(addReq.error);
                    };
                });
            };
            clearReq.onerror = () => reject(clearReq.error);
        });
    } catch (e) {
        throw new Error('解析备份文件失败，请确保选择了正确的 JSON 文件。');
    }
}
