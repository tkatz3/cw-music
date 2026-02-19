export interface Station {
  id: string;
  name: string;
  description: string;
  stream_url: string;
  color: string;
}

export const STATIONS: Station[] = [
  {
    id: 'groovesalad',
    name: 'Groove Salad',
    description: 'A nicely chilled plate of ambient/downtempo beats and grooves',
    stream_url: 'https://ice2.somafm.com/groovesalad-256-mp3',
    color: '#4CAF50',
  },
  {
    id: 'dronezone',
    name: 'Drone Zone',
    description: 'Served best chilled, safe with most medications. Alarm-free ambient.',
    stream_url: 'https://ice2.somafm.com/dronezone-256-mp3',
    color: '#7B1FA2',
  },
  {
    id: 'lush',
    name: 'Lush',
    description: 'Sensuous and mellow vocals, mostly female, with an electronic influence',
    stream_url: 'https://ice2.somafm.com/lush-128-mp3',
    color: '#E91E63',
  },
  {
    id: 'deepspaceone',
    name: 'Deep Space One',
    description: 'Deep ambient electronic, experimental, and space music',
    stream_url: 'https://ice2.somafm.com/deepspaceone-128-mp3',
    color: '#1A237E',
  },
  {
    id: 'seventies',
    name: 'Left Coast 70s',
    description: 'Mellow 70s album tracks',
    stream_url: 'https://ice2.somafm.com/seventies-320-mp3',
    color: '#FF9800',
  },
  {
    id: 'bootliquor',
    name: 'Boot Liquor',
    description: 'Americana roots music for cowhands, raconteurs, and campfire pickers',
    stream_url: 'https://ice2.somafm.com/bootliquor-320-mp3',
    color: '#795548',
  },
  {
    id: 'thistle',
    name: 'ThistleRadio',
    description: 'Exploring music from Celtic roots and branches, curated by Fiona Ritchie',
    stream_url: 'https://ice2.somafm.com/thistle-128-mp3',
    color: '#8BC34A',
  },
  {
    id: 'sonicuniverse',
    name: 'Sonic Universe',
    description: 'Transcending the world of jazz with eclectic, avant-garde takes on tradition',
    stream_url: 'https://ice2.somafm.com/sonicuniverse-256-mp3',
    color: '#FFC107',
  },
  {
    id: 'lounge',
    name: 'Illinois Street Lounge',
    description: 'Classic bachelor pad, cocktail music, and exotica',
    stream_url: 'https://ice2.somafm.com/illstreet-256-mp3',
    color: '#FF5722',
  },
  {
    id: 'vaporwaves',
    name: 'Vaporwaves',
    description: 'All Vaporwave, all the time',
    stream_url: 'https://ice2.somafm.com/vaporwaves-128-mp3',
    color: '#CE93D8',
  },
];
