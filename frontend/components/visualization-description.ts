"use client";

import { createContext, useContext } from "react";

/**
 * The id of the step description in the enclosing VisualizationPanel. A drawing inside the
 * panel points `aria-describedby` at it, so a screen reader reads the current step with it.
 */
export const VisualizationDescriptionContext = createContext<string | undefined>(undefined);

/** The id of the current step description, or undefined outside a VisualizationPanel. */
export function useVisualizationDescriptionId() {
  return useContext(VisualizationDescriptionContext);
}
