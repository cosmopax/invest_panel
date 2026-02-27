/**
 * Technical indicator calculations for the Scout agent.
 * All functions accept arrays of OHLCV data and return indicator values.
 */

export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number; // Unix ms
}

export interface TechnicalIndicators {
  rsi14: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  sma50: number | null;
  sma200: number | null;
  ema50: number | null;
  ema200: number | null;
  bollingerBands: { upper: number; middle: number; lower: number } | null;
  volumeTrend: number | null; // ratio of recent vs average volume
  currentPrice: number;
  change24h: number | null;
}

/** Simple Moving Average over `period` closing prices. */
export function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

/** Exponential Moving Average over `period` closing prices. */
export function ema(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const multiplier = 2 / (period + 1);
  // Seed with SMA
  let value = closes.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  for (let i = period; i < closes.length; i++) {
    value = (closes[i] - value) * multiplier + value;
  }
  return value;
}

/**
 * RSI (Relative Strength Index) — 14-period standard.
 * Returns 0-100 where <30 = oversold, >70 = overbought.
 */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Smoothed RS
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * MACD (Moving Average Convergence Divergence).
 * Default periods: fast=12, slow=26, signal=9.
 */
export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): { macd: number; signal: number; histogram: number } | null {
  if (closes.length < slow + signalPeriod) return null;

  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  if (emaFast === null || emaSlow === null) return null;

  // Build MACD line series for signal calculation
  const macdLine: number[] = [];
  const fastMult = 2 / (fast + 1);
  const slowMult = 2 / (slow + 1);

  let fastEma = closes.slice(0, fast).reduce((s, v) => s + v, 0) / fast;
  let slowEma = closes.slice(0, slow).reduce((s, v) => s + v, 0) / slow;

  for (let i = slow; i < closes.length; i++) {
    fastEma = (closes[i] - fastEma) * fastMult + fastEma;
    slowEma = (closes[i] - slowEma) * slowMult + slowEma;
    macdLine.push(fastEma - slowEma);
  }

  if (macdLine.length < signalPeriod) return null;

  // Signal line = EMA of MACD line
  const sigMult = 2 / (signalPeriod + 1);
  let signalLine =
    macdLine.slice(0, signalPeriod).reduce((s, v) => s + v, 0) / signalPeriod;
  for (let i = signalPeriod; i < macdLine.length; i++) {
    signalLine = (macdLine[i] - signalLine) * sigMult + signalLine;
  }

  const currentMacd = macdLine[macdLine.length - 1];
  return {
    macd: currentMacd,
    signal: signalLine,
    histogram: currentMacd - signalLine,
  };
}

/**
 * Bollinger Bands — 20-day SMA ± 2 standard deviations.
 */
export function bollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2,
): { upper: number; middle: number; lower: number } | null {
  if (closes.length < period) return null;

  const slice = closes.slice(-period);
  const middle = slice.reduce((sum, v) => sum + v, 0) / period;
  const variance =
    slice.reduce((sum, v) => sum + (v - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + stdDevMultiplier * stdDev,
    middle,
    lower: middle - stdDevMultiplier * stdDev,
  };
}

/**
 * Volume trend — ratio of recent 5-day avg volume to 30-day avg volume.
 * >1 = volume increasing, <1 = volume decreasing.
 */
export function volumeTrend(
  volumes: number[],
  shortPeriod = 5,
  longPeriod = 30,
): number | null {
  if (volumes.length < longPeriod) return null;

  const shortAvg =
    volumes.slice(-shortPeriod).reduce((s, v) => s + v, 0) / shortPeriod;
  const longAvg =
    volumes.slice(-longPeriod).reduce((s, v) => s + v, 0) / longPeriod;

  if (longAvg === 0) return null;
  return shortAvg / longAvg;
}

/**
 * Compute all technical indicators from OHLCV data.
 */
export function computeIndicators(candles: OHLCV[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const currentPrice = closes[closes.length - 1] ?? 0;
  const prevPrice = closes.length >= 2 ? closes[closes.length - 2] : null;

  return {
    rsi14: rsi(closes),
    macd: macd(closes),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    bollingerBands: bollingerBands(closes),
    volumeTrend: volumeTrend(volumes),
    currentPrice,
    change24h: prevPrice !== null ? currentPrice - prevPrice : null,
  };
}

/** Generate a human-readable summary of technical indicators for the Scout prompt. */
export function summarizeIndicators(
  symbol: string,
  indicators: TechnicalIndicators,
): string {
  const lines: string[] = [`${symbol}: price=${indicators.currentPrice.toFixed(2)}`];

  if (indicators.rsi14 !== null) {
    const zone =
      indicators.rsi14 < 30
        ? "OVERSOLD"
        : indicators.rsi14 > 70
          ? "OVERBOUGHT"
          : "neutral";
    lines.push(`  RSI(14)=${indicators.rsi14.toFixed(1)} [${zone}]`);
  }

  if (indicators.macd) {
    const direction = indicators.macd.histogram > 0 ? "bullish" : "bearish";
    lines.push(
      `  MACD=${indicators.macd.macd.toFixed(3)}, signal=${indicators.macd.signal.toFixed(3)}, histogram=${indicators.macd.histogram.toFixed(3)} [${direction}]`,
    );
  }

  if (indicators.sma50 !== null) {
    const aboveBelow =
      indicators.currentPrice > indicators.sma50 ? "above" : "below";
    lines.push(`  SMA(50)=${indicators.sma50.toFixed(2)} [price ${aboveBelow}]`);
  }
  if (indicators.sma200 !== null) {
    const aboveBelow =
      indicators.currentPrice > indicators.sma200 ? "above" : "below";
    lines.push(
      `  SMA(200)=${indicators.sma200.toFixed(2)} [price ${aboveBelow}]`,
    );
  }

  if (indicators.bollingerBands) {
    const bb = indicators.bollingerBands;
    const position =
      indicators.currentPrice > bb.upper
        ? "ABOVE upper"
        : indicators.currentPrice < bb.lower
          ? "BELOW lower"
          : "within bands";
    lines.push(
      `  Bollinger(20,2): ${bb.lower.toFixed(2)}/${bb.middle.toFixed(2)}/${bb.upper.toFixed(2)} [${position}]`,
    );
  }

  if (indicators.volumeTrend !== null) {
    const trend =
      indicators.volumeTrend > 1.2
        ? "HIGH"
        : indicators.volumeTrend < 0.8
          ? "LOW"
          : "normal";
    lines.push(
      `  Volume trend=${indicators.volumeTrend.toFixed(2)}x [${trend}]`,
    );
  }

  return lines.join("\n");
}
