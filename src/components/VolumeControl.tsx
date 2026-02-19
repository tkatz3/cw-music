interface VolumeControlProps {
  volume: number;
  onChange: (v: number) => void;
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  const icon = volume === 0 ? '○' : volume < 40 ? '◔' : volume < 75 ? '◑' : '●';

  return (
    <div className="flex items-center gap-3">
      <span
        style={{ color: '#534840', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', width: '10px' }}
      >
        {icon}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 cursor-pointer"
        style={{ accentColor: '#E4A530' }}
      />
      <span
        style={{ color: '#534840', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', width: '28px' }}
      >
        {volume}%
      </span>
    </div>
  );
}
