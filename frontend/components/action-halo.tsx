/** Clears the graph's start (32) and target (36) rings, so they stay visible on top of it. */
export const ACTION_HALO_RADIUS = 40;

/**
 * The halo behind each node that the current step acts on. The graph and the tree draw the same
 * halo, so the current action reads the same way in both, and its size is a cue besides color.
 * Draw it before the edges, so edges, weights, and node labels stay on top of it.
 */
export function ActionHalo({ className, x, y }: { className: string; x: number; y: number }) {
  return (
    <circle
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      cx={x}
      cy={y}
      data-action-halo=""
      r={ACTION_HALO_RADIUS}
    />
  );
}
