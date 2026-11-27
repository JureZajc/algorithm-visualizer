import { OverflowFrame } from "@/components/overflow-frame";
import type {
  HashKey,
  HashTableSnapshot,
  HashTableStep,
  HashTableStepType,
} from "@/types/hash-tables";

interface HashTableViewProps {
  table: HashTableSnapshot;
  step: HashTableStep | null;
}

const BUCKET_STATE_CLASSES: Record<HashTableStepType | "visited" | "hash" | "idle", string> = {
  hash: "border-sky-300 bg-sky-50 shadow-sky-100",
  inspect_bucket: "border-indigo-400 bg-indigo-50 shadow-indigo-100",
  compare: "border-amber-400 bg-amber-50 shadow-amber-100",
  insert: "border-violet-400 bg-violet-50 shadow-violet-100",
  collision: "border-rose-400 bg-rose-50 shadow-rose-100",
  probe: "border-cyan-400 bg-cyan-50 shadow-cyan-100",
  found: "border-emerald-400 bg-emerald-50 shadow-emerald-100",
  not_found: "border-slate-400 bg-slate-100 shadow-slate-100",
  done: "border-emerald-400 bg-emerald-50 shadow-emerald-100",
  visited: "border-indigo-200 bg-indigo-50/60 shadow-none",
  idle: "border-slate-200 bg-white shadow-none",
};

const ITEM_STATE_CLASSES: Record<HashTableStepType | "idle", string> = {
  hash: "border-sky-200 bg-sky-100 text-sky-900",
  inspect_bucket: "border-slate-200 bg-white text-slate-800",
  compare: "border-amber-300 bg-amber-400 text-slate-950",
  insert: "border-violet-500 bg-violet-500 text-white",
  collision: "border-rose-500 bg-rose-500 text-white",
  probe: "border-cyan-300 bg-cyan-100 text-cyan-900",
  found: "border-emerald-500 bg-emerald-500 text-white",
  not_found: "border-slate-400 bg-slate-500 text-white",
  done: "border-emerald-500 bg-emerald-500 text-white",
  idle: "border-slate-200 bg-white text-slate-800",
};

export function HashTableView({ table, step }: HashTableViewProps) {
  const isProbing = table.strategy === "linear_probing";
  const containerName = isProbing ? "slot" : "bucket";
  const containerCount = table.buckets.length;
  const keyCount = table.buckets.reduce((total, bucket) => total + bucket.items.length, 0);
  const caption = `${plural(containerCount, containerName)} · ${plural(keyCount, "key")} stored`;

  return (
    <OverflowFrame
      caption={caption}
      className="max-h-[min(70vh,640px)] rounded-2xl border border-slate-200 bg-slate-50 p-3"
      label={`Hash table, ${plural(containerCount, containerName)}`}
    >
      {isProbing ? <LinearProbingTable table={table} step={step} /> : <ChainingTable table={table} step={step} />}
    </OverflowFrame>
  );
}

// An explicit list role keeps list semantics in Safari, which drops them for unstyled lists.
function ChainingTable({ table, step }: HashTableViewProps) {
  return (
    <ol aria-label="Buckets" className="m-0 grid list-none gap-2 p-0" role="list">
      {table.buckets.map((bucket) => {
        const bucketClass = bucketStateClass(bucket.index, step);
        const stateLabel = bucketStateLabel(bucket.index, step);
        return (
          <li
            className={`grid min-h-16 grid-cols-[4.25rem_minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border shadow-sm transition ${bucketClass}`}
            key={bucket.index}
          >
            <div className="flex items-center justify-center border-r border-inherit px-3 py-2 font-mono text-sm font-black text-slate-700">
              <span className="sr-only">Bucket </span>
              {bucket.index}
              {stateLabel ? <span className="sr-only">, {stateLabel}</span> : null}
            </div>
            <div className="flex min-w-0 items-center px-3 py-2">
              {bucket.items.length > 0 ? (
                <ul
                  aria-label={`Chain in bucket ${bucket.index}`}
                  className="m-0 flex min-w-0 flex-1 list-none flex-wrap items-center gap-2 p-0"
                  role="list"
                >
                  {bucket.items.map((item, itemIndex) => (
                    <li className="flex min-w-0 max-w-full" key={`${bucket.index}-${itemIndex}-${formatKey(item)}`}>
                      <HashItem
                        item={item}
                        isActive={isActiveItem(bucket.index, item, step)}
                        stepType={step?.type ?? null}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-500">
                  empty chain
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function LinearProbingTable({ table, step }: HashTableViewProps) {
  return (
    <ol
      aria-label="Slots"
      className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      role="list"
    >
      {table.buckets.map((bucket) => {
        const item = bucket.items[0] ?? null;
        const bucketClass = bucketStateClass(bucket.index, step);
        return (
          <li
            className={`min-h-28 rounded-xl border p-3 shadow-sm transition ${bucketClass}`}
            key={bucket.index}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-black text-slate-500">
                slot {bucket.index}
              </span>
              <BucketBadge index={bucket.index} step={step} />
            </div>
            {item !== null ? (
              <HashItem
                item={item}
                isActive={isActiveItem(bucket.index, item, step)}
                stepType={step?.type ?? null}
              />
            ) : (
              <div className="flex min-h-11 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 px-2 text-xs font-bold text-slate-500">
                empty
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function HashItem({
  item,
  isActive,
  stepType,
}: {
  item: HashKey;
  isActive: boolean;
  stepType: HashTableStepType | null;
}) {
  const itemClass = isActive && stepType ? ITEM_STATE_CLASSES[stepType] : ITEM_STATE_CLASSES.idle;
  return (
    <span
      className={`inline-flex min-h-10 min-w-10 max-w-full items-center justify-center rounded-lg border px-3 py-2 font-mono text-sm font-black shadow-sm transition ${itemClass}`}
      title={`Key ${formatKey(item)}`}
    >
      <span className="truncate">{formatKey(item)}</span>
    </span>
  );
}

const BUCKET_BADGE_CLASSES = {
  active: "bg-slate-950 text-white",
  hash: "bg-sky-100 text-sky-800",
  visited: "bg-indigo-100 text-indigo-800",
};

function BucketBadge({ index, step }: { index: number; step: HashTableStep | null }) {
  const label = bucketStateLabel(index, step);
  if (!label) return null;
  return (
    <span className={`rounded-full px-2 py-1 text-[0.65rem] font-black uppercase ${BUCKET_BADGE_CLASSES[label]}`}>
      {label}
    </span>
  );
}

function bucketStateLabel(index: number, step: HashTableStep | null): keyof typeof BUCKET_BADGE_CLASSES | null {
  if (!step) return null;
  if (step.active_bucket === index) return "active";
  if (step.hash_index === index) return "hash";
  if (step.visited_buckets.includes(index)) return "visited";
  return null;
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function bucketStateClass(index: number, step: HashTableStep | null) {
  if (!step) return BUCKET_STATE_CLASSES.idle;
  if (step.active_bucket === index) return BUCKET_STATE_CLASSES[step.type];
  if (step.visited_buckets.includes(index)) return BUCKET_STATE_CLASSES.visited;
  if (step.hash_index === index) return BUCKET_STATE_CLASSES.hash;
  return BUCKET_STATE_CLASSES.idle;
}

function isActiveItem(
  bucketIndex: number,
  item: HashKey,
  step: HashTableStep | null,
) {
  return (
    step?.active_bucket === bucketIndex &&
    step.active_item !== null &&
    step.active_item === item
  );
}

function formatKey(key: HashKey) {
  return String(key);
}
