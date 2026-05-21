interface Props {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
  size?: number;
}

export default function KpiGauge({ label, value, target, unit, color, size = 140 }: Props) {
  const r = (size / 2) - 14;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -220;
  const endAngle = 40;
  const totalDeg = endAngle - startAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (pct: number, strokeR = r) => {
    const deg = startAngle + totalDeg * Math.min(pct, 1);
    const x1 = cx + strokeR * Math.cos(toRad(startAngle));
    const y1 = cy + strokeR * Math.sin(toRad(startAngle));
    const x2 = cx + strokeR * Math.cos(toRad(deg));
    const y2 = cy + strokeR * Math.sin(toRad(deg));
    const large = deg - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${strokeR} ${strokeR} 0 ${large} 1 ${x2} ${y2}`;
  };

  const pct = value / 100;
  const targetPct = target / 100;
  const isGood = value >= target;

  const targetDeg = startAngle + totalDeg * targetPct;
  const tx = cx + r * Math.cos(toRad(targetDeg));
  const ty = cy + r * Math.sin(toRad(targetDeg));
  const ti_x = cx + (r - 12) * Math.cos(toRad(targetDeg));
  const ti_y = cy + (r - 12) * Math.sin(toRad(targetDeg));

  return (
    <div className="kpi-gauge">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <path d={arcPath(1)} fill="none" stroke="#1e2d3d" strokeWidth="10" strokeLinecap="round"/>
        {/* Value arc */}
        <path d={arcPath(pct)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/>
        {/* Target marker */}
        <line x1={ti_x} y1={ti_y} x2={tx} y2={ty} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="700" fontFamily="monospace">
          {value}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#8b949e" fontSize={size * 0.1}>
          {unit}
        </text>
        {/* Status dot */}
        <circle cx={cx} cy={cy + 28} r="5" fill={isGood ? '#3fb950' : '#f85149'}/>
      </svg>
      <div className="kpi-label">{label}</div>
      <div className="kpi-target">Meta: {target}{unit}</div>
    </div>
  );
}
