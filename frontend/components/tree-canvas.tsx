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
}

interface Edge {
  source: number;
  target: number;
}

interface TreeStepClasses {
  node: string;
  ring: string;
  text: string;
}

const TREE_STEP_CLASSES: Record<TreeStepType, TreeStepClasses> = {
  compare: {
    node: "fill-amber-400 stroke-amber-600",
    ring: "stroke-amber-300",
    text: "fill-slate-950",
  },
  insert: {
    node: "fill-violet-500 stroke-violet-700",
    ring: "stroke-violet-300",
    text: "fill-white",
  },
  visit: {
    node: "fill-sky-500 stroke-sky-700",
    ring: "stroke-sky-300",
    text: "fill-white",
  },
  found: {
    node: "fill-emerald-500 stroke-emerald-700",
    ring: "stroke-emerald-300",
    text: "fill-white",
  },
  not_found: {
    node: "fill-slate-500 stroke-slate-700",
    ring: "stroke-slate-300",
    text: "fill-white",
  },
  traverse: {
    node: "fill-indigo-500 stroke-indigo-700",
    ring: "stroke-indigo-300",
    text: "fill-white",
  },
  done: {
    node: "fill-emerald-500 stroke-emerald-700",
    ring: "stroke-emerald-300",
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

export function TreeCanvas({ tree, step }: TreeCanvasProps) {
  const layout = createTreeLayout(tree);
  const positions = new Map(layout.nodes.map((node) => [node.value, node]));
  const path = new Set(step?.path ?? []);
  const visited = new Set(step?.visited ?? []);
  const activeValue = step?.current_node;
  const activeClasses = step ? TREE_STEP_CLASSES[step.type] : null;
  const pathValues = step?.path ?? [];
  const activePathEdges = new Set(
    pathValues
      .slice(1)
      .map((value, index) => edgeKey(pathValues[index], value)),
  );

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.10),transparent_64%)] shadow-inner">
      <svg
        className="h-auto min-h-[360px] min-w-[650px] w-full"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="Binary search tree visualization"
      >
        <rect x="0" y="0" width={layout.width} height={layout.height} className="fill-transparent" />

        {layout.edges.map((edge) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);
          if (!source || !target) return null;
          const isPath = activePathEdges.has(edgeKey(edge.source, edge.target));
          const isVisitedEdge = visited.has(edge.source) && visited.has(edge.target);
          const edgeClass = isPath
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
              strokeWidth={isPath ? 6 : isVisitedEdge ? 5 : 3}
              className={`${edgeClass} transition-all duration-200`}
            />
          );
        })}

        {layout.nodes.map((node) => {
          const isActive = activeValue === node.value && activeClasses !== null;
          const isVisited = visited.has(node.value);
          const isPath = path.has(node.value);
          const nodeClasses = isActive
            ? activeClasses.node
            : isVisited
              ? VISITED_NODE_CLASSES.node
              : isPath
                ? PATH_NODE_CLASSES.node
                : DEFAULT_NODE_CLASSES.node;
          const textClass = isActive
            ? activeClasses.text
            : isVisited
              ? VISITED_NODE_CLASSES.text
              : isPath
                ? PATH_NODE_CLASSES.text
                : DEFAULT_NODE_CLASSES.text;

          return (
            <g key={node.value} className="transition-all duration-200">
              {isActive && activeClasses ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="34"
                  strokeWidth="4"
                  className={`fill-none ${activeClasses.ring}`}
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r="25"
                strokeWidth={isActive ? 6 : 2.5}
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
              <title>{`Node ${node.value}`}</title>
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
    </div>
  );
}

function edgeKey(source: number, target: number) {
  return `${source}->${target}`;
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
