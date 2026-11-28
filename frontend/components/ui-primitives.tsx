import type { ComponentPropsWithRef, HTMLAttributes, ReactNode } from "react";

type PanelVariant = "default" | "control" | "visualization" | "subtle" | "warning" | "accent";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type ButtonSize = "sm" | "md";
type AlertVariant = "error" | "warning" | "info" | "success";
type StatusVariant = "idle" | "loading" | "running" | "paused" | "complete" | "invalid" | "error";

const panelBase = "rounded-2xl border shadow-[0_18px_50px_rgba(15,23,42,0.07)]";
const panelVariants: Record<PanelVariant, string> = {
  default: "border-slate-200 bg-white",
  control: "border-slate-200 bg-white/90 backdrop-blur",
  visualization: "border-slate-200 bg-white",
  subtle: "border-slate-200 bg-slate-50/80 shadow-sm",
  warning: "border-amber-200 bg-amber-50 shadow-sm",
  accent: "border-indigo-200 bg-indigo-50/60 shadow-sm",
};

const buttonBase =
  "inline-flex min-h-11 items-center justify-center rounded-xl font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus-visible:ring-indigo-100",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-100",
  ghost: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-100",
  danger: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-100",
  soft: "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus-visible:ring-indigo-100",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 text-sm",
  md: "px-4 text-sm",
};

const inputBase =
  "min-h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm text-slate-900 transition focus:bg-white focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";
const inputStates = {
  default: "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100",
  invalid: "border-rose-300 focus:border-rose-500 focus:ring-rose-100",
};

const textareaBase =
  "w-full resize-y rounded-xl border bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-900 transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

const alertVariants: Record<AlertVariant, string> = {
  error: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

// Failures interrupt; informational notes wait their turn.
const alertRoles: Record<AlertVariant, "alert" | "status"> = {
  error: "alert",
  warning: "alert",
  info: "status",
  success: "status",
};

const statusVariants: Record<StatusVariant, string> = {
  idle: "border-slate-200 bg-slate-50 text-slate-600",
  loading: "border-sky-200 bg-sky-50 text-sky-700",
  running: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paused: "border-amber-200 bg-amber-50 text-amber-800",
  complete: "border-indigo-200 bg-indigo-50 text-indigo-700",
  invalid: "border-rose-200 bg-rose-50 text-rose-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusDots: Record<StatusVariant, string> = {
  idle: "bg-slate-400",
  loading: "bg-sky-500",
  running: "bg-emerald-500",
  paused: "bg-amber-500",
  complete: "bg-indigo-500",
  invalid: "bg-rose-500",
  error: "bg-rose-500",
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function panelClassName(variant: PanelVariant = "default", className?: string) {
  return joinClasses(panelBase, panelVariants[variant], className);
}

export function inputClassName(isInvalid = false, className?: string) {
  return joinClasses(inputBase, isInvalid ? inputStates.invalid : inputStates.default, className);
}

export function textareaClassName(isInvalid = false, className?: string) {
  return joinClasses(textareaBase, isInvalid ? inputStates.invalid : inputStates.default, className);
}

export function Button({
  children,
  className,
  size = "md",
  variant = "secondary",
  ...props
}: ComponentPropsWithRef<"button"> & {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={joinClasses(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * A card. It renders a `section`, which is a landmark, only when it has an accessible name
 * (`aria-label` or `aria-labelledby`); an unnamed panel is a plain `div`. Pass `as` to choose.
 */
export function Panel({
  as,
  children,
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "section" | "div" | "aside";
  children: ReactNode;
  variant?: PanelVariant;
}) {
  const isNamed = Boolean(props["aria-label"] || props["aria-labelledby"]);
  const Element = as ?? (isNamed ? "section" : "div");
  return (
    <Element className={panelClassName(variant, className)} {...props}>
      {children}
    </Element>
  );
}

/** The control panel of a category: a named region that lays its fields out on a grid. */
export function ControlPanel({
  children,
  className,
  label,
}: {
  children: ReactNode;
  /** Grid columns and other layout classes, added to the shared padding and gap. */
  className?: string;
  /** Accessible name of the region, such as "Searching controls". */
  label: string;
}) {
  return (
    <Panel aria-label={label} className={joinClasses("mb-5 grid gap-4 p-5", className)} variant="control">
      {children}
    </Panel>
  );
}

/** A wrapping row of buttons. */
export function ActionRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={joinClasses("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/**
 * A labelled slider that shows its value. The input box is 44px tall, so the whole row is a
 * pointer target, not only the 16px track. The arrow keys move it by `step`.
 */
export function RangeField({
  className,
  disabled,
  label,
  max,
  min,
  onChange,
  step,
  unit,
  value,
  valueText,
}: {
  className?: string;
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  /** Shown after the value, such as "ms". */
  unit?: string;
  value: number;
  /** What a screen reader announces for the value; defaults to the visible value. */
  valueText?: string;
}) {
  const shownValue = unit ? `${value} ${unit}` : String(value);
  return (
    <label className={joinClasses("flex flex-col gap-1 text-xs font-bold text-slate-700", className)}>
      <span className="flex justify-between gap-3">
        <span>{label}</span>
        <span className="font-mono text-indigo-600">{shownValue}</span>
      </span>
      <input
        aria-valuetext={valueText ?? shownValue}
        className="h-11 w-full cursor-pointer accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

/** The animation speed slider: the delay between autoplay steps, in milliseconds. */
export function SpeedField({
  className,
  max,
  min,
  onChange,
  step,
  value,
}: {
  className?: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <RangeField
      className={className}
      label="Animation speed"
      max={max}
      min={min}
      step={step}
      unit="ms"
      value={value}
      valueText={`${value} milliseconds per step`}
      onChange={onChange}
    />
  );
}

export function FormField({
  children,
  className,
  error,
  helperText,
  label,
  messageId,
}: {
  children: ReactNode;
  className?: string;
  error?: string | null;
  helperText?: string;
  label: ReactNode;
  messageId?: string;
}) {
  const message = error || helperText;
  return (
    <label className={joinClasses("flex flex-col gap-2 text-xs font-bold text-slate-700", className)}>
      <span>{label}</span>
      {children}
      {message ? (
        // A new key inserts a fresh element, so an error that replaces helper text is announced.
        <InlineMessage id={messageId} key={error ? "error" : "helper"} tone={error ? "error" : "muted"}>
          {message}
        </InlineMessage>
      ) : null}
    </label>
  );
}

export function InlineMessage({
  children,
  id,
  tone = "muted",
}: {
  children: ReactNode;
  id?: string;
  tone?: "muted" | "error" | "info" | "success";
}) {
  const toneClasses = {
    muted: "text-slate-500",
    error: "text-rose-600",
    info: "text-sky-700",
    success: "text-emerald-700",
  };
  const toneRoles = {
    muted: undefined,
    error: "alert",
    info: "status",
    success: "status",
  } as const;

  return (
    <span id={id} className={joinClasses("min-h-5 text-xs font-semibold leading-5", toneClasses[tone])} role={toneRoles[tone]}>
      {children}
    </span>
  );
}

/**
 * A visually hidden polite status. While `silent` it is empty, so changes are not announced;
 * the current text is announced again when it stops being silent.
 */
export function ScreenReaderStatus({ children, silent = false }: { children: ReactNode; silent?: boolean }) {
  return (
    <span className="sr-only" role="status">
      {silent ? null : children}
    </span>
  );
}

export function Alert({
  children,
  className,
  title,
  variant = "error",
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  variant?: AlertVariant;
}) {
  return (
    <div className={joinClasses("mb-5 rounded-xl border px-4 py-3 text-sm leading-6", alertVariants[variant], className)} role={alertRoles[variant]}>
      {title ? <p className="mb-1 font-extrabold">{title}</p> : null}
      <div className="font-medium">{children}</div>
    </div>
  );
}

export function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
      <h2 className="mb-2 text-lg font-extrabold tracking-normal text-slate-950">{title}</h2>
      <p className="m-0 text-sm leading-6 text-slate-600">{description}</p>
    </section>
  );
}

/** The placeholder inside a visualization panel before there is anything to draw. */
export function VisualizationEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="grid min-h-48 place-content-center gap-1 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="m-0 text-sm font-extrabold text-slate-800">{title}</p>
      <p className="m-0 max-w-md text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

/** An eyebrow, a heading, and an optional description at the top of a panel. */
export function SectionHeader({
  description,
  eyebrow,
  title,
  titleId,
}: {
  description?: ReactNode;
  eyebrow: string;
  title: string;
  /** Lets the panel name itself after the heading through `aria-labelledby`. */
  titleId?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">{eyebrow}</span>
      <h2 className="m-0 text-xl font-extrabold tracking-normal text-slate-950" id={titleId}>{title}</h2>
      {description ? <p className="m-0 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}

// The small uppercase label of a group or a value. 12px is the smallest text size the panels use.
const eyebrowClasses = "text-xs font-extrabold uppercase tracking-[0.1em]";

/** The header strip of a side-rail panel, such as the stats or the pseudocode. */
export function PanelHeader({
  eyebrow,
  title,
  titleId,
}: {
  eyebrow: string;
  title: string;
  /** Lets the panel name itself after the heading through `aria-labelledby`. */
  titleId?: string;
}) {
  return (
    <div className="border-b border-slate-100 px-5 py-4">
      <p className={joinClasses("mb-1 text-indigo-600", eyebrowClasses)}>{eyebrow}</p>
      <h2 className="m-0 text-base font-extrabold tracking-normal text-slate-900" id={titleId}>{title}</h2>
    </div>
  );
}

/** The heading of a group inside a panel, such as "Notes and limitations". */
export function SubsectionHeading({ children }: { children: ReactNode }) {
  return <h3 className={joinClasses("mb-2 text-slate-500", eyebrowClasses)}>{children}</h3>;
}

/** The small uppercase label above a value. */
export function ValueLabel({ children }: { children: ReactNode }) {
  return <span className={joinClasses("mb-1 block text-slate-500", eyebrowClasses)}>{children}</span>;
}

/** A labelled value in a bordered tile. Use the `muted` surface on a white panel. */
export function MetricTile({
  children,
  label,
  surface = "white",
}: {
  children: ReactNode;
  label: string;
  surface?: "white" | "muted";
}) {
  return (
    <div className={joinClasses("rounded-xl border border-slate-200 px-4 py-3", surface === "muted" ? "bg-slate-50" : "bg-white")}>
      <ValueLabel>{label}</ValueLabel>
      <span className="font-mono text-sm font-bold text-slate-900">{children}</span>
    </div>
  );
}

/** The outcome of a finished run. Long values wrap instead of widening the panel. */
export function ResultSummary({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 break-words rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800" aria-live="polite">
      {children}
    </div>
  );
}

export function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: StatusVariant;
}) {
  return (
    <span className={joinClasses("inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-extrabold", statusVariants[variant])}>
      <span className={joinClasses("h-2 w-2 rounded-full", statusDots[variant])} aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Legend swatches. A plain tone is a solid fill, for bars, nodes, and chips drawn in that
 * color. A `-soft` tone is a pale fill inside a colored border, for cells that are tinted.
 */
export type LegendTone =
  | "amber"
  | "cyan"
  | "emerald"
  | "fuchsia"
  | "indigo"
  | "ink"
  | "pink"
  | "rose"
  | "sky"
  | "slate"
  | "teal"
  | "violet"
  | "amber-soft"
  | "cyan-soft"
  | "emerald-soft"
  | "indigo-soft"
  | "rose-soft"
  | "sky-soft"
  | "slate-soft"
  | "violet-soft";

export interface LegendItem {
  label: string;
  tone: LegendTone;
}

const legendTones: Record<LegendTone, string> = {
  amber: "border-amber-500 bg-amber-400",
  cyan: "border-cyan-600 bg-cyan-500",
  emerald: "border-emerald-600 bg-emerald-500",
  fuchsia: "border-fuchsia-600 bg-fuchsia-500",
  indigo: "border-indigo-600 bg-indigo-500",
  ink: "border-slate-950 bg-slate-900",
  pink: "border-pink-600 bg-pink-500",
  rose: "border-rose-600 bg-rose-500",
  sky: "border-sky-600 bg-sky-500",
  slate: "border-slate-600 bg-slate-500",
  teal: "border-teal-600 bg-teal-500",
  violet: "border-violet-600 bg-violet-500",
  "amber-soft": "border-amber-400 bg-amber-100",
  "cyan-soft": "border-cyan-400 bg-cyan-100",
  "emerald-soft": "border-emerald-400 bg-emerald-50",
  "indigo-soft": "border-indigo-400 bg-indigo-50",
  "rose-soft": "border-rose-400 bg-rose-100",
  "sky-soft": "border-sky-400 bg-sky-100",
  "slate-soft": "border-slate-400 bg-slate-100",
  "violet-soft": "border-violet-400 bg-violet-100",
};

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-2 p-0 text-xs font-medium text-slate-600" aria-label="Visualization legend" role="list">
      {items.map((item) => (
        <li className="inline-flex items-center gap-1.5" key={item.label}>
          <span className={joinClasses("h-3 w-3 shrink-0 rounded-full border-2", legendTones[item.tone])} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
