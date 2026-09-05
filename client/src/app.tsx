import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard/Dashboard';

const NotFound = lazy(() => import('./pages/NotFound/NotFound'));
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

const RoutesComponent = () => {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route
            path="applications"
            element={<LazyPage component={<ApplicationList />} />}
          />
          <Route
            path="applications/new"
            element={<LazyPage component={<AddApplication />} />}
          />
          <Route
            path="applications/edit/:id"
            element={<LazyPage component={<EditApplication />} />}
          />
          <Route
            path="scraping"
            element={<LazyPage component={<Scraping />} />}
          />
        </Route>
        <Route path="*" element={<LazyPage component={<NotFound />} />} />
      </Routes>
    </>
  );
};

function LazyPage({ component }: { component: React.ReactNode }) {
  return <Suspense fallback={<RouteLoadingFallback />}>{component}</Suspense>;
}

function RouteLoadingFallback() {
  return (
    <div
      className="mx-auto h-28 w-[min(92vw,720px)] animate-pulse rounded-2xl bg-slate-200/70"
      aria-label="正在加载页面"
    />
  );
}

export default RoutesComponent;
