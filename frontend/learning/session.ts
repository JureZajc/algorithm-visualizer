import type { LearningQuestion, LearningSession } from "./types";

export function createSession(questions: LearningQuestion[] = []): LearningSession {
  return { questions, outcomes: {}, activeId: null, resumeAutoplay: false, answered: 0, correct: 0, skipped: 0, currentStreak: 0, bestStreak: 0 };
}

export type SessionAction =
  | { type: "reset"; questions?: LearningQuestion[] }
  | { type: "open"; id: string; autoplay: boolean }
  | { type: "dismiss" }
  | { type: "answer"; id: string; choice: number }
  | { type: "skip"; id: string }
  | { type: "reveal"; throughIndex: number };

export function evaluateAnswer(question: LearningQuestion, choice: number): boolean {
  return choice === question.correctChoice;
}

export function sessionReducer(state: LearningSession, action: SessionAction): LearningSession {
  if (action.type === "reset") return createSession(action.questions);
  if (action.type === "dismiss") return state.activeId === null && !state.resumeAutoplay ? state : { ...state, activeId: null, resumeAutoplay: false };
  if (action.type === "reveal") {
    const outcomes = { ...state.outcomes };
    let changed = false;
    for (const question of state.questions) {
      if (question.stepIndex <= action.throughIndex && !outcomes[question.id]) {
        outcomes[question.id] = { status: "revealed" };
        changed = true;
      }
    }
    return changed ? { ...state, outcomes } : state;
  }
  const question = state.questions.find((item) => item.id === action.id);
  if (!question || state.outcomes[action.id]) return state;
  if (action.type === "open") return { ...state, activeId: action.id, resumeAutoplay: action.autoplay };
  if (state.activeId !== action.id) return state;
  if (action.type === "skip") return {
    ...state, outcomes: { ...state.outcomes, [action.id]: { status: "skipped" } }, skipped: state.skipped + 1, currentStreak: 0,
  };
  if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice >= question.choices.length) return state;
  const correct = evaluateAnswer(question, action.choice);
  const currentStreak = correct ? state.currentStreak + 1 : 0;
  return {
    ...state, outcomes: { ...state.outcomes, [action.id]: { status: "answered", choice: action.choice, correct } },
    answered: state.answered + 1, correct: state.correct + Number(correct), currentStreak, bestStreak: Math.max(state.bestStreak, currentStreak),
  };
}

export function sessionAccuracy(session: LearningSession): number | null {
  return session.answered === 0 ? null : Math.round(session.correct * 100 / session.answered);
}
