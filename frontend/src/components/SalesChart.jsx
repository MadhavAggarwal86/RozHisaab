import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const DAY = 24 * 60 * 60 * 1000;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shortDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const rupees = (n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// Rounds the axis top up to a friendly number (1, 2, 2.5, 5 × 10ⁿ)
function niceMax(value) {
  if (value <= 0) return 100;
  const step = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 2.5, 5, 10].map((m) => m * step).find((n) => n >= value);
}

// Builds [{ date, current, previous }] for each of the last `days` days, with the matching day of the period before
function buildSeries(totals, days) {
  const today = new Date();
  today.setHours(12, 0, 0, 0); // midday avoids DST edge cases when stepping by 24h
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today.getTime() - (days - 1 - i) * DAY);
    const before = new Date(date.getTime() - days * DAY);
    return { date, current: totals[dateKey(date)] || 0, previous: totals[dateKey(before)] || 0 };
  });
}

export default function SalesChart() {
  const { token } = useAuth();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [hover, setHover] = useState(null);
  const [width, setWidth] = useState(600);
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setData(null);
    setError('');
    api(`/bills/sales?days=${days}&since=${encodeURIComponent(start.toISOString())}&tz=${encodeURIComponent(tz)}`, { token })
      .then((res) => setData(buildSeries(res.totals, days)))
      .catch((err) => setError(err.message));
  }, [token, days]);

  const sum = (key) => (data || []).reduce((s, d) => s + d[key], 0);
  const current = sum('current');
  const previous = sum('previous');
  const change = previous > 0 ? ((current - previous) / previous) * 100 : null;

  const plotW = Math.max(width - PAD.left - PAD.right, 10);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...(data || []).flatMap((d) => [d.current, d.previous])));
  const x = (i) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v) => PAD.top + plotH - (v / max) * plotH;
  const path = (key) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  // Label every day for a week, every 5th day (counting back from today) for a month
  const labelEvery = days === 7 ? 1 : 5;

  const onMove = (e) => {
    if (!data) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - PAD.left) / plotW) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };

  return (
    <section className="home-panel sales-chart">
      <div className="chart-header">
        <div>
          <h2>Sales trend</h2>
          <div className="chart-summary">
            <strong>{data ? rupees(current) : '…'}</strong>
            <span className="muted">last {days} days</span>
            {data && change != null && (
              <span className={`change ${change >= 0 ? 'up' : 'down'}`}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% vs previous {days} days
              </span>
            )}
            {data && change == null && <span className="muted">No sales in the previous {days} days</span>}
          </div>
        </div>
        <div className="segmented" role="group" aria-label="Time range">
          {[7, 30].map((d) => (
            <button key={d} type="button" className={d === days ? 'active' : ''} onClick={() => setDays(d)} aria-pressed={d === days}>
              {d} days
            </button>
          ))}
        </div>
      </div>

      <div className="chart-legend">
        <span><i className="swatch current" /> Last {days} days</span>
        <span><i className="swatch previous" /> Previous {days} days</span>
      </div>

      <div className="chart-wrap" ref={wrapRef}>
        {error ? (
          <p className="empty-row">{error}</p>
        ) : !data ? (
          <p className="empty-row" style={{ height: HEIGHT }}>Loading…</p>
        ) : (
          <svg width={width} height={HEIGHT} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img"
            aria-label={`Daily sales for the last ${days} days compared with the previous ${days} days`}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="grid" x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} />
                <text className="axis" x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{rupees(t)}</text>
              </g>
            ))}
            {data.map((d, i) => (data.length - 1 - i) % labelEvery === 0 ? (
              <text key={i} className="axis" x={x(i)} y={HEIGHT - 8} textAnchor="middle">
                {days === 7 ? d.date.toLocaleDateString('en-IN', { weekday: 'short' }) : shortDate(d.date)}
              </text>
            ) : null)}

            <path className="line previous" d={path('previous')} />
            <path className="line current" d={path('current')} />

            {hover != null && (
              <g>
                <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} />
                <circle className="dot previous" cx={x(hover)} cy={y(data[hover].previous)} r={4} />
                <circle className="dot current" cx={x(hover)} cy={y(data[hover].current)} r={5} />
              </g>
            )}
          </svg>
        )}

        {hover != null && data && (
          <div className="chart-tooltip" style={{ left: Math.min(Math.max(x(hover), 90), width - 90) }}>
            <div className="tooltip-date">{data[hover].date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
            <div><i className="swatch current" /> {rupees(data[hover].current)}</div>
            <div className="muted">
              <i className="swatch previous" /> {rupees(data[hover].previous)} on {shortDate(new Date(data[hover].date.getTime() - days * DAY))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
