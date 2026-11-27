export function validateCountDraft(rawValue: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    return { error: "Enter a whole number from 5 to 40.", value: null };
  }
  if (value < 5 || value > 40) {
    return { error: "Random values must be between 5 and 40.", value: null };
  }
  return { error: null, value };
}

export function validateTarget(rawValue: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    return { error: "Enter an integer target value.", target: null };
  }
  return { error: null, target: value };
}
