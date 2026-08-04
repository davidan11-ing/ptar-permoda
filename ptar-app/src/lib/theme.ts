/**
 * Tokens de color por tema.
 * Se consume via useTheme() — nunca hardcodear hex directamente en los componentes.
 */
export interface ThemeTokens {
  // Fondos
  bg: string;
  surface: string;
  surface2: string;
  // Bordes
  border: string;
  border2: string;
  // Texto
  text1: string;
  text2: string;
  muted: string;
  dim: string;
  // Brand / acento
  brand: string;
  blue: string;
  lblue: string;
  // Semáforo
  green: string;
  amber: string;
  red: string;
  // Chips / badges — fondo y texto
  chipGreenBg: string;  chipGreenText: string;
  chipAmberBg: string;  chipAmberText: string;
  chipRedBg:   string;  chipRedText:   string;
  chipBlueBg:  string;  chipBlueText:  string;
  chipCyanBg:  string;  chipCyanText:  string;
  // Helpers de sombra
  shadow: string;
  shadowMd: string;
}

export const darkTheme: ThemeTokens = {
  bg:       '#0d1117',
  surface:  '#161b22',
  surface2: '#21262d',
  border:   '#30363d',
  border2:  '#21262d',
  text1:    '#e6edf3',
  text2:    '#c9d1d9',
  muted:    '#8b949e',
  dim:      '#484f58',
  brand:    '#00c5e3',
  blue:     '#1f6feb',
  lblue:    '#58a6ff',
  green:    '#3fb950',
  amber:    '#d29922',
  red:      '#f85149',
  chipGreenBg:  'rgba(63,185,80,.12)',  chipGreenText:  '#3fb950',
  chipAmberBg:  'rgba(210,153,34,.12)', chipAmberText:  '#d29922',
  chipRedBg:    'rgba(248,81,73,.12)',  chipRedText:    '#f85149',
  chipBlueBg:   'rgba(31,111,235,.12)', chipBlueText:   '#58a6ff',
  chipCyanBg:   'rgba(0,197,227,.10)',  chipCyanText:   '#00c5e3',
  shadow:   'none',
  shadowMd: 'none',
};

export const lightTheme: ThemeTokens = {
  bg:       '#EAF0F7',
  surface:  '#FFFFFF',
  surface2: '#F2F6FB',
  border:   '#C8D6E5',
  border2:  '#DDE6F0',
  text1:    '#0F1923',
  text2:    '#2D3F52',
  muted:    '#5A6E82',
  dim:      '#8FA3B8',
  brand:    '#0091B0',
  blue:     '#1565C0',
  lblue:    '#1976D2',
  green:    '#1A7A35',
  amber:    '#7A5200',
  red:      '#B71C1C',
  chipGreenBg:  '#E6F7EA', chipGreenText:  '#1A7A35',
  chipAmberBg:  '#FFF3E0', chipAmberText:  '#7A5200',
  chipRedBg:    '#FDECEA', chipRedText:    '#B71C1C',
  chipBlueBg:   '#E3F2FD', chipBlueText:   '#1565C0',
  chipCyanBg:   '#E0F3F7', chipCyanText:   '#0091B0',
  shadow:   '0 1px 4px rgba(15,25,35,.07)',
  shadowMd: '0 4px 16px rgba(15,25,35,.12)',
};
