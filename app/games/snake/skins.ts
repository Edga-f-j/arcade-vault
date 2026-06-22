// app/games/snake/skins.ts
// Módulo puro — sin imports de React, Next.js ni Supabase.

export type Skin = {
  boardBg: string
  gridLineColor: string
  snakeHeadColor: string
  snakeBodyColor: string
  fruitAlpha: number
  textColor: string
}

export const SKINS: Record<string, Skin> = {
  classic: {
    boardBg: '#0a0a0a',
    gridLineColor: '#1a1a1a',
    snakeHeadColor: '#22c55e',
    snakeBodyColor: '#4ade80',
    fruitAlpha: 1,
    textColor: '#ffffff',
  },

  retro: {
    boardBg: '#0d0d14',
    gridLineColor: '#1a2a2f',
    snakeHeadColor: '#39d353',
    snakeBodyColor: '#26a86d',
    fruitAlpha: 0.9,
    textColor: '#39d353',
  },

  neon: {
    boardBg: '#000000',
    gridLineColor: '#0a2a3a',
    snakeHeadColor: '#00ff88',
    snakeBodyColor: '#00dd77',
    fruitAlpha: 1,
    textColor: '#00ff88',
  },
}
