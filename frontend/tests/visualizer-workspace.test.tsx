import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ControlPanel, Panel, RangeField, SpeedField, VisualizationEmptyState } from "@/components/ui-primitives";
import { VisualizationPanel } from "@/components/visualizer-panel";
import { VisualizerWorkspace } from "@/components/visualizer-workspace";
import type { AlgorithmMetadata } from "@/types/algorithm";

const bubbleSort: AlgorithmMetadata = {
  id: "bubble_sort",
  label: "Bubble Sort",
  name: "Bubble Sort",
  category: "sorting",
  description: "Swaps neighbours until the array is sorted.",
  time_complexity: { best: "O(n)", average: "O(n^2)", worst: "O(n^2)" },
  space_complexity: "O(1)",
  notes: [],
  pseudocode: ["repeat until no swaps", "compare neighbours"],
};

describe("Panel", () => {
  it("is a named region only when it has a name", () => {
    render(<>
      <Panel aria-label="Learning mode">Named</Panel>
      <Panel>Unnamed</Panel>
      <Panel as="aside" aria-label="Run details">Aside</Panel>
    </>);
    expect(screen.getByRole("region", { name: "Learning mode" }).tagName).toBe("SECTION");
    expect(screen.getByText("Unnamed").tagName).toBe("DIV");
    expect(screen.getByRole("complementary", { name: "Run details" }).tagName).toBe("ASIDE");
  });

  it("names control panels", () => {
    render(<ControlPanel label="Searching controls"><button type="button">Start</button></ControlPanel>);
    expect(screen.getByRole("region", { name: "Searching controls" })).toBeTruthy();
  });
});

describe("RangeField", () => {
  it("shows its value, keeps its range, and reports numbers", () => {
    const onChange = vi.fn();
    render(<RangeField label="Zoom" max={200} min={50} step={10} unit="%" value={120} onChange={onChange} />);
    const slider = screen.getByRole("slider", { name: /Zoom/ }) as HTMLInputElement;
    expect(screen.getByText("120 %")).toBeTruthy();
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual(["50", "200", "10", "120"]);
    expect(slider.getAttribute("aria-valuetext")).toBe("120 %");
    fireEvent.change(slider, { target: { value: "140" } });
    expect(onChange).toHaveBeenCalledWith(140);
  });

  it("gives the slider a 44px box", () => {
    render(<RangeField label="Zoom" max={200} min={50} step={10} value={120} onChange={vi.fn()} />);
    expect(screen.getByRole("slider").className.split(" ")).toContain("h-11");
  });

  it("announces animation speed as a delay per step", () => {
    render(<SpeedField max={1000} min={80} step={20} value={320} onChange={vi.fn()} />);
    const slider = screen.getByRole("slider", { name: /Animation speed/ });
    expect(screen.getByText("320 ms")).toBeTruthy();
    expect(slider.getAttribute("aria-valuetext")).toBe("320 milliseconds per step");
  });
});

describe("VisualizationPanel", () => {
  it("is a region named after its heading", () => {
    render(<VisualizationPanel title="Binary Search" description="Choose a target." status="idle"><div /></VisualizationPanel>);
    const region = screen.getByRole("region", { name: "Binary Search" });
    expect(region.getAttribute("aria-labelledby")).toBe(screen.getByRole("heading", { name: "Binary Search" }).id);
  });
});

describe("VisualizerWorkspace", () => {
  const metadata = { algorithms: [bubbleSort], isMetadataLoading: false, metadataError: null };

  it("lays out the slots in page order, with the pseudocode and stats in the rail", () => {
    render(
      <VisualizerWorkspace
        algorithmId="bubble_sort"
        controls={<ControlPanel label="Sorting controls">Controls</ControlPanel>}
        error="The backend returned status 500."
        metadata={metadata}
        notices={<p>Learning mode</p>}
        pseudocodeLine={2}
        stats={<p>Stats</p>}
        visualization={<VisualizationPanel title="Bubble Sort" description="Ready." status="error"><div /></VisualizationPanel>}
      />,
    );
    const order = [
      screen.getByRole("region", { name: "Sorting controls" }),
      screen.getByText("Learning mode"),
      screen.getByRole("alert"),
      screen.getByRole("region", { name: "Bubble Sort" }),
      screen.getByRole("heading", { name: "Pseudocode" }),
      screen.getByText("Stats"),
      screen.getByRole("heading", { name: "Algorithm overview" }),
    ];
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByRole("alert").textContent).toBe("Visualization unavailableThe backend returned status 500.");
    expect(screen.getByText("compare neighbours").closest("li")?.getAttribute("aria-current")).toBe("step");
  });

  it("shows no alert without an error", () => {
    render(
      <VisualizerWorkspace
        algorithmId="bubble_sort"
        controls={null}
        metadata={metadata}
        stats={null}
        visualization={<VisualizationEmptyState title="No tree yet" description="Start the visualization." />}
      />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("No tree yet")).toBeTruthy();
  });
});
