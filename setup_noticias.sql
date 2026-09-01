-- ==============================================================================
-- SISTEMA DE NOTÍCIAS E REDATORES (BCV)
-- Basket Clube de Valença
-- Execute este script no SQL Editor do Supabase
-- ==============================================================================

-- 1. CRIAR TABELA DE NOTÍCIAS
CREATE TABLE IF NOT EXISTS public.noticias (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    subtitulo TEXT,
    conteudo TEXT NOT NULL,
    imagem_url TEXT,
    categoria VARCHAR(50) DEFAULT 'Clube', -- 'Clube', 'Jogos', 'Formação', 'Eventos', 'Torneio'
    publicada BOOLEAN DEFAULT TRUE,
    destaque BOOLEAN DEFAULT FALSE,
    data_publicacao DATE DEFAULT CURRENT_DATE,
    autor VARCHAR(150) DEFAULT 'BCV Comunicação',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para pesquisa e ordenação rápida
CREATE INDEX IF NOT EXISTS idx_noticias_publicada ON public.noticias(publicada);
CREATE INDEX IF NOT EXISTS idx_noticias_data ON public.noticias(data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_destaque ON public.noticias(destaque);
CREATE INDEX IF NOT EXISTS idx_noticias_categoria ON public.noticias(categoria);

-- 2. POLÍTICAS DE SEGURANÇA E RLS
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

-- Leitura pública para todos os visitantes e autenticados
DROP POLICY IF EXISTS "Leitura publica de noticias" ON public.noticias;
CREATE POLICY "Leitura publica de noticias" ON public.noticias
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Permissão total de escrita para autenticados e anon
DROP POLICY IF EXISTS "Gestao total de noticias" ON public.noticias;
CREATE POLICY "Gestao total de noticias" ON public.noticias
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. INSERIR NOTÍCIAS INICIAIS (Se a tabela estiver vazia)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.noticias LIMIT 1) THEN
        INSERT INTO public.noticias (titulo, subtitulo, conteudo, imagem_url, categoria, publicada, destaque, data_publicacao, autor)
        VALUES 
        (
            'Inscrições Abertas para a Época 2026/2027',
            'Junta-te à família do Basket Clube de Valença! Todos os escalões de formação com vagas abertas.',
            'O Basket Clube de Valença tem o prazer de anunciar a abertura oficial do período de inscrições para a época desportiva 2026/2027.

Convidamos todas as crianças e jovens (rapazes e raparigas) a partir dos 4 anos de idade a integrarem as nossas equipas:
- BabyBasket (4 a 7 anos)
- Mini 8, Mini 10 e Mini 12
- Sub 14, Sub 16, Sub 18 e Sub 20
- Seniores

O processo de inscrição é totalmente digital e pode ser concluído diretamente através do nosso portal online. Para mais informações ou dúvidas sobre horários e exames médicos, contacta a nossa secretaria ou comparece no Pavilhão Municipal de Valença.',
            'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
            'Formação',
            TRUE,
            TRUE,
            CURRENT_DATE,
            'Direção BCV'
        ),
        (
            '30 Anos de História e Paixão pelo Basquetebol',
            'O BCV celebra 30 anos ao serviço da juventude e do desporto em Valença.',
            'Fundado em 1996, o Basket Clube de Valença comemora três décadas de dedicação ao basquetebol. Ao longo deste percurso formamos centenas de atletas, participamos nas principais competições distritais e nacionais e promovemos os valores da disciplina, respeito e espírito de equipa.

Para assinalar esta data histórica, o clube está a preparar uma série de iniciativas desportivas e comemorativas abertas a toda a comunidade valenciana.

Obrigado a todos os atletas, treinadores, seccionistas, pais e patrocinadores que tornam o BCV uma referência!',
            'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=1200&q=80',
            'Clube',
            TRUE,
            FALSE,
            CURRENT_DATE - INTERVAL '3 days',
            'BCV Comunicação'
        );
    END IF;
END $$;
