export function parseInteger(rawValue: string, label: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be a whole number.`);
  }
  return value;
}

export function requireRange(value: number, label: string, minimum: number, maximum: number) {
  if (value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}
