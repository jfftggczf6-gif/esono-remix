
-- Fix: All policies were created as RESTRICTIVE (default when no PERMISSIVE keyword).
-- Drop and recreate as PERMISSIVE.

-- user_roles: add INSERT policy
CREATE POLICY "Users can insert their own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE
-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- enterprises
DROP POLICY IF EXISTS "Entrepreneurs see own enterprises" ON public.enterprises;
DROP POLICY IF EXISTS "Coaches see assigned enterprises" ON public.enterprises;
DROP POLICY IF EXISTS "Entrepreneurs can create enterprises" ON public.enterprises;
DROP POLICY IF EXISTS "Entrepreneurs can update own enterprises" ON public.enterprises;
CREATE POLICY "Entrepreneurs see own enterprises" ON public.enterprises FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Coaches see assigned enterprises" ON public.enterprises FOR SELECT TO authenticated USING (auth.uid() = coach_id);
CREATE POLICY "Entrepreneurs can create enterprises" ON public.enterprises FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Entrepreneurs can update own enterprises" ON public.enterprises FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- enterprise_modules
DROP POLICY IF EXISTS "Users see modules of own enterprises" ON public.enterprise_modules;
DROP POLICY IF EXISTS "Users can update modules of own enterprises" ON public.enterprise_modules;
DROP POLICY IF EXISTS "Users can insert modules for own enterprises" ON public.enterprise_modules;
CREATE POLICY "Users see modules of own enterprises" ON public.enterprise_modules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enterprises e WHERE e.id = enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));
CREATE POLICY "Users can update modules of own enterprises" ON public.enterprise_modules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enterprises e WHERE e.id = enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));
CREATE POLICY "Users can insert modules for own enterprises" ON public.enterprise_modules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.enterprises e WHERE e.id = enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));

-- deliverables
DROP POLICY IF EXISTS "Users see deliverables of own enterprises" ON public.deliverables;
DROP POLICY IF EXISTS "Users can insert deliverables for own enterprises" ON public.deliverables;
DROP POLICY IF EXISTS "Users can update deliverables of own enterprises" ON public.deliverables;
CREATE POLICY "Users see deliverables of own enterprises" ON public.deliverables FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enterprises e WHERE e.id = enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));
CREATE POLICY "Users can insert deliverables for own enterprises" ON public.deliverables FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.enterprises e WHERE e.id = enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));
CREATE POLICY "Users can update deliverables of own enterprises" ON public.deliverables FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enterprises e WHERE e.id = enterprise_id AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())));
