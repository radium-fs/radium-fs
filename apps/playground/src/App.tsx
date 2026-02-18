import { useReducer, useCallback, useEffect } from 'react';
import type { RfsEvent } from '@radium-fs/core';
import type { PlaygroundState, StepState, StepResult, Scenario } from './engine/types';
import { runScenario } from './engine/runner';
import { getHighlighter } from './lib/highlighter';
import { Header } from './components/Header';
import { CommandFlow } from './components/CommandFlow/CommandFlow';
import { FileInspector } from './components/CommandFlow/FileInspector';
import { DagView } from './components/DagView';
import { EventLog } from './components/EventLog';
import { helloWorldScenario } from './scenarios/hello-world';
import { depChainScenario } from './scenarios/dep-chain';

const SCENARIOS: Scenario[] = [helloWorldScenario, depChainScenario];

function initState(scenario: Scenario): PlaygroundState {
  return {
    scenario,
    steps: scenario.steps.map((step) => ({
      step,
      status: 'pending',
      result: null,
    })),
    events: [],
    inspectedFile: null,
    running: false,
  };
}

type Action =
  | { type: 'RESET'; scenario: Scenario }
  | { type: 'RUN_START' }
  | { type: 'STEP_START'; stepId: string }
  | { type: 'STEP_DONE'; stepId: string; result: StepResult }
  | { type: 'RUN_DONE' }
  | { type: 'EVENT'; event: RfsEvent }
  | { type: 'INSPECT_FILE'; path: string; content: string }
  | { type: 'CLOSE_INSPECTOR' };

function reducer(state: PlaygroundState, action: Action): PlaygroundState {
  switch (action.type) {
    case 'RESET':
      return initState(action.scenario);

    case 'RUN_START':
      return {
        ...state,
        running: true,
        events: [],
        steps: state.steps.map((s) => ({ ...s, status: 'pending', result: null })),
      };

    case 'STEP_START':
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.step.id === action.stepId ? { ...s, status: 'running' } : s,
        ),
      };

    case 'STEP_DONE': {
      const status: StepState['status'] = action.result.cached ? 'cached' : 'built';
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.step.id === action.stepId
            ? { ...s, status, result: action.result }
            : s,
        ),
      };
    }

    case 'RUN_DONE':
      return { ...state, running: false };

    case 'EVENT':
      return { ...state, events: [...state.events, action.event] };

    case 'INSPECT_FILE':
      return {
        ...state,
        inspectedFile: { path: action.path, content: action.content },
      };

    case 'CLOSE_INSPECTOR':
      return { ...state, inspectedFile: null };

    default:
      return state;
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, helloWorldScenario, initState);

  useEffect(() => {
    getHighlighter();
  }, []);

  const handleRun = useCallback(async () => {
    dispatch({ type: 'RUN_START' });

    await runScenario(state.scenario, {
      onStepStart(stepId) {
        dispatch({ type: 'STEP_START', stepId });
      },
      onStepDone(stepId, result) {
        dispatch({ type: 'STEP_DONE', stepId, result });
      },
      onEvent(event) {
        dispatch({ type: 'EVENT', event });
      },
    });

    dispatch({ type: 'RUN_DONE' });
  }, [state.scenario]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET', scenario: state.scenario });
  }, [state.scenario]);

  const handleSelectScenario = useCallback((id: string) => {
    const scenario = SCENARIOS.find((s) => s.id === id);
    if (scenario) dispatch({ type: 'RESET', scenario });
  }, []);

  const handleFileClick = useCallback((path: string, content: string) => {
    dispatch({ type: 'INSPECT_FILE', path, content });
  }, []);

  const handleCloseInspector = useCallback(() => {
    dispatch({ type: 'CLOSE_INSPECTOR' });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-surface">
      <Header
        scenarios={SCENARIOS}
        activeId={state.scenario.id}
        onSelect={handleSelectScenario}
        onRun={handleRun}
        onReset={handleReset}
        running={state.running}
      />

      <div className="flex-1 flex min-h-0">
        <CommandFlow steps={state.steps} onFileClick={handleFileClick} />
        <div className="w-[260px] shrink-0">
          <DagView events={state.events} />
        </div>
      </div>

      <EventLog events={state.events} />

      {state.inspectedFile && (
        <FileInspector
          path={state.inspectedFile.path}
          content={state.inspectedFile.content}
          onClose={handleCloseInspector}
        />
      )}
    </div>
  );
}
