import { Alert, MetricTile, Panel, SubsectionHeading } from "@/components/ui-primitives";
import type { AlgorithmCategory, AlgorithmMetadata } from "@/types/algorithm";

interface AlgorithmMetadataPanelProps {
  algorithmId: string;
  algorithms: AlgorithmMetadata[];
  isLoading: boolean;
  error: string | null;
}

const complexityLabels = [
  ["Best time", "best"],
  ["Average time", "average"],
  ["Worst time", "worst"],
] as const;

const categoryLabels: Record<AlgorithmCategory, string> = {
  sorting: "Sorting",
  searching: "Searching",
  graph: "Graph / Pathfinding",
  dynamic_programming: "Dynamic Programming",
  backtracking: "Backtracking",
  trees: "Trees",
  hash_tables: "Hash Tables",
};

export function formatCategory(category: string) {
  return categoryLabels[category as AlgorithmCategory] ?? category.replaceAll("_", " ");
}

export function AlgorithmMetadataPanel(props: AlgorithmMetadataPanelProps) {
  const metadata = props.algorithms.find((item) => item.id === props.algorithmId);

  if (props.isLoading) {
    return (
      <Panel className="mb-5 p-5" variant="subtle" role="status">
        <span className="sr-only">Loading algorithm details</span>
        <div className="mb-3 h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mb-2 h-6 w-52 animate-pulse rounded bg-slate-200" />
        <div className="h-4 max-w-2xl animate-pulse rounded bg-slate-100" />
      </Panel>
    );
  }

  if (!metadata) {
    return (
      <Alert title="Algorithm details unavailable" variant="warning">
        {props.error ?? "The selected algorithm was not present in the metadata catalog."} Visualizations remain available.
      </Alert>
    );
  }

  return (
    <Panel className="mb-5 p-5" aria-labelledby={`metadata-${metadata.id}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <span className="mb-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-indigo-700">
            {formatCategory(metadata.category)}
          </span>
          <h2 id={`metadata-${metadata.id}`} className="mb-1 text-xl font-extrabold tracking-normal text-slate-950">Algorithm overview</h2>
          <h3 className="mb-1 text-lg font-extrabold tracking-normal text-slate-900">{metadata.name}</h3>
          <p className="m-0 text-sm leading-6 text-slate-600">{metadata.description}</p>
        </div>
        <p className="m-0 max-w-xs text-xs leading-5 text-slate-500">Complexities describe the algorithm itself and exclude animation snapshot overhead.</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {complexityLabels.map(([label, key]) => (
          <MetricTile key={key} label={label} surface="muted">{metadata.time_complexity[key]}</MetricTile>
        ))}
        <MetricTile label="Space" surface="muted">{metadata.space_complexity}</MetricTile>
      </div>

      <div>
        <SubsectionHeading>Notes and limitations</SubsectionHeading>
        <ul className="m-0 grid gap-2 pl-5 text-sm leading-6 text-slate-700 md:grid-cols-2">
          {metadata.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </div>
    </Panel>
  );
}
