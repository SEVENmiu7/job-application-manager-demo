import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import Dashboard from './pages/Dashboard/Dashboard';
import ApplicationList from './pages/ApplicationList/ApplicationList';
import AddApplication from './pages/AddApplication/AddApplication';
import EditApplication from './pages/EditApplication/EditApplication';
import Scraping from './pages/Scraping/Scraping';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<ApplicationList />} />
        <Route path="applications/new" element={<AddApplication />} />
        <Route path="applications/edit/:id" element={<EditApplication />} />
        <Route path="scraping" element={<Scraping />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
