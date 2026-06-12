import type { GraphEdge, GraphNodePosition, GraphStep, GraphStepType } from "@/types/graph";

interface GraphCanvasProps {
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
  start: string;
  target: string;
  directed: boolean;
  step: GraphStep | null;
}

interface GraphStepClasses {
  nodeFill: string;
  nodeStroke: string;
  edgeStroke: string;
  markerId: string;
  weightText: string;
}

const GRAPH_STEP_CLASSES: Record<GraphStepType, GraphStepClasses> = {
  visit: {
    nodeFill: "fill-sky-500",
    nodeStroke: "stroke-sky-600",
    edgeStroke: "stroke-sky-500",
    markerId: "arrow-visit",
    weightText: "fill-sky-700",
  },
  inspect_edge: {
    nodeFill: "fill-amber-400",
    nodeStroke: "stroke-amber-500",
    edgeStroke: "stroke-amber-500",
    markerId: "arrow-active",
    weightText: "fill-amber-700",
  },
  enqueue: {
    nodeFill: "fill-violet-500",
    nodeStroke: "stroke-violet-600",
    edgeStroke: "stroke-violet-500",
    markerId: "arrow-frontier",
    weightText: "fill-violet-700",
  },
  dequeue: {
    nodeFill: "fill-amber-400",
    nodeStroke: "stroke-amber-500",
    edgeStroke: "stroke-amber-500",
    markerId: "arrow-active",
    weightText: "fill-amber-700",
  },
  push: {
    nodeFill: "fill-violet-500",
    nodeStroke: "stroke-violet-600",
    edgeStroke: "stroke-violet-500",
    markerId: "arrow-frontier",
    weightText: "fill-violet-700",
  },
  pop: {
    nodeFill: "fill-amber-400",
    nodeStroke: "stroke-amber-500",
    edgeStroke: "stroke-amber-500",
    markerId: "arrow-active",
    weightText: "fill-amber-700",
  },
  relax: {
    nodeFill: "fill-rose-500",
    nodeStroke: "stroke-rose-600",
    edgeStroke: "stroke-rose-500",
    markerId: "arrow-relax",
    weightText: "fill-rose-700",
  },
  path_found: {
    nodeFill: "fill-emerald-500",
    nodeStroke: "stroke-emerald-600",
    edgeStroke: "stroke-emerald-500",
    markerId: "arrow-path",
    weightText: "fill-emerald-700",
  },
  not_found: {
    nodeFill: "fill-slate-400",
    nodeStroke: "stroke-slate-500",
    edgeStroke: "stroke-slate-400",
    markerId: "arrow-not-found",
    weightText: "fill-slate-700",
  },
  done: {
    nodeFill: "fill-emerald-500",
    nodeStroke: "stroke-emerald-600",
    edgeStroke: "stroke-emerald-500",
    markerId: "arrow-path",
    weightText: "fill-emerald-700",
  },
};

const DEFAULT_NODE_CLASSES = "fill-white stroke-slate-600";
const FRONTIER_NODE_CLASSES = "fill-violet-500 stroke-violet-600";
const VISITED_NODE_CLASSES = "fill-sky-500 stroke-sky-600";
const PATH_NODE_CLASSES = "fill-emerald-500 stroke-emerald-600";

function edgeKey(source: string, target: string, directed: boolean) {
  return directed ? `${source}->${target}` : [source, target].sort().join("--");
}

export function GraphCanvas({ nodes, edges, start, target, directed, step }: GraphCanvasProps) {
  const positions = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set(step?.visited ?? []);
  const frontier = new Set(step?.frontier ?? []);
  const path = step?.path ?? [];
  const pathEdges = new Set(path.slice(1).map((node, index) => edgeKey(path[index], node, directed)));
  const activeEdgeKey = step?.edge ? edgeKey(step.edge.source, step.edge.target, directed) : null;
  const activeClasses = step ? GRAPH_STEP_CLASSES[step.type] : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_65%)]">
      <svg className="h-auto min-h-[360px] w-full" viewBox="0 0 650 410" role="img" aria-label="Weighted graph visualization">
        <defs>
          <marker id="arrow-default" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" className="fill-slate-400" /></marker>
          <marker id="arrow-visit" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" className="fill-sky-500" /></marker>
          <marker id="arrow-active" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" className="fill-amber-500" /></marker>
          <marker id="arrow-frontier" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" className="fill-violet-500" /></marker>
          <marker id="arrow-relax" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" className="fill-rose-500" /></marker>
          <marker id="arrow-path" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" className="fill-emerald-500" /></marker>
          <marker id="arrow-not-found" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" className="fill-slate-400" /></marker>
        </defs>

        {edges.map((edge, index) => {
          const source = positions.get(edge.source);
          const targetNode = positions.get(edge.target);
          if (!source || !targetNode) return null;
          const key = edgeKey(edge.source, edge.target, directed);
          const isPath = pathEdges.has(key);
          const isActive = activeEdgeKey === key && activeClasses !== null;
          const edgeStrokeClass = isPath
            ? "stroke-emerald-500"
            : isActive
              ? activeClasses.edgeStroke
              : "stroke-slate-400";
          const weightTextClass = isPath
            ? "fill-emerald-700"
            : isActive
              ? activeClasses.weightText
              : "fill-slate-700";
          const markerId = isPath ? "arrow-path" : isActive ? activeClasses.markerId : "arrow-default";
          const marker = directed ? `url(#${markerId})` : undefined;
          const midX = (source.x + targetNode.x) / 2;
          const midY = (source.y + targetNode.y) / 2;
          return (
            <g key={`${edge.source}-${edge.target}-${index}`}>
              <line x1={source.x} y1={source.y} x2={targetNode.x} y2={targetNode.y} strokeWidth={isPath ? 7 : isActive ? 6 : 3} strokeLinecap="round" markerEnd={marker} className={`${edgeStrokeClass} transition-all duration-200`} />
              <circle cx={midX} cy={midY} r="13" strokeWidth="2" className={`fill-white ${edgeStrokeClass}`} />
              <text x={midX} y={midY + 4} textAnchor="middle" className={`${weightTextClass} text-[11px] font-black`}>{edge.weight}</text>
            </g>
          );
        })}

        {nodes.map((node) => {
          const isCurrent = step?.current === node.id;
          const isNeighbor = step?.neighbor === node.id && step?.type === "inspect_edge";
          const isPath = path.includes(node.id);
          const isFrontier = frontier.has(node.id);
          const isVisited = visited.has(node.id);
          const isActive = isCurrent || isNeighbor;
          const nodeClasses = isPath
            ? PATH_NODE_CLASSES
            : isActive && activeClasses
              ? `${activeClasses.nodeFill} ${activeClasses.nodeStroke}`
              : isFrontier
                ? FRONTIER_NODE_CLASSES
                : isVisited
                  ? VISITED_NODE_CLASSES
                  : DEFAULT_NODE_CLASSES;
          const nodeTextClass = isPath || isActive || isFrontier || isVisited ? "fill-white" : "fill-slate-700";
          return (
            <g key={node.id} className="transition-all duration-200">
              {node.id === start ? <circle cx={node.x} cy={node.y} r="31" strokeWidth="3" strokeDasharray="5 4" className="fill-none stroke-emerald-500" /> : null}
              {node.id === target ? <circle cx={node.x} cy={node.y} r="35" strokeWidth="3" className="fill-none stroke-rose-500" /> : null}
              <circle cx={node.x} cy={node.y} r="25" strokeWidth={isActive ? 6 : 2.5} className={`${nodeClasses} drop-shadow-sm`} />
              <text x={node.x} y={node.y + 5} textAnchor="middle" className={`${nodeTextClass} text-sm font-black`}>{node.id}</text>
              {step?.distances?.[node.id] !== undefined ? <text x={node.x} y={node.y + 48} textAnchor="middle" className="fill-slate-600 text-[11px] font-bold">d = {step.distances[node.id]}</text> : null}
              <title>{`Node ${node.id}${node.id === start ? ", start" : ""}${node.id === target ? ", target" : ""}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
