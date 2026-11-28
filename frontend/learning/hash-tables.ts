import type { HashKey, HashTableAlgorithm, HashTableStep } from "@/types/hash-tables";
import { question, type LearningQuestion, type LearningStep } from "./types";

export function hashTableQuestion(algorithm: HashTableAlgorithm, steps: readonly LearningStep[], index: number): LearningQuestion | null {
  const step = steps[index];
  const previous = steps[index - 1];
  if (!step || !previous || !("hash_index" in step) || !("hash_index" in previous)) return null;
  switch (step.type) {
    case "hash":
      return isInsert(algorithm) ? hashBucketQuestion(algorithm, step, index) : null;
    case "collision":
    case "insert":
      return algorithm === "hash_insert_chaining" ? chainQuestion(algorithm, previous, step, index) : null;
    case "probe":
      return nextProbeQuestion(algorithm, previous, step, index);
    case "compare":
    case "not_found":
      return isInsert(algorithm) ? null : searchOutcomeQuestion(algorithm, previous, step, index);
    default:
      return null;
  }
}

function isInsert(algorithm: HashTableAlgorithm) {
  return algorithm === "hash_insert_chaining" || algorithm === "hash_insert_linear_probing";
}

function slotName(step: HashTableStep) {
  return step.table.strategy === "separate_chaining" ? "bucket" : "slot";
}

function bucketItems(step: HashTableStep, bucket: number): HashKey[] | null {
  return step.table.buckets[bucket]?.items ?? null;
}

// Indices in 0..size-1 other than the answer, in the order given, deduplicated.
function slotChoices(answer: number, size: number, distractors: readonly number[]) {
  const others = [...new Set(distractors)].filter((slot) => Number.isInteger(slot) && slot >= 0 && slot < size && slot !== answer);
  return [answer, ...others.slice(0, 3)].sort((a, b) => a - b);
}

// String keys hash by the sum of their character codes, and negative keys by
// Python's floored modulo. Neither is a fair mental calculation, so only
// non-negative integer keys are asked about.
function hashBucketQuestion(algorithm: HashTableAlgorithm, step: HashTableStep, index: number) {
  const { key, hash_index: answer } = step;
  const size = step.table.size;
  if (typeof key !== "number" || !Number.isInteger(key) || key < 0 || answer !== key % size) return null;
  const name = slotName(step);
  const quotient = Math.floor(key / size);
  const choices = slotChoices(answer, size, [quotient % size, key % 10, (answer + 1) % size, (answer + size - 1) % size, (answer + 2) % size]);
  return question(algorithm, index, "hash-bucket",
    `${key} is hashed next. The table has ${size} ${name}s. Which ${name} does ${key} hash to?`,
    choices.map((slot) => `${capitalize(name)} ${slot}`), choices.indexOf(answer),
    `${key} mod ${size} = ${answer}, because ${key} = ${quotient} × ${size} + ${answer}. An integer key hashes to its remainder after division by the table size.`);
}

function chainQuestion(algorithm: HashTableAlgorithm, previous: HashTableStep, step: HashTableStep, index: number) {
  const bucket = previous.active_bucket;
  if (previous.type !== "inspect_bucket" || bucket === null || step.active_bucket !== bucket || step.key !== previous.key) return null;
  const items = bucketItems(previous, bucket);
  const chained = step.type === "collision";
  if (!items || chained !== items.length > 0) return null;
  const key = step.key;
  return question(algorithm, index, "chain-or-place",
    `Bucket ${bucket} has been inspected for ${key}. How is ${key} stored?`,
    [`As the first key in bucket ${bucket}`, `Appended to the chain in bucket ${bucket}`], chained ? 1 : 0,
    chained ? `Bucket ${bucket} already holds ${items.join(", ")}. Separate chaining keeps all keys that hash to the same bucket in one chain, so ${key} is appended to its end.`
      : `Bucket ${bucket} is empty, so ${key} becomes its first key.`);
}

function nextProbeQuestion(algorithm: HashTableAlgorithm, previous: HashTableStep, step: HashTableStep, index: number) {
  const slot = previous.active_bucket;
  const size = step.table.size;
  const occupant = slot === null ? undefined : bucketItems(previous, slot)?.[0];
  const searching = previous.type === "compare";
  if ((previous.type !== "collision" && !searching) || slot === null || occupant === undefined || step.key !== previous.key) return null;
  const answer = (slot + 1) % size;
  if (step.active_bucket !== answer) return null;
  const key = step.key;
  const choices = slotChoices(answer, size, [(answer + 1) % size, (slot + size - 1) % size, slot, (answer + 2) % size]);
  return question(algorithm, index, "next-probe",
    searching ? `Slot ${slot} holds ${occupant}, not ${key}. Which slot does linear probing check next?`
      : `Slot ${slot} already holds ${occupant}, so ${key} cannot go there. Which slot does linear probing check next?`,
    choices.map((choice) => `Slot ${choice}`), choices.indexOf(answer),
    answer === 0 ? `Slot ${slot} is the last slot, so linear probing wraps around to slot 0.`
      : `Linear probing checks the following slot: ${slot} + 1 = ${answer}.`);
}

function searchOutcomeQuestion(algorithm: HashTableAlgorithm, previous: HashTableStep, step: HashTableStep, index: number) {
  const slot = previous.active_bucket;
  if ((previous.type !== "inspect_bucket" && previous.type !== "probe") || slot === null || step.key !== previous.key) return null;
  const items = bucketItems(previous, slot);
  if (!items || (step.type === "not_found") !== (items.length === 0)) return null;
  const key = step.key;
  const name = slotName(previous);
  const chaining = previous.table.strategy === "separate_chaining";
  const found = chaining ? items.includes(key) : items[0] === key;
  // Probing a full table past its last slot ends without an empty slot, so
  // neither "probe the next slot" nor "stop here" would describe it.
  if (!chaining && !found && items.length > 0 && previous.visited_buckets.length >= previous.table.size) return null;
  // Separate chaining never moves on to another bucket, so choice 1 is only
  // ever right for probing.
  const answer = found ? 0 : chaining || items.length === 0 ? 2 : 1;
  return question(algorithm, index, "search-outcome",
    `${capitalize(name)} ${slot} has been inspected for ${key}. What does the search do?`,
    [`It finds ${key} in ${name} ${slot}`, `It checks the next ${name}`, `It stops: ${key} is not in the table`], answer,
    chaining ? chainingOutcome(key, slot, items, found) : probingOutcome(key, slot, items[0]));
}

function chainingOutcome(key: HashKey, bucket: number, items: readonly HashKey[], found: boolean) {
  if (found) return `Bucket ${bucket} holds ${items.join(", ")}. Separate chaining searches only the bucket a key hashes to, and ${key} is in its chain.`;
  const contents = items.length === 0 ? "that bucket is empty" : `that bucket holds ${items.join(", ")}`;
  return `${key} can only be in bucket ${bucket}, where it hashes, and ${contents}. ${key} is not in the table.`;
}

function probingOutcome(key: HashKey, slot: number, occupant: HashKey | undefined) {
  if (occupant === undefined) return `Slot ${slot} is empty. Had ${key} been inserted, it would sit in this slot or one probed before it, so the search stops: ${key} is not in the table.`;
  if (occupant === key) return `Slot ${slot} holds ${key}, so the search has found it.`;
  return `Slot ${slot} holds ${occupant}, not ${key}. A collision may have pushed ${key} further along, so the search probes the next slot.`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
