"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button, Panel } from "@/components/ui-primitives";
import type { LearningControls } from "@/hooks/use-learning-playback";
import type { LearningQuestion } from "@/learning/types";

export function LearningPanel({ learning, isLoading = false }: { learning: LearningControls; isLoading?: boolean }) {
  const messageId = useId();
  return (
    <Panel className="mb-5 p-4 sm:p-5" variant={learning.enabled ? "accent" : "subtle"} aria-label="Learning mode">
      <label className="flex w-fit items-center gap-3 text-sm font-extrabold text-slate-900">
        <input type="checkbox" className="h-5 w-5 accent-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
          checked={learning.enabled} disabled={!learning.supported || isLoading} aria-describedby={messageId}
          onChange={(event) => learning.setEnabled(event.target.checked)} />
        Learning mode
      </label>
      <p id={messageId} className="mt-2 text-xs leading-5 text-slate-600">
        {learning.supported ? "Predict what happens before selected steps. Answer or skip, then Continue to reveal the step."
          : "Learning mode is not available for this algorithm yet"}
      </p>
      {learning.enabled ? <>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-700" aria-label="Learning statistics">
          <span>Score: {learning.session.correct} / {learning.session.answered}</span>
          <span>Accuracy: {learning.accuracy === null ? "—" : `${learning.accuracy}%`}</span>
          <span>Streak: {learning.session.currentStreak}</span>
          <span>Best streak: {learning.session.bestStreak}</span>
          <span>Skipped: {learning.session.skipped}</span>
        </div>
        {learning.activeQuestion ? <QuestionPanel key={learning.activeQuestion.id} question={learning.activeQuestion} learning={learning} /> : null}
        {learning.isComplete ? <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-4" role="status">
          <h2 className="text-base font-extrabold text-slate-950">Learning session complete</h2>
          <p className="mt-2 text-sm text-slate-700">Correct: {learning.session.correct} / {learning.session.answered} · Accuracy: {learning.accuracy === null ? "—" : `${learning.accuracy}%`} · Best streak: {learning.session.bestStreak}</p>
        </div> : null}
      </> : null}
    </Panel>
  );
}

function QuestionPanel({ question, learning }: { question: LearningQuestion; learning: LearningControls }) {
  const [choice, setChoice] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const groupId = useId();
  const outcome = learning.outcome;
  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => { if (outcome) continueRef.current?.focus(); }, [outcome]);

  return <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-4">
    <h2 ref={headingRef} tabIndex={-1} className="rounded text-base font-extrabold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">What happens next?</h2>
    <form onSubmit={(event) => { event.preventDefault(); if (choice !== null) learning.submit(choice); }}>
      <fieldset className="mt-3" disabled={!!outcome}>
        <legend className="mb-3 text-sm font-bold leading-6 text-slate-800">{question.prompt}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {question.choices.map((answer, index) => <label key={answer} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 has-checked:border-indigo-500 has-checked:bg-indigo-50 focus-within:ring-2 focus-within:ring-indigo-500">
            <input className="h-4 w-4 shrink-0 accent-indigo-600" type="radio" name={groupId} value={index}
              checked={choice === index} onChange={() => setChoice(index)} />
            {answer}
          </label>)}
        </div>
      </fieldset>
      {outcome ? <div className="mt-4 text-sm leading-6 text-slate-700" role="status">
        <p className="font-extrabold">{outcome.status === "answered" ? outcome.correct ? "✓ Correct!" : "Incorrect." : "Question skipped."}</p>
        <p>Correct answer: {question.choices[question.correctChoice]}</p>
        <p>{question.explanation}</p>
      </div> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {outcome ? <Button ref={continueRef} variant="primary" onClick={learning.continuePlayback}>Continue</Button> : <>
          <Button type="submit" variant="primary" disabled={choice === null}>Submit answer</Button>
          <Button onClick={learning.skip}>Skip question</Button>
        </>}
      </div>
    </form>
  </div>;
}
