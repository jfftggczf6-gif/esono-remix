-- Data Room tables
CREATE TABLE IF NOT EXISTS public.data_room_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id     UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,
  label             TEXT NOT NULL,
  filename          TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  file_size         INTEGER,
  evidence_level    INTEGER DEFAULT 0,
  is_generated      BOOLEAN DEFAULT false,
  deliverable_type  TEXT,
  uploaded_by       UUID NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_room_shares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id   UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  investor_email  TEXT,
  investor_name   TEXT,
  access_token    TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      TIMESTAMPTZ,
  can_download    BOOLEAN DEFAULT true,
  viewed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS for data_room_documents
ALTER TABLE public.data_room_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view data_room_documents of own enterprises"
  ON public.data_room_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM enterprises e WHERE e.id = data_room_documents.enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));

CREATE POLICY "Users can insert data_room_documents for own enterprises"
  ON public.data_room_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM enterprises e WHERE e.id = data_room_documents.enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));

CREATE POLICY "Users can update data_room_documents of own enterprises"
  ON public.data_room_documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM enterprises e WHERE e.id = data_room_documents.enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));

CREATE POLICY "Users can delete data_room_documents of own enterprises"
  ON public.data_room_documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM enterprises e WHERE e.id = data_room_documents.enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));

CREATE POLICY "Super admin can select all data_room_documents"
  ON public.data_room_documents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS for data_room_shares
ALTER TABLE public.data_room_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view data_room_shares of own enterprises"
  ON public.data_room_shares FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM enterprises e WHERE e.id = data_room_shares.enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));

CREATE POLICY "Users can insert data_room_shares for own enterprises"
  ON public.data_room_shares FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM enterprises e WHERE e.id = data_room_shares.enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));

CREATE POLICY "Users can delete data_room_shares of own enterprises"
  ON public.data_room_shares FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM enterprises e WHERE e.id = data_room_shares.enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));

CREATE POLICY "Super admin can select all data_room_shares"
  ON public.data_room_shares FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS data_room_documents_enterprise_idx ON public.data_room_documents (enterprise_id);
CREATE INDEX IF NOT EXISTS data_room_shares_enterprise_idx ON public.data_room_shares (enterprise_id);
CREATE UNIQUE INDEX IF NOT EXISTS data_room_shares_token_idx ON public.data_room_shares (access_token);