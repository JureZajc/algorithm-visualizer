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
      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]"
        aria-label="Loading pseudocode"
        aria-live="polite"
      >
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-2">
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </section>
    );
  }

  if (!metadata?.pseudocode.length) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900" aria-live="polite">
        <h2 className="mb-1 font-extrabold">Pseudocode unavailable</h2>
        <p className="m-0">{props.error ?? "The selected algorithm does not include pseudocode metadata."}</p>
      </section>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]"
      aria-labelledby={`pseudocode-${metadata.id}`}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="mb-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-indigo-600">Follow the steps</p>
        <h2 id={`pseudocode-${metadata.id}`} className="m-0 text-base font-extrabold text-slate-900">Pseudocode</h2>
      </div>
      <ol className="m-0 grid list-none gap-1 p-3 font-mono text-xs leading-5">
        {metadata.pseudocode.map((line, index) => {
          const lineNumber = index + 1;
          const isCurrent = props.currentLine === lineNumber;
          return (
            <li
              className={isCurrent
                ? "grid grid-cols-[2rem_minmax(0,1fr)] rounded-lg bg-indigo-600 px-2 py-2 text-white shadow-sm"
                : "grid grid-cols-[2rem_minmax(0,1fr)] rounded-lg px-2 py-2 text-slate-600"}
              key={`${lineNumber}-${line}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className={isCurrent ? "select-none text-indigo-200" : "select-none text-slate-400"}>{lineNumber}</span>
              <span className="whitespace-pre-wrap break-words">{line.trimStart()}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
