import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { DocPage } from './pages/DocPage';
import { LandingPage } from './pages/LandingPage';
import { useDocTitle } from './lib/useDocTitle';

function AppRoutes() {
  useDocTitle();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/playground" element={<PlaygroundPage />} />
      <Route path="/docs/*" element={<DocPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  );
}
