import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Download,
  LayoutGrid,
  List,
  Menu,
  PlusCircle,
  Target,
  X,
} from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
        className={`layout-sidebar ${mobileMenuOpen ? 'layout-sidebar-open' : ''}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo" aria-hidden="true">
            <Target />
          </div>
          <div>
            <div className="sidebar-title">求职投递</div>
            <div className="sidebar-subtitle">面试演示版</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="主导航">
          {NAV_ITEMS.map((item: NavigationItem) => {
            const Icon = item.icon;
            const active: boolean =
              item.path === '/applications'
                ? location.pathname === '/applications' ||
                  location.pathname.startsWith('/applications/edit/')
                : item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={`nav-item ${active ? 'nav-item-active' : ''}`}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
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
