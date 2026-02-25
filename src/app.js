// ===== SubTracker App Core =====
import {
    getAllSubscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    getCategoryById,
    CATEGORIES,
    EMOJI_OPTIONS,
} from './db.js';

let currentPage = 'dashboard';
let allSubs = [];
let activeFilter = 'all';
let editingId = null;

// ===== Helpers =====
function formatCurrency(amount) {
    return `¥${amount.toFixed(2)}`;
}

function getToday() {
    return new Date();
}

function getDaysUntilBilling(billingDay) {
    const today = getToday();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    if (billingDay === currentDay) return 0;
    if (billingDay > currentDay) return billingDay - currentDay;
    return daysInMonth - currentDay + billingDay;
}

function getUpcomingSubs(subs, limit = 5) {
    return subs
        .filter((s) => s.active)
        .map((s) => ({ ...s, daysUntil: getDaysUntilBilling(s.billingDay) }))
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, limit);
}

function getMonthlyTotal(subs) {
    return subs.filter((s) => s.active).reduce((sum, s) => sum + s.amount, 0);
}

function getCategorySummary(subs) {
    const activeSubs = subs.filter((s) => s.active);
    const total = getMonthlyTotal(activeSubs);
    const map = {};

    activeSubs.forEach((s) => {
        if (!map[s.category]) {
            map[s.category] = { amount: 0, count: 0 };
        }
        map[s.category].amount += s.amount;
        map[s.category].count++;
    });

    return Object.entries(map)
        .map(([catId, data]) => {
            const cat = getCategoryById(catId);
            return {
                ...cat,
                ...data,
                percentage: total > 0 ? (data.amount / total) * 100 : 0,
            };
        })
        .sort((a, b) => b.amount - a.amount);
}

function getFilteredSubs(subs) {
    const filtered =
        activeFilter === 'all'
            ? subs
            : subs.filter((s) => s.category === activeFilter);
    // Sort: active first, then by amount descending
    return filtered.sort((a, b) => {
        if (a.active !== b.active) return b.active - a.active;
        return b.amount - a.amount;
    });
}

// ===== Rendering =====
export function renderApp() {
    const app = document.getElementById('app');

    app.innerHTML = `
    <div class="bg-glow"></div>
    <div class="bg-glow bg-glow--secondary"></div>
    
    <div id="page-dashboard" class="page ${currentPage === 'dashboard' ? 'page--active' : ''}">
      ${renderDashboard()}
    </div>
    
    <div id="page-list" class="page ${currentPage === 'list' ? 'page--active' : ''}">
      ${renderListPage()}
    </div>

    <div id="page-stats" class="page ${currentPage === 'stats' ? 'page--active' : ''}">
      ${renderStatsPage()}
    </div>

    <button class="fab" id="btn-add" aria-label="添加订阅">+</button>

    <nav class="bottom-nav">
      <button class="nav-item ${currentPage === 'dashboard' ? 'nav-item--active' : ''}" data-page="dashboard">
        <span class="nav-item__icon">🏠</span>
        <span>首页</span>
      </button>
      <button class="nav-item ${currentPage === 'list' ? 'nav-item--active' : ''}" data-page="list">
        <span class="nav-item__icon">📋</span>
        <span>订阅</span>
      </button>
      <button class="nav-item ${currentPage === 'stats' ? 'nav-item--active' : ''}" data-page="stats">
        <span class="nav-item__icon">📊</span>
        <span>统计</span>
      </button>
    </nav>

    <div class="modal-overlay" id="modal-overlay"></div>
    <div class="modal-sheet" id="modal-sheet">
      <div class="modal-sheet__handle"></div>
      <div class="modal-sheet__header">
        <h2 class="modal-sheet__title" id="modal-title">添加订阅</h2>
        <button class="modal-sheet__close" id="modal-close">✕</button>
      </div>
      <div class="modal-sheet__body" id="modal-body"></div>
    </div>

    <div class="modal-overlay" id="confirm-overlay"></div>
    <div class="confirm-dialog" id="confirm-dialog">
      <h3 class="confirm-dialog__title" id="confirm-title"></h3>
      <p class="confirm-dialog__message" id="confirm-message"></p>
      <div class="confirm-dialog__actions">
        <button class="btn btn--ghost" id="confirm-cancel">取消</button>
        <button class="btn btn--danger" id="confirm-ok">删除</button>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  `;

    bindEvents();
}

function renderDashboard() {
    const activeSubs = allSubs.filter((s) => s.active);
    const total = getMonthlyTotal(allSubs);
    const upcoming = getUpcomingSubs(allSubs);
    const catSummary = getCategorySummary(allSubs);
    const today = getToday();
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

    return `
    <header class="header animate-fadeInUp">
      <p class="header__greeting">${monthNames[today.getMonth()]} · 月度固定支出</p>
      <h1 class="header__title">订阅管理</h1>
    </header>

    <div class="summary-card animate-fadeInUp delay-1">
      <p class="summary-card__label">每月总支出</p>
      <p class="summary-card__amount"><span>¥</span>${total.toFixed(2)}</p>
      <div class="summary-card__meta">
        <div class="summary-card__meta-item">
          <span class="summary-card__meta-label">活跃订阅</span>
          <span class="summary-card__meta-value">${activeSubs.length} 项</span>
        </div>
        <div class="summary-card__meta-item">
          <span class="summary-card__meta-label">年度预估</span>
          <span class="summary-card__meta-value">¥${(total * 12).toFixed(0)}</span>
        </div>
      </div>
    </div>

    <div class="quick-stats animate-fadeInUp delay-2">
      <div class="stat-card">
        <div class="stat-card__icon" style="background: var(--gradient-pink);">📅</div>
        <div class="stat-card__value">${upcoming.length > 0 ? upcoming[0].daysUntil + '天' : '-'}</div>
        <div class="stat-card__label">最近扣费</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background: var(--gradient-teal);">📂</div>
        <div class="stat-card__value">${catSummary.length}</div>
        <div class="stat-card__label">分类数量</div>
      </div>
    </div>

    ${upcoming.length > 0 ? `
    <div class="section animate-fadeInUp delay-3">
      <div class="section__header">
        <h2 class="section__title">即将扣费</h2>
      </div>
      <div class="upcoming-list">
        ${upcoming.map((s) => {
        const cat = getCategoryById(s.category);
        return `
            <div class="upcoming-card">
              <div class="upcoming-card__icon">${s.icon}</div>
              <div class="upcoming-card__name">${s.name}</div>
              <div class="upcoming-card__date">${s.daysUntil === 0 ? '今天' : s.daysUntil + '天后'} · ${s.billingDay}号</div>
              <div class="upcoming-card__amount">${formatCurrency(s.amount)}</div>
            </div>
          `;
    }).join('')}
      </div>
    </div>
    ` : ''}

    ${catSummary.length > 0 ? `
    <div class="section animate-fadeInUp delay-4">
      <div class="section__header">
        <h2 class="section__title">分类概览</h2>
      </div>
      <div class="category-summary">
        ${catSummary.map((c) => `
          <div class="category-row">
            <span class="category-row__label">${c.icon} ${c.name}</span>
            <div class="category-row__bar-bg">
              <div class="category-row__bar" style="width: ${c.percentage}%; background: ${c.gradient};"></div>
            </div>
            <span class="category-row__amount">${formatCurrency(c.amount)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${allSubs.length === 0 ? `
    <div class="empty-state animate-fadeInUp delay-2">
      <div class="empty-state__icon">📝</div>
      <h3 class="empty-state__title">还没有订阅</h3>
      <p class="empty-state__desc">点击右下角的 + 按钮添加你的第一个订阅</p>
    </div>
    ` : ''}
  `;
}

function renderListPage() {
    const filtered = getFilteredSubs(allSubs);

    return `
    <header class="header animate-fadeInUp">
      <h1 class="header__title">全部订阅</h1>
      <p class="header__greeting">共 ${allSubs.length} 项 · 活跃 ${allSubs.filter(s => s.active).length} 项</p>
    </header>

    <div class="category-filter animate-fadeInUp delay-1">
      <button class="category-chip ${activeFilter === 'all' ? 'category-chip--active' : ''}" data-filter="all">
        全部
      </button>
      ${CATEGORIES.map((c) => `
        <button class="category-chip ${activeFilter === c.id ? 'category-chip--active' : ''}" data-filter="${c.id}">
          ${c.icon} ${c.name}
        </button>
      `).join('')}
    </div>

    <div class="section">
      ${filtered.length > 0 ? `
      <div class="sub-list">
        ${filtered.map((s, i) => {
        const cat = getCategoryById(s.category);
        return `
            <div class="sub-item ${!s.active ? 'sub-item--inactive' : ''} animate-fadeInUp delay-${Math.min(i + 1, 6)}" data-id="${s.id}">
              <div class="sub-item__icon" style="background: ${cat.gradient};">${s.icon}</div>
              <div class="sub-item__info">
                <div class="sub-item__name">${s.name}</div>
                <div class="sub-item__detail">${cat.icon} ${cat.name} · 每月${s.billingDay}号${!s.active ? ' · 已暂停' : ''}</div>
              </div>
              <div class="sub-item__amount">
                ${formatCurrency(s.amount)}
                <div class="sub-item__amount-period">/月</div>
              </div>
            </div>
          `;
    }).join('')}
      </div>
      ` : `
      <div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <h3 class="empty-state__title">没有找到订阅</h3>
        <p class="empty-state__desc">当前分类下没有订阅项目</p>
      </div>
      `}
    </div>
  `;
}

function renderStatsPage() {
    const activeSubs = allSubs.filter((s) => s.active);
    const total = getMonthlyTotal(allSubs);
    const catSummary = getCategorySummary(allSubs);
    const daily = total / 30;

    return `
    <header class="header animate-fadeInUp">
      <h1 class="header__title">支出统计</h1>
      <p class="header__greeting">数据总览</p>
    </header>

    <div class="quick-stats animate-fadeInUp delay-1" style="grid-template-columns: 1fr 1fr 1fr;">
      <div class="stat-card">
        <div class="stat-card__icon" style="background: var(--gradient-purple);">💰</div>
        <div class="stat-card__value">${formatCurrency(total)}</div>
        <div class="stat-card__label">月支出</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background: var(--gradient-pink);">📆</div>
        <div class="stat-card__value">${formatCurrency(daily)}</div>
        <div class="stat-card__label">日均</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background: var(--gradient-teal);">📅</div>
        <div class="stat-card__value">¥${(total * 12).toFixed(0)}</div>
        <div class="stat-card__label">年支出</div>
      </div>
    </div>

    ${catSummary.length > 0 ? `
    <div class="section animate-fadeInUp delay-2">
      <div class="section__header">
        <h2 class="section__title">分类明细</h2>
      </div>
      <div class="sub-list">
        ${catSummary.map((c, i) => `
          <div class="sub-item animate-fadeInUp delay-${Math.min(i + 1, 6)}">
            <div class="sub-item__icon" style="background: ${c.gradient};">${c.icon}</div>
            <div class="sub-item__info">
              <div class="sub-item__name">${c.name}</div>
              <div class="sub-item__detail">${c.count} 项订阅 · ${c.percentage.toFixed(1)}%</div>
            </div>
            <div class="sub-item__amount">
              ${formatCurrency(c.amount)}
              <div class="sub-item__amount-period">/月</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : `
    <div class="empty-state animate-fadeInUp delay-2">
      <div class="empty-state__icon">📊</div>
      <h3 class="empty-state__title">暂无数据</h3>
      <p class="empty-state__desc">添加订阅后即可查看统计数据</p>
    </div>
    `}

    ${activeSubs.length > 0 ? `
    <div class="section animate-fadeInUp delay-3">
      <div class="section__header">
        <h2 class="section__title">支出排行</h2>
      </div>
      <div class="category-summary">
        ${activeSubs
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 8)
                .map((s) => `
            <div class="category-row">
              <span class="category-row__label">${s.icon} ${s.name}</span>
              <div class="category-row__bar-bg">
                <div class="category-row__bar" style="width: ${total > 0 ? (s.amount / total * 100) : 0}%; background: ${getCategoryById(s.category).gradient};"></div>
              </div>
              <span class="category-row__amount">${formatCurrency(s.amount)}</span>
            </div>
          `).join('')}
      </div>
    </div>
    ` : ''}
  `;
}

function renderFormModal(sub = null) {
    editingId = sub ? sub.id : null;
    const isEdit = !!sub;
    const selectedIcon = sub ? sub.icon : '📦';

    document.getElementById('modal-title').textContent = isEdit ? '编辑订阅' : '添加订阅';

    document.getElementById('modal-body').innerHTML = `
    <form id="sub-form">
      <div class="form-group">
        <label class="form-label">图标</label>
        <div class="emoji-picker" id="emoji-picker">
          ${EMOJI_OPTIONS.map((e) => `
            <button type="button" class="emoji-option ${e === selectedIcon ? 'emoji-option--selected' : ''}" data-emoji="${e}">${e}</button>
          `).join('')}
        </div>
        <input type="hidden" id="form-icon" value="${selectedIcon}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="form-name">订阅名称</label>
        <input class="form-input" type="text" id="form-name" placeholder="例如: Netflix, iCloud" value="${sub ? sub.name : ''}" required />
      </div>

      <div class="form-group">
        <label class="form-label" for="form-amount">每月金额 (¥)</label>
        <input class="form-input" type="number" id="form-amount" placeholder="0.00" step="0.01" min="0" value="${sub ? sub.amount : ''}" required />
      </div>

      <div class="form-group">
        <label class="form-label" for="form-category">分类</label>
        <select class="form-input" id="form-category">
          ${CATEGORIES.map((c) => `
            <option value="${c.id}" ${sub && sub.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="form-billingday">每月扣费日</label>
        <select class="form-input" id="form-billingday">
          ${Array.from({ length: 31 }, (_, i) => i + 1).map((d) => `
            <option value="${d}" ${sub && sub.billingDay === d ? 'selected' : ''}>${d} 号</option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="form-notes">备注 (可选)</label>
        <input class="form-input" type="text" id="form-notes" placeholder="备注信息" value="${sub ? (sub.notes || '') : ''}" />
      </div>

      ${isEdit ? `
      <div class="form-group">
        <label class="form-label">状态</label>
        <button type="button" class="btn btn--ghost" id="btn-toggle-active" style="justify-content: flex-start;">
          ${sub.active ? '🟢 活跃 — 点击暂停' : '⏸️ 已暂停 — 点击启用'}
        </button>
      </div>
      ` : ''}

      <button type="submit" class="btn btn--primary" style="margin-top: var(--space-md);">
        ${isEdit ? '保存修改' : '添加订阅'}
      </button>

      ${isEdit ? `
        <button type="button" class="btn btn--danger" id="btn-delete" style="margin-top: var(--space-sm);">
          删除订阅
        </button>
      ` : ''}
    </form>
  `;

    // Emoji picker events
    document.querySelectorAll('#emoji-picker .emoji-option').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#emoji-picker .emoji-option').forEach((b) => b.classList.remove('emoji-option--selected'));
            btn.classList.add('emoji-option--selected');
            document.getElementById('form-icon').value = btn.dataset.emoji;
        });
    });

    // Form submit
    document.getElementById('sub-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('form-name').value.trim(),
            amount: document.getElementById('form-amount').value,
            category: document.getElementById('form-category').value,
            icon: document.getElementById('form-icon').value,
            billingDay: document.getElementById('form-billingday').value,
            notes: document.getElementById('form-notes').value.trim(),
        };

        if (!data.name || !data.amount) return;

        try {
            if (isEdit) {
                await updateSubscription(editingId, data);
                showToast('订阅已更新 ✅');
            } else {
                await addSubscription(data);
                showToast('订阅已添加 🎉');
            }
            closeModal();
            await refreshData();
        } catch (err) {
            console.error(err);
            showToast('操作失败，请重试');
        }
    });

    // Toggle active
    if (isEdit) {
        const toggleBtn = document.getElementById('btn-toggle-active');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', async () => {
                await updateSubscription(sub.id, { active: !sub.active });
                showToast(sub.active ? '已暂停 ⏸️' : '已启用 🟢');
                closeModal();
                await refreshData();
            });
        }

        const deleteBtn = document.getElementById('btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                showConfirm(
                    '删除订阅',
                    `确定删除「${sub.name}」吗？此操作无法撤销。`,
                    async () => {
                        await deleteSubscription(sub.id);
                        showToast('已删除 🗑️');
                        closeModal();
                        await refreshData();
                    }
                );
            });
        }
    }

    openModal();
}

// ===== Modal =====
function openModal() {
    document.getElementById('modal-overlay').classList.add('modal-overlay--active');
    document.getElementById('modal-sheet').classList.add('modal-sheet--active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('modal-overlay--active');
    document.getElementById('modal-sheet').classList.remove('modal-sheet--active');
    document.body.style.overflow = '';
    editingId = null;
}

// ===== Confirm Dialog =====
let confirmCallback = null;

function showConfirm(title, message, callback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-overlay').classList.add('modal-overlay--active');
    document.getElementById('confirm-dialog').classList.add('confirm-dialog--active');
    confirmCallback = callback;
}

function closeConfirm() {
    document.getElementById('confirm-overlay').classList.remove('modal-overlay--active');
    document.getElementById('confirm-dialog').classList.remove('confirm-dialog--active');
    confirmCallback = null;
}

// ===== Toast =====
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('toast--visible');
    setTimeout(() => toast.classList.remove('toast--visible'), 2500);
}

// ===== Events =====
function bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach((btn) => {
        btn.addEventListener('click', () => {
            currentPage = btn.dataset.page;
            renderApp();
        });
    });

    // FAB
    document.getElementById('btn-add').addEventListener('click', () => {
        renderFormModal();
    });

    // Modal close
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', closeModal);

    // Confirm dialog
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
    document.getElementById('confirm-ok').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    });
    document.getElementById('confirm-overlay').addEventListener('click', closeConfirm);

    // Sub items click -> edit
    document.querySelectorAll('.sub-item[data-id]').forEach((item) => {
        item.addEventListener('click', () => {
            const sub = allSubs.find((s) => s.id === item.dataset.id);
            if (sub) renderFormModal(sub);
        });
    });

    // Category filter
    document.querySelectorAll('.category-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            activeFilter = chip.dataset.filter;
            renderApp();
        });
    });
}

// ===== Data =====
async function refreshData() {
    allSubs = await getAllSubscriptions();
    renderApp();
}

export async function initApp() {
    await refreshData();
}
