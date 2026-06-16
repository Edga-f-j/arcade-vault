'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { startGame } from './game';

export default function AsteroidsGame() {
  const canvasRef = useRef<HTMLCanvasElement>( null );
  const setPausedRef = useRef<( ( p: boolean ) => void ) | null>( null );

  const [ score, setScore ] = useState( 0 );
  const [ lives, setLives ] = useState( 3 );
  const [ level, setLevel ] = useState( 1 );
  const [ paused, setPaused ] = useState( false );
  const [ playerName, setPlayerName ] = useState( '' );
  const [ gameStarted, setGameStarted ] = useState( false );

  useEffect( () => {
    const saved = localStorage.getItem( 'arcade_player_name' );
    if ( saved ) setPlayerName( saved );
  }, [] );

  useEffect( () => {
    if ( !gameStarted || !canvasRef.current ) return;
    const { cleanup, setPaused: gamePause } = startGame( canvasRef.current, ( state ) => {
      setScore( state.score );
      setLives( state.lives );
      setLevel( state.level );
    } );
    setPausedRef.current = gamePause;
    return cleanup;
  }, [ gameStarted ] );

  function handleStart() {
    const name = playerName.trim() || 'INVITADO';
    setPlayerName( name );
    localStorage.setItem( 'arcade_player_name', name );
    setGameStarted( true );
  }

  const togglePause = () => {
    const next = !paused;
    setPaused( next );
    setPausedRef.current?.( next );
  };

  return (
    <div className="av-player fade-in">
      {/* ── HUD externo ─────────────────────────────────────────────────────── */}
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>{ playerName || 'INVITADO' }</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{ score.toLocaleString( 'es-ES' ) }</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">
              { lives > 0
                ? Array.from( { length: lives }, ( _, i ) => <span key={i}>♥ </span> )
                : '—' }
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{ String( level ).padStart( 2, '0' ) }</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={ togglePause }>
            { paused ? 'REANUDAR' : 'PAUSA' }
          </button>
          <Link href="/" className="btn ghost">SALIR</Link>
        </div>
      </div>

      {/* ── CRT + canvas ────────────────────────────────────────────────────── */}
      <div className="crt">
        <div className="crt-screen">
          { !gameStarted && (
            <div className="crt-content" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 10 }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div className="pixel neon-yellow" style={{ fontSize: 20 }}>INTRODUCE TU NOMBRE</div>
                <input
                  type="text"
                  maxLength={ 20 }
                  placeholder="JUGADOR"
                  value={ playerName }
                  onChange={ (e) => setPlayerName( e.target.value ) }
                  onKeyDown={ (e) => e.key === 'Enter' && handleStart() }
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
                  }}
                  autoFocus
                />
                <button className="btn yellow" onClick={ handleStart }>
                  JUGAR
                </button>
              </div>
            </div>
          ) }
          <canvas
            ref={ canvasRef }
            width={ 800 }
            height={ 600 }
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
          { paused && (
            <div className="crt-content" style={{ background: 'rgba(0,0,0,0.65)', zIndex: 5 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 10, letterSpacing: '0.16em' }}>
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          ) }
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>ASTEROIDS · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
    </div>
  );
}
