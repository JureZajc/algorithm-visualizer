import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlgorithmMetadataPanel, formatCategory } from "@/components/algorithm-metadata-panel";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { Alert, FormField, InlineMessage } from "@/components/ui-primitives";
import { VisualizationPanel } from "@/components/visualizer-panel";
import type { AlgorithmMetadata } from "@/types/algorithm";
import { PLAYBACK_SPEED, PlaybackHarness } from "./playback-harness";

const fibonacci: AlgorithmMetadata = {
  id: "fibonacci",
  label: "Fibonacci",
  name: "Fibonacci DP",
  category: "dynamic_programming",
  description: "Builds Fibonacci numbers bottom up.",
  time_complexity: { best: "O(n)", average: "O(n)", worst: "O(n)" },
  space_complexity: "O(n)",
  notes: ["Stores every value."],
  pseudocode: ["for i from 2 to n"],
};

function announcements() {
  return screen.getAllByRole("status").map((region) => region.textContent).filter(Boolean);
}

describe("message roles", () => {
  it("raises errors and warnings as alerts and informational notes as statuses", () => {
    render(<>
      <Alert title="Visualization unavailable">The API did not respond.</Alert>
      <Alert title="Metadata unavailable" variant="warning">Details are missing.</Alert>
      <Alert title="Binary Search input" variant="info">Values are sorted first.</Alert>
    </>);
    const alerts = screen.getAllByRole("alert");
    expect(alerts.map((alert) => alert.textContent)).toEqual([
      "Visualization unavailableThe API did not respond.",
      "Metadata unavailableDetails are missing.",
    ]);
    expect(screen.getByRole("status").textContent).toContain("Values are sorted first.");
    for (const element of [...alerts, screen.getByRole("status")]) expect(element.getAttribute("aria-live")).toBeNull();
  });

  it("raises inline errors as alerts and leaves helper text out of live regions", () => {
    render(<>
      <InlineMessage tone="error">Maze needs a start cell.</InlineMessage>
      <InlineMessage>Use 2 to 15.</InlineMessage>
    </>);
    expect(screen.getByRole("alert").textContent).toBe("Maze needs a start cell.");
    const helper = screen.getByText("Use 2 to 15.");
    expect(helper.getAttribute("role")).toBeNull();
    expect(helper.getAttribute("aria-live")).toBeNull();
  });

  it("renders the form-field message row only when there is a message", () => {
    const { rerender } = render(<FormField label="Target" messageId="target-message"><input aria-describedby="target-message" /></FormField>);
    const label = screen.getByText("Target").closest("label")!;
    expect(label.children).toHaveLength(2);
    expect(document.getElementById("target-message")).toBeNull();

    rerender(<FormField label="Target" helperText="Use an integer target." messageId="target-message"><input aria-describedby="target-message" /></FormField>);
    expect(document.getElementById("target-message")!.textContent).toBe("Use an integer target.");
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(<FormField label="Target" error="Enter a whole number." helperText="Use an integer target." messageId="target-message"><input aria-describedby="target-message" /></FormField>);
    expect(screen.getByRole("alert").id).toBe("target-message");
    expect(screen.getByRole("alert").textContent).toBe("Enter a whole number.");
    expect(screen.queryByText("Use an integer target.")).toBeNull();
  });

  it("exposes metadata and pseudocode loading as statuses", () => {
    render(<>
      <AlgorithmMetadataPanel algorithmId="fibonacci" algorithms={[]} isLoading error={null} />
      <PseudocodePanel algorithmId="fibonacci" algorithms={[]} isLoading error={null} />
    </>);
    expect(announcements()).toEqual(["Loading algorithm details", "Loading pseudocode"]);
  });

  it("alerts once when metadata fails and reports missing pseudocode as a status", () => {
    render(<>
      <AlgorithmMetadataPanel algorithmId="fibonacci" algorithms={[]} isLoading={false} error="Could not reach the API." />
      <PseudocodePanel algorithmId="fibonacci" algorithms={[]} isLoading={false} error="Could not reach the API." />
    </>);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert").textContent).toContain("Algorithm details unavailable");
    expect(screen.getByRole("status").textContent).toContain("Pseudocode unavailable");
  });
});

describe("visualization panel", () => {
  it("is busy only while steps load", () => {
    const { rerender } = render(<VisualizationPanel title="Bubble Sort" description="Loading" status="loading"><div /></VisualizationPanel>);
    const panel = screen.getByRole("heading", { name: "Bubble Sort" }).closest("section")!;
    expect(panel.getAttribute("aria-busy")).toBe("true");
    rerender(<VisualizationPanel title="Bubble Sort" description="Compare 3 and 2." status="paused"><div /></VisualizationPanel>);
    expect(panel.getAttribute("aria-busy")).toBe("false");
  });
});

describe("metadata category badge", () => {
  it("shows a readable category name", () => {
    render(<AlgorithmMetadataPanel algorithmId="fibonacci" algorithms={[fibonacci]} isLoading={false} error={null} />);
    expect(screen.getByText("Dynamic Programming")).toBeTruthy();
    expect(screen.queryByText("dynamic_programming")).toBeNull();
  });

  it.each([
    ["sorting", "Sorting"],
    ["graph", "Graph / Pathfinding"],
    ["hash_tables", "Hash Tables"],
    ["string_matching", "string matching"],
  ])("formats %s as %s", (category, label) => {
    expect(formatCategory(category)).toBe(label);
  });
});

describe("playback announcements", () => {
  function startAutoplay() {
    vi.useFakeTimers();
    render(<PlaybackHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Load steps" }));
  }

  it("stays silent on autoplay ticks while the visible counter and description keep updating", () => {
    startAutoplay();
    expect(announcements()).toEqual(["Running"]);
    act(() => vi.advanceTimersByTime(PLAYBACK_SPEED));
    expect(announcements()).toEqual(["Running"]);
    act(() => vi.advanceTimersByTime(PLAYBACK_SPEED));
    expect(announcements()).toEqual(["Running"]);

    const counter = screen.getByText("Step 3 / 4");
    const description = screen.getByText("Third step.");
    for (const element of [counter, description]) expect(element.closest("[role='status'], [role='alert'], [aria-live]")).toBeNull();
  });

  it("announces the step and description on pause, after a manual step, and on completion", () => {
    startAutoplay();
    act(() => vi.advanceTimersByTime(PLAYBACK_SPEED));
    fireEvent.click(screen.getByRole("button", { name: "Pause playback" }));
    expect(announcements()).toEqual(["Paused", "Step 2 of 4", "Second step."]);

    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(announcements()).toEqual(["Paused", "Step 3 of 4", "Third step."]);

    fireEvent.click(screen.getByRole("button", { name: "Resume playback" }));
    expect(announcements()).toEqual(["Running"]);
    act(() => vi.advanceTimersByTime(PLAYBACK_SPEED));
    expect(announcements()).toEqual(["Complete", "Step 4 of 4", "Fourth step."]);
  });
});
