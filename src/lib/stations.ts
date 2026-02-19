export interface Station {
  id: string;
  name: string;
  description: string;
  stream_url: string;
  color: string;
}

export interface Playlist {
  id: string;
  name: string;
  stationIds: string[];
  color: string;
}

// Vivid colors that read well on a warm dark background
const COLORS = [
  '#E4A530', '#7B8CDE', '#6BCF7F', '#E87D3E', '#AB69D1',
  '#5BC4E0', '#E05757', '#4CAF8C', '#CE93D8', '#42A5F5',
  '#FF8A65', '#26C6DA', '#EF5350', '#66BB6A', '#FFCA28',
];

export function stationColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
