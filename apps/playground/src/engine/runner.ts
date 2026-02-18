import { createStore } from '@radium-fs/core';
import { memoryAdapter } from '@radium-fs/memory';
import type { RfsEvent } from '@radium-fs/core';
import type { Scenario, StepResult, RunContext } from './types';

export interface RunStepCallback {
  onStepStart: (stepId: string) => void;
  onStepDone: (stepId: string, result: StepResult) => void;
  onEvent: (event: RfsEvent) => void;
}

export async function runScenario(
  scenario: Scenario,
  callbacks: RunStepCallback,
): Promise<void> {
  const adapter = memoryAdapter();
  const store = createStore({ root: '/playground', adapter });

  store.on((event) => {
    callbacks.onEvent(event);
  });

  const results = new Map<string, StepResult>();
  const ctx: RunContext = { store, adapter, results };

  for (const step of scenario.steps) {
    callbacks.onStepStart(step.id);

    try {
      const result = await step.run(ctx);
      results.set(step.id, result);
      callbacks.onStepDone(step.id, result);
    } catch (err) {
      const result: StepResult = {
        fileTree: null,
        events: [],
        durationMs: 0,
        cached: false,
      };
      results.set(step.id, result);
      callbacks.onStepDone(step.id, result);
    }
  }
}
