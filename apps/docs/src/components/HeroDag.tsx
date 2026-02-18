import { useEffect, useMemo, useState } from 'react';

type Phase =
  | 'cold-context'
  | 'cold-agents'
  | 'cold-done'
  | 'cached'
  | 'update-context'
  | 'update-agents'
  | 'update-done'
  | 'fade';

type Scene = 'cold' | 'cached' | 'updated';

type NodeId =
  | 'repo-context'
  | 'task-context'
  | 'tools-context'
  | 'planner'
  | 'coder'
  | 'tester'
  | 'reviewer'
  | 'deployer';

interface Point {
  x: number;
  y: number;
}

interface NodeDef {
  id: NodeId;
  label: string;
  detailDesktop: string;
  detailMobile: string;
}

interface EdgeDef {
  id: string;
  from: NodeId;
  to: NodeId;
}

interface SceneMetrics {
  title: string;
  init: number;
  cached: number;
  rebuild: number;
}

interface Layout {
  viewW: number;
  viewH: number;
  nodeW: number;
  nodeH: number;
  labelSize: number;
  detailSize: number;
  positions: Record<NodeId, Point>;
}

interface NodeState {
  visible: boolean;
  status: 'hidden' | 'building' | 'built' | 'cached';
}

const LOOP_STEPS: [Phase, number][] = [
  ['cold-agents', 850],
  ['cold-done', 900],
  ['cached', 1150],
  ['update-context', 800],
  ['update-agents', 900],
  ['update-done', 1200],
  ['fade', 700],
  ['cold-context', 180],
];

const COLORS = {
  building: 'var(--color-warning)',
  built: 'var(--color-dag-built)',
  cached: 'var(--color-dag-cached)',
  bg: 'var(--color-dag-node-bg)',
  edge: 'var(--color-dag-edge)',
  text: 'var(--color-dag-text)',
  textDim: 'var(--color-dag-text-dim)',
  glow: 'var(--color-dag-glow)',
};

const NODE_DEFS: NodeDef[] = [
  { id: 'repo-context', label: 'repo-context', detailDesktop: 'git: main@a8f1', detailMobile: 'git@a8f1' },
  { id: 'task-context', label: 'task-context', detailDesktop: 'ticket: auth-v1', detailMobile: 'auth-v1' },
  { id: 'tools-context', label: 'tools-context', detailDesktop: 'toolchain: ts+vitest', detailMobile: 'ts+vitest' },
  { id: 'planner', label: 'Planner', detailDesktop: 'mount: repo + task', detailMobile: 'repo+task' },
  { id: 'coder', label: 'Coder', detailDesktop: 'mount: repo + task + tools', detailMobile: 'repo+task+tools' },
  { id: 'tester', label: 'Tester', detailDesktop: 'mount: repo + tools', detailMobile: 'repo+tools' },
  { id: 'reviewer', label: 'Reviewer', detailDesktop: 'mount: repo + task', detailMobile: 'repo+task' },
  { id: 'deployer', label: 'Deployer', detailDesktop: 'mount: repo + tools', detailMobile: 'repo+tools' },
];

const CONTEXT_IDS: NodeId[] = ['repo-context', 'task-context', 'tools-context'];
const AGENT_IDS: NodeId[] = ['planner', 'coder', 'tester', 'reviewer', 'deployer'];
const UPDATED_AGENT_IDS: NodeId[] = ['planner', 'coder', 'reviewer'];

const EDGE_DEFS: EdgeDef[] = [
  { id: 'repo-planner', from: 'repo-context', to: 'planner' },
  { id: 'task-planner', from: 'task-context', to: 'planner' },
  { id: 'repo-coder', from: 'repo-context', to: 'coder' },
  { id: 'task-coder', from: 'task-context', to: 'coder' },
  { id: 'tools-coder', from: 'tools-context', to: 'coder' },
  { id: 'repo-tester', from: 'repo-context', to: 'tester' },
  { id: 'tools-tester', from: 'tools-context', to: 'tester' },
  { id: 'repo-reviewer', from: 'repo-context', to: 'reviewer' },
  { id: 'task-reviewer', from: 'task-context', to: 'reviewer' },
  { id: 'repo-deployer', from: 'repo-context', to: 'deployer' },
  { id: 'tools-deployer', from: 'tools-context', to: 'deployer' },
];

const SCENE_METRICS: Record<Scene, SceneMetrics> = {
  cold: { title: 'Cold Build', init: 8, cached: 0, rebuild: 0 },
  cached: { title: 'All Cached', init: 0, cached: 8, rebuild: 0 },
  updated: { title: 'Task Context Updated', init: 0, cached: 5, rebuild: 3 },
};

const PHASE_HINTS: Record<Phase, string> = {
  'cold-context': 'Initialize shared context spaces',
  'cold-agents': 'Fan-out to agent workspaces',
  'cold-done': 'All spaces initialized',
  cached: 'Same inputs, full cache hit',
  'update-context': 'Only task-context changes',
  'update-agents': 'Selective rebuild for dependent agents',
  'update-done': '3 rebuilds, 5 spaces reused',
  fade: 'Looping scenario',
};

const DESKTOP_LAYOUT: Layout = {
  viewW: 760,
  viewH: 255,
  nodeW: 132,
  nodeH: 44,
  labelSize: 10,
  detailSize: 8,
  positions: {
    planner: { x: 20, y: 16 },
    coder: { x: 166, y: 16 },
    tester: { x: 312, y: 16 },
    reviewer: { x: 458, y: 16 },
    deployer: { x: 604, y: 16 },
    'repo-context': { x: 95, y: 152 },
    'task-context': { x: 314, y: 152 },
    'tools-context': { x: 533, y: 152 },
  },
};

const MOBILE_LAYOUT: Layout = {
  viewW: 392,
  viewH: 286,
  nodeW: 108,
  nodeH: 40,
  labelSize: 9,
  detailSize: 7,
  positions: {
    planner: { x: 16, y: 14 },
    coder: { x: 142, y: 14 },
    tester: { x: 268, y: 14 },
    reviewer: { x: 79, y: 72 },
    deployer: { x: 205, y: 72 },
    'repo-context': { x: 16, y: 184 },
    'task-context': { x: 142, y: 184 },
    'tools-context': { x: 268, y: 184 },
  },
};

function sceneFromPhase(phase: Phase): Scene {
  if (phase === 'cached') return 'cached';
  if (phase === 'update-context' || phase === 'update-agents' || phase === 'update-done' || phase === 'fade') {
    return 'updated';
  }
  return 'cold';
}

function isUpdatedScene(phase: Phase): boolean {
  return phase === 'update-context' || phase === 'update-agents' || phase === 'update-done' || phase === 'fade';
}

function getNodeColor(status: NodeState['status']): string {
  if (status === 'building') return COLORS.building;
  if (status === 'built') return COLORS.built;
  if (status === 'cached') return COLORS.cached;
  return 'transparent';
}

function createHiddenStates(): Record<NodeId, NodeState> {
  return {
    'repo-context': { visible: false, status: 'hidden' },
    'task-context': { visible: false, status: 'hidden' },
    'tools-context': { visible: false, status: 'hidden' },
    planner: { visible: false, status: 'hidden' },
    coder: { visible: false, status: 'hidden' },
    tester: { visible: false, status: 'hidden' },
    reviewer: { visible: false, status: 'hidden' },
    deployer: { visible: false, status: 'hidden' },
  };
}

function setNodes(states: Record<NodeId, NodeState>, ids: NodeId[], status: NodeState['status']) {
  for (const id of ids) {
    states[id] = { visible: true, status };
  }
}

function buildNodeStates(phase: Phase): Record<NodeId, NodeState> {
  const states = createHiddenStates();

  switch (phase) {
    case 'cold-context':
      setNodes(states, CONTEXT_IDS, 'building');
      return states;
    case 'cold-agents':
      setNodes(states, CONTEXT_IDS, 'built');
      setNodes(states, AGENT_IDS, 'building');
      return states;
    case 'cold-done':
      setNodes(states, [...CONTEXT_IDS, ...AGENT_IDS], 'built');
      return states;
    case 'cached':
      setNodes(states, [...CONTEXT_IDS, ...AGENT_IDS], 'cached');
      return states;
    case 'update-context':
      setNodes(states, [...CONTEXT_IDS, ...AGENT_IDS], 'cached');
      states['task-context'] = { visible: true, status: 'building' };
      return states;
    case 'update-agents':
      setNodes(states, [...CONTEXT_IDS, ...AGENT_IDS], 'cached');
      states['task-context'] = { visible: true, status: 'built' };
      setNodes(states, UPDATED_AGENT_IDS, 'building');
      return states;
    case 'update-done':
    case 'fade':
      setNodes(states, [...CONTEXT_IDS, ...AGENT_IDS], 'cached');
      states['task-context'] = { visible: true, status: 'built' };
      setNodes(states, UPDATED_AGENT_IDS, 'built');
      return states;
    default:
      return states;
  }
}

function detailForNode(node: NodeDef, phase: Phase, isMobile: boolean): string {
  if (node.id === 'task-context' && isUpdatedScene(phase)) {
    return isMobile ? 'auth-v2' : 'ticket: auth-v2';
  }
  return isMobile ? node.detailMobile : node.detailDesktop;
}

function metricBadge(label: string, value: number, color: string) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-surface-raised">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
    </span>
  );
}

export function HeroDag() {
  const [phase, setPhase] = useState<Phase>('cold-context');
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 640px)');

    setPrefersReduced(reducedQuery.matches);
    setIsMobile(mobileQuery.matches);

    const onReduced = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    const onMobile = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    reducedQuery.addEventListener('change', onReduced);
    mobileQuery.addEventListener('change', onMobile);

    return () => {
      reducedQuery.removeEventListener('change', onReduced);
      mobileQuery.removeEventListener('change', onMobile);
    };
  }, []);

  useEffect(() => {
    if (prefersReduced) {
      setPhase('update-done');
      return;
    }

    setPhase('cold-context');
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function runLoop() {
      while (!cancelled) {
        for (const [nextPhase, delayMs] of LOOP_STEPS) {
          if (cancelled) return;
          await new Promise<void>((resolve) => {
            timeout = setTimeout(() => {
              if (!cancelled) setPhase(nextPhase);
              resolve();
            }, delayMs);
          });
        }
      }
    }

    runLoop();

    return () => {
      cancelled = true;
      if (timeout !== null) {
        clearTimeout(timeout);
      }
    };
  }, [prefersReduced]);

  const layout = isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
  const states = useMemo(() => buildNodeStates(phase), [phase]);
  const scene = sceneFromPhase(phase);
  const metrics = SCENE_METRICS[scene];
  const fading = phase === 'fade' && !prefersReduced;

  return (
    <div className="w-full max-w-[940px] mx-auto">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs font-mono">
        <span className="px-2.5 py-1 rounded border border-border bg-surface-raised text-text-primary">
          {metrics.title}
        </span>
        <span className="px-2 py-1 rounded border border-border text-text-secondary">
          {PHASE_HINTS[phase]}
        </span>
        {metricBadge('init', metrics.init, COLORS.built)}
        {metricBadge('cached', metrics.cached, COLORS.cached)}
        {metricBadge('rebuild', metrics.rebuild, COLORS.building)}
        <span className="px-2 py-1 rounded border border-border text-text-secondary">
          work units
        </span>
      </div>

      <svg
        viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
        className="w-full h-auto"
        role="img"
        aria-label="Animated multi-agent context DAG with selective rebuild"
      >
        <defs>
          <marker
            id="hero-multi-agent-arrow"
            viewBox="0 0 10 7"
            refX="10"
            refY="3.5"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 3.5 L 0 7 z" fill={COLORS.edge} />
          </marker>
        </defs>

        <g
          style={{
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.55s ease-out',
          }}
        >
          {EDGE_DEFS.map((edge) => {
            const source = states[edge.from];
            const target = states[edge.to];
            if (!source.visible || !target.visible) return null;

            const from = layout.positions[edge.from];
            const to = layout.positions[edge.to];
            const edgeActive = source.status === 'building' || target.status === 'building';
            const edgeCached = source.status === 'cached' && target.status === 'cached';

            return (
              <path
                key={edge.id}
                d={edgePath(from, to, layout.nodeW, layout.nodeH)}
                fill="none"
                stroke={edgeActive ? COLORS.building : edgeCached ? COLORS.cached : COLORS.edge}
                strokeWidth={edgeActive ? 1.7 : 1.4}
                strokeDasharray="4 3"
                markerEnd="url(#hero-multi-agent-arrow)"
                style={{
                  opacity: edgeActive ? 0.95 : edgeCached ? 0.72 : 0.62,
                  transition: 'opacity 0.25s ease, stroke 0.25s ease',
                }}
              />
            );
          })}

          {NODE_DEFS.map((node) => {
            const state = states[node.id];
            const color = getNodeColor(state.status);
            const showGlow = state.status === 'built';
            const pos = layout.positions[node.id];
            const detail = detailForNode(node, phase, isMobile);

            return (
              <g
                key={node.id}
                style={{
                  opacity: state.visible ? 1 : 0,
                  transition: 'opacity 0.25s ease-in',
                }}
              >
                {showGlow && (
                  <rect
                    x={pos.x - 2}
                    y={pos.y - 2}
                    width={layout.nodeW + 4}
                    height={layout.nodeH + 4}
                    rx={8}
                    fill="none"
                    stroke={COLORS.glow}
                    strokeWidth={3}
                  />
                )}

                <rect
                  x={pos.x}
                  y={pos.y}
                  width={layout.nodeW}
                  height={layout.nodeH}
                  rx={6}
                  fill={COLORS.bg}
                  stroke={color}
                  strokeWidth={1.5}
                  style={{ transition: 'stroke 0.25s ease' }}
                />
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={4}
                  height={layout.nodeH}
                  rx={2}
                  fill={color}
                  style={{ transition: 'fill 0.25s ease' }}
                />
                <text
                  x={pos.x + 10}
                  y={pos.y + 15}
                  fill={COLORS.text}
                  fontSize={layout.labelSize}
                  fontFamily="var(--font-mono)"
                  fontWeight={600}
                >
                  {node.label}
                </text>
                <text
                  x={pos.x + 10}
                  y={pos.y + 30}
                  fill={COLORS.textDim}
                  fontSize={layout.detailSize}
                  fontFamily="var(--font-mono)"
                >
                  {detail}
                </text>
                <circle
                  cx={pos.x + layout.nodeW - 11}
                  cy={pos.y + layout.nodeH / 2}
                  r={3}
                  fill={color}
                  style={{ transition: 'fill 0.25s ease' }}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function edgePath(from: Point, to: Point, nodeW: number, nodeH: number): string {
  const x1 = from.x + nodeW / 2;
  const y1 = from.y;
  const x2 = to.x + nodeW / 2;
  const y2 = to.y + nodeH;
  const c1y = y1 - 28;
  const c2y = y2 + 24;
  return `M ${x1} ${y1} C ${x1} ${c1y}, ${x2} ${c2y}, ${x2} ${y2}`;
}
