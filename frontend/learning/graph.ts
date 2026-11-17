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

export function dfsQuestion(steps: readonly LearningStep[], index: number, context: LearningRunContext): LearningQuestion | null {
  const step = steps[index];
  const previous = steps[index - 1];
  if (!step || !previous || !("frontier" in step) || !("frontier" in previous)) return null;
  if (previous.type === "inspect_edge" && previous.neighbor !== null) {
    const neighbor = previous.neighbor;
    const pushed = step.type === "push" && step.neighbor === neighbor;
    const visited = previous.visited.includes(neighbor);
    if (pushed === (visited || previous.frontier.includes(neighbor))) return null;
    return question("dfs", index, "push-decision", `After inspecting ${previous.current} → ${neighbor}, what does DFS do with ${neighbor}?`,
      [`Push ${neighbor} onto the stack`, `Skip ${neighbor}: it is already visited or on the stack`], pushed ? 0 : 1,
      pushed ? `${neighbor} is neither visited nor on the stack, so DFS pushes it on top of the stack.`
        : `${neighbor} is already ${visited ? "visited" : "on the stack"}, so DFS does not push it again.`);
  }
  if (step.type !== "pop" || step.current === null || previous.frontier.at(-1) !== step.current) return null;
  const answer = step.current;
  const labels = [...new Set(context.nodes ?? [])];
  if (!labels.includes(answer) || labels.length < 2) return null;
  // Other stack entries come first: the bottom of the stack is what a queue would remove.
  const choices = [...new Set([...previous.frontier, ...labels])].filter((node) => node !== answer && labels.includes(node)).slice(0, 3);
  choices.push(answer);
  choices.sort((a, b) => labels.indexOf(a) - labels.indexOf(b));
  return question("dfs", index, "pop-node", "Which node will DFS pop from the stack next?",
    choices.map((node) => `Node ${node}`), choices.indexOf(answer),
    `DFS uses a last-in, first-out stack. ${answer} was pushed most recently, so it is on top.`);
}
