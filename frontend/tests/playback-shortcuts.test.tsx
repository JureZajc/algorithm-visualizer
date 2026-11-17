import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { StepControls } from "@/components/step-controls";
import { PLAYBACK_SPEED, PlaybackHarness } from "./playback-harness";

type Handler = "onTogglePlayback" | "onPrevious" | "onNext" | "onJumpToStart" | "onJumpToEnd" | "onRestart";

function renderControls(overrides: Partial<ComponentProps<typeof StepControls>> = {}) {
  const handlers = {
    onTogglePlayback: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onJumpToStart: vi.fn(),
    onJumpToEnd: vi.fn(),
    onRestart: vi.fn(),
    onSeek: vi.fn(),
  };
  render(<>
    <StepControls currentStepIndex={2} totalSteps={5} isLoading={false} isPlaying={false} {...handlers} {...overrides} />
    <input aria-label="Text field" />
    <select aria-label="Choice"><option>One</option></select>
    <textarea aria-label="Notes" />
    <button type="button">Other button</button>
    <div role="region" aria-label="Scrollable table" tabIndex={0} />
  </>);
  return handlers;
}

function calledHandlers(handlers: Record<string, ReturnType<typeof vi.fn>>) {
  return Object.entries(handlers).filter(([, handler]) => handler.mock.calls.length > 0).map(([name]) => name);
}

const keys = [" ", "ArrowLeft", "ArrowRight", "Home", "End"];

describe("playback shortcuts", () => {
  it.each<[string, Handler]>([
    [" ", "onTogglePlayback"],
    ["ArrowLeft", "onPrevious"],
    ["ArrowRight", "onNext"],
    ["Home", "onJumpToStart"],
    ["End", "onJumpToEnd"],
  ])("maps %j to %s and keeps the page from scrolling", (key, handler) => {
    const handlers = renderControls();
    expect(fireEvent.keyDown(document.body, { key })).toBe(false);
    expect(calledHandlers(handlers)).toEqual([handler]);
  });

  it("replays with Space once playback is complete", () => {
    const handlers = renderControls({ currentStepIndex: 4 });
    fireEvent.keyDown(document.body, { key: " " });
    expect(calledHandlers(handlers)).toEqual(["onRestart"]);
  });

  it("does nothing past either end", () => {
    const atStart = renderControls({ currentStepIndex: 0 });
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    fireEvent.keyDown(document.body, { key: "Home" });
    expect(calledHandlers(atStart)).toEqual([]);
  });

  it.each([
    ["an input", () => screen.getByRole("textbox", { name: "Text field" })],
    ["a select", () => screen.getByRole("combobox", { name: "Choice" })],
    ["a textarea", () => screen.getByRole("textbox", { name: "Notes" })],
    ["a button", () => screen.getByRole("button", { name: "Other button" })],
    ["a playback button", () => screen.getByRole("button", { name: "Next step" })],
    ["the step slider", () => screen.getByRole("slider")],
    ["a focusable scroll frame", () => screen.getByRole("region", { name: "Scrollable table" })],
  ])("ignores the keys while focus is in %s", (_, getTarget) => {
    const handlers = renderControls();
    const target = getTarget();
    for (const key of keys) expect(fireEvent.keyDown(target, { key })).toBe(true);
    expect(calledHandlers(handlers)).toEqual([]);
  });

  it.each([
    ["Learning mode blocks playback", { learningBlocked: true }],
    ["steps are loading", { isLoading: true }],
    ["no steps are loaded", { currentStepIndex: -1, totalSteps: 0 }],
  ])("ignores the keys while %s", (_, overrides) => {
    const handlers = renderControls(overrides);
    for (const key of keys) expect(fireEvent.keyDown(document.body, { key })).toBe(true);
    expect(calledHandlers(handlers)).toEqual([]);
  });

  it("ignores modified keys and held-down Space", () => {
    const handlers = renderControls();
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      fireEvent.keyDown(document.body, { key: "ArrowRight", [modifier]: true });
    }
    fireEvent.keyDown(document.body, { key: " ", repeat: true });
    expect(calledHandlers(handlers)).toEqual([]);
  });

  it("drives real playback through every shortcut", () => {
    vi.useFakeTimers();
    render(<PlaybackHarness />);
    const counter = () => screen.getByText(/^Step \d+ \/ 4$/).textContent;
    const press = (key: string) => fireEvent.keyDown(document.body, { key });

    fireEvent.click(screen.getByRole("button", { name: "Load steps" }));
    press(" ");
    expect(screen.getByRole("button", { name: "Play playback" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(PLAYBACK_SPEED * 2));
    expect(counter()).toBe("Step 1 / 4");

    press("ArrowRight");
    expect(counter()).toBe("Step 2 / 4");
    press("End");
    expect(counter()).toBe("Step 4 / 4");
    press("ArrowLeft");
    expect(counter()).toBe("Step 3 / 4");
    press("Home");
    expect(counter()).toBe("Step 1 / 4");

    press(" ");
    expect(screen.getByRole("button", { name: "Pause playback" })).toBeTruthy();
    for (let tick = 0; tick < 3; tick++) act(() => vi.advanceTimersByTime(PLAYBACK_SPEED));
    expect(counter()).toBe("Step 4 / 4");
    press(" ");
    expect(counter()).toBe("Step 1 / 4");
    expect(screen.getByRole("button", { name: "Pause playback" })).toBeTruthy();
  });
});
