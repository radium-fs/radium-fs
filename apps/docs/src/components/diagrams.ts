export interface DagNode {
  id: string;
  label: string;
  status: 'built' | 'cached' | 'rebuilding';
  detail?: string;
}

export interface DagEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramDef {
  nodes: DagNode[];
  edges?: DagEdge[];
  caption?: string;
}

export const diagrams: Record<string, DiagramDef> = {
  'single-space': {
    nodes: [
      { id: 'greeter', label: 'greeter', status: 'built', detail: 'message: "hello"' },
    ],
    caption: 'A single space after ensure() — cache miss, onInit runs',
  },

  'single-space-cached': {
    nodes: [
      { id: 'greeter', label: 'greeter', status: 'cached', detail: 'message: "hello"' },
    ],
    caption: 'Same input, same dataId — instant cache hit',
  },

  'intro-overview': {
    nodes: [
      { id: 'repo-context', label: 'repo-context', status: 'built', detail: 'repo: "main"' },
      { id: 'task-context', label: 'task-context', status: 'built', detail: 'task: "auth-v2"' },
      { id: 'tools-context', label: 'tools-context', status: 'built', detail: 'stack: "ts+vt"' },
      { id: 'planner', label: 'planner', status: 'built', detail: 'dep: repo+task' },
      { id: 'coder', label: 'coder', status: 'built', detail: 'dep: repo+task+tools' },
      { id: 'tester', label: 'tester', status: 'built', detail: 'dep: repo+tools' },
    ],
    edges: [
      { from: 'repo-context', to: 'planner', label: 'dep("repo")' },
      { from: 'task-context', to: 'planner', label: 'dep("task")' },
      { from: 'repo-context', to: 'coder', label: 'dep("repo")' },
      { from: 'task-context', to: 'coder', label: 'dep("task")' },
      { from: 'tools-context', to: 'coder', label: 'dep("tools")' },
      { from: 'repo-context', to: 'tester', label: 'dep("repo")' },
      { from: 'tools-context', to: 'tester', label: 'dep("tools")' },
    ],
    caption: 'Multi-agent context DAG: dep() wires only required context per agent',
  },

  'dep-chain-full': {
    nodes: [
      { id: 'config', label: 'config', status: 'built', detail: 'env: "prod"' },
      { id: 'lib', label: 'lib', status: 'built', detail: 'name: "utils"' },
      { id: 'app', label: 'app', status: 'built' },
    ],
    edges: [
      { from: 'config', to: 'app', label: 'dep("config")' },
      { from: 'lib', to: 'app', label: 'dep("lib")' },
    ],
    caption: 'Full build — all three spaces initialized',
  },

  'dep-chain-cached': {
    nodes: [
      { id: 'config', label: 'config', status: 'cached', detail: 'env: "prod"' },
      { id: 'lib', label: 'lib', status: 'cached', detail: 'name: "utils"' },
      { id: 'app', label: 'app', status: 'cached' },
    ],
    edges: [
      { from: 'config', to: 'app', label: 'dep("config")' },
      { from: 'lib', to: 'app', label: 'dep("lib")' },
    ],
    caption: 'Second run — everything cached, zero work',
  },

  'dep-chain-partial': {
    nodes: [
      { id: 'config', label: 'config', status: 'rebuilding', detail: 'env: "dev"' },
      { id: 'lib', label: 'lib', status: 'cached', detail: 'name: "utils"' },
      { id: 'app', label: 'app', status: 'rebuilding' },
    ],
    edges: [
      { from: 'config', to: 'app', label: 'dep("config")' },
      { from: 'lib', to: 'app', label: 'dep("lib")' },
    ],
    caption: 'Input changed — config and app rebuild, lib stays cached',
  },

  'caching-full-build': {
    nodes: [
      { id: 'config', label: 'config', status: 'built', detail: 'env: "prod"' },
      { id: 'bundle', label: 'bundle', status: 'built' },
    ],
    edges: [
      { from: 'config', to: 'bundle', label: 'dep("config")' },
    ],
    caption: 'First build — both spaces created from scratch',
  },

  'caching-partial': {
    nodes: [
      { id: 'config', label: 'config', status: 'rebuilding', detail: 'env: "staging"' },
      { id: 'bundle', label: 'bundle', status: 'rebuilding' },
    ],
    edges: [
      { from: 'config', to: 'bundle', label: 'dep("config")' },
    ],
    caption: 'env changed — new dataId, both rebuild',
  },
};
