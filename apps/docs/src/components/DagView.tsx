import { useMemo, useState, useCallback, useRef } from 'react';
import type { RfsEvent } from '@radium-fs/core';

interface DagViewProps {
  events: RfsEvent[];
  fullWidth?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  building: 'var(--color-warning)',
  built: 'var(--color-dag-built)',
  cached: 'var(--color-dag-cached)',
  error: 'var(--color-error)',
};

const STATUS_LABELS: Record<string, string> = {
  built: 'Built',
  cached: 'Cached',
  error: 'Error',
};

interface DagNode {
  dataId: string;
  kind: string;
  status: string;
}

interface DagEdge {
  from: string;
  to: string;
}

function buildGraph(events: RfsEvent[]): { nodes: DagNode[]; edges: DagEdge[] } {
  const nodeMap = new Map<string, DagNode>();
  const edgeSet = new Set<string>();
  const edges: DagEdge[] = [];
  const stack: string[] = [];

  function addEdgeFromStack(childId: string): void {
    if (stack.length === 0) return;
    const parentId = stack[stack.length - 1];
    const key = `${parentId}:${childId}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ from: parentId, to: childId });
  }

  function popStack(dataId: string): void {
    if (stack.length > 0 && stack[stack.length - 1] === dataId) {
      stack.pop();
    }
  }

  for (const event of events) {
    if (event.type === 'init:start') {
      addEdgeFromStack(event.dataId);
      stack.push(event.dataId);
      if (!nodeMap.has(event.dataId)) {
        nodeMap.set(event.dataId, {
          dataId: event.dataId,
          kind: event.kind,
          status: 'building',
        });
      }
    } else if (event.type === 'init:done') {
      popStack(event.dataId);
      const node = nodeMap.get(event.dataId);
      if (node) node.status = 'built';
    } else if (event.type === 'init:error') {
      popStack(event.dataId);
      const node = nodeMap.get(event.dataId);
      if (node) node.status = 'error';
    } else if (event.type === 'init:cached') {
      addEdgeFromStack(event.dataId);
      const existing = nodeMap.get(event.dataId);
      if (existing) {
        existing.status = 'cached';
      } else {
        nodeMap.set(event.dataId, {
          dataId: event.dataId,
          kind: event.kind,
          status: 'cached',
        });
      }
    }
  }

  return { nodes: [...nodeMap.values()], edges };
}

function assignLevels(nodes: DagNode[], edges: DagEdge[]): DagNode[][] {
  const depsOf = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!depsOf.has(e.from)) depsOf.set(e.from, new Set());
    depsOf.get(e.from)!.add(e.to);
  }

  const nodeIds = new Set(nodes.map((n) => n.dataId));
  const depths = new Map<string, number>();

  function getDepth(id: string, visited: Set<string>): number {
    if (depths.has(id)) return depths.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);

    const deps = depsOf.get(id);
    if (!deps || deps.size === 0) {
      depths.set(id, 0);
      return 0;
    }
    const reachable = [...deps].filter((d) => nodeIds.has(d));
    if (reachable.length === 0) {
      depths.set(id, 0);
      return 0;
    }
    const d = Math.max(...reachable.map((d) => getDepth(d, new Set(visited)))) + 1;
    depths.set(id, d);
    return d;
  }

  for (const node of nodes) getDepth(node.dataId, new Set());

  const levels: DagNode[][] = [];
  for (const node of nodes) {
    const d = depths.get(node.dataId) ?? 0;
    while (levels.length <= d) levels.push([]);
    levels[d].push(node);
  }

  return levels;
}

const NODE_W = 84;
const NODE_H = 44;
const GAP_X = 14;
const GAP_Y = 40;
const PAD = 16;
const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
      <svg className="w-16 h-16 text-border" fill="none" viewBox="0 0 64 64" stroke="currentColor" strokeWidth="1.2">
        <circle cx="20" cy="16" r="8" />
        <circle cx="44" cy="16" r="8" />
        <circle cx="32" cy="44" r="8" />
        <line x1="24" y1="22" x2="30" y2="38" />
        <line x1="40" y1="22" x2="34" y2="38" />
      </svg>
      <p className="text-xs text-text-secondary text-center leading-relaxed">
        Run the scenario to see the
        <br />
        dependency graph here
      </p>
    </div>
  );
}

function Legend() {
  const items = [
    { status: 'built', label: 'Built' },
    { status: 'cached', label: 'Cached' },
    { status: 'error', label: 'Error' },
  ];

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
      {items.map(({ status, label }) => (
        <span key={status} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[status] }}
          />
          <span className="text-[10px] text-text-secondary">{label}</span>
        </span>
      ))}
    </div>
  );
}

interface TooltipData {
  node: DagNode;
  x: number;
  y: number;
}

export function DagView({ events, fullWidth }: DagViewProps) {
  const { nodes, edges, levels } = useMemo(() => {
    const g = buildGraph(events);
    return { ...g, levels: assignLevels(g.nodes, g.edges) };
  }, [events]);

  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
      });
    }
  }, []);

  const handleNodeEnter = useCallback(
    (node: DagNode, e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        node,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 8,
      });
    },
    [],
  );

  const handleNodeLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const outerClassName = fullWidth
    ? 'h-full bg-surface-raised flex flex-col'
    : 'h-full border-l border-border bg-surface-raised flex flex-col';

  if (nodes.length === 0) {
    return (
      <aside className={outerClassName}>
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Space Graph
          </h2>
        </div>
        <EmptyState />
      </aside>
    );
  }

  const maxPerRow = Math.max(...levels.map((l) => l.length));
  const svgW = maxPerRow * NODE_W + (maxPerRow - 1) * GAP_X + PAD * 2;
  const svgH = levels.length * NODE_H + (levels.length - 1) * GAP_Y + PAD * 2;

  const nodePos = new Map<string, { x: number; y: number }>();
  for (let lvl = 0; lvl < levels.length; lvl++) {
    const row = levels[lvl];
    const rowW = row.length * NODE_W + (row.length - 1) * GAP_X;
    const startX = (svgW - rowW) / 2;
    const y = PAD + lvl * (NODE_H + GAP_Y);
    for (let i = 0; i < row.length; i++) {
      nodePos.set(row[i].dataId, { x: startX + i * (NODE_W + GAP_X), y });
    }
  }

  return (
    <aside className={outerClassName}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Space Graph
        </h2>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-text-secondary font-mono mr-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            className="w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-surface transition-colors text-sm"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={handleZoomIn}
            className="w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-surface transition-colors text-sm"
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      <Legend />

      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 relative"
        onWheel={handleWheel}
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <div
          className="flex items-center justify-center min-h-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center top',
          }}
        >
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            width={svgW}
            height={svgH}
          >
            {edges.map((edge) => {
              const depPos = nodePos.get(edge.to);
              const parentPos = nodePos.get(edge.from);
              if (!depPos || !parentPos) return null;

              const x1 = depPos.x + NODE_W / 2;
              const y1 = depPos.y + NODE_H;
              const x2 = parentPos.x + NODE_W / 2;
              const y2 = parentPos.y;
              const midY = (y1 + y2) / 2;

              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--color-dag-edge)"
                  strokeWidth="1.5"
                />
              );
            })}

            {nodes.map((node) => {
              const pos = nodePos.get(node.dataId);
              if (!pos) return null;
              const color = STATUS_COLORS[node.status] ?? 'var(--color-border)';

              return (
                <g
                  key={node.dataId}
                  className="cursor-pointer"
                  onMouseEnter={(e) => handleNodeEnter(node, e)}
                  onMouseLeave={handleNodeLeave}
                >
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={4}
                    fill="var(--color-surface)"
                    stroke={color}
                    strokeWidth={1.5}
                  />
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={4}
                    height={NODE_H}
                    rx={2}
                    fill={color}
                  />
                  <text
                    x={pos.x + NODE_W / 2}
                    y={fullWidth ? pos.y + NODE_H / 2 + 4 : pos.y + 18}
                    textAnchor="middle"
                    fill="var(--color-dag-text)"
                    fontSize={11}
                    fontFamily="var(--font-mono)"
                  >
                    {node.kind}
                  </text>
                  {!fullWidth && (
                    <text
                      x={pos.x + NODE_W / 2}
                      y={pos.y + 32}
                      textAnchor="middle"
                      fill="var(--color-dag-text-dim)"
                      fontSize={8}
                      fontFamily="var(--font-mono)"
                    >
                      {node.dataId.slice(0, 8)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-10 pointer-events-none bg-surface-raised border border-border rounded-lg px-3 py-2 shadow-lg"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="text-xs font-mono text-text-primary font-medium">
              {tooltip.node.kind}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    STATUS_COLORS[tooltip.node.status] ?? 'var(--color-border)',
                }}
              />
              <span className="text-[10px] text-text-secondary">
                {STATUS_LABELS[tooltip.node.status] ?? tooltip.node.status}
              </span>
            </div>
            <div className="text-[10px] text-text-secondary font-mono mt-1">
              {tooltip.node.dataId.slice(0, 12)}…
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
