import { useEffect, useState } from 'react';

/** 订阅一个媒体查询，返回当前是否匹配（用于侧边栏收起等布局决策）。 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQueryList: MediaQueryList = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', onChange);
    return () => mediaQueryList.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** 中等宽度桌面窗口：侧边栏收缩为图标栏。 */
export function useSidebarCollapsed(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
}


