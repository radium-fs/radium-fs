import type { RfsStore, RfsAdapter, RfsSpaceBase, RfsEvent } from '@radium-fs/core';

// ---------------------------------------------------------------------------
// File tree
// ---------------------------------------------------------------------------

export interface FileTreeNode {
  name: string;
  type: 'file' | 'dir';
  children?: FileTreeNode[];
  content?: string;
}

// ---------------------------------------------------------------------------
// Scenario execution
// ---------------------------------------------------------------------------

export interface RunContext {
  store: RfsStore;
  adapter: RfsAdapter;
  results: Map<string, StepResult>;
}

export interface StepResult {
  space?: RfsSpaceBase;
  fileTree: FileTreeNode | null;
  events: RfsEvent[];
  durationMs: number;
  cached: boolean;
}

export interface ScenarioStep {
  id: string;
  label: string;
  code: string;
  run: (ctx: RunContext) => Promise<StepResult>;
}

export interface Scenario {
  id: string;
  name: string;
  steps: ScenarioStep[];
}

// ---------------------------------------------------------------------------
// UI state
// ---------------------------------------------------------------------------

export type StepStatus = 'pending' | 'running' | 'built' | 'cached' | 'error';

export interface StepState {
  step: ScenarioStep;
  status: StepStatus;
  result: StepResult | null;
}

export interface PlaygroundState {
  scenario: Scenario;
  steps: StepState[];
  events: RfsEvent[];
  inspectedFile: { path: string; content: string } | null;
  running: boolean;
}
