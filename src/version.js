// ===== Version & What's New =====
export const APP_VERSION = '1.3.0';

export const CHANGELOG = [
    {
        version: '1.3.0',
        date: '2025-02-25',
        title: '📢 更新通知',
        changes: [
            '打开 App 自动提醒新功能',
            '点击「知道了」后不再重复提醒',
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
