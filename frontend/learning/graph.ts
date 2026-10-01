import { question, type LearningQuestion, type LearningRunContext, type LearningStep } from "./types";

export function bfsQuestion(steps: readonly LearningStep[], index: number, context: LearningRunContext): LearningQuestion | null {
  const step = steps[index];
  const previous = steps[index - 1];
  if (!step || !previous || !("frontier" in step) || !("frontier" in previous)) return null;
  const isDequeue = step.type === "dequeue" && step.current !== null && previous.frontier[0] === step.current;
  const isEnqueue = step.type === "enqueue" && step.neighbor !== null && previous.type === "inspect_edge";
  if (!isDequeue && !isEnqueue) return null;
  const answer = isDequeue ? step.current! : step.neighbor!;
  const labels = [...new Set(context.nodes ?? [])];
  if (!labels.includes(answer) || labels.length < 2) return null;
  const choices = labels.filter((node) => node !== answer).slice(0, 3);
  choices.push(answer);
  choices.sort((a, b) => labels.indexOf(a) - labels.indexOf(b));
  return question("bfs", index, isDequeue ? "dequeue-node" : "enqueue-node",
    isDequeue ? "Which node will BFS remove from the queue next?" : `After inspecting ${previous.current} → ${previous.neighbor}, which node is added to the queue?`,
    choices.map((node) => `Node ${node}`), choices.indexOf(answer),
    isDequeue ? `BFS uses a first-in, first-out queue. ${answer} is at the front.`
      : `${answer} has just been discovered through this edge and is added at the back of the queue.`);
}
