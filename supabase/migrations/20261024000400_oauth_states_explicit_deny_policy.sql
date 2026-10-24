-- Explicit default-deny policy for public.oauth_states.
-- Resolves the 'RLS Enabled No Policy' suggestion in Supabase Security Advisor.
-- Ensures client roles (anon, authenticated) have an explicit deny policy while
-- backend Edge Functions continue to access the table via the service_role key.

DROP POLICY IF EXISTS "oauth_states_no_client_access" ON public.oauth_states;
CREATE POLICY "oauth_states_no_client_access" ON public.oauth_states
  FOR ALL
  TO public
  USING (false);

