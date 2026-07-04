-- =============================================================
-- InternAI Tracker — Initial Database Schema
-- Run this in Supabase SQL Editor
-- =============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =============================================================
-- PROFILES (extends Supabase auth.users)
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  target_role TEXT,
  target_industry TEXT,
  experience_level TEXT CHECK (experience_level IN ('student', 'fresh_grad', 'junior', 'mid')) DEFAULT 'student',
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  bio TEXT,
  skills JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================
-- CVS
-- =============================================================
CREATE TABLE IF NOT EXISTS cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  extracted_text TEXT,
  version INTEGER DEFAULT 1,
  is_primary BOOLEAN DEFAULT FALSE,
  word_count INTEGER,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one CV can be primary per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_cvs_primary ON cvs(user_id) WHERE is_primary = TRUE;

-- =============================================================
-- JOBS
-- =============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  job_type TEXT CHECK (job_type IN ('full_time', 'part_time', 'internship', 'contract', 'remote')) DEFAULT 'internship',
  description TEXT NOT NULL,
  required_skills JSONB DEFAULT '[]',
  nice_to_have_skills JSONB DEFAULT '[]',
  source_url TEXT,
  salary_range TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index on jobs
CREATE INDEX IF NOT EXISTS idx_jobs_fts ON jobs USING GIN(to_tsvector('english', title || ' ' || COALESCE(company, '') || ' ' || description));

-- =============================================================
-- AI REPORTS
-- =============================================================
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cv_id UUID REFERENCES cvs(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ats_score INTEGER CHECK (ats_score BETWEEN 0 AND 100),
  match_score INTEGER CHECK (match_score BETWEEN 0 AND 100),
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  missing_skills JSONB DEFAULT '[]',
  matched_skills JSONB DEFAULT '[]',
  weak_areas JSONB DEFAULT '[]',
  strengths JSONB DEFAULT '[]',
  suggestions TEXT,
  improved_cv_text TEXT,
  interview_questions JSONB DEFAULT '[]',
  rejection_analysis TEXT,
  keyword_density JSONB DEFAULT '{}',
  raw_response JSONB,
  model_used TEXT DEFAULT 'gemini-1.5-pro',
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- APPLICATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  cv_id UUID REFERENCES cvs(id) ON DELETE SET NULL,
  ai_report_id UUID REFERENCES ai_reports(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN (
    'draft', 'applied', 'screening', 'interview',
    'technical', 'final_round', 'offer', 'rejected', 'withdrawn'
  )) DEFAULT 'draft',
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  notes TEXT,
  cover_letter TEXT,
  applied_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  interview_date TIMESTAMPTZ,
  offer_amount TEXT,
  position INTEGER, -- Kanban column order
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- APPLICATION STATUS HISTORY
-- =============================================================
CREATE TABLE IF NOT EXISTS application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-record status changes
CREATE OR REPLACE FUNCTION record_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO application_status_history (application_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_application_status_change ON applications;
CREATE TRIGGER on_application_status_change
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION record_status_change();

-- =============================================================
-- AI COACH CONVERSATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'New Conversation',
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ANALYTICS CACHE
-- =============================================================
CREATE TABLE IF NOT EXISTS analytics_cache (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  total_applications INTEGER DEFAULT 0,
  interview_rate DECIMAL(5,2) DEFAULT 0,
  offer_rate DECIMAL(5,2) DEFAULT 0,
  rejection_rate DECIMAL(5,2) DEFAULT 0,
  avg_ats_score DECIMAL(5,2) DEFAULT 0,
  avg_match_score DECIMAL(5,2) DEFAULT 0,
  avg_confidence_score DECIMAL(5,2) DEFAULT 0,
  top_missing_skills JSONB DEFAULT '[]',
  applications_by_status JSONB DEFAULT '{}',
  monthly_trend JSONB DEFAULT '[]',
  skill_improvement_rate DECIMAL(5,2) DEFAULT 0,
  last_computed TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- UPDATED_AT TRIGGERS
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coach_conversations_updated_at BEFORE UPDATE ON coach_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_id ON ai_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_status_history_application_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_id ON coach_conversations(user_id);
