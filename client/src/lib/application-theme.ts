export interface ApplicationStatusTheme {
  dot: string;
  badge: string;
  rail: string;
  drop: string;
  cardGlow: string;
  quick: string;
}

export const APPLICATION_STATUS_THEMES: Record<string, ApplicationStatusTheme> =
  {
    收藏: {
      dot: 'bg-slate-400',
      badge: 'border-slate-200 bg-slate-100/90 text-slate-700',
      rail: 'from-slate-300 via-slate-200',
      drop: 'border-slate-400 bg-slate-100/80',
      cardGlow: 'from-slate-300/55',
      quick: 'border-slate-200 bg-slate-50 text-slate-700',
    },
    准备中: {
      dot: 'bg-violet-500',
      badge: 'border-violet-200 bg-violet-100/90 text-violet-800',
      rail: 'from-violet-500 via-fuchsia-300',
      drop: 'border-violet-400 bg-violet-50/90',
      cardGlow: 'from-violet-400/55',
      quick: 'border-violet-200 bg-violet-50 text-violet-800',
    },
    已投递: {
      dot: 'bg-sky-500',
      badge: 'border-sky-200 bg-sky-100/90 text-sky-800',
      rail: 'from-sky-500 via-cyan-300',
      drop: 'border-sky-400 bg-sky-50/90',
      cardGlow: 'from-sky-400/60',
      quick: 'border-sky-200 bg-sky-50 text-sky-800',
    },
    测评: {
      dot: 'bg-fuchsia-500',
      badge: 'border-fuchsia-200 bg-fuchsia-100/90 text-fuchsia-800',
      rail: 'from-fuchsia-500 via-pink-300',
      drop: 'border-fuchsia-400 bg-fuchsia-50/90',
      cardGlow: 'from-fuchsia-400/60',
      quick: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
    },
    笔试: {
      dot: 'bg-indigo-500',
      badge: 'border-indigo-200 bg-indigo-100/90 text-indigo-800',
      rail: 'from-indigo-500 via-blue-300',
      drop: 'border-indigo-400 bg-indigo-50/90',
      cardGlow: 'from-indigo-400/55',
      quick: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    },
    AI面试: {
      dot: 'bg-cyan-600',
      badge: 'border-cyan-200 bg-cyan-100/90 text-cyan-900',
      rail: 'from-cyan-600 via-sky-300',
      drop: 'border-cyan-500 bg-cyan-50/90',
      cardGlow: 'from-cyan-500/60',
      quick: 'border-cyan-200 bg-cyan-50 text-cyan-900',
    },
    一面: {
      dot: 'bg-cyan-500',
      badge: 'border-cyan-200 bg-cyan-100/90 text-cyan-900',
      rail: 'from-cyan-500 via-teal-300',
      drop: 'border-cyan-400 bg-cyan-50/90',
      cardGlow: 'from-cyan-400/60',
      quick: 'border-cyan-200 bg-cyan-50 text-cyan-900',
    },
    二面: {
      dot: 'bg-teal-500',
      badge: 'border-teal-200 bg-teal-100/90 text-teal-900',
      rail: 'from-teal-500 via-emerald-300',
      drop: 'border-teal-400 bg-teal-50/90',
      cardGlow: 'from-teal-400/60',
      quick: 'border-teal-200 bg-teal-50 text-teal-900',
    },
    三面: {
      dot: 'bg-amber-500',
      badge: 'border-amber-200 bg-amber-100/90 text-amber-900',
      rail: 'from-amber-500 via-yellow-300',
      drop: 'border-amber-400 bg-amber-50/90',
      cardGlow: 'from-amber-400/60',
      quick: 'border-amber-200 bg-amber-50 text-amber-900',
    },
    HR面: {
      dot: 'bg-orange-500',
      badge: 'border-orange-200 bg-orange-100/90 text-orange-900',
      rail: 'from-orange-500 via-amber-300',
      drop: 'border-orange-400 bg-orange-50/90',
      cardGlow: 'from-orange-400/60',
      quick: 'border-orange-200 bg-orange-50 text-orange-900',
    },
    谈Offer: {
      dot: 'bg-yellow-500',
      badge: 'border-yellow-200 bg-yellow-100/90 text-yellow-900',
      rail: 'from-yellow-500 via-lime-300',
      drop: 'border-yellow-400 bg-yellow-50/90',
      cardGlow: 'from-yellow-400/60',
      quick: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    },
    已Offer: {
      dot: 'bg-emerald-500',
      badge: 'border-emerald-200 bg-emerald-100/90 text-emerald-900',
      rail: 'from-emerald-500 via-lime-300',
      drop: 'border-emerald-400 bg-emerald-50/90',
      cardGlow: 'from-emerald-400/60',
      quick: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    },
    已拒绝: {
      dot: 'bg-rose-500',
      badge: 'border-rose-200 bg-rose-100/90 text-rose-800',
      rail: 'from-rose-500 via-pink-300',
      drop: 'border-rose-400 bg-rose-50/90',
      cardGlow: 'from-rose-400/55',
      quick: 'border-rose-200 bg-rose-50 text-rose-800',
    },
  };

export function getApplicationStatusTheme(
  status: string,
): ApplicationStatusTheme {
  return APPLICATION_STATUS_THEMES[status] || APPLICATION_STATUS_THEMES['收藏'];
}
