import { useState, useEffect, useMemo } from 'react';

type Phase =
  | 'idle'
  | 'config-build'
  | 'config-done'
  | 'lib-build'
  | 'lib-done'
  | 'app-build'
  | 'app-done'
  | 'pause'
  | 'cached'
  | 'fade-out';

const PHASE_TIMING: [Phase, number][] = [
  ['config-build', 400],
  ['config-done', 500],
  ['lib-build', 400],
  ['lib-done', 500],
  ['app-build', 600],
  ['app-done', 1500],
  ['pause', 200],
  ['cached', 1200],
  ['fade-out', 800],
  ['idle', 400],
];

const COLORS = {
  building: '#f59e0b',
  built: '#4ade80',
  cached: '#22543d',
  bg: '#0d1a14',
  edge: '#2d5a42',
  text: '#e2efe8',
  textDim: '#5a8a6e',
  glow: 'rgba(74, 222, 128, 0.3)',
};

const NODE_W = 150;
const NODE_H = 48;

interface NodeState {
  visible: boolean;
  status: 'hidden' | 'building' | 'built' | 'cached';
}

interface EdgeState {
  visible: boolean;
}

function getNodeColor(status: NodeState['status']): string {
  if (status === 'building') return COLORS.building;
  if (status === 'built') return COLORS.built;
  if (status === 'cached') return COLORS.cached;
  return 'transparent';
}

export function HeroDag() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReduced) {
      setPhase('app-done');
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    async function runLoop() {
      while (!cancelled) {
        for (const [nextPhase, delay] of PHASE_TIMING) {
          if (cancelled) return;
          await new Promise<void>((resolve) => {
            timeout = setTimeout(() => {
              if (!cancelled) setPhase(nextPhase);
              resolve();
            }, delay);
          });
        }
      }
    }

    runLoop();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [prefersReduced]);

  const nodes: Record<string, NodeState> = useMemo(() => {
    const phaseIdx = PHASE_TIMING.findIndex(([p]) => p === phase);
    const visible = (minPhase: Phase) => {
      const idx = PHASE_TIMING.findIndex(([p]) => p === minPhase);
      return phaseIdx >= idx && phase !== 'idle';
    };
    const getStatus = (buildPhase: Phase, donePhase: Phase): NodeState['status'] => {
      if (phase === 'cached') return 'cached';
      if (phase === 'fade-out' || phase === 'idle') return 'hidden';
      const buildIdx = PHASE_TIMING.findIndex(([p]) => p === buildPhase);
      const doneIdx = PHASE_TIMING.findIndex(([p]) => p === donePhase);
      if (phaseIdx >= doneIdx) return 'built';
      if (phaseIdx >= buildIdx) return 'building';
      return 'hidden';
    };

    return {
      config: {
        visible: visible('config-build'),
        status: getStatus('config-build', 'config-done'),
      },
      lib: {
        visible: visible('lib-build'),
        status: getStatus('lib-build', 'lib-done'),
      },
      app: {
        visible: visible('app-build'),
        status: getStatus('app-build', 'app-done'),
      },
    };
  }, [phase]);

  const edgeState: Record<string, EdgeState> = useMemo(() => ({
    'config-app': { visible: nodes.app.visible },
    'lib-app': { visible: nodes.app.visible },
  }), [nodes.app.visible]);

  const isFading = phase === 'fade-out';

  const configPos = { x: 40, y: 16 };
  const libPos = { x: 230, y: 16 };
  const appPos = { x: 135, y: 100 };

  const svgW = 420;
  const svgH = 168;

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto"
        role="img"
        aria-label="Animated DAG showing spaces building, linking, and caching"
      >
        <defs>
          <marker
            id="hero-arrow"
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

        <g style={{
          opacity: isFading ? 0 : 1,
          transition: 'opacity 0.6s ease-out',
        }}>
          {/* Edges */}
          {renderEdge('config-app', configPos, appPos, edgeState['config-app'])}
          {renderEdge('lib-app', libPos, appPos, edgeState['lib-app'])}

          {/* Nodes */}
          {renderNode('config', 'config', 'env: "prod"', configPos, nodes.config)}
          {renderNode('lib', 'lib', 'name: "utils"', libPos, nodes.lib)}
          {renderNode('app', 'app', undefined, appPos, nodes.app)}
        </g>
      </svg>
    </div>
  );
}

function renderEdge(
  key: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  state: EdgeState,
) {
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y;
  const midY = (y1 + y2) / 2;

  return (
    <path
      key={key}
      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
      fill="none"
      stroke={COLORS.edge}
      strokeWidth="1.5"
      strokeDasharray="4 3"
      markerEnd="url(#hero-arrow)"
      style={{
        opacity: state.visible ? 1 : 0,
        transition: 'opacity 0.4s ease-in',
      }}
    />
  );
}

function renderNode(
  key: string,
  label: string,
  detail: string | undefined,
  pos: { x: number; y: number },
  state: NodeState,
) {
  const color = getNodeColor(state.status);
  const showGlow = state.status === 'built';

  return (
    <g
      key={key}
      style={{
        opacity: state.visible ? 1 : 0,
        transition: 'opacity 0.35s ease-in',
      }}
    >
      {showGlow && (
        <rect
          x={pos.x - 2}
          y={pos.y - 2}
          width={NODE_W + 4}
          height={NODE_H + 4}
          rx={8}
          fill="none"
          stroke={COLORS.glow}
          strokeWidth={3}
          style={{ transition: 'stroke 0.3s ease' }}
        />
      )}
      <rect
        x={pos.x}
        y={pos.y}
        width={NODE_W}
        height={NODE_H}
        rx={6}
        fill={COLORS.bg}
        stroke={color}
        strokeWidth={1.5}
        style={{ transition: 'stroke 0.3s ease' }}
      />
      <rect
        x={pos.x}
        y={pos.y}
        width={4}
        height={NODE_H}
        rx={2}
        fill={color}
        style={{ transition: 'fill 0.3s ease' }}
      />
      <text
        x={pos.x + 14}
        y={pos.y + (detail ? 20 : NODE_H / 2 + 4)}
        fill={COLORS.text}
        fontSize={12}
        fontFamily="var(--font-mono)"
        fontWeight={500}
        style={{ transition: 'fill 0.3s ease' }}
      >
        {label}
      </text>
      {detail && (
        <text
          x={pos.x + 14}
          y={pos.y + 36}
          fill={COLORS.textDim}
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {detail}
        </text>
      )}
      <circle
        cx={pos.x + NODE_W - 14}
        cy={pos.y + NODE_H / 2}
        r={3.5}
        fill={color}
        style={{ transition: 'fill 0.3s ease' }}
      />
    </g>
  );
}
