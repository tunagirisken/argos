import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { bbLines, emaLine, seriesFor, tvColors, type LwSeries } from "../../lib/lwc";

type Overlays = { ema20: boolean; ema50: boolean; bb: boolean };

export function TVChart({
  lw,
  range,
  mode,
  overlays,
  theme,
}: {
  lw: LwSeries;
  range: string;
  mode: "candle" | "line";
  overlays: Overlays;
  theme?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick" | "Line" | "Histogram">[]>([]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const c = tvColors();
    const chart = createChart(wrapRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: c.text,
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: c.border, labelBackgroundColor: c.accent },
        horzLine: { color: c.border, labelBackgroundColor: c.accent },
      },
      rightPriceScale: { borderColor: c.border, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: {
        borderColor: c.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 0,
        fixRightEdge: true,
        fixLeftEdge: false,
      },
      handleScale: { axisPressedMouseMove: true },
    });
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const c = tvColors();
    chart.applyOptions({
      layout: { textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
      crosshair: {
        vertLine: { color: c.border, labelBackgroundColor: c.accent },
        horzLine: { color: c.border, labelBackgroundColor: c.accent },
      },
    });
  }, [theme]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const c = tvColors();
    seriesRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        /* StrictMode remount */
      }
    });
    seriesRef.current = [];
    const add = <T extends ISeriesApi<"Candlestick" | "Line" | "Histogram">>(s: T) => {
      seriesRef.current.push(s);
      return s;
    };
    const { ohlc, vol } = seriesFor(lw, range);

    const v = add(
      chart.addHistogramSeries({
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      })
    );
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    v.setData(vol);

    if (mode === "line") {
      const ls = add(
        chart.addLineSeries({
          color: c.accent,
          lineWidth: 2,
          priceLineColor: c.accent,
          crosshairMarkerVisible: true,
          lastValueVisible: true,
        })
      );
      ls.setData(ohlc.map((o) => ({ time: o.time, value: o.close })));
    } else {
      const cs = add(
        chart.addCandlestickSeries({
          upColor: c.up,
          downColor: c.down,
          wickUpColor: c.up,
          wickDownColor: c.down,
          borderVisible: false,
        })
      );
      cs.setData(ohlc);
    }

    if (overlays.ema20) {
      const s = add(
        chart.addLineSeries({
          color: "#ff9800",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })
      );
      s.setData(emaLine(ohlc, 20));
    }
    if (overlays.ema50) {
      const s = add(
        chart.addLineSeries({
          color: "#ab47bc",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })
      );
      s.setData(emaLine(ohlc, 50));
    }
    if (overlays.bb) {
      const { up, lo } = bbLines(ohlc, 20, 2);
      const o1 = add(
        chart.addLineSeries({
          color: "rgba(120,123,134,0.7)",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          lineStyle: 2,
        })
      );
      const o2 = add(
        chart.addLineSeries({
          color: "rgba(120,123,134,0.7)",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          lineStyle: 2,
        })
      );
      o1.setData(up);
      o2.setData(lo);
    }
    const ts = chart.timeScale();
    ts.fitContent();
    if (ohlc.length > 1) {
      ts.setVisibleLogicalRange({ from: 0, to: ohlc.length - 1 });
    }
  }, [lw, range, mode, overlays]);

  return <div ref={wrapRef} className="chart-wrap" />;
}
