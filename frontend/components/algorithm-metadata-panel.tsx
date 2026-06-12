import type { AlgorithmMetadata } from "@/types/algorithm";

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

export function AlgorithmMetadataPanel(props: AlgorithmMetadataPanelProps) {
  const metadata = props.algorithms.find((item) => item.id === props.algorithmId);

  if (props.isLoading) {
    return (
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm" aria-live="polite" aria-label="Loading algorithm details">
        <div className="mb-3 h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mb-2 h-6 w-52 animate-pulse rounded bg-slate-200" />
        <div className="h-4 max-w-2xl animate-pulse rounded bg-slate-100" />
      </section>
    );
  }

  if (!metadata) {
    return (
      <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900" aria-live="polite">
        <span className="font-bold">Algorithm details unavailable.</span>{" "}
        {props.error ?? "The selected algorithm was not present in the metadata catalog."} Visualizations remain available.
      </section>
    );
  }

  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]" aria-labelledby={`metadata-${metadata.id}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <span className="mb-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-indigo-700">
            {metadata.category}
          </span>
          <h2 id={`metadata-${metadata.id}`} className="mb-1 text-xl font-extrabold tracking-tight text-slate-950">{metadata.name}</h2>
          <p className="m-0 text-sm leading-6 text-slate-600">{metadata.description}</p>
        </div>
        <p className="m-0 max-w-xs text-xs leading-5 text-slate-500">Complexities describe the algorithm itself and exclude animation snapshot overhead.</p>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {complexityLabels.map(([label, key]) => (
          <Complexity key={key} label={label} value={metadata.time_complexity[key]} />
        ))}
        <Complexity label="Space" value={metadata.space_complexity} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">Notes and limitations</h3>
        <ul className="m-0 grid gap-2 pl-5 text-sm leading-6 text-slate-700 md:grid-cols-2">
          {metadata.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </div>
    </section>
  );
}

function Complexity({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="mb-1 block text-[0.65rem] font-extrabold uppercase tracking-[0.09em] text-slate-500">{label}</span>
      <span className="font-mono text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}
