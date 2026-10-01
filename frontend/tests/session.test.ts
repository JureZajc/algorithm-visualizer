import { describe, expect, it } from "vitest";
import { createSession, evaluateAnswer, sessionAccuracy, sessionReducer } from "@/learning/session";
import { question } from "@/learning/types";

const questions = [1, 4, 7, 10].map((index) => question("test", index, "decision", "Prompt", ["correct", "incorrect"], 0, "Explanation")!);

describe("learning session", () => {
  it("evaluates answers and calculates accuracy and streaks", () => {
    let session = createSession(questions);
    expect(sessionAccuracy(session)).toBeNull();
    expect(evaluateAnswer(questions[0], 0)).toBe(true);
    expect(evaluateAnswer(questions[0], 1)).toBe(false);
    for (const [i, choice] of [0, 0, 1, 0].entries()) {
      session = sessionReducer(session, { type: "open", id: questions[i].id, autoplay: false });
      session = sessionReducer(session, { type: "answer", id: questions[i].id, choice });
    }
    expect(session.answered).toBe(4);
    expect(session.correct).toBe(3);
    expect(sessionAccuracy(session)).toBe(75);
    expect(session.currentStreak).toBe(1);
    expect(session.bestStreak).toBe(2);
  });

  it("ignores duplicate submissions, invalid choices, and answers to inactive checkpoints", () => {
    let session = createSession(questions);
    expect(sessionReducer(session, { type: "answer", id: questions[0].id, choice: 0 })).toBe(session);
    session = sessionReducer(session, { type: "open", id: questions[0].id, autoplay: true });
    for (const choice of [-1, 2, 0.5, NaN]) expect(sessionReducer(session, { type: "answer", id: questions[0].id, choice })).toBe(session);
    session = sessionReducer(session, { type: "answer", id: questions[0].id, choice: 0 });
    expect(sessionReducer(session, { type: "answer", id: questions[0].id, choice: 1 })).toBe(session);
    expect(sessionReducer(session, { type: "skip", id: questions[0].id })).toBe(session);
    expect(sessionReducer(session, { type: "open", id: questions[0].id, autoplay: false })).toBe(session);
    expect(session.answered).toBe(1);
  });

  it("excludes skips from accuracy and breaks a streak", () => {
    let session = createSession(questions);
    session = sessionReducer(session, { type: "open", id: questions[0].id, autoplay: false });
    session = sessionReducer(session, { type: "answer", id: questions[0].id, choice: 0 });
    session = sessionReducer(session, { type: "open", id: questions[1].id, autoplay: false });
    session = sessionReducer(session, { type: "skip", id: questions[1].id });
    expect(session.answered).toBe(1);
    expect(session.skipped).toBe(1);
    expect(session.currentStreak).toBe(0);
    expect(session.bestStreak).toBe(1);
    expect(sessionAccuracy(session)).toBe(100);
  });

  it("preserves recorded answers during reveal/dismiss and resets a new session", () => {
    let session = createSession(questions);
    session = sessionReducer(session, { type: "open", id: questions[0].id, autoplay: true });
    session = sessionReducer(session, { type: "answer", id: questions[0].id, choice: 0 });
    session = sessionReducer(session, { type: "dismiss" });
    session = sessionReducer(session, { type: "reveal", throughIndex: 7 });
    expect(session.activeId).toBeNull();
    expect(session.outcomes[questions[0].id].status).toBe("answered");
    expect(session.outcomes[questions[1].id].status).toBe("revealed");
    expect(session.outcomes[questions[2].id].status).toBe("revealed");
    expect(session.outcomes[questions[3].id]).toBeUndefined();
    expect(session.correct).toBe(1);
    expect(sessionReducer(session, { type: "reset", questions })).toEqual(createSession(questions));
    expect(sessionReducer(session, { type: "reset" })).toEqual(createSession());
  });
});
