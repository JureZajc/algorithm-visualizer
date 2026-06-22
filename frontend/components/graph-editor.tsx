import { useState, type FormEvent } from "react";

import type { GraphEdge, GraphNodePosition } from "@/types/graph";

interface GraphEditorProps {
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
  start: string;
  target: string;
  directed: boolean;
  disabled: boolean;
  pendingNodeId: string | null;
  directionLockMessage: string | null;
  error: string | null;
  onBeginNodePlacement: (nodeId: string) => boolean;
  onCancelNodePlacement: () => void;
  onRemoveNode: (nodeId: string) => void;
  onAddEdge: (source: string, target: string, weight: number) => boolean;
  onRemoveEdge: (index: number) => void;
  onUpdateEdgeWeight: (index: number, weight: number) => boolean;
  onInvalidWeight: () => void;
  onStartChange: (nodeId: string) => void;
  onTargetChange: (nodeId: string) => void;
  onDirectedChange: (directed: boolean) => void;
  onExportJson: () => void;
  onCopyJson: () => Promise<boolean>;
  onLoadJson: (rawJson: string) => boolean;
}

const inputClass = "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
const smallButtonClass = "min-h-10 rounded-lg px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45";

export function GraphEditor({
  nodes,
  edges,
  start,
  target,
  directed,
  disabled,
  pendingNodeId,
  directionLockMessage,
  error,
  onBeginNodePlacement,
  onCancelNodePlacement,
  onRemoveNode,
  onAddEdge,
  onRemoveEdge,
  onUpdateEdgeWeight,
  onInvalidWeight,
  onStartChange,
  onTargetChange,
  onDirectedChange,
  onExportJson,
  onCopyJson,
  onLoadJson,
}: GraphEditorProps) {
  const [nodeId, setNodeId] = useState("");
  const [edgeSource, setEdgeSource] = useState("");
  const [edgeTarget, setEdgeTarget] = useState("");
  const [edgeWeight, setEdgeWeight] = useState("1");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonStatus, setJsonStatus] = useState<string | null>(null);

  const source = nodes.some((node) => node.id === edgeSource) ? edgeSource : nodes[0]?.id ?? "";
  const targetCandidate = nodes.some((node) => node.id === edgeTarget) ? edgeTarget : "";
  const edgeTargetValue = targetCandidate && targetCandidate !== source
    ? targetCandidate
    : nodes.find((node) => node.id !== source)?.id ?? "";

  function beginPlacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (onBeginNodePlacement(nodeId)) setNodeId("");
  }

  function addEdge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const weight = Number(edgeWeight);
    if (!edgeWeight.trim() || !Number.isFinite(weight)) {
      onInvalidWeight();
      return;
    }
    if (onAddEdge(source, edgeTargetValue, weight)) setEdgeWeight("1");
  }

  async function copyJson() {
    setJsonStatus(null);
    const copied = await onCopyJson();
    setJsonStatus(copied ? "JSON copied to clipboard." : "Clipboard access failed. Use Export JSON instead.");
  }

  function loadJson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJsonStatus(null);
    if (!jsonInput.trim()) {
      setJsonStatus("Paste graph JSON before loading.");
      return;
    }
    if (onLoadJson(jsonInput)) {
      setJsonInput("");
      setJsonStatus("Graph JSON loaded.");
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="m-0 text-lg font-extrabold text-slate-900">Custom graph editor</h2>
        <p className="mb-0 mt-1 text-sm leading-6 text-slate-600">Add nodes on the canvas, then connect and configure them here.</p>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" aria-live="polite">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 mt-0 text-sm font-extrabold text-slate-900">1. Nodes</h3>
          <form className="flex gap-2" onSubmit={beginPlacement}>
            <label className="min-w-0 flex-1 text-xs font-bold text-slate-700">
              Node ID
              <input className={`${inputClass} mt-2`} value={nodeId} disabled={disabled || pendingNodeId !== null} placeholder="A" onChange={(event) => setNodeId(event.target.value)} />
            </label>
            <button className={`${smallButtonClass} mt-6 bg-indigo-600 text-white hover:bg-indigo-700`} type="submit" disabled={disabled || pendingNodeId !== null}>Add node</button>
          </form>
          {pendingNodeId ? (
            <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
              Click the canvas to place <strong>{pendingNodeId}</strong>.
              <button className="ml-2 font-bold underline" type="button" disabled={disabled} onClick={onCancelNodePlacement}>Cancel</button>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {nodes.length === 0 ? <span className="text-sm text-slate-500">No nodes yet.</span> : nodes.map((node) => (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm font-bold text-slate-700" key={node.id}>
                {node.id}
                <button className="flex h-7 w-7 items-center justify-center rounded-full text-rose-600 hover:bg-rose-100" type="button" aria-label={`Remove node ${node.id}`} disabled={disabled} onClick={() => onRemoveNode(node.id)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 mt-0 text-sm font-extrabold text-slate-900">2. Edges</h3>
          <form className="grid grid-cols-2 gap-2" onSubmit={addEdge}>
            <label className="text-xs font-bold text-slate-700">From<select className={`${inputClass} mt-2`} value={source} disabled={disabled || nodes.length < 2} onChange={(event) => setEdgeSource(event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-700">To<select className={`${inputClass} mt-2`} value={edgeTargetValue} disabled={disabled || nodes.length < 2} onChange={(event) => setEdgeTarget(event.target.value)}>{nodes.filter((node) => node.id !== source).map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-700">Weight<input className={`${inputClass} mt-2`} type="number" step="any" value={edgeWeight} disabled={disabled || nodes.length < 2} onChange={(event) => setEdgeWeight(event.target.value)} /></label>
            <button className={`${smallButtonClass} mt-6 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`} type="submit" disabled={disabled || nodes.length < 2}>Add edge</button>
          </form>
          <div className="mt-3 grid max-h-44 gap-2 overflow-auto">
            {edges.length === 0 ? <span className="text-sm text-slate-500">No edges yet.</span> : edges.map((edge, index) => (
              <div className="grid grid-cols-[minmax(0,1fr)_90px_36px] items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm" key={`${edge.source}-${edge.target}-${edge.weight}-${index}`}>
                <span className="truncate font-mono font-bold text-slate-700">{edge.source} {directed ? "→" : "—"} {edge.target}</span>
                <input
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
                  type="number"
                  step="any"
                  defaultValue={edge.weight}
                  disabled={disabled}
                  aria-label={`Weight for edge ${edge.source} to ${edge.target}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  onBlur={(event) => {
                    const weight = Number(event.currentTarget.value);
                    if (!event.currentTarget.value.trim() || !Number.isFinite(weight)) {
                      onInvalidWeight();
                      event.currentTarget.value = String(edge.weight);
                    } else if (!onUpdateEdgeWeight(index, weight)) {
                      event.currentTarget.value = String(edge.weight);
                    }
                  }}
                />
                <button className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-100" type="button" aria-label={`Remove edge ${edge.source} to ${edge.target}`} disabled={disabled} onClick={() => onRemoveEdge(index)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 mt-0 text-sm font-extrabold text-slate-900">3. Run settings</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="text-xs font-bold text-slate-700">Graph type<select className={`${inputClass} mt-2`} value={directed ? "directed" : "undirected"} disabled={disabled || directionLockMessage !== null} onChange={(event) => onDirectedChange(event.target.value === "directed")}><option value="undirected">Undirected</option><option value="directed">Directed</option></select></label>
            {directionLockMessage ? <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">{directionLockMessage}</p> : null}
            <label className="text-xs font-bold text-slate-700">Start node<select className={`${inputClass} mt-2`} value={start} disabled={disabled || nodes.length === 0} onChange={(event) => onStartChange(event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-700">Target node<select className={`${inputClass} mt-2`} value={target} disabled={disabled || nodes.length === 0} onChange={(event) => onTargetChange(event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 className="mb-1 mt-0 text-sm font-extrabold text-slate-900">4. Import and export</h3>
            <p className="m-0 text-sm leading-6 text-slate-600">Save this custom graph as JSON, copy it, or paste JSON to load another graph.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={disabled} onClick={onExportJson}>Export JSON</button>
            <button className="min-h-10 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={disabled} onClick={copyJson}>Copy JSON</button>
          </div>
        </div>
        <form className="grid gap-3" onSubmit={loadJson}>
          <label className="text-xs font-bold text-slate-700">
            Import JSON
            <textarea
              className="mt-2 min-h-36 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              value={jsonInput}
              disabled={disabled}
              placeholder={'{\n  "nodes": [\n    { "id": "A", "x": 120, "y": 160 }\n  ],\n  "edges": [],\n  "directed": false,\n  "start": "A",\n  "target": "A"\n}'}
              spellCheck={false}
              onChange={(event) => setJsonInput(event.target.value)}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button className="min-h-10 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45" type="submit" disabled={disabled}>Load JSON</button>
            {jsonStatus ? <span className="text-sm font-medium text-slate-600" aria-live="polite">{jsonStatus}</span> : null}
          </div>
        </form>
      </div>
    </section>
  );
}
