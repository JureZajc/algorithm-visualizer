import type { GraphEdge, GraphNodePosition, GraphStep } from "@/types/graph";

interface GraphCanvasProps {
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
  start: string;
  target: string;
  directed: boolean;
  step: GraphStep | null;
}

function edgeKey(source: string, target: string, directed: boolean) {
  return directed ? `${source}->${target}` : [source, target].sort().join("--");
}

export function GraphCanvas({ nodes, edges, start, target, directed, step }: GraphCanvasProps) {
  const positions = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set(step?.visited ?? []);
  const frontier = new Set(step?.frontier ?? []);
  const path = step?.path ?? [];
  const pathEdges = new Set(path.slice(1).map((node, index) => edgeKey(path[index], node, directed)));
  const inspectedKey = step?.edge ? edgeKey(step.edge.source, step.edge.target, directed) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_65%)]">
      <svg className="h-auto min-h-[360px] w-full" viewBox="0 0 650 410" role="img" aria-label="Weighted graph visualization">
        <defs>
          <marker id="arrow-default" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" /></marker>
          <marker id="arrow-active" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" /></marker>
          <marker id="arrow-path" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#10b981" /></marker>
        </defs>

        {edges.map((edge, index) => {
          const source = positions.get(edge.source);
          const targetNode = positions.get(edge.target);
          if (!source || !targetNode) return null;
          const key = edgeKey(edge.source, edge.target, directed);
          const isPath = pathEdges.has(key);
          const isInspected = inspectedKey === key && step?.type === "inspect_edge";
          const stroke = isPath ? "#10b981" : isInspected ? "#f59e0b" : "#94a3b8";
          const marker = directed ? `url(#${isPath ? "arrow-path" : isInspected ? "arrow-active" : "arrow-default"})` : undefined;
          const midX = (source.x + targetNode.x) / 2;
          const midY = (source.y + targetNode.y) / 2;
          return (
            <g key={`${edge.source}-${edge.target}-${index}`}>
              <line x1={source.x} y1={source.y} x2={targetNode.x} y2={targetNode.y} stroke={stroke} strokeWidth={isPath ? 7 : isInspected ? 6 : 3} strokeLinecap="round" markerEnd={marker} className="transition-all duration-200" />
              <circle cx={midX} cy={midY} r="13" fill="white" stroke={stroke} strokeWidth="2" />
              <text x={midX} y={midY + 4} textAnchor="middle" className="fill-slate-700 text-[11px] font-black">{edge.weight}</text>
            </g>
          );
        })}

        {nodes.map((node) => {
          const isCurrent = step?.current === node.id;
          const isNeighbor = step?.neighbor === node.id && step?.type === "inspect_edge";
          const isPath = path.includes(node.id);
          const isFrontier = frontier.has(node.id);
          const isVisited = visited.has(node.id);
          const fill = isCurrent ? "#f59e0b" : isPath ? "#10b981" : isFrontier ? "#8b5cf6" : isVisited ? "#0ea5e9" : "#ffffff";
          const textFill = isCurrent || isPath || isFrontier || isVisited ? "#ffffff" : "#334155";
          return (
            <g key={node.id} className="transition-all duration-200">
              {node.id === start ? <circle cx={node.x} cy={node.y} r="31" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="5 4" /> : null}
              {node.id === target ? <circle cx={node.x} cy={node.y} r="35" fill="none" stroke="#f43f5e" strokeWidth="3" /> : null}
              <circle cx={node.x} cy={node.y} r="25" fill={fill} stroke={isNeighbor ? "#f59e0b" : "#475569"} strokeWidth={isNeighbor ? 6 : 2.5} className="drop-shadow-sm" />
              <text x={node.x} y={node.y + 5} textAnchor="middle" fill={textFill} className="text-sm font-black">{node.id}</text>
              {step?.distances?.[node.id] !== undefined ? <text x={node.x} y={node.y + 48} textAnchor="middle" className="fill-slate-600 text-[11px] font-bold">d = {step.distances[node.id]}</text> : null}
              <title>{`Node ${node.id}${node.id === start ? ", start" : ""}${node.id === target ? ", target" : ""}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
