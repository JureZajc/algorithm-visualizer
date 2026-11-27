export function validateCountDraft(rawValue: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    return { error: "Enter a whole number from 5 to 50.", value: null };
  }
  if (value < 5 || value > 50) {
    return { error: "Random values must be between 5 and 50.", value: null };
  }
  return { error: null, value };
}
