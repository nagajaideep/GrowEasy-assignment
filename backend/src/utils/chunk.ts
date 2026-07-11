/** Split an array into consecutive chunks of at most `size` elements. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk size must be > 0');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Promise-based delay used for retry backoff. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
