import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout, { Splash } from './layout/AppLayout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const PlanPage = lazy(() => import('./pages/Plan'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Wizard = lazy(() => import('./pages/Wizard'));
const Analyze = lazy(() => import('./pages/Analyze'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Notes = lazy(() => import('./pages/Notes'));
const Assistant = lazy(() => import('./pages/Assistant'));
const Focus = lazy(() => import('./pages/Focus'));
const Stats = lazy(() => import('./pages/Stats'));
const SettingsPage = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="wizard" element={<Wizard />} />
          <Route path="analyze" element={<Analyze />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="notes" element={<Notes />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="focus" element={<Focus />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
