interface VolumeControlProps {
  volume: number;
  onChange: (v: number) => void;
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-sm">
        {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 accent-amber-400 cursor-pointer"
      />
      <span className="text-gray-400 text-xs font-mono w-8">{volume}%</span>
    </div>
  );
}
