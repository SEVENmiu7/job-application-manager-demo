import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';

const NotFound = lazy(() => import('./pages/NotFound/NotFound'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const ApplicationList = lazy(
  () => import('./pages/ApplicationList/ApplicationList'),
);
const AddApplication = lazy(
  () => import('./pages/AddApplication/AddApplication'),
);
const EditApplication = lazy(
  () => import('./pages/EditApplication/EditApplication'),
);
const Scraping = lazy(() => import('./pages/Scraping/Scraping'));

function PageLoadingFallback() {
  return (
    <div
      className="h-28 animate-pulse rounded-2xl bg-slate-200/70"
      role="status"
      aria-label="页面加载中"
    />
  );
}

function loadPage(page: React.ReactNode) {
  return <Suspense fallback={<PageLoadingFallback />}>{page}</Suspense>;
}

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={loadPage(<Dashboard />)} />
        <Route path="applications" element={loadPage(<ApplicationList />)} />
        <Route path="applications/new" element={loadPage(<AddApplication />)} />
        <Route
          path="applications/edit/:id"
          element={loadPage(<EditApplication />)}
        />
        <Route path="scraping" element={loadPage(<Scraping />)} />
      </Route>
      <Route path="*" element={loadPage(<NotFound />)} />
    </Routes>
  );
};

export default RoutesComponent;
