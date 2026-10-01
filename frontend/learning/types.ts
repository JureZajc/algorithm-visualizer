import type { ArrayAlgorithmStep } from "@/types/algorithm";
import type { BacktrackingStep } from "@/types/backtracking";
import type { DynamicProgrammingStep } from "@/types/dynamic-programming";
import type { GraphStep } from "@/types/graph";
import type { TreeStep } from "@/types/trees";

export type LearningStep = ArrayAlgorithmStep | TreeStep | GraphStep | DynamicProgrammingStep | BacktrackingStep;

export interface LearningQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctChoice: number;
  explanation: string;
  stepIndex: number;
  kind: string;
  difficulty?: "easy" | "medium";
}

export interface LearningRunContext {
  target?: number;
  nodes?: readonly string[];
}

export type QuestionOutcome =
  | { status: "answered"; choice: number; correct: boolean }
  | { status: "skipped" }
  | { status: "revealed" };

export interface LearningSession {
  questions: LearningQuestion[];
  outcomes: Record<string, QuestionOutcome>;
  activeId: string | null;
  resumeAutoplay: boolean;
  answered: number;
  correct: number;
  skipped: number;
  currentStreak: number;
  bestStreak: number;
}

export function question(
  algorithm: string,
  stepIndex: number,
  kind: string,
  prompt: string,
  choices: string[],
  correctChoice: number,
  explanation: string,
): LearningQuestion | null {
  if (stepIndex < 1 || choices.length < 2 || new Set(choices).size !== choices.length ||
      !Number.isInteger(correctChoice) || correctChoice < 0 || correctChoice >= choices.length) return null;
  return { id: `${algorithm}:${stepIndex}:${kind}`, stepIndex, kind, prompt, choices, correctChoice, explanation };
}
