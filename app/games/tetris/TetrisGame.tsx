'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { startGame } from './game';
import TouchGamepad, { type GamepadButton } from '@/app/games/_components/TouchGamepad';

export default function TetrisGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>( null );
  const nextCanvasRef = useRef<HTMLCanvasElement>( null );
  const setPausedRef  = useRef<( ( p: boolean ) => void ) | null>( null );
  const sendInputRef  = useRef<( ( b: GamepadButton, p: boolean ) => void ) | null>( null );
  const scoreSaved = useRef( false );

  const [ score, setScore ] = useState( 0 );
  const [ lines, setLines ] = useState( 0 );
  const [ level, setLevel ] = useState( 1 );
  const [ paused, setPaused ] = useState( false );
  const [ gameOver, setGameOver ] = useState( false );
  const [ playerName, setPlayerName ] = useState( '' );
  const [ gameStarted, setGameStarted ] = useState( false );

  useEffect( () => {
    const saved = localStorage.getItem( 'arcade_player_name' );
    if ( saved ) setPlayerName( saved );
  }, [] );

  useEffect( () => {
    if ( !gameStarted || !canvasRef.current || !nextCanvasRef.current ) return;
    const { cleanup, setPaused: gamePause, sendInput } = startGame(
      canvasRef.current,
      nextCanvasRef.current,
      ( state ) => {
        setScore( state.score );
        setLines( state.lines );
        setLevel( state.level );
        if ( state.gameOver ) {
          setGameOver( true );
          saveScore( state.score );
        }
      }
    );
    setPausedRef.current = gamePause;
    sendInputRef.current = sendInput;
    return cleanup;
  }, [ gameStarted ] ); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveScore( value: number ) {
    if ( scoreSaved.current || value <= 0 ) return;
    scoreSaved.current = true;
    const supabase = createClient();
    await supabase.from( 'scores' ).insert( {
      player_name: playerName || 'INVITADO',
      game_slug: 'tetris',
      score: value,
    } );
  }

  async function handleExit() {
    await saveScore( score );
    router.push( '/' );
  }

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
          <div className="hud-stat">
            <div className="l">Líneas</div>
            <div className="v">{ lines }</div>
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
          <button className="btn ghost" onClick={ handleExit }>SALIR</button>
        </div>
      </div>

      {/* ── CRT + canvas + preview ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center' }}>
        <div className="crt" style={{ maxWidth: 300, width: '100%' }}>
          <div className="crt-screen" style={{ aspectRatio: '1/2' }}>
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
              width={ 300 }
              height={ 600 }
              style={{ display: 'block', width: '100%', height: '100%' }}
            />
            { paused && !gameOver && (
              <div className="crt-content" style={{ background: 'rgba(0,0,0,0.65)', zIndex: 5 }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 10, letterSpacing: '0.16em' }}>
                    PULSA REANUDAR PARA CONTINUAR
                  </div>
                </div>
              </div>
            ) }
            { gameOver && (
              <div className="crt-content" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 15 }}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                  <div className="pixel neon-yellow" style={{ fontSize: 22 }}>GAME OVER</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.16em' }}>
                    PUNTUACIÓN FINAL
                  </div>
                  <div className="v" style={{ fontSize: 28 }}>{ score.toLocaleString( 'es-ES' ) }</div>
                  <button className="btn yellow" onClick={ handleExit }>SALIR</button>
                </div>
              </div>
            ) }
          </div>
          <TouchGamepad
            onInput={ (b, p) => sendInputRef.current?.( b, p ) }
            mapping={{ used: ['up','down','left','right','a'], labels: { a: 'DROP' } }}
          />
          <div className="crt-bottom">
            <span className="led">SEÑAL OK</span>
            <span>TETRIS · CRT-83 · 60 HZ</span>
            <span>CARGA · 1MB</span>
          </div>
        </div>

        {/* ── Panel preview ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-dim)', textAlign: 'center' }}>
            SIGUIENTE
          </div>
          <canvas
            ref={ nextCanvasRef }
            width={ 120 }
            height={ 120 }
            style={{ display: 'block', border: '1px solid var(--ink-dim)', background: '#000' }}
          />
        </div>
      </div>
    </div>
  );
}
