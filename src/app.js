// ===== SubTracker App Core =====
import {
  getAllSubscriptions,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  getCategoryById,
  getBillingCycleById,
  getMonthlyAmount,
  getNextBillingDate,
  getDaysUntilNextBilling,
  getLastBillingDate,
  formatBillingDate,
  CATEGORIES,
  BILLING_CYCLES,
  EMOJI_OPTIONS,
  exportData,
  importData,
} from './db.js';
import { APP_VERSION, getUnseenChanges, setSeenVersion } from './version.js';

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

function getUpcomingSubs(subs, limit = 5) {
  return subs
    .filter((s) => s.active)
    .map((s) => ({ ...s, daysUntil: getDaysUntilNextBilling(s), nextDate: getNextBillingDate(s) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit);
}

function getMonthlyTotal(subs) {
  return subs.filter((s) => s.active).reduce((sum, s) => sum + getMonthlyAmount(s), 0);
}

function getCategorySummary(subs) {
  const activeSubs = subs.filter((s) => s.active);
  const total = getMonthlyTotal(activeSubs);
  const map = {};

  activeSubs.forEach((s) => {
    if (!map[s.category]) {
      map[s.category] = { amount: 0, count: 0 };
    }
    map[s.category].amount += getMonthlyAmount(s);
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
    return getMonthlyAmount(b) - getMonthlyAmount(a);
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

    <div class="modal-overlay" id="whatsnew-overlay"></div>
    <div class="whatsnew-dialog" id="whatsnew-dialog">
      <div class="whatsnew-dialog__content" id="whatsnew-content"></div>
    </div>
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
    const cycle = getBillingCycleById(s.billingCycle);
    return `
            <div class="upcoming-card">
              <div class="upcoming-card__icon">${s.icon}</div>
              <div class="upcoming-card__name">${s.name}</div>
              <div class="upcoming-card__date">${s.daysUntil === 0 ? '今天' : s.daysUntil + '天后'} · ${formatBillingDate(s.nextDate)}</div>
              <div class="upcoming-card__amount">${formatCurrency(s.amount)}<span style="font-size:0.7rem;color:rgba(168,85,247,0.7);">${cycle.label}</span></div>
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
    const cycle = getBillingCycleById(s.billingCycle);
    const monthlyAmt = getMonthlyAmount(s);
    const nextDate = getNextBillingDate(s);
    const lastDate = getLastBillingDate(s);
    const daysUntil = getDaysUntilNextBilling(s);
    return `
            <div class="sub-item ${!s.active ? 'sub-item--inactive' : ''} animate-fadeInUp delay-${Math.min(i + 1, 6)}" data-id="${s.id}">
              <div class="sub-item__icon" style="background: ${cat.gradient};">${s.icon}</div>
              <div class="sub-item__info">
                <div class="sub-item__name">${s.name}</div>
                <div class="sub-item__detail">${cat.icon} ${cat.name} · ${cycle.name}${!s.active ? ' · 已暂停' : ''}</div>
                <div class="sub-item__detail" style="margin-top:2px;font-size:0.7rem;">${lastDate ? '上次 ' + formatBillingDate(lastDate) + ' → ' : ''}下次 ${formatBillingDate(nextDate)}（${daysUntil === 0 ? '今天' : daysUntil + '天后'}）</div>
              </div>
              <div class="sub-item__amount">
                ${formatCurrency(s.amount)}
                <div class="sub-item__amount-period">${cycle.label}${cycle.id !== 'monthly' ? ' (≈' + formatCurrency(monthlyAmt) + '/月)' : ''}</div>
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
        .sort((a, b) => getMonthlyAmount(b) - getMonthlyAmount(a))
        .slice(0, 8)
        .map((s) => {
          const mAmt = getMonthlyAmount(s);
          return `
            <div class="category-row">
              <span class="category-row__label">${s.icon} ${s.name}</span>
              <div class="category-row__bar-bg">
                <div class="category-row__bar" style="width: ${total > 0 ? (mAmt / total * 100) : 0}%; background: ${getCategoryById(s.category).gradient};"></div>
              </div>
              <span class="category-row__amount">${formatCurrency(mAmt)}/月</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <div class="section animate-fadeInUp delay-4">
      <div class="section__header">
        <h2 class="section__title" style="color:var(--text-secondary);font-size:var(--font-base);">数据安全</h2>
      </div>
      <div style="display:flex;gap:var(--space-sm);">
        <button class="btn btn--ghost" id="btn-export" style="flex:1;font-size:0.85rem;padding:var(--space-sm);">
          💾 导出备份
        </button>
        <button class="btn btn--ghost" id="btn-import" style="flex:1;font-size:0.85rem;padding:var(--space-sm);">
          📂 恢复备份
        </button>
      </div>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:var(--space-sm);text-align:center;">
        定期导出备份以防数据丢失。恢复备份将覆盖现有数据。
      </p>
      <input type="file" id="import-file" accept=".json" style="display:none;" />
    </div>
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
        <label class="form-label" for="form-cycle">扣费周期</label>
        <select class="form-input" id="form-cycle">
          ${BILLING_CYCLES.map((c) => `
            <option value="${c.id}" ${sub && sub.billingCycle === c.id ? 'selected' : ''}>${c.name}（${c.id === 'monthly' ? '每月扣费' : c.id === 'quarterly' ? '每3个月扣费' : '每年扣费'}）</option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="form-amount" id="form-amount-label">金额 (¥)</label>
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
        <label class="form-label" for="form-billingdate">下次扣费日期</label>
        <input class="form-input" type="date" id="form-billingdate" value="${sub ? (sub.nextBillingDate || sub.firstBillingDate || sub.startDate || '') : new Date().toISOString().split('T')[0]}" required />
        <div style="font-size:0.75rem;color:rgba(168,85,247,0.6);margin-top:4px;">选择下一次扣费的日期，系统将据此推算未来的扣费时间</div>
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

  // Billing cycle change -> update amount label
  const cycleSelect = document.getElementById('form-cycle');
  const amountLabel = document.getElementById('form-amount-label');
  function updateAmountLabel() {
    const cycleId = cycleSelect.value;
    const labels = { monthly: '每月金额 (¥)', quarterly: '每季金额 (¥)', yearly: '每年金额 (¥)' };
    amountLabel.textContent = labels[cycleId] || '金额 (¥)';
  }
  cycleSelect.addEventListener('change', updateAmountLabel);
  updateAmountLabel();

  // Form submit
  document.getElementById('sub-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('form-name').value.trim(),
      amount: document.getElementById('form-amount').value,
      billingCycle: document.getElementById('form-cycle').value,
      category: document.getElementById('form-category').value,
      icon: document.getElementById('form-icon').value,
      nextBillingDate: document.getElementById('form-billingdate').value,
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

  // Backup / Restore
  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      try {
        const jsonStr = await exportData();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `subtracker-backup-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('备份已保存 💾');
      } catch (err) {
        console.error(err);
        showToast('导出失败');
      }
    });
  }

  const btnImport = document.getElementById('btn-import');
  const fileInput = document.getElementById('import-file');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      showConfirm(
        '恢复备份',
        '恢复将覆盖当前所有订阅数据。确定要导入这些数据吗？',
        () => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const count = await importData(ev.target.result);
              showToast(`成功恢复 ${count} 条记录 📂`);
              await refreshData();
            } catch (err) {
              console.error(err);
              alert(err.message || '导入失败，请检查文件格式是否正确');
            }
          };
          reader.readAsText(file);
        }
      );
      // Reset input so the same file can be selected again
      e.target.value = '';
    });
  }
}

// ===== Data =====
async function refreshData() {
  allSubs = await getAllSubscriptions();
  renderApp();
}

export async function initApp() {
  await refreshData();
  checkWhatsNew();
}

// ===== What's New =====
function checkWhatsNew() {
  const unseen = getUnseenChanges();
  if (unseen.length === 0) return;
  showWhatsNew(unseen);
}

function showWhatsNew(entries) {
  const content = document.getElementById('whatsnew-content');
  content.innerHTML = `
    <div style="text-align:center;font-size:2rem;margin-bottom:8px;">🆕</div>
    <h2 style="text-align:center;font-size:1.2rem;margin-bottom:16px;">有新功能啦！</h2>
    ${entries.map((entry) => `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:1rem;font-weight:600;">${entry.title}</span>
          <span style="font-size:0.7rem;color:rgba(168,85,247,0.6);background:rgba(168,85,247,0.1);padding:2px 8px;border-radius:12px;">v${entry.version}</span>
        </div>
        <ul style="list-style:none;padding:0;margin:0;">
          ${entry.changes.map((c) => `
            <li style="font-size:0.85rem;color:rgba(255,255,255,0.75);padding:4px 0;padding-left:16px;position:relative;">
              <span style="position:absolute;left:0;color:rgba(168,85,247,0.8);">•</span>
              ${c}
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('')}
    <button class="btn btn--primary" id="whatsnew-close" style="width:100%;margin-top:8px;">知道了 👍</button>
  `;

  document.getElementById('whatsnew-overlay').classList.add('modal-overlay--active');
  document.getElementById('whatsnew-dialog').classList.add('whatsnew-dialog--active');

  document.getElementById('whatsnew-close').addEventListener('click', closeWhatsNew);
  document.getElementById('whatsnew-overlay').addEventListener('click', closeWhatsNew);
}

function closeWhatsNew() {
  document.getElementById('whatsnew-overlay').classList.remove('modal-overlay--active');
  document.getElementById('whatsnew-dialog').classList.remove('whatsnew-dialog--active');
  setSeenVersion(APP_VERSION);
}
