'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const FroggerGame = dynamic(() => import('../FroggerGame'), { ssr: false });

export default function FroggerPlayPage() {
  const [score, setScore]       = useState(0);
  const [lives, setLives]       = useState(3);
  const [level, setLevel]       = useState(1);
  const [paused, setPaused]     = useState(false);
  const [over, setOver]         = useState(false);
  const [name, setName]         = useState('');
  const [saved, setSaved]       = useState(false);
  const [gameKey, setGameKey]   = useState(0);
  const scoreSaved               = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('av_player_name');
    if (stored) setName(stored);
  }, []);

  function handleScoreChange(s: number) { setScore(s); }
  function handleLivesChange(l: number) { setLives(l); }
  function handleLevelChange(l: number) { setLevel(l); }

  function handleGameOver(finalScore: number) {
    setScore(finalScore);
    setOver(true);
  }

  async function handleSave() {
    if (scoreSaved.current) return;
    scoreSaved.current = true;
    setSaved(true);
    const trimmed = name.trim() || 'INVITADO';
    localStorage.setItem('av_player_name', trimmed);
    const supabase = createClient();
    await supabase.from('scores').insert({
      player_name: trimmed,
      game_slug: 'frogger',
      score,
    });
  }

  function handleRestart() {
    scoreSaved.current = false;
    setSaved(false);
    setOver(false);
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setGameKey(k => k + 1);
  }

  const togglePause = () => {
    if (over) return;
    setPaused(p => !p);
  };

  return (
    <div className="av-player fade-in">
      {/* ── HUD externo ───────────────────────────────────────────────────── */}
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>{name || 'INVITADO'}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">
              {lives > 0
                ? Array.from({ length: lives }, (_, i) => <span key={i}>♥ </span>)
                : '—'}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>

        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause} disabled={over}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <button className="btn ghost" onClick={() => history.back()}>SALIR</button>
        </div>
      </div>

      {/* ── CRT + canvas ──────────────────────────────────────────────────── */}
      <div className="crt">
        <div className="crt-screen">
          <FroggerGame
            key={gameKey}
            paused={paused}
            onScoreChange={handleScoreChange}
            onLivesChange={handleLivesChange}
            onLevelChange={handleLevelChange}
            onGameOver={handleGameOver}
          />

          {paused && !over && (
            <div className="crt-content" style={{ background: 'rgba(0,0,0,0.65)', zIndex: 5 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 10, letterSpacing: '0.16em' }}>
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}

          {over && (
            <div className="crt-content" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 10 }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div className="pixel neon-yellow" style={{ fontSize: 20 }}>GAME OVER</div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)', letterSpacing: '0.12em' }}>
                  PUNTUACIÓN FINAL: <span style={{ color: 'var(--ink)' }}>{score.toLocaleString('es-ES')}</span>
                </div>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="TU NOMBRE"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={saved}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--ink-dim)',
                    color: 'var(--ink)',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    letterSpacing: '0.12em',
                    padding: '8px 14px',
                    textAlign: 'center',
                    outline: 'none',
                    width: 200,
                    opacity: saved ? 0.5 : 1,
                  }}
                />
                <button
                  className="btn yellow"
                  onClick={handleSave}
                  disabled={saved}
                  style={{ opacity: saved ? 0.5 : 1, cursor: saved ? 'default' : 'pointer' }}
                >
                  {saved ? 'GUARDADO ✓' : 'GUARDAR SCORE'}
                </button>
                <button className="btn ghost" onClick={handleRestart}>
                  JUGAR DE NUEVO
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>FROGGER · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
    </div>
  );
}
