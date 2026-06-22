// app/games/arkanoid/skins.ts
// Módulo puro — sin imports de React, Next.js ni Supabase.

export type Skin = {
  /** Modo de renderizado de bloques/pelota/paleta */
  renderMode: 'sprite' | 'flat' | 'neon'
  /** Color de fondo del canvas */
  boardBg: string
  /** Color de la paleta */
  paddleColor: string
  /** Color de la bola */
  ballColor: string
  /** Mapa color-nombre → hex para bloques (solo renderMode flat/neon) */
  blockColors: Record<string, string>
  /** Color del texto HUD interno del canvas */
  textColor: string
  /** Blur del glow (0 = sin glow) */
  shadowBlur: number
  /** Color del glow ('' si shadowBlur === 0) */
  shadowColor: string
  /** Color de contorno de bloque (solo neon) */
  strokeColor: string
}

export const SKINS: Record<string, Skin> = {
  classic: {
    renderMode:  'sprite',
    boardBg:     '#000000',
    paddleColor: '',           // no se usa — el sprite toma el control
    ballColor:   '',
    blockColors: {},
    textColor:   '#ffffff',
    shadowBlur:  0,
    shadowColor: '',
    strokeColor: '',
  },

  retro: {
    renderMode:  'flat',
    boardBg:     '#0d0d14',
    paddleColor: '#ffb000',    // ámbar CRT
    ballColor:   '#ffb000',
    blockColors: {
      red:     '#cc2200',
      yellow:  '#b38600',
      cyan:    '#007799',
      magenta: '#993377',
      hotpink: '#aa2255',
      green:   '#226633',
      gray:    '#4a4a5a',
    },
    textColor:   '#39d353',    // verde fósforo
    shadowBlur:  0,
    shadowColor: '',
    strokeColor: '',
  },

  neon: {
    renderMode:  'neon',
    boardBg:     '#000000',
    paddleColor: '#00f5ff',    // cyan — acento de Arkanoid
    ballColor:   '#ffffff',
    blockColors: {
      red:     '#ff4444',
      yellow:  '#f5ff00',
      cyan:    '#00f5ff',
      magenta: '#ff006e',
      hotpink: '#ff66aa',
      green:   '#00ff88',
      gray:    '#8899bb',
    },
    textColor:   '#00f5ff',
    shadowBlur:  14,
    shadowColor: '#00f5ff',
    strokeColor: '#00f5ff',
  },
}
