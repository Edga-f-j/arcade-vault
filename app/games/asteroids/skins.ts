// app/games/asteroids/skins.ts
// Módulo puro — sin imports de React / Next / Supabase

export type Skin = {
  boardBg: string        // fondo del canvas ('' = transparente)
  shipColor: string      // color de la nave y asteroides
  bulletColor: string    // color de las balas
  thrustColor: string    // color del chorro de empuje
  powerUpColor: string   // color del power-up 3x
  particleColor: string  // color base de las partículas de explosión
  hudColor: string       // color del texto HUD interno
  tripleShotColor: string // color del indicador triple disparo
  shadowBlur: number     // 0 = sin glow
  shadowColor: string    // color del glow ('' si shadowBlur === 0)
  retroHighlight: boolean // true = añadir highlight CRT en asteroides
}

export const SKINS: Record<string, Skin> = {
  classic: {
    boardBg: '#000000',
    shipColor: '#ffffff',
    bulletColor: '#ffffff',
    thrustColor: 'rgba(255,130,0,0.85)',
    powerUpColor: '#00ffff',
    particleColor: '#ffffff',
    hudColor: '#ffffff',
    tripleShotColor: '#00ffff',
    shadowBlur: 0,
    shadowColor: '',
    retroHighlight: false,
  },
  retro: {
    boardBg: '#0d0d14',
    shipColor: '#39d353',
    bulletColor: '#ffb000',
    thrustColor: 'rgba(255,176,0,0.80)',
    powerUpColor: '#4488ff',
    particleColor: '#39d353',
    hudColor: '#39d353',
    tripleShotColor: '#4488ff',
    shadowBlur: 0,
    shadowColor: '',
    retroHighlight: false,
  },
  neon: {
    boardBg: '#000000',
    shipColor: '#f5ff00',
    bulletColor: '#f5ff00',
    thrustColor: 'rgba(255,100,0,0.90)',
    powerUpColor: '#00f5ff',
    particleColor: '#f5ff00',
    hudColor: '#f5ff00',
    tripleShotColor: '#00f5ff',
    shadowBlur: 12,
    shadowColor: '#f5ff00',
    retroHighlight: false,
  },
}
