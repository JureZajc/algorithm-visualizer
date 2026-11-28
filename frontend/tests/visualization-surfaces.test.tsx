import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BacktrackingGrid, gridTrackStyle } from "@/components/backtracking-grid";
import { GraphCanvas, nextFreeNodePosition } from "@/components/graph-canvas";
import { GraphVisualizer } from "@/components/graph-visualizer";
import { HashTableView } from "@/components/hash-table-view";
import { OverflowFrame } from "@/components/overflow-frame";
import { SudokuGrid } from "@/components/sudoku-grid";
import { TreeCanvas } from "@/components/tree-canvas";
import { VisualizationPanel } from "@/components/visualizer-panel";
import type { BacktrackingCell, SudokuBoard } from "@/types/backtracking";
import type { GraphStep } from "@/types/graph";
import type { HashTableSnapshot } from "@/types/hash-tables";
import type { TreeNode, TreeStep } from "@/types/trees";

vi.mock("@/lib/api", () => ({ fetchGraphSteps: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Records every ResizeObserver callback so a test can report a new size. */
function stubResizeObserver() {
  const callbacks: Array<() => void> = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  return () => act(() => callbacks.forEach((callback) => callback()));
}

function setScrollSize(element: HTMLElement, size: { scrollWidth: number; clientWidth: number; scrollHeight?: number; clientHeight?: number }) {
  for (const [property, value] of Object.entries({ scrollHeight: 100, clientHeight: 100, ...size })) {
    Object.defineProperty(element, property, { configurable: true, value });
  }
}

function tabStops(elements: HTMLElement[]) {
  return elements.filter((element) => element.tabIndex === 0);
}

describe("OverflowFrame", () => {
  function renderFrame(focusable?: boolean) {
    const notifyResize = stubResizeObserver();
    render(
      <OverflowFrame label="Wide table" focusable={focusable}>
        <table data-testid="content" />
      </OverflowFrame>,
    );
    const frame = screen.getByTestId("content").parentElement!;
    return { frame, notifyResize };
  }

  it("stays out of the tab order and hides the hint while the content fits", () => {
    const { frame, notifyResize } = renderFrame();
    setScrollSize(frame, { scrollWidth: 300, clientWidth: 300 });
    notifyResize();

    expect(screen.queryByText("Scroll to explore")).toBeNull();
    expect(frame.getAttribute("tabindex")).toBeNull();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("becomes a labelled tab stop with a scroll hint when the content overflows", () => {
    const { frame, notifyResize } = renderFrame();
    setScrollSize(frame, { scrollWidth: 900, clientWidth: 300 });
    notifyResize();

    const group = screen.getByRole("group", { name: "Wide table" });
    expect(group).toBe(frame);
    expect(group.tabIndex).toBe(0);
    const hint = document.getElementById(group.getAttribute("aria-describedby")!)!;
    expect(hint.textContent).toContain("Scroll to explore");

    setScrollSize(frame, { scrollWidth: 300, clientWidth: 300 });
    notifyResize();
    expect(screen.queryByText("Scroll to explore")).toBeNull();
    expect(frame.getAttribute("tabindex")).toBeNull();
  });

  it("shows the hint without a tab stop when the content has its own", () => {
    const { frame, notifyResize } = renderFrame(false);
    setScrollSize(frame, { scrollWidth: 300, clientWidth: 300, scrollHeight: 900, clientHeight: 400 });
    notifyResize();

    expect(screen.getByText("Scroll to explore")).toBeTruthy();
    expect(frame.getAttribute("tabindex")).toBeNull();
    expect(screen.queryByRole("group")).toBeNull();
  });
});

describe("maze grid", () => {
  function mazeGrid(rows: number, columns: number): BacktrackingCell[][] {
    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, column): BacktrackingCell => {
        if (row === 0 && column === 0) return "start";
        if (row === rows - 1 && column === columns - 1) return "end";
        return "empty";
      }),
    );
  }

  function cell(row: number, column: number, value = "empty") {
    return screen.getByRole("button", { name: `Edit row ${row}, column ${column}: ${value}` });
  }

  function press(key: string, options: { ctrlKey?: boolean } = {}) {
    fireEvent.keyDown(document.activeElement!, { key, ...options });
  }

  it("keeps one cell in the tab order and moves focus with the arrow keys, Home, and End", () => {
    const onCellClick = vi.fn();
    render(<BacktrackingGrid algorithm="maze_solver" grid={mazeGrid(3, 4)} step={null} onCellClick={onCellClick} />);

    const grid = screen.getByRole("grid", { name: "Maze" });
    const cells = within(grid).getAllByRole("button");
    expect(cells).toHaveLength(12);
    expect(tabStops(cells)).toEqual([cell(1, 1, "start")]);

    cell(1, 1, "start").focus();
    press("ArrowRight");
    expect(document.activeElement).toBe(cell(1, 2));
    expect(tabStops(cells)).toEqual([cell(1, 2)]);

    press("ArrowDown");
    expect(document.activeElement).toBe(cell(2, 2));
    press("End");
    expect(document.activeElement).toBe(cell(2, 4));
    press("Home");
    expect(document.activeElement).toBe(cell(2, 1));
    press("ArrowLeft");
    expect(document.activeElement).toBe(cell(2, 1));
    press("End", { ctrlKey: true });
    expect(document.activeElement).toBe(cell(3, 4, "end"));
    press("ArrowDown");
    expect(document.activeElement).toBe(cell(3, 4, "end"));
    press("Home", { ctrlKey: true });
    expect(document.activeElement).toBe(cell(1, 1, "start"));
    press("ArrowUp");
    expect(document.activeElement).toBe(cell(1, 1, "start"));

    fireEvent.click(cell(2, 3));
    expect(onCellClick).toHaveBeenCalledWith(1, 2);
  });

  it("moves the tab stop to a cell focused by other means", () => {
    render(<BacktrackingGrid algorithm="maze_solver" grid={mazeGrid(3, 3)} step={null} onCellClick={vi.fn()} />);
    act(() => cell(3, 2).focus());
    expect(tabStops(screen.getAllByRole("button"))).toEqual([cell(3, 2)]);
  });

  it("shows a read-only table while editing is disabled and for N-Queens", () => {
    const { rerender } = render(
      <BacktrackingGrid algorithm="maze_solver" grid={mazeGrid(2, 2)} step={null} onCellClick={vi.fn()} editingDisabled />,
    );
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    const table = screen.getByRole("table", { name: "Maze" });
    expect(within(table).getAllByRole("cell")[0].getAttribute("aria-label")).toBe("Row 1, column 1: start");

    rerender(<BacktrackingGrid algorithm="n_queens" grid={[["queen", "empty"], ["empty", "empty"]]} step={null} />);
    expect(screen.getByRole("table", { name: "N-Queens board" })).toBeTruthy();
  });

  it("sizes explicit tracks so cells never overflow their columns", () => {
    expect(gridTrackStyle(15, "2.75rem", "0.25rem")).toEqual({
      gridTemplateColumns: "repeat(15, minmax(2.75rem, 1fr))",
      minWidth: "calc(15 * 2.75rem + 14 * 0.25rem + 0px)",
    });
  });
});

describe("Sudoku grid", () => {
  const board: SudokuBoard = Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, column) => (row === 0 && column === 0 ? "5" : ".")),
  );

  function cell(row: number, column: number) {
    return screen.getByRole("textbox", { name: `Sudoku row ${row}, column ${column}` });
  }

  it("keeps one cell in the tab order and moves focus with the arrow keys", () => {
    const onCellChange = vi.fn();
    render(<SudokuGrid board={board} step={null} editingDisabled={false} onCellChange={onCellChange} />);

    const grid = screen.getByRole("grid", { name: "Sudoku board" });
    const cells = within(grid).getAllByRole("textbox");
    expect(cells).toHaveLength(81);
    expect(tabStops(cells)).toEqual([cell(1, 1)]);

    cell(1, 1).focus();
    fireEvent.keyDown(cell(1, 1), { key: "ArrowRight" });
    expect(document.activeElement).toBe(cell(1, 2));
    fireEvent.keyDown(cell(1, 2), { key: "ArrowDown" });
    expect(document.activeElement).toBe(cell(2, 2));
    fireEvent.keyDown(cell(2, 2), { key: "End", ctrlKey: true });
    expect(document.activeElement).toBe(cell(9, 9));
    expect(tabStops(cells)).toEqual([cell(9, 9)]);

    fireEvent.change(cell(9, 9), { target: { value: "7" } });
    expect(onCellChange).toHaveBeenCalledWith(8, 8, "7");
  });

  it("leaves typing keys to the cell", () => {
    render(<SudokuGrid board={board} step={null} editingDisabled={false} onCellChange={vi.fn()} />);
    cell(1, 1).focus();
    fireEvent.keyDown(cell(1, 1), { key: "4" });
    fireEvent.keyDown(cell(1, 1), { key: "ArrowRight", shiftKey: true });
    expect(document.activeElement).toBe(cell(1, 1));
  });

  it("shows a read-only table with disabled cells during playback", () => {
    render(<SudokuGrid board={board} step={null} editingDisabled onCellChange={vi.fn()} />);
    expect(screen.queryByRole("grid")).toBeNull();
    const table = screen.getByRole("table", { name: "Sudoku board" });
    const cells = within(table).getAllByRole("textbox") as HTMLInputElement[];
    expect(cells.every((input) => input.disabled)).toBe(true);
  });
});

describe("graph node placement", () => {
  const canvasProps = {
    edges: [],
    start: "A",
    target: "A",
    directed: false,
    showStart: false,
    showTarget: false,
    step: null,
  };

  it("fills free slots row by row and falls back to the least crowded slot", () => {
    expect(nextFreeNodePosition([])).toEqual({ x: 75, y: 70 });
    expect(nextFreeNodePosition([{ id: "A", x: 75, y: 70 }])).toEqual({ x: 175, y: 70 });
    expect(nextFreeNodePosition([{ id: "A", x: 120, y: 70 }])).toEqual({ x: 275, y: 70 });

    const everySlot = [70, 160, 250, 340].flatMap((y) =>
      [75, 175, 275, 375, 475, 575].map((x) => ({ id: `${x}-${y}`, x, y })),
    );
    const crowded = everySlot.filter((node) => !(node.x === 575 && node.y === 340));
    expect(nextFreeNodePosition(crowded)).toEqual({ x: 575, y: 340 });
    expect(nextFreeNodePosition(everySlot)).toEqual({ x: 75, y: 70 });
  });

  it("is not focusable until a node is waiting to be placed", () => {
    const onCanvasClick = vi.fn();
    const { rerender } = render(<GraphCanvas {...canvasProps} nodes={[]} onCanvasClick={onCanvasClick} />);
    expect(screen.queryByRole("button")).toBeNull();

    rerender(<GraphCanvas {...canvasProps} nodes={[]} isPlacementActive onCanvasClick={onCanvasClick} />);
    expect(screen.getByRole("button", { name: "Place the new node at the next free position" }).tabIndex).toBe(0);
  });

  it("places the pending node with Enter or Space through onCanvasClick", () => {
    const onCanvasClick = vi.fn();
    render(
      <GraphCanvas
        {...canvasProps}
        nodes={[{ id: "A", x: 75, y: 70 }]}
        isPlacementActive
        pendingNodeId="B"
        onCanvasClick={onCanvasClick}
      />,
    );
    const surface = screen.getByRole("button", { name: "Place node B at the next free position" });
    expect(document.activeElement).toBe(surface);

    fireEvent.keyDown(surface, { key: "Enter" });
    expect(onCanvasClick).toHaveBeenLastCalledWith(175, 70);
    fireEvent.keyDown(surface, { key: " " });
    expect(onCanvasClick).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(surface, { key: "a" });
    expect(onCanvasClick).toHaveBeenCalledTimes(2);
  });

  it("adds custom graph nodes from the keyboard alone", () => {
    render(<GraphVisualizer algorithms={[]} isMetadataLoading={false} metadataError={null} />);
    fireEvent.change(screen.getByLabelText("Graph"), { target: { value: "custom" } });

    for (const nodeId of ["A", "B"]) {
      const input = screen.getByLabelText("Node ID") as HTMLInputElement;
      input.focus();
      fireEvent.change(input, { target: { value: nodeId } });
      fireEvent.submit(input.form!);

      const surface = screen.getByRole("button", { name: /at the next free position/ });
      expect(document.activeElement).toBe(surface);
      fireEvent.keyDown(surface, { key: "Enter" });
      expect(screen.getByRole("button", { name: `Remove node ${nodeId}` })).toBeTruthy();
    }

    const nodeB = screen.getByText("Node B", { selector: "title" }).parentElement!;
    expect(nodeB.querySelector("circle:not([stroke-dasharray])")!.getAttribute("cx")).toBe("175");
  });
});

describe("hash table view", () => {
  const chaining: HashTableSnapshot = {
    strategy: "separate_chaining",
    size: 3,
    buckets: [
      { index: 0, items: [3, 6] },
      { index: 1, items: [] },
      { index: 2, items: [5] },
    ],
  };

  it("lists buckets and their chains and states the counts", () => {
    render(<HashTableView table={chaining} step={null} />);
    expect(screen.getByText("3 buckets · 3 keys stored")).toBeTruthy();
    const buckets = screen.getByRole("list", { name: "Buckets" });
    expect(buckets.children).toHaveLength(3);
    const chain = screen.getByRole("list", { name: "Chain in bucket 0" });
    expect(within(chain).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["3", "6"]);
    expect(buckets.children[1].textContent).toContain("Bucket 1");
  });

  it("lists probing slots", () => {
    render(
      <HashTableView
        table={{ strategy: "linear_probing", size: 2, buckets: [{ index: 0, items: [4] }, { index: 1, items: [] }] }}
        step={null}
      />,
    );
    expect(screen.getByText("2 slots · 1 key stored")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Slots" }).children).toHaveLength(2);
  });
});

describe("tree canvas", () => {
  it("keeps a 31-node degenerate tree at its computed size", () => {
    let tree: TreeNode | null = null;
    for (let value = 31; value >= 1; value -= 1) {
      tree = { value, left: null, right: tree };
    }
    render(<TreeCanvas tree={tree} step={null} />);
    const svg = screen.getByRole("img", { name: "Binary search tree visualization" });
    expect(svg.getAttribute("viewBox")).toBe("0 0 2436 2710");
    expect(svg.style.minWidth).toBe("2436px");
  });
});

describe("current action halo", () => {
  const graphProps = {
    nodes: [
      { id: "A", x: 100, y: 100 },
      { id: "B", x: 250, y: 100 },
      { id: "C", x: 400, y: 100 },
    ],
    edges: [{ source: "A", target: "B", weight: 1 }],
    start: "A",
    target: "C",
    directed: false,
    showStart: true,
    showTarget: true,
  };

  function halos(container: HTMLElement) {
    return Array.from(container.querySelectorAll("[data-action-halo]"));
  }

  it("marks the graph's current node and neighbor, under the edges", () => {
    const step = { type: "inspect_edge", current: "A", neighbor: "B", visited: [], frontier: [] } as unknown as GraphStep;
    const { container, rerender } = render(<GraphCanvas {...graphProps} step={null} />);
    expect(halos(container)).toHaveLength(0);

    rerender(<GraphCanvas {...graphProps} step={step} />);
    const drawn = halos(container);
    expect(drawn.map((halo) => [halo.getAttribute("cx"), halo.getAttribute("r"), halo.getAttribute("class")])).toEqual([
      ["100", "40", "pointer-events-none fill-amber-200"],
      ["250", "40", "pointer-events-none fill-amber-200"],
    ]);
    // Drawn before the edges, so the edge and its weight stay on top.
    const edge = container.querySelector("line")!;
    expect(drawn[1].compareDocumentPosition(edge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("marks the tree's current, imbalanced, and rotated nodes with the same halo", () => {
    const tree: TreeNode = {
      value: 2,
      left: { value: 1, left: null, right: null },
      right: { value: 3, left: null, right: null },
    };
    const step = { type: "compare", current_node: 1, imbalanced_node: 2, rotation_nodes: [3], path: [], visited: [] } as unknown as TreeStep;
    const { container } = render(<TreeCanvas tree={tree} step={step} />);
    const drawn = halos(container);
    expect(drawn.map((halo) => halo.getAttribute("r"))).toEqual(["40", "40", "40"]);
    expect(drawn.map((halo) => halo.getAttribute("class")).sort()).toEqual([
      "pointer-events-none fill-amber-200",
      "pointer-events-none fill-fuchsia-200",
      "pointer-events-none fill-rose-200",
    ]);
    expect(drawn[2].compareDocumentPosition(container.querySelector("line")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("drawing descriptions", () => {
  const graphProps = { nodes: [], edges: [], start: "A", target: "A", directed: false, showStart: false, showTarget: false, step: null };

  it("describes the graph and the tree with the panel's step description", () => {
    render(
      <VisualizationPanel description="Visit node A." status="paused" title="Breadth-first search">
        <GraphCanvas {...graphProps} />
        <TreeCanvas tree={null} step={null} />
      </VisualizationPanel>,
    );
    for (const name of ["Weighted graph algorithm visualization", "Binary search tree visualization"]) {
      const descriptionId = screen.getByRole("img", { name }).getAttribute("aria-describedby");
      expect(descriptionId).toBeTruthy();
      const description = document.getElementById(descriptionId!);
      expect(description?.tagName).toBe("P");
      expect(description?.textContent).toBe("Visit node A.");
    }
  });

  it("leaves a drawing outside a panel without a description", () => {
    render(<TreeCanvas tree={null} step={null} />);
    expect(screen.getByRole("img", { name: "Binary search tree visualization" }).hasAttribute("aria-describedby")).toBe(false);
  });
});
