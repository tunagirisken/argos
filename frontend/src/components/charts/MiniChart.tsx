import { useEffect, useRef } from "react";
import { ColorType, createChart, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { tvColors, type LwOhlc, type LwSeries } from "../../lib/lwc";

function validBars(bars: LwOhlc[]): LwOhlc[] {
  return bars.filter(
    (b) =>
      b.time != null &&
      Number.isFinite(b.open) &&
      Number.isFinite(b.high) &&
      Number.isFinite(b.low) &&
      Number.isFinite(b.close)
  );
}

export function MiniChart({
  lw,
  mode,
  theme,
}: {
  lw: LwSeries;
  mode: "candle" | "line";
  theme?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const serRef = useRef<ISeriesApi<"Candlestick" | "Area"> | null>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const chart = createChart(wrapRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        fontSize: 1,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false, borderVisible: false },
      crosshair: {
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;
    serRef.current = null;
    return () => {
      chart.remove();
      chartRef.current = null;
      serRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const c = tvColors();
    if (serRef.current) {
      try {
        chart.removeSeries(serRef.current);
      } catch {
        /* StrictMode remount — eski seri bu chart'a ait değil */
      }
      serRef.current = null;
    }
    const ohlc = validBars(lw.intra.slice(-40));
    if (!ohlc.length) return;
    if (mode === "line") {
      const up = ohlc[ohlc.length - 1].close >= ohlc[0].close;
      const col = up ? c.up : c.down;
      const s = chart.addAreaSeries({
        lineColor: col,
        topColor: `${col}44`,
        bottomColor: `${col}00`,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(ohlc.map((o) => ({ time: o.time, value: o.close })));
      serRef.current = s;
    } else {
      const s = chart.addCandlestickSeries({
        upColor: c.up,
        downColor: c.down,
        wickUpColor: c.up,
        wickDownColor: c.down,
        borderVisible: false,
      });
      s.setData(ohlc);
      serRef.current = s;
    }
    chart.timeScale().fitContent();
  }, [lw, mode, theme]);

  return <div ref={wrapRef} style={{ width: "100%", height: "100%" }} />;
}
