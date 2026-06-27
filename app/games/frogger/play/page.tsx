'use client';

import dynamic from 'next/dynamic';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/_context/AuthContext';
import { SKINS } from '../skins';
import TouchGamepad, { type GamepadButton } from '@/app/games/_components/TouchGamepad';

const FroggerGame = dynamic(() => import('../FroggerGame'), { ssr: false });

export default function FroggerPlayPage() {
  const { user, profile }       = useAuth();
  const [score, setScore]       = useState(0);
  const [lives, setLives]       = useState(3);
  const [level, setLevel]       = useState(1);
  const [paused, setPaused]     = useState(false);
  const [over, setOver]         = useState(false);
  const [saved, setSaved]       = useState(false);
  const [gameKey, setGameKey]   = useState(0);
  const [activeSkin, setActiveSkin] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('av_skin_frogger') ?? 'classic';
    }
    return 'classic';
  });
  const scoreSaved               = useRef(false);
  const sendInputRef             = useRef<((b: GamepadButton, pressed: boolean) => void) | null>(null);

  const handleSkinChange = (key: string) => {
    setActiveSkin(key);
    localStorage.setItem('av_skin_frogger', key);
  };

  function handleScoreChange(s: number) { setScore(s); }
  function handleLivesChange(l: number) { setLives(l); }
  function handleLevelChange(l: number) { setLevel(l); }

  function handleGameOver(finalScore: number) {
    setScore(finalScore);
    setOver(true);
    saveScore(finalScore);
  }

  async function saveScore(value: number) {
    if (scoreSaved.current || value <= 0) return;
    if (!user || !profile) return;
    scoreSaved.current = true;
    setSaved(true);
    const supabase = createClient();
    await supabase.from('scores').insert({
      player_name: profile.username,
      game_slug: 'frogger',
      score: value,
      user_id: user.id,
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
            <div className="v" style={{ color: 'var(--ink)' }}>{profile?.username || 'INVITADO'}</div>
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

        {/* Selector de skin */}
        <div className="hud-skins" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {Object.keys(SKINS).map(k => (
            <button
              key={k}
              className={`btn-skin${activeSkin === k ? ' active' : ''}`}
              onClick={() => handleSkinChange(k)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: activeSkin === k ? 'var(--green)' : 'transparent',
                color: activeSkin === k ? '#000' : 'var(--ink-dim)',
                border: `1px solid ${activeSkin === k ? 'var(--green)' : 'var(--ink-faint)'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause} disabled={over}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <button className="btn ghost" onClick={() => history.back()}>SALIR</button>
        </div>
      </div>

      {/* ── CRT + canvas ──────────────────────────────────────────────────── */}
      <div className="crt" style={{ maxWidth: 640, width: '100%', margin: '0 auto' }}>
        <div className="crt-screen" style={{ aspectRatio: '8/7' }}>
          <FroggerGame
            key={gameKey}
            paused={paused}
            onScoreChange={handleScoreChange}
            onLivesChange={handleLivesChange}
            onLevelChange={handleLevelChange}
            onGameOver={handleGameOver}
            skinKey={activeSkin}
            sendInputRef={sendInputRef}
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
                {user && profile ? (
                  <div className="mono" style={{ fontSize: 11, color: saved ? 'var(--green)' : 'var(--ink-dim)', letterSpacing: '0.12em' }}>
                    {saved ? 'PUNTUACIÓN GUARDADA ✓' : 'GUARDANDO…'}
                  </div>
                ) : (
                  <div className="mono" style={{ fontSize: 11, color: 'var(--magenta)', letterSpacing: '0.12em' }}>
                    INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN
                  </div>
                )}
                <button className="btn ghost" onClick={handleRestart}>
                  JUGAR DE NUEVO
                </button>
              </div>
            </div>
          )}
        </div>

        <TouchGamepad
          onInput={(b, p) => sendInputRef.current?.(b, p)}
          mapping={{ used: ['up', 'down', 'left', 'right'] }}
        />
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>FROGGER · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
    </div>
  );
}
