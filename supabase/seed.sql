-- Seed del catálogo de juegos (Arcade Vault).
-- Catálogo, no datos de prueba. Idempotente: re-ejecutable sin duplicar.
insert into public.games (slug, name, description, image_url, route) values
  ('arkanoid','Arkanoid','El clásico arcade de paleta y pelota. Rompe todos los bloques de cada nivel sin dejar caer la pelota. ¿Puedes completar los 5 niveles?','/games/arkanoid/arkanoid.png','/games/arkanoid'),
  ('asteroids','Asteroids','Destruye asteroides y sobrevive el mayor tiempo posible.',null,'/games/asteroids'),
  ('frogger','FROGGER','Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.',null,'/games/frogger'),
  ('snake','Snake','El clásico juego de la serpiente. Come frutas para crecer y subir de nivel — pero no choques con las paredes ni contigo mismo.','/games/snake/snake.png','/games/snake'),
  ('tetris','Tetris','El clásico puzzle de bloques que caen. Encaja tetrominos, completa líneas y sube de nivel antes de que el tablero se llene.','/games/tetris.png','/games/tetris')
on conflict (slug) do update
  set name=excluded.name, description=excluded.description,
      image_url=excluded.image_url, route=excluded.route;
