import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

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

const legendSwatches: Record<string, string> = {
  Active: "bg-indigo-600",
  Attempt: "bg-amber-400",
  Backtrack: "bg-violet-400",
  Candidate: "bg-cyan-400",
  Chosen: "bg-emerald-500",
  Collision: "bg-rose-500",
  Compare: "bg-amber-400",
  Conflict: "bg-rose-500",
  Current: "bg-amber-400",
  Found: "bg-emerald-500",
  Frontier: "bg-violet-500",
  Given: "bg-slate-500",
  Hash: "bg-sky-400",
  Imbalanced: "bg-rose-500",
  Inspect: "bg-sky-500",
  Inserted: "bg-violet-500",
  "Not found": "bg-slate-500",
  Overwrite: "bg-violet-500",
  "Path / MST": "bg-emerald-500",
  Path: "bg-indigo-500",
  Probe: "bg-cyan-500",
  Rejected: "bg-rose-500",
  Related: "bg-amber-300",
  Rotation: "bg-fuchsia-500",
  Solution: "bg-emerald-500",
  Swap: "bg-rose-500",
  Try: "bg-amber-400",
  Visited: "bg-sky-500",
  Wall: "bg-slate-900",
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
}: ButtonHTMLAttributes<HTMLButtonElement> & {
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

export function Panel({
  children,
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  variant?: PanelVariant;
}) {
  return (
    <section className={panelClassName(variant, className)} {...props}>
      {children}
    </section>
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
  return (
    <label className={joinClasses("flex flex-col gap-2 text-xs font-bold text-slate-700", className)}>
      <span>{label}</span>
      {children}
      <InlineMessage id={messageId} tone={error ? "error" : "muted"}>
        {error ?? helperText ?? ""}
      </InlineMessage>
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

  return (
    <span id={id} className={joinClasses("min-h-5 text-xs font-semibold leading-5", toneClasses[tone])} aria-live="polite">
      {children}
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
    <div className={joinClasses("mb-5 rounded-xl border px-4 py-3 text-sm leading-6", alertVariants[variant], className)} aria-live="polite">
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

export function Legend({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs font-medium text-slate-500" aria-label="Visualization legend">
      {items.map((item) => (
        <span className="inline-flex items-center gap-1.5" key={item}>
          <span className={joinClasses("h-2.5 w-2.5 rounded-full", legendSwatches[item] ?? "bg-slate-400")} aria-hidden="true" />
          {item}
        </span>
      ))}
    </div>
  );
}
