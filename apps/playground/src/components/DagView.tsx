import { useMemo } from 'react';
import type { RfsEvent } from '@radium-fs/core';

interface DagViewProps {
  events: RfsEvent[];
}

const STATUS_COLORS: Record<string, string> = {
  building: '#f59e0b',
  built: '#4ade80',
  cached: '#22543d',
  error: '#ef4444',
};

interface DagNode {
  dataId: string;
  kind: string;
  status: string;
}

interface DagEdge {
  from: string; // dependant (parent)
  to: string; // dependency (child)
}

/**
 * Build the space graph from raw events using a stack-based approach.
 *
 * When init:start fires while another init is already on the stack,
 * the outer space depends on the inner one. init:cached also indicates
 * a dependency when it fires within a parent's init lifecycle.
 */
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

/**
 * Assign depth levels: leaf dependencies at level 0, dependants at higher levels.
 */
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

export function DagView({ events }: DagViewProps) {
  const { nodes, edges, levels } = useMemo(() => {
    const g = buildGraph(events);
    return { ...g, levels: assignLevels(g.nodes, g.edges) };
  }, [events]);

  if (nodes.length === 0) {
    return (
      <aside className="h-full border-l border-border bg-surface-raised flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Space Graph
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-text-secondary text-center leading-relaxed">
            Run the scenario to see
            <br />
            spaces appear here
          </p>
        </div>
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
    <aside className="h-full border-l border-border bg-surface-raised flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Space Graph
        </h2>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full"
          style={{ maxWidth: svgW }}
        >
          {/* Edges: draw from dependency (top) down to dependant (bottom) */}
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
                stroke="#1e3a2e"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = nodePos.get(node.dataId);
            if (!pos) return null;
            const color = STATUS_COLORS[node.status] ?? '#1e3a2e';

            return (
              <g key={node.dataId}>
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
                  y={pos.y + 18}
                  textAnchor="middle"
                  fill="#e2efe8"
                  fontSize={11}
                  fontFamily="var(--font-mono)"
                >
                  {node.kind}
                </text>
                <text
                  x={pos.x + NODE_W / 2}
                  y={pos.y + 32}
                  textAnchor="middle"
                  fill="#6b8f7b"
                  fontSize={8}
                  fontFamily="var(--font-mono)"
                >
                  {node.dataId.slice(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </aside>
  );
}
