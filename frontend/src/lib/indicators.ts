export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Candle {
  i: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export function genCandles(
  seed: number,
  n: number,
  start: number,
  drift: number,
  vol: number
): Candle[] {
  const rnd = mulberry32(seed);
  const out: Candle[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    const open = price;
    const change = (rnd() - 0.5) * 2 * vol + drift;
    const close = Math.max(1, open * (1 + change));
    const hi = Math.max(open, close) * (1 + rnd() * vol * 0.6);
    const lo = Math.min(open, close) * (1 - rnd() * vol * 0.6);
    const volume = Math.round((0.6 + rnd()) * 1e6);
    out.push({ i, open, close, high: hi, low: lo, volume });
    price = close;
  }
  return out;
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
