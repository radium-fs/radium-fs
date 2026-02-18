import { useMemo } from 'react';
import { diagrams, type DiagramDef, type DagNode, type DagEdge } from './diagrams';

interface DagDiagramProps {
  preset?: string;
  diagram?: DiagramDef;
  className?: string;
}

const STATUS_FILL: Record<string, string> = {
  built: 'var(--color-dag-built)',
  cached: 'var(--color-dag-cached)',
  rebuilding: 'var(--color-warning)',
};

const STATUS_GLOW: Record<string, string> = {
  built: 'var(--color-dag-glow)',
};

const NODE_W = 140;
const NODE_H = 52;
const GAP_X = 40;
const GAP_Y = 60;
const PAD = 24;

function layout(
  nodes: DagNode[],
  edges: DagEdge[],
): { positions: Map<string, { x: number; y: number }>; svgW: number; svgH: number } {
  const incoming = new Set<string>();
  for (const e of edges ?? []) incoming.add(e.to);

  const roots = nodes.filter((n) => !incoming.has(n.id));
  const children = nodes.filter((n) => incoming.has(n.id));

  const levels: DagNode[][] = [];
  if (roots.length > 0) levels.push(roots);
  if (children.length > 0) levels.push(children);

  const maxPerRow = Math.max(...levels.map((l) => l.length));
  const svgW = maxPerRow * NODE_W + (maxPerRow - 1) * GAP_X + PAD * 2;
  const svgH = levels.length * NODE_H + (levels.length - 1) * GAP_Y + PAD * 2;

  const positions = new Map<string, { x: number; y: number }>();
  for (let lvl = 0; lvl < levels.length; lvl++) {
    const row = levels[lvl];
    const rowW = row.length * NODE_W + (row.length - 1) * GAP_X;
    const startX = (svgW - rowW) / 2;
    const y = PAD + lvl * (NODE_H + GAP_Y);
    for (let i = 0; i < row.length; i++) {
      positions.set(row[i].id, { x: startX + i * (NODE_W + GAP_X), y });
    }
  }

  return { positions, svgW, svgH };
}

export function DagDiagram({ preset, diagram, className }: DagDiagramProps) {
  const def = preset ? diagrams[preset] : diagram;
  if (!def) {
    return (
      <div className="my-4 p-4 border border-error/30 rounded-lg text-error text-sm">
        DagDiagram: unknown preset &ldquo;{preset}&rdquo;
      </div>
    );
  }

  const { nodes, edges = [], caption } = def;
  const showEdgeLabels = edges.length <= 4;

  const { positions, svgW, svgH } = useMemo(
    () => layout(nodes, edges),
    [nodes, edges],
  );

  const maxW = Math.max(svgW * 2, 320);

  return (
    <div className={`not-prose my-6 ${className ?? ''}`}>
      <div
        className="rounded-lg border border-border bg-surface-code overflow-hidden mx-auto"
        style={{ maxWidth: maxW }}
      >
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto"
          role="img"
          aria-label={caption ?? 'DAG diagram'}
        >
          <defs>
            <marker
              id="dag-arrow"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3.5 L 0 7 z" fill="var(--color-dag-edge)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge) => {
            const fromPos = positions.get(edge.from);
            const toPos = positions.get(edge.to);
            if (!fromPos || !toPos) return null;

            const x1 = fromPos.x + NODE_W / 2;
            const y1 = fromPos.y + NODE_H;
            const x2 = toPos.x + NODE_W / 2;
            const y2 = toPos.y;
            const midY = (y1 + y2) / 2;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--color-dag-edge)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  markerEnd="url(#dag-arrow)"
                />
                {showEdgeLabels && edge.label && (
                  <text
                    x={(x1 + x2) / 2 + (x1 === x2 ? 0 : x1 < x2 ? 10 : -10)}
                    y={midY}
                    textAnchor="middle"
                    fill="var(--color-dag-text-dim)"
                    fontSize={9}
                    fontFamily="var(--font-mono)"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const color = STATUS_FILL[node.status] ?? 'var(--color-border)';
            const glow = STATUS_GLOW[node.status];

            return (
              <g key={node.id}>
                {/* Glow filter for built nodes */}
                {glow && (
                  <rect
                    x={pos.x - 2}
                    y={pos.y - 2}
                    width={NODE_W + 4}
                    height={NODE_H + 4}
                    rx={8}
                    fill="none"
                    stroke={glow}
                    strokeWidth={3}
                    opacity={0.5}
                  />
                )}
                {/* Node body */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill="var(--color-dag-node-bg)"
                  stroke={color}
                  strokeWidth={1.5}
                />
                {/* Left accent bar */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={4}
                  height={NODE_H}
                  rx={2}
                  fill={color}
                />
                {/* Label */}
                <text
                  x={pos.x + 14}
                  y={pos.y + (node.detail ? 20 : NODE_H / 2 + 4)}
                  fill="var(--color-dag-text)"
                  fontSize={12}
                  fontFamily="var(--font-mono)"
                  fontWeight={500}
                >
                  {node.label}
                </text>
                {/* Detail */}
                {node.detail && (
                  <text
                    x={pos.x + 14}
                    y={pos.y + 36}
                    fill="var(--color-dag-text-dim)"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                  >
                    {node.detail}
                  </text>
                )}
                {/* Status indicator */}
                <circle
                  cx={pos.x + NODE_W - 14}
                  cy={pos.y + NODE_H / 2}
                  r={3.5}
                  fill={color}
                />
              </g>
            );
          })}
        </svg>
      </div>
      {caption && (
        <p className="text-xs text-text-secondary mt-2 text-center">
          {caption}
        </p>
      )}
    </div>
  );
}
