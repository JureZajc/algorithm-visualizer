import { Panel, PanelHeader } from "@/components/ui-primitives";
import type { AlgorithmMetadata } from "@/types/algorithm";

interface PseudocodePanelProps {
  algorithmId: string;
  algorithms: AlgorithmMetadata[];
  currentLine?: number;
  isLoading: boolean;
  error: string | null;
}

export function PseudocodePanel(props: PseudocodePanelProps) {
  const metadata = props.algorithms.find((item) => item.id === props.algorithmId);

  if (props.isLoading) {
    return (
      <Panel className="p-5" role="status">
        <span className="sr-only">Loading pseudocode</span>
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-2">
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </Panel>
    );
  }

  if (!metadata?.pseudocode.length) {
    return (
      // A status, not an alert: when metadata fails, the overview panel already raises the alert.
      <Panel className="p-5 text-sm leading-6 text-amber-900" variant="warning" role="status">
        <h2 className="mb-1 font-extrabold">Pseudocode unavailable</h2>
        <p className="m-0">{props.error ?? "The selected algorithm does not include pseudocode metadata."}</p>
      </Panel>
    );
  }

  return (
    <Panel
      className="overflow-hidden"
      aria-labelledby={`pseudocode-${metadata.id}`}
    >
      <PanelHeader eyebrow="Follow the steps" title="Pseudocode" titleId={`pseudocode-${metadata.id}`} />
      <ol className="m-0 grid list-none gap-1.5 p-3 font-mono text-xs leading-5">
        {metadata.pseudocode.map((line, index) => {
          const lineNumber = index + 1;
          const isCurrent = props.currentLine === lineNumber;
          return (
            <li
              className={isCurrent
                ? "grid grid-cols-[2rem_minmax(0,1fr)] rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-2 text-indigo-950 shadow-sm"
                : "grid grid-cols-[2rem_minmax(0,1fr)] rounded-lg border border-transparent px-2 py-2 text-slate-600"}
              key={`${lineNumber}-${line}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className={isCurrent ? "select-none font-bold text-indigo-600" : "select-none text-slate-500"}>{lineNumber}</span>
              <span className="whitespace-pre-wrap break-words">{line.trimStart()}</span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
