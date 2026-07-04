-- =============================================================
-- InternAI Tracker — Row Level Security Policies
-- =============================================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- CVS
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own CVs" ON cvs FOR ALL USING (auth.uid() = user_id);

-- JOBS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own jobs" ON jobs FOR ALL USING (auth.uid() = user_id);

-- AI REPORTS
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own AI reports" ON ai_reports FOR ALL USING (auth.uid() = user_id);

-- APPLICATIONS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own applications" ON applications FOR ALL USING (auth.uid() = user_id);

-- APPLICATION STATUS HISTORY
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own status history" ON application_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM applications a
    WHERE a.id = application_status_history.application_id
    AND a.user_id = auth.uid()
  ));

-- COACH CONVERSATIONS
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own conversations" ON coach_conversations FOR ALL USING (auth.uid() = user_id);

-- ANALYTICS CACHE
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analytics" ON analytics_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages analytics" ON analytics_cache FOR ALL USING (auth.role() = 'service_role');

-- =============================================================
-- SUPABASE STORAGE BUCKETS
-- =============================================================
-- Run these via Supabase Dashboard > Storage or API

-- INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage RLS
-- CREATE POLICY "Users can upload own CVs" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can read own CVs" ON storage.objects FOR SELECT
--   USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete own CVs" ON storage.objects FOR DELETE
--   USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
