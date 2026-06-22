// app/games/frogger/skins.ts
// Módulo puro — sin imports de React / Next / Supabase

export type Skin = {
  boardBg: string         // '' = clearRect transparente; color = rellena fondo
  goalBg: string          // fondo zona meta (fila 0)
  goalFilled: string      // meta ocupada
  riverBg: string         // fondo zona río
  safeBg: string          // fondo zona segura / salida
  roadBg: string          // fondo zona carretera
  roadDash: string        // rayas discontinuas de carretera
  goalBorder: string      // borde de bocas destino
  frogColor: string       // color de la rana
  carColors: string[]     // paleta de coches (se elige por índice)
  truckBody: string       // color cuerpo del camión
  truckCabin: string      // color cabina del camión
  wheelColor: string      // color de ruedas
  logColor: string        // color troncos
  logGrain: string        // líneas de veta del tronco
  turtleColor: string     // color tortugas visibles
  turtleSubmerged: string // color tortugas sumergidas
  turtleShell: string     // contorno caparazón
  hudColor: string        // texto HUD interno del canvas
  timerBarBg: string      // fondo barra de tiempo
  shadowBlur: number      // 0 = sin glow
  shadowColor: string     // color glow ('' si shadowBlur === 0)
  retroHighlight: boolean // true = highlight CRT de 4px en bloques sólidos
}

export const SKINS: Record<string, Skin> = {
  classic: {
    boardBg: '',
    goalBg: '#1a4a1a',
    goalFilled: '#2a6a2a',
    riverBg: '#0a1a3a',
    safeBg: '#1a3a1a',
    roadBg: '#1a1a1a',
    roadDash: '#333333',
    goalBorder: '#c8a000',
    frogColor: '#4ade80',
    carColors: ['#e63946', '#f4a261', '#4895ef'],
    truckBody: '#888888',
    truckCabin: '#555555',
    wheelColor: '#111111',
    logColor: '#8B4513',
    logGrain: '#6B3410',
    turtleColor: '#15803d',
    turtleSubmerged: '#22c55e',
    turtleShell: '#166534',
    hudColor: '#ffffff',
    timerBarBg: '#111111',
    shadowBlur: 0,
    shadowColor: '',
    retroHighlight: false,
  },
  retro: {
    boardBg: '#0d0d14',
    goalBg: '#0a1f0a',
    goalFilled: '#143d14',
    riverBg: '#060d1a',
    safeBg: '#0a180a',
    roadBg: '#111111',
    roadDash: '#2a2a2a',
    goalBorder: '#ffb000',
    frogColor: '#39d353',
    carColors: ['#ffb000', '#4488ff', '#39d353'],
    truckBody: '#556b2f',
    truckCabin: '#3b4c21',
    wheelColor: '#0a0a0a',
    logColor: '#7a3b10',
    logGrain: '#5a2b0a',
    turtleColor: '#2a7a3a',
    turtleSubmerged: '#1a4a2a',
    turtleShell: '#1a5a2a',
    hudColor: '#39d353',
    timerBarBg: '#0a0a0a',
    shadowBlur: 0,
    shadowColor: '',
    retroHighlight: true,
  },
  neon: {
    boardBg: '#000000',
    goalBg: '#001a00',
    goalFilled: '#003300',
    riverBg: '#00000f',
    safeBg: '#001500',
    roadBg: '#050505',
    roadDash: '#1a1a1a',
    goalBorder: '#00ff88',
    frogColor: '#00ff88',
    carColors: ['#ff006e', '#f5ff00', '#00f5ff'],
    truckBody: '#1a1a1a',
    truckCabin: '#111111',
    wheelColor: '#000000',
    logColor: '#2a1000',
    logGrain: '#3d1800',
    turtleColor: '#00ff88',
    turtleSubmerged: '#004422',
    turtleShell: '#00cc66',
    hudColor: '#00ff88',
    timerBarBg: '#000000',
    shadowBlur: 12,
    shadowColor: '#00ff88',
    retroHighlight: false,
  },
}
