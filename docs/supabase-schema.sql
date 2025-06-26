-- Snapshot Schema – aggiornato al FASE 0 (Sprint-4)
-- Per schema operativo completo vedere `supabase-optimized-schema.sql`

-- Estratto delle modifiche principali ----------------------------------------

-- Aggiunta colonna is_portatore in users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_portatore BOOLEAN DEFAULT FALSE;

-- Aggiunta colonna is_admin in users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Tabella portatori
CREATE TABLE portatori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  bio TEXT,
  attivo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella risposte
CREATE TABLE risposte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ucme_id UUID REFERENCES ucmes(id) ON DELETE CASCADE,
  portatore_id UUID REFERENCES portatori(id),
  testo TEXT NOT NULL,
  visibile BOOLEAN DEFAULT TRUE,
  letto_da_utente BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Portatori & Risposte (estratto)
ALTER TABLE portatori ENABLE ROW LEVEL SECURITY;
CREATE POLICY portatori_select_own ON portatori FOR SELECT USING (user_id = auth.uid());
-- ... ulteriori policy ...

ALTER TABLE risposte ENABLE ROW LEVEL SECURITY;
CREATE POLICY risposte_select_by_portatore ON risposte FOR SELECT USING (portatore_id IN (SELECT id FROM portatori p WHERE p.user_id = auth.uid()));
-- ... ulteriori policy ... 