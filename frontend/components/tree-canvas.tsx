import { ActionHalo } from "@/components/action-halo";
import { OverflowFrame } from "@/components/overflow-frame";
import { useVisualizationDescriptionId } from "@/components/visualization-description";
import type { TreeNode, TreeStep, TreeStepType } from "@/types/trees";

interface TreeCanvasProps {
  tree: TreeNode | null;
  step: TreeStep | null;
}

interface PositionedNode {
  value: number;
  x: number;
  y: number;
  depth: number;
  left: number | null;
  right: number | null;
  height?: number;
  balanceFactor?: number;
}

interface Edge {
  source: number;
  target: number;
}

interface TreeStepClasses {
  node: string;
  halo: string;
  text: string;
}

const TREE_STEP_CLASSES: Record<TreeStepType, TreeStepClasses> = {
  compare: {
    node: "fill-amber-400 stroke-amber-600",
    halo: "fill-amber-200",
    text: "fill-slate-950",
  },
  insert: {
    node: "fill-violet-500 stroke-violet-700",
    halo: "fill-violet-200",
    text: "fill-white",
  },
  visit: {
    node: "fill-sky-500 stroke-sky-700",
    halo: "fill-sky-200",
    text: "fill-white",
  },
  found: {
    node: "fill-emerald-500 stroke-emerald-700",
    halo: "fill-emerald-200",
    text: "fill-white",
  },
  not_found: {
    node: "fill-slate-500 stroke-slate-700",
    halo: "fill-slate-200",
    text: "fill-white",
  },
  traverse: {
    node: "fill-indigo-500 stroke-indigo-700",
    halo: "fill-indigo-200",
    text: "fill-white",
  },
  balance_check: {
    node: "fill-cyan-500 stroke-cyan-700",
    halo: "fill-cyan-200",
    text: "fill-white",
  },
  imbalance: {
    node: "fill-rose-500 stroke-rose-700",
    halo: "fill-rose-200",
    text: "fill-white",
  },
  rotate: {
    node: "fill-fuchsia-500 stroke-fuchsia-700",
    halo: "fill-fuchsia-200",
    text: "fill-white",
  },
  done: {
    node: "fill-emerald-500 stroke-emerald-700",
    halo: "fill-emerald-200",
    text: "fill-white",
  },
};

const DEFAULT_NODE_CLASSES = {
  node: "fill-white stroke-slate-400",
  text: "fill-slate-800",
};
const PATH_NODE_CLASSES = {
  node: "fill-indigo-500 stroke-indigo-700",
  text: "fill-white",
};
const VISITED_NODE_CLASSES = {
  node: "fill-sky-500 stroke-sky-700",
  text: "fill-white",
};
const IMBALANCED_NODE_CLASSES = {
  node: "fill-rose-500 stroke-rose-700",
  halo: "fill-rose-200",
  text: "fill-white",
};
const ROTATION_NODE_CLASSES = {
  node: "fill-fuchsia-500 stroke-fuchsia-700",
  halo: "fill-fuchsia-200",
  text: "fill-white",
};
const ROTATION_EDGE_CLASS = "stroke-fuchsia-500";

export function TreeCanvas({ tree, step }: TreeCanvasProps) {
  const descriptionId = useVisualizationDescriptionId();
  const layout = createTreeLayout(tree);
  const positions = new Map(layout.nodes.map((node) => [node.value, node]));
  const path = new Set(step?.path ?? []);
  const visited = new Set(step?.visited ?? []);
  const rotationValues = new Set(step?.rotation_nodes ?? []);
  const imbalancedValue = step?.imbalanced_node ?? null;
  const activeValue = step?.current_node;
  const activeClasses = step ? TREE_STEP_CLASSES[step.type] : null;
  const pathValues = step?.path ?? [];
  const activePathEdges = new Set(
    pathValues
      .slice(1)
      .map((value, index) => edgeKey(pathValues[index], value)),
  );

  function haloClassFor(value: number) {
    if (imbalancedValue === value) return IMBALANCED_NODE_CLASSES.halo;
    if (rotationValues.has(value)) return ROTATION_NODE_CLASSES.halo;
    if (activeValue === value && activeClasses) return activeClasses.halo;
    return null;
  }

  return (
    <OverflowFrame
      className="max-h-[min(75vh,720px)] rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.10),transparent_64%)] shadow-inner"
      label="Binary search tree"
    >
      {/* Never narrower than the layout, so large trees scroll instead of shrinking their nodes. */}
      <svg
        className="block h-auto w-full"
        style={{ minWidth: layout.width }}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="Binary search tree visualization"
        aria-describedby={descriptionId}
      >
        <rect x="0" y="0" width={layout.width} height={layout.height} className="fill-transparent" />

        {layout.nodes.map((node) => {
          const haloClass = haloClassFor(node.value);
          return haloClass ? <ActionHalo className={haloClass} key={`halo-${node.value}`} x={node.x} y={node.y} /> : null;
        })}

        {layout.edges.map((edge) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);
          if (!source || !target) return null;
          const isPath = activePathEdges.has(edgeKey(edge.source, edge.target));
          const isRotationEdge = rotationValues.has(edge.source) && rotationValues.has(edge.target);
          const isVisitedEdge = visited.has(edge.source) && visited.has(edge.target);
          const edgeClass = isRotationEdge
            ? ROTATION_EDGE_CLASS
            : isPath
              ? "stroke-indigo-500"
              : isVisitedEdge
                ? "stroke-sky-400"
                : "stroke-slate-300";

          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={source.x}
              y1={source.y + 25}
              x2={target.x}
              y2={target.y - 25}
              strokeLinecap="round"
              strokeWidth={isRotationEdge ? 7 : isPath ? 6 : isVisitedEdge ? 5 : 3}
              className={`${edgeClass} transition-all duration-200`}
            />
          );
        })}

        {layout.nodes.map((node) => {
          const isImbalanced = imbalancedValue === node.value;
          const isRotationNode = rotationValues.has(node.value);
          const isActive = activeValue === node.value && activeClasses !== null;
          const isVisited = visited.has(node.value);
          const isPath = path.has(node.value);
          const nodeClasses = isImbalanced
            ? IMBALANCED_NODE_CLASSES.node
            : isRotationNode
              ? ROTATION_NODE_CLASSES.node
              : isActive
                ? activeClasses.node
                : isVisited
                  ? VISITED_NODE_CLASSES.node
                  : isPath
                    ? PATH_NODE_CLASSES.node
                    : DEFAULT_NODE_CLASSES.node;
          const textClass = isImbalanced
            ? IMBALANCED_NODE_CLASSES.text
            : isRotationNode
              ? ROTATION_NODE_CLASSES.text
              : isActive
                ? activeClasses.text
                : isVisited
                  ? VISITED_NODE_CLASSES.text
                  : isPath
                    ? PATH_NODE_CLASSES.text
                    : DEFAULT_NODE_CLASSES.text;
          const metrics = formatNodeMetrics(node);

          return (
            <g key={node.value} className="transition-all duration-200">
              <circle
                cx={node.x}
                cy={node.y}
                r="25"
                strokeWidth={isImbalanced || isRotationNode || isActive ? 6 : 2.5}
                className={`${nodeClasses} drop-shadow-sm`}
              />
              <text
                x={node.x}
                y={node.y + 5}
                textAnchor="middle"
                className={`${textClass} text-sm font-black`}
              >
                {node.value}
              </text>
              {metrics ? (
                <g>
                  <rect
                    x={node.x - 39}
                    y={node.y + 34}
                    width="78"
                    height="20"
                    rx="8"
                    className="fill-white stroke-slate-200"
                  />
                  <text
                    x={node.x}
                    y={node.y + 48}
                    textAnchor="middle"
                    className="fill-slate-600 font-mono text-[10px] font-bold"
                  >
                    {metrics}
                  </text>
                </g>
              ) : null}
              <title>{metrics ? `Node ${node.value}, ${metrics}` : `Node ${node.value}`}</title>
            </g>
          );
        })}

        {layout.nodes.length === 0 ? (
          <text
            x={layout.width / 2}
            y={layout.height / 2}
            textAnchor="middle"
            className="fill-slate-500 text-sm font-bold"
          >
            Start a visualization to draw the tree.
          </text>
        ) : null}
      </svg>
    </OverflowFrame>
  );
}

function edgeKey(source: number, target: number) {
  return `${source}->${target}`;
}

function formatNodeMetrics(node: PositionedNode) {
  if (typeof node.height !== "number" && typeof node.balanceFactor !== "number") {
    return null;
  }

  const heightLabel = typeof node.height === "number" ? `h${node.height}` : "";
  const balanceLabel = typeof node.balanceFactor === "number" ? `bf${node.balanceFactor}` : "";
  return [heightLabel, balanceLabel].filter(Boolean).join(" ");
}

function createTreeLayout(tree: TreeNode | null) {
  const nodes: PositionedNode[] = [];
  const edges: Edge[] = [];
  let column = 0;
  let maxDepth = 0;

  function walk(node: TreeNode | null, depth: number): number | null {
    if (!node) return null;

    const left = walk(node.left, depth + 1);
    const currentColumn = column;
    column += 1;
    const right = walk(node.right, depth + 1);
    maxDepth = Math.max(maxDepth, depth);

    if (left !== null) edges.push({ source: node.value, target: left });
    if (right !== null) edges.push({ source: node.value, target: right });
    nodes.push({
      value: node.value,
      x: 0,
      y: 0,
      depth,
      left,
      right,
      height: node.height,
      balanceFactor: node.balance_factor,
    });
    nodes[nodes.length - 1].x = currentColumn;
    return node.value;
  }

  walk(tree, 0);

  const width = Math.max(650, nodes.length * 76 + 80);
  const height = Math.max(360, maxDepth * 86 + 130);
  const usableWidth = width - 80;
  const denominator = Math.max(1, nodes.length - 1);

  for (const node of nodes) {
    node.x = Math.round(40 + (node.x * usableWidth) / denominator);
    node.y = 62 + node.depth * 86;
  }

  return { nodes, edges, width, height };
}
