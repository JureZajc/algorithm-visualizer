import { parseInteger, requireRange } from "@/lib/number-input";
import type {
  DynamicProgrammingAlgorithm,
  DynamicProgrammingRequest,
} from "@/types/dynamic-programming";

export interface DynamicProgrammingForm {
  n: string;
  coins: string;
  amount: string;
  weights: string;
  values: string;
  capacity: string;
  textA: string;
  textB: string;
  rows: string;
  cols: string;
}

export const INITIAL_FORM: DynamicProgrammingForm = {
  n: "8",
  coins: "1, 3, 4",
  amount: "6",
  weights: "2, 3, 4, 5",
  values: "3, 4, 5, 6",
  capacity: "5",
  textA: "ABCDEF",
  textB: "ACE",
  rows: "3",
  cols: "7",
};

export const DEFAULT_FIELDS: Record<
  DynamicProgrammingAlgorithm,
  Partial<DynamicProgrammingForm>
> = {
  fibonacci: { n: "8" },
  coin_change: { coins: "1, 3, 4", amount: "6" },
  knapsack: {
    weights: "2, 3, 4, 5",
    values: "3, 4, 5, 6",
    capacity: "5",
  },
  lcs: { textA: "ABCDEF", textB: "ACE" },
  edit_distance: { textA: "kitten", textB: "sitting" },
  unique_paths: { rows: "3", cols: "7" },
};

export function parseIntegerList(rawValue: string, label: string) {
  const parts = rawValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error(`${label} must include at least one value.`);
  }

  return parts.map((part) => parseInteger(part, label));
}

export function requireListLength(
  values: number[],
  label: string,
  minimum: number,
  maximum: number,
) {
  if (values.length < minimum || values.length > maximum) {
    throw new Error(`${label} must include ${minimum} to ${maximum} values.`);
  }
  return values;
}

export function requirePositiveValues(values: number[], label: string) {
  if (values.some((value) => value <= 0)) {
    throw new Error(`${label} must contain positive values.`);
  }
  return values;
}

export function requireNonnegativeValues(values: number[], label: string) {
  if (values.some((value) => value < 0)) {
    throw new Error(`${label} must contain nonnegative values.`);
  }
  return values;
}

export function requireText(value: string, label: string) {
  if (value.length > 12) {
    throw new Error(`${label} must be 12 characters or fewer.`);
  }
  return value;
}

export function createRequest(
  algorithm: DynamicProgrammingAlgorithm,
  form: DynamicProgrammingForm,
): DynamicProgrammingRequest {
  if (algorithm === "fibonacci") {
    return {
      algorithm,
      n: requireRange(parseInteger(form.n, "n"), "n", 0, 40),
    };
  }

  if (algorithm === "coin_change") {
    const coins = requirePositiveValues(
      requireListLength(parseIntegerList(form.coins, "Coins"), "Coins", 1, 8),
      "Coins",
    );
    return {
      algorithm,
      coins,
      amount: requireRange(parseInteger(form.amount, "Amount"), "Amount", 0, 50),
    };
  }

  if (algorithm === "knapsack") {
    const weights = requirePositiveValues(
      requireListLength(
        parseIntegerList(form.weights, "Weights"),
        "Weights",
        1,
        8,
      ),
      "Weights",
    );
    const values = requireNonnegativeValues(
      requireListLength(parseIntegerList(form.values, "Values"), "Values", 1, 8),
      "Values",
    );
    if (weights.length !== values.length) {
      throw new Error("Knapsack requires matching weights and values.");
    }
    return {
      algorithm,
      weights,
      values,
      capacity: requireRange(
        parseInteger(form.capacity, "Capacity"),
        "Capacity",
        0,
        50,
      ),
    };
  }

  if (algorithm === "lcs") {
    return {
      algorithm,
      text_a: requireText(form.textA, "First string"),
      text_b: requireText(form.textB, "Second string"),
    };
  }

  if (algorithm === "edit_distance") {
    return {
      algorithm,
      text_a: requireText(form.textA, "Source string"),
      text_b: requireText(form.textB, "Target string"),
    };
  }

  return {
    algorithm,
    rows: requireRange(parseInteger(form.rows, "Rows"), "Rows", 1, 12),
    cols: requireRange(parseInteger(form.cols, "Columns"), "Columns", 1, 12),
  };
}

export function createDefaultRequest(algorithm: DynamicProgrammingAlgorithm) {
  return createRequest(algorithm, {
    ...INITIAL_FORM,
    ...DEFAULT_FIELDS[algorithm],
  });
}

export function safeRequest(
  algorithm: DynamicProgrammingAlgorithm,
  form: DynamicProgrammingForm,
) {
  try {
    return createRequest(algorithm, form);
  } catch {
    return createDefaultRequest(algorithm);
  }
}

export function formFieldsFromRequest(
  request: Omit<DynamicProgrammingRequest, "algorithm">,
): Partial<DynamicProgrammingForm> {
  return {
    ...(request.n !== undefined ? { n: String(request.n) } : {}),
    ...(request.coins ? { coins: request.coins.join(", ") } : {}),
    ...(request.amount !== undefined ? { amount: String(request.amount) } : {}),
    ...(request.weights ? { weights: request.weights.join(", ") } : {}),
    ...(request.values ? { values: request.values.join(", ") } : {}),
    ...(request.capacity !== undefined ? { capacity: String(request.capacity) } : {}),
    ...(request.text_a !== undefined ? { textA: request.text_a } : {}),
    ...(request.text_b !== undefined ? { textB: request.text_b } : {}),
    ...(request.rows !== undefined ? { rows: String(request.rows) } : {}),
    ...(request.cols !== undefined ? { cols: String(request.cols) } : {}),
  };
}

export function validateDynamicProgrammingForm(
  algorithm: DynamicProgrammingAlgorithm,
  form: DynamicProgrammingForm,
): Partial<Record<keyof DynamicProgrammingForm | "form", string>> {
  try {
    createRequest(algorithm, form);
    return {};
  } catch (validationError) {
    const message = validationError instanceof Error ? validationError.message : "Check the highlighted inputs.";
    const field = dynamicProgrammingErrorField(message);
    return field ? { [field]: message } : { form: message };
  }
}

export function dynamicProgrammingErrorField(message: string): keyof DynamicProgrammingForm | null {
  if (message.startsWith("n ")) return "n";
  if (message.startsWith("Coins")) return "coins";
  if (message.startsWith("Amount")) return "amount";
  if (message.startsWith("Weights")) return "weights";
  if (message.startsWith("Values")) return "values";
  if (message.startsWith("Capacity")) return "capacity";
  if (message.startsWith("First string") || message.startsWith("Source string")) return "textA";
  if (message.startsWith("Second string") || message.startsWith("Target string")) return "textB";
  if (message.startsWith("Rows")) return "rows";
  if (message.startsWith("Columns")) return "cols";
  return null;
}
