import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import Report from './pages/Report';
import './index.css';
import'./results.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          {/* Dashboard is a layout: /portfolios slides the upload sheet over it */}
          <Route element={<Dashboard />}>
            <Route path="/dashboard" element={null} />
            <Route path="/portfolios" element={null} />
          </Route>

          {/* Results + report are separate pages */}
          <Route path="/results/:id" element={<Results />} />
          <Route path="/results/:id/report" element={<Report />} />

          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
);