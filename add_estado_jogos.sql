-- Adicionar campo 'estado' à tabela jogos
ALTER TABLE jogos
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'Agendado';

-- Valores possíveis: 'Agendado', 'Em Jogo', 'Terminado', 'Cancelado'
