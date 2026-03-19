interface StatusRingProps {
  total: number;
  onTrack: number;
  atRisk: number;
  slipped: number;
  done: number;
}

interface LegendItem {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export const StatusRing = ({ total, onTrack, atRisk, slipped, done }: StatusRingProps) => {
  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
        <span style={{ fontSize: 12, color: 'var(--salt-color-foreground-secondary)' }}>No data</span>
      </div>
    );
  }

  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const onTrackPct = pct(onTrack);
  const atRiskPct = pct(atRisk);
  const slippedPct = pct(slipped);
  const donePct = pct(done);

  let cursor = 0;
  const segments: string[] = [];

  const addSegment = (color: string, p: number) => {
    if (p <= 0) return;
    segments.push(`${color} ${cursor}% ${cursor + p}%`);
    cursor += p;
  };

  addSegment('var(--salt-status-success-foreground)', onTrackPct);
  addSegment('var(--salt-status-warning-foreground)', atRiskPct);
  addSegment('var(--salt-status-error-foreground)', slippedPct);
  addSegment('var(--salt-color-gray-300)', donePct);
  if (cursor < 100) addSegment('var(--salt-separable-primary-borderColor)', 100 - cursor);

  const gradient = `conic-gradient(${segments.join(', ')})`;

  const legend: LegendItem[] = [
    { label: 'On Track', count: onTrack, pct: Math.round(onTrackPct), color: 'var(--salt-status-success-foreground)' },
    { label: 'At Risk', count: atRisk, pct: Math.round(atRiskPct), color: 'var(--salt-status-warning-foreground)' },
    { label: 'Slipped', count: slipped, pct: Math.round(slippedPct), color: 'var(--salt-status-error-foreground)' },
    { label: 'Done', count: done, pct: Math.round(donePct), color: 'var(--salt-color-gray-300)' },
  ].filter((i) => i.count > 0);

  const onTrackPctRounded = Math.round(onTrackPct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--salt-spacing-150)' }}>
      {/* Donut ring */}
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <div style={{ width: 140, height: 140, borderRadius: '50%', background: gradient }} />
        {/* Hole */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: 'var(--salt-color-background)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--salt-status-success-foreground)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {onTrackPctRounded}%
          </span>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--salt-color-foreground-secondary)', fontWeight: 700 }}>
            On Track
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', width: '100%' }}>
        {legend.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--salt-color-foreground-secondary)', flex: 1 }}>{item.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--salt-color-foreground)', fontVariantNumeric: 'tabular-nums' }}>{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
