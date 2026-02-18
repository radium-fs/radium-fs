import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import { DocLayout } from '../components/layout/DocLayout';

const IntroPage = lazy(() => import('../content/index.mdx'));
const GettingStartedPage = lazy(() => import('../content/getting-started.mdx'));
const SpaceAndKindPage = lazy(() => import('../content/concepts/space-and-kind.mdx'));
const StoreAndEnsurePage = lazy(() => import('../content/concepts/store-and-ensure.mdx'));
const DependenciesPage = lazy(() => import('../content/concepts/dependencies.mdx'));
const CachingPage = lazy(() => import('../content/concepts/caching.mdx'));
const CommandsPage = lazy(() => import('../content/concepts/commands.mdx'));
const DefineKindPage = lazy(() => import('../content/api/define-kind.mdx'));
const CreateStorePage = lazy(() => import('../content/api/create-store.mdx'));
const RfsSpacePage = lazy(() => import('../content/api/rfs-space.mdx'));
const RfsAdapterPage = lazy(() => import('../content/api/rfs-adapter.mdx'));
const EventsPage = lazy(() => import('../content/api/events.mdx'));
const NodeSetupPage = lazy(() => import('../content/guides/node-setup.mdx'));
const MemoryAdapterPage = lazy(() => import('../content/guides/memory-adapter.mdx'));
const DiskLayoutPage = lazy(() => import('../content/guides/disk-layout.mdx'));

function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

export function DocPage() {
  return (
    <DocLayout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<IntroPage />} />
          <Route path="getting-started" element={<GettingStartedPage />} />
          <Route path="concepts/space-and-kind" element={<SpaceAndKindPage />} />
          <Route path="concepts/store-and-ensure" element={<StoreAndEnsurePage />} />
          <Route path="concepts/dependencies" element={<DependenciesPage />} />
          <Route path="concepts/caching" element={<CachingPage />} />
          <Route path="concepts/commands" element={<CommandsPage />} />
          <Route path="api/define-kind" element={<DefineKindPage />} />
          <Route path="api/create-store" element={<CreateStorePage />} />
          <Route path="api/rfs-space" element={<RfsSpacePage />} />
          <Route path="api/rfs-adapter" element={<RfsAdapterPage />} />
          <Route path="api/events" element={<EventsPage />} />
          <Route path="guides/node-setup" element={<NodeSetupPage />} />
          <Route path="guides/memory-adapter" element={<MemoryAdapterPage />} />
          <Route path="guides/disk-layout" element={<DiskLayoutPage />} />
        </Routes>
      </Suspense>
    </DocLayout>
  );
}
