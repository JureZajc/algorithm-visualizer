import type { GraphEdge, GraphNodePosition, GraphStep, GraphStepType } from "@/types/graph";

interface GraphCanvasProps {
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
  start: string;
  target: string;
  directed: boolean;
  showStart: boolean;
  showTarget: boolean;
  step: GraphStep | null;
}

interface GraphStepClasses {
  node: string;
  edge: string;
  markerId: string;
  weight: string;
}

const GRAPH_STEP_CLASSES: Record<GraphStepType, GraphStepClasses> = {
  visit: { node: "fill-sky-500 stroke-sky-700", edge: "stroke-sky-500", markerId: "arrow-visit", weight: "fill-sky-800" },
  inspect_edge: { node: "fill-amber-400 stroke-amber-600", edge: "stroke-amber-500", markerId: "arrow-active", weight: "fill-amber-800" },
  enqueue: { node: "fill-violet-500 stroke-violet-700", edge: "stroke-violet-500", markerId: "arrow-frontier", weight: "fill-violet-800" },
  dequeue: { node: "fill-amber-400 stroke-amber-600", edge: "stroke-amber-500", markerId: "arrow-active", weight: "fill-amber-800" },
  push: { node: "fill-violet-500 stroke-violet-700", edge: "stroke-violet-500", markerId: "arrow-frontier", weight: "fill-violet-800" },
  pop: { node: "fill-amber-400 stroke-amber-600", edge: "stroke-amber-500", markerId: "arrow-active", weight: "fill-amber-800" },
  relax: { node: "fill-fuchsia-500 stroke-fuchsia-700", edge: "stroke-fuchsia-500", markerId: "arrow-relax", weight: "fill-fuchsia-800" },
  path_found: { node: "fill-emerald-500 stroke-emerald-700", edge: "stroke-emerald-500", markerId: "arrow-success", weight: "fill-emerald-800" },
  not_found: { node: "fill-slate-500 stroke-slate-700", edge: "stroke-slate-500", markerId: "arrow-default", weight: "fill-slate-700" },
  cycle_detected: { node: "fill-rose-500 stroke-rose-700", edge: "stroke-rose-500", markerId: "arrow-reject", weight: "fill-rose-800" },
  accept_edge: { node: "fill-emerald-500 stroke-emerald-700", edge: "stroke-emerald-500", markerId: "arrow-success", weight: "fill-emerald-800" },
  reject_edge: { node: "fill-rose-500 stroke-rose-700", edge: "stroke-rose-500", markerId: "arrow-reject", weight: "fill-rose-800" },
  add_to_result: { node: "fill-teal-500 stroke-teal-700", edge: "stroke-teal-500", markerId: "arrow-result", weight: "fill-teal-800" },
  update_frontier: { node: "fill-cyan-500 stroke-cyan-700", edge: "stroke-cyan-500", markerId: "arrow-candidate", weight: "fill-cyan-800" },
  done: { node: "fill-emerald-500 stroke-emerald-700", edge: "stroke-emerald-500", markerId: "arrow-success", weight: "fill-emerald-800" },
};

const DEFAULT_NODE_CLASSES = "fill-white stroke-slate-500";
const FRONTIER_NODE_CLASSES = "fill-violet-500 stroke-violet-700";
const VISITED_NODE_CLASSES = "fill-sky-500 stroke-sky-700";
const PATH_NODE_CLASSES = "fill-emerald-500 stroke-emerald-700";
const RESULT_NODE_CLASSES = "fill-teal-500 stroke-teal-700";

function edgeKey(source: string, target: string, directed: boolean) {
  return directed ? `${source}->${target}` : [source, target].sort().join("--");
}

function edgeKeys(edges: GraphEdge[], directed: boolean) {
  return new Set(edges.map((edge) => edgeKey(edge.source, edge.target, directed)));
}

function Marker({ id, colorClass }: { id: string; colorClass: string }) {
  return (
    <marker id={id} markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" className={colorClass} />
    </marker>
  );
}

export function GraphCanvas({ nodes, edges, start, target, directed, showStart, showTarget, step }: GraphCanvasProps) {
  const positions = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set(step?.visited ?? []);
  const frontier = new Set(step?.frontier ?? []);
  const path = step?.path ?? [];
  const result = new Set(step?.result ?? []);
  const pathEdges = new Set(path.slice(1).map((node, index) => edgeKey(path[index], node, directed)));
  const candidateEdges = edgeKeys(step?.frontier_edges ?? [], false);
  const mstEdges = edgeKeys(step?.mst_edges ?? [], false);
  const activeEdgeKey = step?.edge ? edgeKey(step.edge.source, step.edge.target, directed) : null;
  const activeClasses = step ? GRAPH_STEP_CLASSES[step.type] : null;
  const cycleDetected = step?.type === "cycle_detected";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.10),transparent_64%)] shadow-inner">
      <svg className="h-auto min-h-[360px] w-full" viewBox="0 0 650 410" role="img" aria-label="Weighted graph algorithm visualization">
        <defs>
          <Marker id="arrow-default" colorClass="fill-slate-400" />
          <Marker id="arrow-visit" colorClass="fill-sky-500" />
          <Marker id="arrow-active" colorClass="fill-amber-500" />
          <Marker id="arrow-frontier" colorClass="fill-violet-500" />
          <Marker id="arrow-relax" colorClass="fill-fuchsia-500" />
          <Marker id="arrow-success" colorClass="fill-emerald-500" />
          <Marker id="arrow-reject" colorClass="fill-rose-500" />
          <Marker id="arrow-result" colorClass="fill-teal-500" />
          <Marker id="arrow-candidate" colorClass="fill-cyan-500" />
        </defs>

        {edges.map((edge, index) => {
          const source = positions.get(edge.source);
          const targetNode = positions.get(edge.target);
          if (!source || !targetNode) return null;

          const key = edgeKey(edge.source, edge.target, directed);
          const undirectedKey = edgeKey(edge.source, edge.target, false);
          const isPath = pathEdges.has(key);
          const isMst = mstEdges.has(undirectedKey);
          const isCandidate = candidateEdges.has(undirectedKey);
          const isActive = activeEdgeKey === key && activeClasses !== null;
          const edgeClass = isActive
            ? activeClasses.edge
            : isPath || isMst
              ? "stroke-emerald-500"
              : isCandidate
                ? "stroke-cyan-400"
                : "stroke-slate-400";
          const weightClass = isActive
            ? activeClasses.weight
            : isPath || isMst
              ? "fill-emerald-800"
              : isCandidate
                ? "fill-cyan-800"
                : "fill-slate-700";
          const markerId = isActive
            ? activeClasses.markerId
            : isPath || isMst
              ? "arrow-success"
              : isCandidate
                ? "arrow-candidate"
                : "arrow-default";
          const midX = (source.x + targetNode.x) / 2;
          const midY = (source.y + targetNode.y) / 2;

          return (
            <g key={`${edge.source}-${edge.target}-${index}`}>
              <line
                x1={source.x}
                y1={source.y}
                x2={targetNode.x}
                y2={targetNode.y}
                strokeWidth={isActive ? 7 : isPath || isMst ? 6 : isCandidate ? 4 : 3}
                strokeDasharray={isCandidate && !isActive ? "8 6" : undefined}
                strokeLinecap="round"
                markerEnd={directed ? `url(#${markerId})` : undefined}
                className={`${edgeClass} transition-all duration-200`}
              />
              <circle cx={midX} cy={midY} r="14" strokeWidth="2" className={`fill-white ${edgeClass}`} />
              <text x={midX} y={midY + 4} textAnchor="middle" className={`${weightClass} text-[11px] font-black`}>{edge.weight}</text>
            </g>
          );
        })}

        {nodes.map((node) => {
          const isCurrent = step?.current === node.id;
          const isNeighbor = step?.neighbor === node.id;
          const isPath = path.includes(node.id);
          const isResult = result.has(node.id);
          const isFrontier = frontier.has(node.id);
          const isVisited = visited.has(node.id);
          const isActive = isCurrent || isNeighbor;
          const nodeClasses = cycleDetected
            ? "fill-rose-100 stroke-rose-500"
            : isActive && activeClasses
              ? activeClasses.node
              : isPath
                ? PATH_NODE_CLASSES
                : isResult
                  ? RESULT_NODE_CLASSES
                  : isFrontier
                    ? FRONTIER_NODE_CLASSES
                    : isVisited
                      ? VISITED_NODE_CLASSES
                      : DEFAULT_NODE_CLASSES;
          const hasDarkFill = !cycleDetected && (isActive || isPath || isResult || isFrontier || isVisited);

          return (
            <g key={node.id} className="transition-all duration-200">
              {showStart && node.id === start ? <circle cx={node.x} cy={node.y} r="32" strokeWidth="3" strokeDasharray="5 4" className="fill-none stroke-emerald-500" /> : null}
              {showTarget && node.id === target ? <circle cx={node.x} cy={node.y} r="36" strokeWidth="3" className="fill-none stroke-rose-500" /> : null}
              <circle cx={node.x} cy={node.y} r="25" strokeWidth={isActive ? 6 : 2.5} className={`${nodeClasses} drop-shadow-sm`} />
              <text x={node.x} y={node.y + 5} textAnchor="middle" className={`${hasDarkFill ? "fill-white" : "fill-slate-800"} text-sm font-black`}>{node.id}</text>
              {step?.distances?.[node.id] !== undefined ? <text x={node.x} y={node.y + 48} textAnchor="middle" className="fill-slate-700 text-[11px] font-bold">g = {step.distances[node.id]}</text> : null}
              <title>{`Node ${node.id}${showStart && node.id === start ? ", start" : ""}${showTarget && node.id === target ? ", target" : ""}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
