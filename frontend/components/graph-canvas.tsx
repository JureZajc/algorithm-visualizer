import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";

import { ActionHalo } from "@/components/action-halo";
import { OverflowFrame } from "@/components/overflow-frame";
import { useVisualizationDescriptionId } from "@/components/visualization-description";
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
  isPlacementActive?: boolean;
  /** Names the node waiting to be placed in the keyboard placement label. */
  pendingNodeId?: string | null;
  onCanvasClick?: (x: number, y: number) => void;
}

// Keyboard placement fills a fixed grid of slots, row by row, inside the clickable area.
const PLACEMENT_COLUMNS = [75, 175, 275, 375, 475, 575];
const PLACEMENT_ROWS = [70, 160, 250, 340];
const MIN_NODE_SPACING = 90;

/**
 * The first slot at least `MIN_NODE_SPACING` away from every node. When every slot is
 * crowded, the slot farthest from its nearest node.
 */
export function nextFreeNodePosition(nodes: GraphNodePosition[]) {
  let best = { x: PLACEMENT_COLUMNS[0], y: PLACEMENT_ROWS[0] };
  let bestDistance = -1;
  for (const y of PLACEMENT_ROWS) {
    for (const x of PLACEMENT_COLUMNS) {
      const nearest = Math.min(Infinity, ...nodes.map((node) => Math.hypot(node.x - x, node.y - y)));
      if (nearest >= MIN_NODE_SPACING) return { x, y };
      if (nearest > bestDistance) {
        best = { x, y };
        bestDistance = nearest;
      }
    }
  }
  return best;
}

interface GraphStepClasses {
  node: string;
  halo: string;
  edge: string;
  markerId: string;
  weight: string;
}

const GRAPH_STEP_CLASSES: Record<GraphStepType, GraphStepClasses> = {
  visit: { node: "fill-sky-500 stroke-sky-700", halo: "fill-sky-200", edge: "stroke-sky-500", markerId: "arrow-visit", weight: "fill-sky-800" },
  inspect_edge: { node: "fill-amber-400 stroke-amber-600", halo: "fill-amber-200", edge: "stroke-amber-500", markerId: "arrow-active", weight: "fill-amber-800" },
  enqueue: { node: "fill-violet-500 stroke-violet-700", halo: "fill-violet-200", edge: "stroke-violet-500", markerId: "arrow-frontier", weight: "fill-violet-800" },
  dequeue: { node: "fill-amber-400 stroke-amber-600", halo: "fill-amber-200", edge: "stroke-amber-500", markerId: "arrow-active", weight: "fill-amber-800" },
  push: { node: "fill-violet-500 stroke-violet-700", halo: "fill-violet-200", edge: "stroke-violet-500", markerId: "arrow-frontier", weight: "fill-violet-800" },
  pop: { node: "fill-amber-400 stroke-amber-600", halo: "fill-amber-200", edge: "stroke-amber-500", markerId: "arrow-active", weight: "fill-amber-800" },
  relax: { node: "fill-fuchsia-500 stroke-fuchsia-700", halo: "fill-fuchsia-200", edge: "stroke-fuchsia-500", markerId: "arrow-relax", weight: "fill-fuchsia-800" },
  path_found: { node: "fill-emerald-500 stroke-emerald-700", halo: "fill-emerald-200", edge: "stroke-emerald-500", markerId: "arrow-success", weight: "fill-emerald-800" },
  not_found: { node: "fill-slate-500 stroke-slate-700", halo: "fill-slate-200", edge: "stroke-slate-500", markerId: "arrow-default", weight: "fill-slate-700" },
  cycle_detected: { node: "fill-rose-500 stroke-rose-700", halo: "fill-rose-200", edge: "stroke-rose-500", markerId: "arrow-reject", weight: "fill-rose-800" },
  accept_edge: { node: "fill-emerald-500 stroke-emerald-700", halo: "fill-emerald-200", edge: "stroke-emerald-500", markerId: "arrow-success", weight: "fill-emerald-800" },
  reject_edge: { node: "fill-rose-500 stroke-rose-700", halo: "fill-rose-200", edge: "stroke-rose-500", markerId: "arrow-reject", weight: "fill-rose-800" },
  add_to_result: { node: "fill-teal-500 stroke-teal-700", halo: "fill-teal-200", edge: "stroke-teal-500", markerId: "arrow-result", weight: "fill-teal-800" },
  update_frontier: { node: "fill-cyan-500 stroke-cyan-700", halo: "fill-cyan-200", edge: "stroke-cyan-500", markerId: "arrow-candidate", weight: "fill-cyan-800" },
  done: { node: "fill-emerald-500 stroke-emerald-700", halo: "fill-emerald-200", edge: "stroke-emerald-500", markerId: "arrow-success", weight: "fill-emerald-800" },
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

export function GraphCanvas({
  nodes,
  edges,
  start,
  target,
  directed,
  showStart,
  showTarget,
  step,
  isPlacementActive = false,
  pendingNodeId = null,
  onCanvasClick,
}: GraphCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const descriptionId = useVisualizationDescriptionId();
  const canPlaceNode = isPlacementActive && onCanvasClick !== undefined;

  // Starting a placement disables the editor control that had focus. Catch that focus here,
  // so a keyboard user lands on the surface instead of the top of the page.
  useEffect(() => {
    if (!canPlaceNode) return;
    const focused = document.activeElement;
    if (!focused || focused === document.body || focused.matches(":disabled")) {
      surfaceRef.current?.focus();
    }
  }, [canPlaceNode]);

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

  function handleCanvasClick(event: MouseEvent<SVGRectElement>) {
    const svg = event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix || !onCanvasClick) return;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const graphPoint = point.matrixTransform(matrix.inverse());
    onCanvasClick(
      Math.min(618, Math.max(32, graphPoint.x)),
      Math.min(378, Math.max(32, graphPoint.y)),
    );
  }

  function placeAtNextFreePosition() {
    const { x, y } = nextFreeNodePosition(nodes);
    onCanvasClick?.(x, y);
  }

  function handleSurfaceKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    placeAtNextFreePosition();
  }

  // Pointer clicks land on the SVG and use the click position. A click on the surface itself
  // comes from assistive technology activating the button.
  function handleSurfaceClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) placeAtNextFreePosition();
  }

  const placementSurfaceProps = canPlaceNode
    ? {
        "aria-label": pendingNodeId
          ? `Place node ${pendingNodeId} at the next free position`
          : "Place the new node at the next free position",
        role: "button",
        tabIndex: 0,
        onClick: handleSurfaceClick,
        onKeyDown: handleSurfaceKeyDown,
      }
    : {};

  return (
    <OverflowFrame
      className="rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.10),transparent_64%)] shadow-inner"
      focusable={!canPlaceNode}
      label="Graph"
    >
      {/* A readable minimum width; narrow screens scroll the graph instead of shrinking it. */}
      <div
        {...placementSurfaceProps}
        className="min-w-[560px] rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-indigo-300"
        ref={surfaceRef}
      >
        <svg className="block h-auto min-h-[360px] w-full" viewBox="0 0 650 410" role="img" aria-label="Weighted graph algorithm visualization" aria-describedby={descriptionId}>
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

          <rect
            x="0"
            y="0"
            width="650"
            height="410"
            className={isPlacementActive ? "cursor-crosshair fill-transparent" : "fill-transparent"}
            onClick={isPlacementActive ? handleCanvasClick : undefined}
          />

          {activeClasses
            ? nodes
                .filter((node) => node.id === step?.current || node.id === step?.neighbor)
                .map((node) => <ActionHalo className={activeClasses.halo} key={`halo-${node.id}`} x={node.x} y={node.y} />)
            : null}

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
    </OverflowFrame>
  );
}
