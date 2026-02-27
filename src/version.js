// ===== Version & What's New =====
export const APP_VERSION = '1.6.0';

export const CHANGELOG = [
    {
        version: '1.6.0',
        date: '2026-02-27',
        title: '📄 LaTeX 导出',
        changes: [
            '新增「导出 LaTeX 报告」功能，可在「统计」页导出 .tex 文件',
            '上传到 Overleaf 并选择 XeLaTeX 编译，即可生成精美 PDF 报告',
            '报告包含月度支出概览与完整订阅明细表格',
        ],
    },
    {
        version: '1.5.1',
        date: '2025-02-25',
        title: '📅 日期选择优化',
        changes: [
            '表单中的「首次扣费日期」改为「下次扣费日期」',
            '直接选择下一次将要扣费的日期，更符合直觉',
        ],
    },
    {
        version: '1.5.0',
        date: '2025-02-25',
        title: '💾 备份与恢复',
        changes: [
            '「统计」页底新增数据安全设置',
            '支持一键导出所有数据到本地',
            '支持从备份文件快速恢复数据',
        ],
    },
    {
        version: '1.4.0',
        date: '2025-02-25',
        title: '⚡ 更新与数据保护',
        changes: [
            '新版本到达时顶部显示更新提示',
            '点击即可立即更新，无需手动刷新',
            '请求持久化存储，防止数据被清除',
        ],
    },
    {
        version: '1.2.0',
        date: '2025-02-25',
        title: '🎯 扣费日期优化',
        changes: [
            '新增首次扣费日期选择器',
            '支持记录已有会员的开通日期',
            '自动计算下次和上次扣费时间',
            '年付/季付订阅精确显示扣费月份',
        ],
    },
    {
        version: '1.1.0',
        date: '2025-02-25',
        title: '🔄 扣费周期',
        changes: [
            '新增月付/季付/年付周期选择',
            '自动折算月均费用',
            '金额标签根据周期动态切换',
        ],
    },
    {
        version: '1.0.0',
        date: '2025-02-25',
        title: '🎉 首次发布',
        changes: [
            '仪表板、订阅管理、支出统计',
            'PWA 支持，离线可用',
            '本地数据存储，隐私安全',
        ],
    },
];

const SEEN_VERSION_KEY = 'subtracker_seen_version';

export function getSeenVersion() {
    return localStorage.getItem(SEEN_VERSION_KEY) || '';
}

export function setSeenVersion(version) {
    localStorage.setItem(SEEN_VERSION_KEY, version);
}

export function getUnseenChanges() {
    const seen = getSeenVersion();
    if (!seen) {
        // First time user — don't show changelog, just mark current version
        setSeenVersion(APP_VERSION);
        return [];
    }
    return CHANGELOG.filter((entry) => entry.version > seen);
}
