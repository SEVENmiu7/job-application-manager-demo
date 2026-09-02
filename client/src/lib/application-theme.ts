export interface ApplicationStatusTheme {
  dot: string;
  badge: string;
  rail: string;
  drop: string;
  cardGlow: string;
  quick: string;
}

// 统一语义色：准备=Slate 已投递=Blue 测评=Purple 面试=Cyan(同族)
//             Offer=Green 拒绝=Red；同组节点共用同一主色
const STATUS_FAMILY_STYLES: Record<string, ApplicationStatusTheme> = {
  slate: {
    dot: 'bg-slate-400',
    badge: 'border-slate-200 bg-slate-100/80 text-slate-700',
    rail: 'from-slate-400 via-slate-300',
    drop: 'border-slate-400 bg-slate-100/80',
    cardGlow: 'from-slate-300/55',
    quick: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  blue: {
    dot: 'bg-blue-500',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    rail: 'from-blue-500 via-blue-300',
    drop: 'border-blue-400 bg-blue-50/90',
    cardGlow: 'from-blue-400/55',
    quick: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  purple: {
    dot: 'bg-purple-500',
    badge: 'border-purple-200 bg-purple-50 text-purple-700',
    rail: 'from-purple-500 via-purple-300',
    drop: 'border-purple-400 bg-purple-50/90',
    cardGlow: 'from-purple-400/55',
    quick: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  cyan: {
    dot: 'bg-cyan-500',
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    rail: 'from-cyan-500 via-cyan-300',
    drop: 'border-cyan-400 bg-cyan-50/90',
    cardGlow: 'from-cyan-400/55',
    quick: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  green: {
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rail: 'from-emerald-500 via-emerald-300',
    drop: 'border-emerald-400 bg-emerald-50/90',
    cardGlow: 'from-emerald-400/55',
    quick: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  red: {
    dot: 'bg-red-500',
    badge: 'border-red-200 bg-red-50 text-red-600',
    rail: 'from-red-500 via-red-300',
    drop: 'border-red-400 bg-red-50/90',
    cardGlow: 'from-red-400/55',
    quick: 'border-red-200 bg-red-50 text-red-600',
  },
};

const STATUS_FAMILY: Record<string, keyof typeof STATUS_FAMILY_STYLES> = {
  收藏: 'slate',
  准备中: 'slate',
  已投递: 'blue',
  测评: 'purple',
  笔试: 'purple',
  AI面试: 'cyan',
  一面: 'cyan',
  二面: 'cyan',
  三面: 'cyan',
  HR面: 'cyan',
  谈Offer: 'green',
  已Offer: 'green',
  已拒绝: 'red',
};

export function getApplicationStatusTheme(
  status: string,
): ApplicationStatusTheme {
  const family: keyof typeof STATUS_FAMILY_STYLES =
    STATUS_FAMILY[status] || 'slate';
  return STATUS_FAMILY_STYLES[family];
}
