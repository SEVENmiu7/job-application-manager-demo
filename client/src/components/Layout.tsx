import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Download,
  LayoutGrid,
  List,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Target,
  X,
} from 'lucide-react';

import { AppearanceMenu } from './theme/AppearanceMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useMediaQuery, useSidebarCollapsed } from '@/hooks/useMediaQuery';
import './Layout.css';

interface NavigationItem {
  path: string;
  label: string;
  icon: typeof LayoutGrid;
  exact: boolean;
}

const NAV_ITEMS: NavigationItem[] = [
  { path: '/', label: '投递看板', icon: LayoutGrid, exact: true },
  {
    path: '/applications',
    label: '投递列表',
    icon: List,
    exact: true,
  },
  {
    path: '/applications/new',
    label: '添加投递',
    icon: PlusCircle,
    exact: true,
  },
  { path: '/scraping', label: '岗位采集', icon: Download, exact: false },
];

export default function Layout() {
  const location = useLocation();
  const automaticSidebarCollapsed: boolean = useSidebarCollapsed();
  const isMobile: boolean = useMediaQuery('(max-width: 767px)');
  const [manualSidebarCollapsed, setManualSidebarCollapsed] = useState<
    boolean | null
  >(() => {
    const saved: string | null = window.localStorage.getItem(
      'qz-sidebar-collapsed',
    );
    return saved === null ? null : saved === 'true';
  });
  const sidebarCollapsed: boolean =
    !isMobile &&
    (manualSidebarCollapsed === null
      ? automaticSidebarCollapsed
      : manualSidebarCollapsed);
  const [sidebarHovered, setSidebarHovered] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const sidebarEnterTimer = useRef<number | null>(null);
  const sidebarLeaveTimer = useRef<number | null>(null);

  const clearSidebarTimer = (timer: MutableRefObject<number | null>): void => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const handleSidebarMouseEnter = (): void => {
    clearSidebarTimer(sidebarLeaveTimer);
    if (!sidebarCollapsed) return;
    clearSidebarTimer(sidebarEnterTimer);
    sidebarEnterTimer.current = window.setTimeout(() => {
      setSidebarHovered(true);
      sidebarEnterTimer.current = null;
    }, 140);
  };

  const handleSidebarMouseLeave = (): void => {
    clearSidebarTimer(sidebarEnterTimer);
    if (!sidebarCollapsed) return;
    clearSidebarTimer(sidebarLeaveTimer);
    sidebarLeaveTimer.current = window.setTimeout(() => {
      setSidebarHovered(false);
      sidebarLeaveTimer.current = null;
    }, 180);
  };

  const toggleSidebar = (): void => {
    const nextCollapsed: boolean = !sidebarCollapsed;
    setManualSidebarCollapsed(nextCollapsed);
    window.localStorage.setItem('qz-sidebar-collapsed', String(nextCollapsed));
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(
    () => () => {
      if (sidebarEnterTimer.current !== null) {
        window.clearTimeout(sidebarEnterTimer.current);
      }
      if (sidebarLeaveTimer.current !== null) {
        window.clearTimeout(sidebarLeaveTimer.current);
      }
    },
    [],
  );

  const renderNavItem = (item: NavigationItem) => {
    const Icon = item.icon;
    const active: boolean =
      item.path === '/applications'
        ? location.pathname === '/applications' ||
          location.pathname.startsWith('/applications/edit/')
        : item.exact
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path);
    const link = (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.exact}
        className={`nav-item ${active ? 'nav-item-active' : ''}`}
        aria-label={item.label}
      >
        <Icon className="nav-icon" />
        <span className="nav-label">{item.label}</span>
      </NavLink>
    );
    if (sidebarCollapsed && !sidebarHovered) {
      return (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <div className="layout-root">
      <header className="mobile-header">
        <div className="mobile-brand">
          <span className="mobile-logo" aria-hidden="true">
            <Target />
          </span>
          <div>
            <div className="sidebar-title">求职投递</div>
            <div className="sidebar-subtitle">面试演示版</div>
          </div>
        </div>
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMobileMenuOpen((open: boolean) => !open)}
          aria-label={mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="关闭导航菜单"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`layout-sidebar ${mobileMenuOpen ? 'layout-sidebar-open' : ''} ${
          sidebarCollapsed ? 'layout-sidebar-collapsed' : ''
        } ${sidebarCollapsed && sidebarHovered ? 'layout-sidebar-hovered' : ''}`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo" aria-hidden="true">
            <Target />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-title">求职投递</div>
            <div className="sidebar-subtitle">面试演示版</div>
          </div>
          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            aria-pressed={sidebarCollapsed}
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="主导航">
          {NAV_ITEMS.map((item: NavigationItem) => renderNavItem(item))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-appearance">
            <AppearanceMenu />
          </div>
          <div className="demo-sidebar-note">
            <Target aria-hidden="true" />
            <div>
              <strong>演示环境</strong>
              <span>仅使用虚构求职数据</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="layout-main">
        <div className="demo-banner" role="status">
          <strong>面试演示版</strong>
          <span>
            当前页面仅包含虚构样例，与个人真实投递数据完全隔离。
          </span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
