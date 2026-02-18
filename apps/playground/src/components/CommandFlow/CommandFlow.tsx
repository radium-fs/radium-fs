import type { StepState } from '../../engine/types';
import { StepCell } from './StepCell';

interface CommandFlowProps {
  steps: StepState[];
  onFileClick: (path: string, content: string) => void;
}

export function CommandFlow({ steps, onFileClick }: CommandFlowProps) {
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      {steps.map((stepState, i) => (
        <StepCell
          key={stepState.step.id}
          stepState={stepState}
          index={i}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
