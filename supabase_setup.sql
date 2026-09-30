-- ==============================================================================
-- STUDIO BELLA - SCRIPT COMPLETO DE BANCO DE DADOS & POLÍTICAS DE ARMAZENAMENTO
-- SUPABASE POSTGRESQL + SUPABASE STORAGE BUCKET
-- ==============================================================================

-- 1. HABILITAR EXTENSÕES ESSENCIAIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CONFIGURAÇÃO DO BUCKET DE ARMAZENAMENTO (SUPABASE STORAGE)
-- ==============================================================================

-- Criar bucket público para fotos de serviços, perfil da cabeleireira e galeria
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'salon-images',
    'salon-images',
    true,
    5242880, -- Limite de 5MB por imagem
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Políticas de Armazenamento para a tabela storage.objects:

-- A. Leitura pública de qualquer foto armazenada no bucket 'salon-images'
DROP POLICY IF EXISTS "Fotos de servicos sao visiveis publicamente" ON storage.objects;
CREATE POLICY "Fotos de servicos sao visiveis publicamente"
ON storage.objects FOR SELECT
USING (bucket_id = 'salon-images');

-- B. Upload de imagens no bucket 'salon-images'
DROP POLICY IF EXISTS "Permitir upload de imagens no bucket salon-images" ON storage.objects;
CREATE POLICY "Permitir upload de imagens no bucket salon-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'salon-images');

-- C. Atualização de imagens no bucket 'salon-images'
DROP POLICY IF EXISTS "Permitir atualizacao de imagens no bucket salon-images" ON storage.objects;
CREATE POLICY "Permitir atualizacao de imagens no bucket salon-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'salon-images')
WITH CHECK (bucket_id = 'salon-images');

-- D. Exclusão de imagens no bucket 'salon-images'
DROP POLICY IF EXISTS "Permitir exclusao de imagens no bucket salon-images" ON storage.objects;
CREATE POLICY "Permitir exclusao de imagens no bucket salon-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'salon-images');


-- ==============================================================================
-- 3. CRIAÇÃO DAS TABELAS DE DADOS
-- ==============================================================================

-- A. TABELA DE SERVIÇOS
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- B. TABELA DE AGENDAMENTOS
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "clientWhatsapp" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "servicePrice" NUMERIC(10, 2) NOT NULL,
    "serviceDuration" INTEGER NOT NULL,
    date TEXT NOT NULL,        -- Formato YYYY-MM-DD
    time TEXT NOT NULL,        -- Formato HH:mm
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'confirmado', 'concluido', 'cancelado'
    notes TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    "updatedAt" TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- C. TABELA DE BLOQUEIOS (FOLGAS, ALMOÇOS, CURSOS)
CREATE TABLE IF NOT EXISTS public.blocked_slots (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,        -- Formato YYYY-MM-DD
    time TEXT,                 -- Se nulo, bloqueia o dia todo
    reason TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- D. TABELA DE CONFIGURAÇÕES DE HORÁRIOS DO SALÃO
CREATE TABLE IF NOT EXISTS public.business_config (
    id TEXT PRIMARY KEY DEFAULT 'config_1',
    "salonName" TEXT NOT NULL DEFAULT 'Studio Bella Concept',
    "hairdresserName" TEXT NOT NULL DEFAULT 'Isabella Mendes',
    "hairdresserPhone" TEXT DEFAULT '5511987654321',
    address TEXT DEFAULT 'Av. das Flores, 850 - Sala 302, Jardins',
    "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    schedules JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- E. TABELA DE REGISTROS DE MENSAGENS (WHATSAPP LOGS)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id TEXT PRIMARY KEY,
    "appointmentId" TEXT,
    "clientName" TEXT NOT NULL,
    phone TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageTitle" TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'enviada',
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    "apiMessageId" TEXT
);

-- ÍNDICES PARA CONSULTAS RÁPIDAS
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments (date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments (status);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON public.blocked_slots (date);


-- ==============================================================================
-- 4. POLÍTICAS DE SEGURANÇA E ACESSO (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- POLÍTICAS: TABELA services
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Leitura de serviços para todos" ON public.services;
CREATE POLICY "Leitura de serviços para todos"
ON public.services FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Gerenciamento de serviços" ON public.services;
CREATE POLICY "Gerenciamento de serviços"
ON public.services FOR ALL
USING (true)
WITH CHECK (true);

-- ----------------------------------------------------
-- POLÍTICAS: TABELA appointments
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Consulta de agendamentos para verificação de horários" ON public.appointments;
CREATE POLICY "Consulta de agendamentos para verificação de horários"
ON public.appointments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Clientes podem enviar novos agendamentos" ON public.appointments;
CREATE POLICY "Clientes podem enviar novos agendamentos"
ON public.appointments FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Atualização e gestão de agendamentos" ON public.appointments;
CREATE POLICY "Atualização e gestão de agendamentos"
ON public.appointments FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Exclusão de agendamentos" ON public.appointments;
CREATE POLICY "Exclusão de agendamentos"
ON public.appointments FOR DELETE
USING (true);

-- ----------------------------------------------------
-- POLÍTICAS: TABELA blocked_slots
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Consulta de bloqueios" ON public.blocked_slots;
CREATE POLICY "Consulta de bloqueios"
ON public.blocked_slots FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Gerenciamento de bloqueios" ON public.blocked_slots;
CREATE POLICY "Gerenciamento de bloqueios"
ON public.blocked_slots FOR ALL
USING (true)
WITH CHECK (true);

-- ----------------------------------------------------
-- POLÍTICAS: TABELA business_config
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Consulta de configurações do salão" ON public.business_config;
CREATE POLICY "Consulta de configurações do salão"
ON public.business_config FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Atualização de configurações do salão" ON public.business_config;
CREATE POLICY "Atualização de configurações do salão"
ON public.business_config FOR ALL
USING (true)
WITH CHECK (true);

-- ----------------------------------------------------
-- POLÍTICAS: TABELA whatsapp_logs
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Registros de WhatsApp" ON public.whatsapp_logs;
CREATE POLICY "Registros de WhatsApp"
ON public.whatsapp_logs FOR ALL
USING (true)
WITH CHECK (true);


-- ==============================================================================
-- 5. CARGA INICIAL DE DADOS (SEED DATA)
-- ==============================================================================

-- Inserir os serviços do Studio Bella
INSERT INTO public.services (id, name, category, description, "durationMinutes", price, image, active)
VALUES 
    (
        'srv-1', 
        'Corte Feminino & Visagismo', 
        'Corte & Estilo', 
        'Análise visagista de traços faciais, lavagem terapêutica, corte personalizado e finalização escovada.', 
        60, 
        130.00, 
        '/src/assets/images/service_cortes_1790710979603.jpg', 
        true
    ),
    (
        'srv-2', 
        'Mechas, Balayage & Iluminação', 
        'Coloração & Mechas', 
        'Técnica de morena iluminada ou loiro dos sonhos com produtos de proteção Plex, tonalização e nutrição pós-cor.', 
        180, 
        390.00, 
        '/src/assets/images/service_coloracao_1790710988487.jpg', 
        true
    ),
    (
        'srv-3', 
        'Coloração Raiz & Banho de Brilho', 
        'Coloração & Mechas', 
        'Cobertura impecável de fios brancos com tintura premium sem amônia e revitalização do comprimento.', 
        90, 
        190.00, 
        '/src/assets/images/service_coloracao_1790710988487.jpg', 
        true
    ),
    (
        'srv-4', 
        'Escova Modelada & Ozonioterapia', 
        'Tratamentos', 
        'Vapor de ozônio purificante no couro cabeludo, máscara de hidratação profunda e escova glamourosa com ondas.', 
        50, 
        95.00, 
        '/src/assets/images/service_cortes_1790710979603.jpg', 
        true
    ),
    (
        'srv-5', 
        'Botox Capilar & Alinhamento Térmico', 
        'Tratamentos', 
        'Redução de volume e frizz, selagem de cutículas e reposição de massa capilar com brilho espelhado.', 
        120, 
        240.00, 
        '/src/assets/images/service_cortes_1790710979603.jpg', 
        true
    ),
    (
        'srv-6', 
        'Penteado Social & Produção para Festas', 
        'Penteados', 
        'Penteados clássicos ou despojados (coques, semi-presos, tranças) com alta fixação para casamentos e formaturas.', 
        75, 
        180.00, 
        '/src/assets/images/service_cortes_1790710979603.jpg', 
        true
    )
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    "durationMinutes" = EXCLUDED."durationMinutes",
    description = EXCLUDED.description;

-- Inserir Configurações Padrão de Horários
INSERT INTO public.business_config (id, "salonName", "hairdresserName", "hairdresserPhone", address, "slotIntervalMinutes", schedules)
VALUES (
    'config_1',
    'Studio Bella Concept',
    'Isabella Mendes',
    '5511987654321',
    'Av. das Flores, 850 - Sala 302, Jardins',
    30,
    '[
        {"dayOfWeek": 0, "dayName": "Domingo", "isOpen": false, "openTime": "09:00", "closeTime": "18:00"},
        {"dayOfWeek": 1, "dayName": "Segunda-feira", "isOpen": false, "openTime": "09:00", "closeTime": "18:00"},
        {"dayOfWeek": 2, "dayName": "Terça-feira", "isOpen": true, "openTime": "09:00", "closeTime": "19:00", "lunchBreakStart": "12:00", "lunchBreakEnd": "13:00"},
        {"dayOfWeek": 3, "dayName": "Quarta-feira", "isOpen": true, "openTime": "09:00", "closeTime": "19:00", "lunchBreakStart": "12:00", "lunchBreakEnd": "13:00"},
        {"dayOfWeek": 4, "dayName": "Quinta-feira", "isOpen": true, "openTime": "09:00", "closeTime": "19:00", "lunchBreakStart": "12:00", "lunchBreakEnd": "13:00"},
        {"dayOfWeek": 5, "dayName": "Sexta-feira", "isOpen": true, "openTime": "09:00", "closeTime": "19:30", "lunchBreakStart": "12:30", "lunchBreakEnd": "13:30"},
        {"dayOfWeek": 6, "dayName": "Sábado", "isOpen": true, "openTime": "08:30", "closeTime": "18:00", "lunchBreakStart": "13:00", "lunchBreakEnd": "13:30"}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
