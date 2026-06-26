'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/_context/AuthContext';
import { startGame } from './game';
import { SKINS, type Skin } from './skins';
import TouchGamepad, { type GamepadButton } from '@/app/games/_components/TouchGamepad';

interface Props { skinKey?: string }

export default function AsteroidsGame( { skinKey = 'classic' }: Props ) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>( null );
  const setPausedRef = useRef<( ( p: boolean ) => void ) | null>( null );
  const sendInputRef = useRef<( ( b: GamepadButton, p: boolean ) => void ) | null>( null );
  const scoreSaved = useRef( false );
  const skinRef = useRef<Skin>( SKINS[ skinKey ] ?? SKINS.classic );

  const [ score, setScore ] = useState( 0 );
  const [ lives, setLives ] = useState( 3 );
  const [ level, setLevel ] = useState( 1 );
  const [ paused, setPaused ] = useState( false );
  const [ playerName, setPlayerName ] = useState( '' );
  const [ gameStarted, setGameStarted ] = useState( false );
  const [ activeSkin, setActiveSkin ] = useState( () => {
    if ( typeof window !== 'undefined' ) {
      return localStorage.getItem( 'av_skin_asteroids' ) ?? 'classic';
    }
    return 'classic';
  } );

  // Sincronizar skinKey prop → skinRef
  useEffect( () => {
    skinRef.current = SKINS[ skinKey ] ?? SKINS.classic;
  }, [ skinKey ] );

  // Sincronizar activeSkin (selector interno) → skinRef
  useEffect( () => {
    skinRef.current = SKINS[ activeSkin ] ?? SKINS.classic;
  }, [ activeSkin ] );

  useEffect( () => {
    const saved = localStorage.getItem( 'arcade_player_name' );
    if ( saved ) setPlayerName( saved );
  }, [] );

  useEffect( () => {
    if ( user && profile ) setGameStarted( true );
  }, [ user, profile ] );

  useEffect( () => {
    if ( !gameStarted || !canvasRef.current ) return;
    const { cleanup, setPaused: gamePause, sendInput } = startGame( canvasRef.current, skinRef, ( state ) => {
      setScore( state.score );
      setLives( state.lives );
      setLevel( state.level );
      if ( state.lives === 0 ) saveScore( state.score );
    } );
    setPausedRef.current = gamePause;
    sendInputRef.current = sendInput;
    return cleanup;
  }, [ gameStarted ] );

  async function saveScore( value: number ) {
    if ( scoreSaved.current || value <= 0 ) return;
    if ( !user || !profile ) return;
    scoreSaved.current = true;
    const supabase = createClient();
    await supabase.from( 'scores' ).insert( {
      player_name: profile.username,
      game_slug: 'asteroids',
      score: value,
      user_id: user.id,
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

  const handleSkinChange = ( key: string ) => {
    setActiveSkin( key );
    localStorage.setItem( 'av_skin_asteroids', key );
  };

  return (
    <div className="av-player fade-in">
      {/* ── HUD externo ─────────────────────────────────────────────────────── */}
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>{ profile?.username || playerName || 'INVITADO' }</div>
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

        {/* Selector de skin */}
        <div className="hud-skins" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          { Object.keys( SKINS ).map( k => (
            <button
              key={ k }
              className={ `btn-skin${ activeSkin === k ? ' active' : '' }` }
              onClick={ () => handleSkinChange( k ) }
              style={{
                padding: '4px 10px',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: activeSkin === k ? 'var(--yellow)' : 'transparent',
                color: activeSkin === k ? '#000' : 'var(--ink-dim)',
                border: `1px solid ${ activeSkin === k ? 'var(--yellow)' : 'var(--ink-faint)' }`,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              { k }
            </button>
          ) ) }
        </div>

        <div className="hud-actions">
          <button className="btn yellow" onClick={ togglePause }>
            { paused ? 'REANUDAR' : 'PAUSA' }
          </button>
          <button className="btn ghost" onClick={ handleExit }>SALIR</button>
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
        <TouchGamepad
          onInput={ (b, p) => sendInputRef.current?.( b, p ) }
          mapping={{ used: ['up', 'down', 'left', 'right', 'a'], labels: { a: 'FUEGO' } }}
        />
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>ASTEROIDS · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
    </div>
  );
}
