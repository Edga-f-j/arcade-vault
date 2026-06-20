# Game Suggestions — To-Do

Cola de juegos propuestos por el agente `game-planner`. Cada ítem es un candidato a
implementar vía `/add-game`. Marcar `[x]` cuando se implemente.

<!-- formato de cada entrada:
- [ ] **<Name>** — `<slug>` · <CATEGORÍA> · <color>
      <descripción 1-3 frases>
      Mecánica/controles: ...
      Canvas: <w>x<h> · HUD: <campos> · Fin: <condición>
      Propuesto: <fecha> — Motivo de encaje: ...
-->

## Sugerencias

- [ ] **Space Invaders** — `space-invaders` · SHOOTER · magenta
      Defiende la Tierra de oleadas de alienígenas que descienden en formación. Destruye a todos antes de que lleguen al suelo o te eliminen. La velocidad de los invasores aumenta con cada oleada completada.
      Mecánica/controles: Flechas ← → para mover la nave; Espacio para disparar. Los invasores se mueven en bloque de lado a lado, bajando un escalón al tocar el borde. Disparan aleatoriamente hacia abajo. 4 escudos destructibles absorben impactos.
      Canvas: 800x600 · HUD: score / lives / level · Fin: invasores llegan al suelo O el jugador pierde todas las vidas (múltiple)
      Propuesto: 2026-06-20 — Motivo de encaje: único SHOOTER con dinámica de oleadas en formación; llena el hueco de SHOOTER (solo Asteroids) con mecánica radicalmente distinta; magenta libre en esa categoría.

- [ ] **Columns** — `columns` · PUZZLE · yellow
      Haz caer grupos de 3 gemas de colores y alinea 3 o más del mismo color (horizontal, vertical o diagonal) para eliminarlas antes de que la pila llegue arriba.
      Mecánica/controles: Flechas ← → mueven la columna; Arriba/Espacio rota el orden interno de las 3 gemas; Abajo acelera caída. Eliminaciones en cadena multiplican el puntaje.
      Canvas: 320x640 · HUD: score / level / next · Fin: pila llega al tope
      Propuesto: 2026-06-20 — Motivo de encaje: PUZZLE solo tiene Tetris; Columns aporta mecánica de color-matching ausente en el catálogo.

- [ ] **Bubble Bobble** — `bubble-bobble` · ARCADE · cyan
      Atrapa enemigos en burbujas y reviéntalas antes de que escapen para limpiar cada pantalla fija.
      Mecánica/controles: Flechas para moverse/saltar; Z o Espacio dispara burbuja. Saltar sobre burbuja la explota. La fruta bonus cae de enemigos reventados.
      Canvas: 800x600 · HUD: score / lives / level · Fin: limpiar todos los enemigos de la pantalla
      Propuesto: 2026-06-20 — Motivo de encaje: único plataformer con mecánica de atrape; complementa Arkanoid (pantallas fijas) con patrón de juego totalmente distinto.

- [ ] **Pac-Man** — `pac-man` · ARCADE · yellow
      Come todos los puntos del laberinto evitando fantasmas; usa power-pellets para cazarlos temporalmente.
      Mecánica/controles: Flechas de dirección; los 4 fantasmas tienen IA distinta (persecución, emboscada, aleatoria, mixta). Power-pellet invierte roles por unos segundos.
      Canvas: 800x600 · HUD: score / lives / level · Fin: todos los puntos comidos O perder todas las vidas
      Propuesto: 2026-06-20 — Motivo de encaje: cubre género LABERINTO/CHASE completamente ausente del catálogo.

- [ ] **1942** — `1942` · SHOOTER · green
      Pilota un biplano en un shooter vertical de scroll continuo, destruyendo oleadas de aviones enemigos y esquivando proyectiles.
      Mecánica/controles: Flechas mueven la nave en 4 direcciones; Espacio dispara; scroll vertical hacia arriba continuo. Power-ups caen de enemigos derribados (disparo triple, escudo).
      Canvas: 480x640 · HUD: score / lives / level · Fin: perder todas las vidas
      Propuesto: 2026-06-20 — Motivo de encaje: shooter vertical puro (scroll-up) ausente del catálogo; Asteroids es omnidireccional, Space Invaders es estático.

- [ ] **Scramble** — `scramble` · SHOOTER · cyan
      Pilota tu nave en un desplazamiento horizontal continuo, destruye oleadas de enemigos y torretas, y gestiona el combustible antes de que se agote.
      Mecánica/controles: Flechas arriba/abajo controlan altitud; Z dispara misiles horizontales; X lanza bombas hacia abajo. El scroll lateral avanza solo. Combustible baja constantemente; recargar destruyendo depósitos.
      Canvas: 800x480 · HUD: score / fuel / lives · Fin: sin combustible O perder todas las vidas
      Propuesto: 2026-06-20 — Motivo de encaje: único shooter horizontal side-scrolling; aporta mecánica de gestión de recursos (combustible) ausente en el catálogo.

- [ ] **Kung-Fu Master** — `kung-fu-master` · ARCADE · magenta
      Avanza por pasillos horizontales derrotando oleadas de enemigos a puñetazos y patadas para rescatar a tu pareja secuestrada.
      Mecánica/controles: Flechas para mover/saltar/agachar; Z puñetazo; X patada. Enemigos aparecen desde ambos lados en cantidad creciente. Barra de vida se agota por golpes y proyectiles.
      Canvas: 800x480 · HUD: score / health / lives / level · Fin: perder toda la vida
      Propuesto: 2026-06-20 — Motivo de encaje: único beat-em-up; cubre mecánica de combate cuerpo a cuerpo completamente ausente del catálogo.

- [ ] **Pinball Neon** — `pinball-neon` · ARCADE · green
      Lanza la bola con un plunger, mantenla en juego con los flippers y acumula puntos golpeando bumpers y rampas iluminadas de neón.
      Mecánica/controles: Z / X (o flechas ← →) para los dos flippers; Espacio para cargar y soltar el plunger. Bumpers circulares suman puntos al impacto. La bola muere si cae entre los flippers.
      Canvas: 480x800 · HUD: score / lives / multiplier · Fin: perder todas las vidas
      Propuesto: 2026-06-20 — Motivo de encaje: física de rebote libre con dos paletas simultáneas; mecánica completamente distinta de Arkanoid (una paleta, bloques fijos).

- [ ] **Turbo Road** — `turbo-road` · ARCADE · yellow
      Conduce a toda velocidad esquivando el tráfico en una carretera generada proceduralmente, al estilo Pole Position / Out Run.
      Mecánica/controles: Flechas ← → mueven el coche horizontalmente; ↑ ↓ aceleran/frenan. Pseudo-3D por road-scaling en canvas. Vehículos rivales vienen de frente a velocidad creciente.
      Canvas: 800x600 · HUD: score / speed / level · Fin: vidas agotadas por colisión
      Propuesto: 2026-06-20 — Motivo de encaje: única categoría de CARRERAS en el catálogo; perspectiva falsa implementable en canvas 2D puro.

- [ ] **Pong** — `pong` · ARCADE · cyan
      Enfrenta a la paleta del CPU en el clásico duelo de tenis de mesa — primero en anotar 7 puntos gana.
      Mecánica/controles: Flechas ↑ ↓ (o W/S) para mover la paleta del jugador; CPU sigue la pelota con delay deliberado para ser vencible. La pelota gana velocidad con cada golpe.
      Canvas: 800x600 · HUD: score jugador / score CPU · Fin: llegar a 7 puntos
      Propuesto: 2026-06-20 — Motivo de encaje: único juego de deportes; cubre mecánica de reflejos/precisión con paleta ausente en el catálogo.

- [ ] **Missile Command** — `missile-command` · SHOOTER · yellow
      Defiende tus ciudades interceptando misiles enemigos antes de que destruyan la superficie.
      Mecánica/controles: Ratón para apuntar; clic para lanzar misil antiaéreo que explota en el punto de impacto. El radio de explosión destruye misiles enemigos cercanos. Las oleadas aumentan en densidad y velocidad.
      Canvas: 800x600 · HUD: score / cities / ammo · Fin: todas las ciudades destruidas
      Propuesto: 2026-06-20 — Motivo de encaje: mecánica de apuntado libre con explosión radial ausente; cubre defensa desde ángulo completamente distinto a Asteroids y Space Invaders.

- [ ] **Boulder Dash** — `boulder-dash` · PUZZLE · green
      Excava túneles en una cueva para recolectar diamantes esquivando rocas que caen por gravedad.
      Mecánica/controles: Flechas para excavar/mover en 4 direcciones; excavar tierra desplaza rocas que caen si quedan sin soporte. Recolectar N diamantes abre la salida.
      Canvas: 800x600 · HUD: score / diamonds / time · Fin: escapar por la salida O ser aplastado por roca
      Propuesto: 2026-06-20 — Motivo de encaje: única mecánica de física de caída en grilla; complementa Tetris (PUZZLE) con sabor exploración/aventura.

- [ ] **Rastan** — `rastan` · ARCADE · magenta
      Guerrero bárbaro avanza por plataformas cortando enemigos con su espada, escalando cadenas y derrotando jefes al final de cada etapa.
      Mecánica/controles: Flechas para mover/saltar; Z ataca cuerpo a cuerpo. Enemigos aparecen de ambos lados; jefe al final de cada nivel. Barra de vida se agota por golpes.
      Canvas: 800x480 · HUD: score / health / lives / level · Fin: perder toda la vida
      Propuesto: 2026-06-20 — Motivo de encaje: abre subcategoría acción-aventura lateral; única mecánica de combate + plataformas no cubierta por ningún juego actual.

- [ ] **Robotron: 2084** — `robotron` · ARCADE · cyan
      Muévete en todas direcciones y dispara a hordas de robots que invaden la pantalla mientras rescatas a los últimos humanos.
      Mecánica/controles: WASD mueve en 8 direcciones; Flechas disparan en 8 direcciones independientes (twin-stick). El jugador muere al contacto con cualquier enemigo o proyectil. Oleadas infinitas con robots que se reproducen.
      Canvas: 800x600 · HUD: score / lives / wave · Fin: perder todas las vidas
      Propuesto: 2026-06-20 — Motivo de encaje: única mecánica twin-stick de supervivencia; aporta control de disparo independiente del movimiento ausente en todo el catálogo.

- [ ] **Centipede** — `centipede` · SHOOTER · green
      Destruye el ciempiés que desciende serpenteando por la pantalla antes de que llegue a tu zona, mientras esquivas arañas y pulgas.
      Mecánica/controles: WASD o flechas mueven al jugador libremente en el tercio inferior; Espacio dispara hacia arriba. Cada impacto en el ciempiés convierte el segmento en hongo que altera la trayectoria del resto.
      Canvas: 640x800 · HUD: score / lives / level · Fin: perder todas las vidas
      Propuesto: 2026-06-20 — Motivo de encaje: disparo con gestión de terreno dinámico (hongos); mecánica de segmentos encadenados ausente en el catálogo.

- [ ] **Operation Wolf** — `operation-wolf` · SHOOTER · magenta
      Mueve el cursor de mira por la pantalla y elimina oleadas de enemigos antes de agotar tu energía o munición.
      Mecánica/controles: Ratón para apuntar y clic para disparar (o mantener); escenario se desplaza lateralmente de forma automática. Power-ups (munición, granadas, vida) caen de enemigos abatidos.
      Canvas: 800x480 · HUD: score / health / ammo / grenades · Fin: sin energía O sin munición
      Propuesto: 2026-06-20 — Motivo de encaje: único juego de galería con control por ratón; aporta mecánica de apuntar-y-disparar radicalmente distinta de todos los shooters actuales.

- [ ] **Frogger** — `frogger` · ARCADE · green
      Cruza la calle esquivando coches y salta de tronco en tronco sobre el río para llegar a casa sano y salvo.
      Mecánica/controles: Flechas para moverse en cuadrícula paso a paso (arriba/abajo/izquierda/derecha). Un impacto con coche o caída al agua es muerte instantánea. Timing preciso obligatorio.
      Canvas: 480x640 · HUD: score / lives / time · Fin: perder todas las vidas O agotar el tiempo
      Propuesto: 2026-06-20 — Motivo de encaje: mecánica de cruzar obstáculos en cuadrícula completamente ausente; referente clásico de habilidad y reflejos con timing.

- [ ] **Simon Says** — `simon-says` · ARCADE · cyan
      Repite secuencias de colores y sonidos que se alargan con cada ronda — un pulso neón que pone a prueba tu memoria y ritmo.
      Mecánica/controles: El juego ilumina 4 paneles de colores en secuencia; el jugador los repite con clic o teclas A/S/D/F. Cada ronda correcta añade un paso más. Un error termina la partida.
      Canvas: 600x600 · HUD: score / level / best · Fin: primer error
      Propuesto: 2026-06-20 — Motivo de encaje: única mecánica de ritmo/memoria en el catálogo; usa los 4 colores neon del proyecto (cyan, magenta, yellow, green) de forma nativa.

- [ ] **Blackjack Arcade** — `blackjack-arcade` · PUZZLE · magenta
      Gana al dealer llegando a 21 sin pasarte — rondas contrarreloj con apuestas de fichas y multiplicadores neón.
      Mecánica/controles: Tecla H para pedir carta (Hit); S para plantarse (Stand); el dealer juega automáticamente según reglas clásicas. Ganar antes del tiempo límite acumula fichas y sube de nivel.
      Canvas: 800x600 · HUD: score / fichas / timer · Fin: fichas agotadas
      Propuesto: 2026-06-20 — Motivo de encaje: única mecánica de decisión/riesgo calculado con cartas; categoría de juego de mesa completamente ausente del catálogo.
