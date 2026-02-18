import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { DocPage } from './pages/DocPage';
import { DocPageZh } from './pages/DocPageZh';
import { LandingPage } from './pages/LandingPage';
import { useDocTitle } from './lib/useDocTitle';

function AppRoutes() {
  useDocTitle();
  return (
    <Routes>
      <Route path="/" element={<LandingPage locale="en" />} />
      <Route path="/zh" element={<LandingPage locale="zh" />} />
      <Route path="/playground" element={<PlaygroundPage />} />
      <Route path="/docs/*" element={<DocPage />} />
      <Route path="/zh/docs/*" element={<DocPageZh />} />
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
