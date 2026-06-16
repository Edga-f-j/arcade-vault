'use client';

import { useEffect, useRef } from 'react';
import { startGame } from './game';

export default function AsteroidsGame() {
  const canvasRef = useRef<HTMLCanvasElement>( null );

  useEffect( () => {
    if ( !canvasRef.current ) return;
    return startGame( canvasRef.current );
  }, [] );

  return <canvas ref={canvasRef} width={800} height={600} />;
}
