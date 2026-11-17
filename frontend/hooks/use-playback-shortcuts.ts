"use client";

import { useEffect, useEffectEvent } from "react";

export type PlaybackShortcut = "toggle" | "previous" | "next" | "first" | "last";

const SHORTCUT_KEYS: Record<string, PlaybackShortcut> = {
  " ": "toggle",
  ArrowLeft: "previous",
  ArrowRight: "next",
  Home: "first",
  End: "last",
};

// Focus inside any of these means the keys already do something there: typing,
// pressing a button, moving a slider or a grid cell, or scrolling a focusable frame.
const KEY_OWNER_SELECTOR = [
  "input",
  "select",
  "textarea",
  "button",
  "a[href]",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
  "[role='application']",
  "[role='button']",
  "[role='grid']",
  "[role='listbox']",
  "[role='menu']",
  "[role='radiogroup']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='tablist']",
  "[role='textbox']",
  "[role='tree']",
].join(", ");

export function playbackShortcutFor(event: KeyboardEvent): PlaybackShortcut | null {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  const shortcut = SHORTCUT_KEYS[event.key];
  if (!shortcut || (shortcut === "toggle" && event.repeat)) return null;
  if (event.target instanceof Element && event.target.closest(KEY_OWNER_SELECTOR)) return null;
  return shortcut;
}

/**
 * Space plays or pauses, Left and Right step, Home and End jump to the first and last step.
 * Keys are left alone while `enabled` is false and while focus is in a control that uses them.
 */
export function usePlaybackShortcuts(enabled: boolean, onShortcut: (shortcut: PlaybackShortcut) => void) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) return;
    const shortcut = playbackShortcutFor(event);
    if (!shortcut) return;
    event.preventDefault();
    onShortcut(shortcut);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);
}
