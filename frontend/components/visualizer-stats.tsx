interface VisualizerStatsProps {
  algorithmName: string;
  currentStep: number;
  totalSteps: number;
  elapsedMs: number;
  finalArray: number[] | null;
}

export function VisualizerStats({
  algorithmName,
  currentStep,
  totalSteps,
  elapsedMs,
  finalArray,
}: VisualizerStatsProps) {
  return (
    <aside className="stats-card" aria-label="Visualization statistics">
      <div className="stat-row">
        <span className="stat-label">Algorithm</span>
        <span className="stat-value">{algorithmName}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Progress</span>
        <span className="stat-value">
          {currentStep} / {totalSteps}
        </span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Elapsed time</span>
        <span className="stat-value">{(elapsedMs / 1000).toFixed(1)} s</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Final sorted array</span>
        <div className="final-array">
          {finalArray ? `[${finalArray.join(", ")}]` : "Waiting for completion"}
        </div>
      </div>
    </aside>
  );
}
