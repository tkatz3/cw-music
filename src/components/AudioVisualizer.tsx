interface AudioVisualizerProps {
  active: boolean;
  color?: string;
  size?: 'sm' | 'lg';
}

export function AudioVisualizer({ active, color = '#f0a500', size = 'sm' }: AudioVisualizerProps) {
  const barCount = size === 'lg' ? 12 : 5;
  const heights = size === 'lg'
    ? [40, 65, 85, 70, 95, 55, 80, 60, 75, 50, 90, 45]
    : [30, 60, 45, 70, 40];

  return (
    <div
      className="flex items-end gap-[3px]"
      style={{ height: size === 'lg' ? '60px' : '24px' }}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${active ? 'animate-none' : 'opacity-30'}`}
          style={{
            width: size === 'lg' ? '4px' : '3px',
            backgroundColor: color,
            height: active ? `${heights[i % heights.length]}%` : '20%',
            animation: active ? `equalizer ${0.8 + (i % 4) * 0.2}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
