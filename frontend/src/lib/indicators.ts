export interface Candle {
  i: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev: number | undefined;
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + (prev as number) * (1 - k);
    out.push(prev);
  });
  return out;
}

export function bollinger(closes: number[], period = 20, mult = 2) {
  const up: (number | null)[] = [];
  const lo: (number | null)[] = [];
  const mid: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      up.push(null);
      lo.push(null);
      mid.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const m = slice.reduce((a, b) => a + b, 0) / period;
    const sd = Math.sqrt(slice.reduce((a, b) => a + (b - m) ** 2, 0) / period);
    mid.push(m);
    up.push(m + mult * sd);
    lo.push(m - mult * sd);
  }
  return { up, lo, mid };
}
