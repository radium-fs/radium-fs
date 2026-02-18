import { useReducer, useCallback, useEffect, useState } from 'react';
import type { RfsEvent } from '@radium-fs/core';
import type {
  PlaygroundState,
  StepState,
  StepResult,
  Scenario,
  MobileTab,
} from '../engine/types';
import { runScenario } from '../engine/runner';
import { getHighlighter } from '../lib/highlighter';
import { Header } from '../components/Header';
import { CommandFlow } from '../components/CommandFlow/CommandFlow';
import { FileInspector } from '../components/CommandFlow/FileInspector';
import { DagView } from '../components/DagView';
import { EventLog } from '../components/EventLog';
import { helloWorldScenario } from '../scenarios/hello-world';
import { depChainScenario } from '../scenarios/dep-chain';

const SCENARIOS: Scenario[] = [helloWorldScenario, depChainScenario];

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: 'steps', label: 'Steps' },
  { id: 'graph', label: 'Graph' },
  { id: 'events', label: 'Events' },
];

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
    activeTab: 'steps',
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
  | { type: 'CLOSE_INSPECTOR' }
  | { type: 'SET_TAB'; tab: MobileTab };

function reducer(state: PlaygroundState, action: Action): PlaygroundState {
  switch (action.type) {
    case 'RESET':
      return { ...initState(action.scenario), activeTab: state.activeTab };

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

    case 'SET_TAB':
      return { ...state, activeTab: action.tab };

    default:
      return state;
  }
}

const DAG_WIDTH_DEFAULT = 360;
const DAG_WIDTH_MIN = 200;
const DAG_WIDTH_MAX = 600;

function ResizeHandle({
  width,
  onResize,
}: {
  width: number;
  onResize: (w: number) => void;
}) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;

      const onMove = (ev: PointerEvent) => {
        const delta = startX - ev.clientX;
        onResize(
          Math.min(DAG_WIDTH_MAX, Math.max(DAG_WIDTH_MIN, startWidth + delta)),
        );
      };

      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width, onResize],
  );

  return (
    <div
      className="w-1.5 shrink-0 cursor-col-resize group relative"
      onPointerDown={handlePointerDown}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="h-full w-px mx-auto bg-border group-hover:bg-accent/50 group-active:bg-accent transition-colors" />
    </div>
  );
}

export function PlaygroundPage() {
  const [state, dispatch] = useReducer(reducer, helloWorldScenario, initState);
  const [dagWidth, setDagWidth] = useState(DAG_WIDTH_DEFAULT);

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

      {/* Mobile: scenario dropdown + content tabs */}
      <div className="md:hidden flex flex-col border-b border-border">
        <div className="px-3 py-2 border-b border-border">
          <select
            value={state.scenario.id}
            onChange={(e) => handleSelectScenario(e.target.value)}
            className="w-full bg-surface-raised text-text-primary text-xs font-medium px-3 py-2 rounded border border-border focus:outline-none focus:border-accent"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
              className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${
                state.activeTab === tab.id
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: side-by-side layout */}
      <div className="hidden md:flex flex-1 min-h-0">
        <CommandFlow steps={state.steps} onFileClick={handleFileClick} />
        <ResizeHandle onResize={setDagWidth} width={dagWidth} />
        <div className="shrink-0" style={{ width: dagWidth }}>
          <DagView events={state.events} />
        </div>
      </div>

      {/* Mobile: tabbed content */}
      <div className="flex-1 min-h-0 md:hidden">
        {state.activeTab === 'steps' && (
          <CommandFlow steps={state.steps} onFileClick={handleFileClick} />
        )}
        {state.activeTab === 'graph' && (
          <DagView events={state.events} fullWidth />
        )}
        {state.activeTab === 'events' && (
          <EventLog events={state.events} vertical />
        )}
      </div>

      {/* Desktop: horizontal event log footer */}
      <div className="hidden md:block">
        <EventLog events={state.events} />
      </div>

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
