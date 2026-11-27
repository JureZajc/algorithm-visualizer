import type { ReactNode } from "react";

import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { Alert } from "@/components/ui-primitives";
import type { MetadataSourceProps } from "@/types/algorithm";

/**
 * The layout every category shares: controls, notices, the run error, the visualization beside
 * a support rail of pseudocode and stats, and the algorithm overview. It only arranges what it
 * is given; the category keeps its state and requests.
 */
export function VisualizerWorkspace({
  algorithmId,
  controls,
  error,
  metadata,
  notices,
  pseudocodeLine,
  stats,
  visualization,
}: {
  algorithmId: string;
  /** The control panel: inputs, run actions, and step controls. */
  controls: ReactNode;
  /** The run's error, shown above the visualization. */
  error?: string | null;
  metadata: MetadataSourceProps;
  /** Shown between the controls and the visualization: Learning mode, editors, input notes. */
  notices?: ReactNode;
  /** The pseudocode line to highlight for the current step. */
  pseudocodeLine?: number | null;
  stats: ReactNode;
  visualization: ReactNode;
}) {
  return (
    <div>
      {controls}
      {notices}
      {error ? <Alert title="Visualization unavailable">{error}</Alert> : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {visualization}
        <VisualizerSupportRail algorithmId={algorithmId} metadata={metadata} pseudocodeLine={pseudocodeLine}>
          {stats}
        </VisualizerSupportRail>
      </div>
      <AlgorithmMetadataPanel
        algorithmId={algorithmId}
        algorithms={metadata.algorithms}
        error={metadata.metadataError}
        isLoading={metadata.isMetadataLoading}
      />
    </div>
  );
}

/** The column beside the visualization: pseudocode, then the run's stats. One width for every category. */
export function VisualizerSupportRail({
  algorithmId,
  children,
  metadata,
  pseudocodeLine,
}: {
  algorithmId: string;
  children: ReactNode;
  metadata: MetadataSourceProps;
  pseudocodeLine?: number | null;
}) {
  return (
    <div className="grid min-w-0 gap-5 self-start">
      <PseudocodePanel
        algorithmId={algorithmId}
        algorithms={metadata.algorithms}
        currentLine={pseudocodeLine ?? undefined}
        error={metadata.metadataError}
        isLoading={metadata.isMetadataLoading}
      />
      {children}
    </div>
  );
}
