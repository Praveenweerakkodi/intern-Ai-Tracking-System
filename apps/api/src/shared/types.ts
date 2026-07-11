// =============================================================
// InternAI Tracker — Shared TypeScript Types
// Inlined copy of packages/shared/src/types/index.ts
// This avoids monorepo resolution issues in Docker/container builds
// =============================================================

// ---- Enums ----
export type ExperienceLevel = 'student' | 'fresh_grad' | 'junior' | 'mid';

export type ApplicationStatus =
  | 'draft'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'technical'
  | 'final_round'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export type JobType = 'full_time' | 'part_time' | 'internship' | 'contract' | 'remote';

export type AIModel = 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-2.0-flash';

// ---- Database Types ----
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  target_role: string | null;
  target_industry: string | null;
  experience_level: ExperienceLevel;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  bio: string | null;
  skills: string[];
  created_at: string;
  updated_at: string;
}

export interface CV {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  extracted_text: string | null;
  version: number;
  is_primary: boolean;
  word_count: number | null;
  tags: string[];
  created_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  location: string | null;
  job_type: JobType;
  description: string;
  required_skills: string[];
  nice_to_have_skills: string[];
  source_url: string | null;
  salary_range: string | null;
  deadline: string | null;
  created_at: string;
}

export interface AIReport {
  id: string;
  user_id: string;
  cv_id: string | null;
  job_id: string | null;
  ats_score: number | null;
  match_score: number | null;
  confidence_score: number | null;
  missing_skills: SkillItem[];
  matched_skills: SkillItem[];
  weak_areas: WeakArea[];
  strengths: string[];
  suggestions: string | null;
  improved_cv_text: string | null;
  interview_questions: InterviewQuestion[];
  rejection_analysis: string | null;
  keyword_density: Record<string, number>;
  model_used: AIModel;
  processing_time_ms: number | null;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string | null;
  cv_id: string | null;
  ai_report_id: string | null;
  status: ApplicationStatus;
  priority: number;
  notes: string | null;
  cover_letter: string | null;
  applied_at: string | null;
  response_received_at: string | null;
  interview_date: string | null;
  offer_amount: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  job?: Job;
  cv?: CV;
  ai_report?: AIReport;
  status_history?: ApplicationStatusHistory[];
}

export interface ApplicationStatusHistory {
  id: string;
  application_id: string;
  old_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  note: string | null;
  changed_at: string;
}

export interface CoachConversation {
  id: string;
  user_id: string;
  application_id: string | null;
  title: string;
  messages: ChatMessage[];
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsCache {
  user_id: string;
  total_applications: number;
  interview_rate: number;
  offer_rate: number;
  rejection_rate: number;
  avg_ats_score: number;
  avg_match_score: number;
  avg_confidence_score: number;
  top_missing_skills: SkillItem[];
  applications_by_status: Record<ApplicationStatus, number>;
  monthly_trend: MonthlyTrend[];
  skill_improvement_rate: number;
  last_computed: string;
}

// ---- Nested Types ----
export interface SkillItem {
  name: string;
  category?: string;
  importance?: 'required' | 'nice_to_have';
  frequency?: number;
}

export interface WeakArea {
  section: string;
  issue: string;
  suggestion: string;
}

export interface InterviewQuestion {
  question: string;
  type: 'behavioral' | 'technical' | 'situational';
  hint?: string;
  example_answer?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context_refs?: string[];
}

export interface MonthlyTrend {
  month: string;
  applications: number;
  interviews: number;
  offers: number;
}

// ---- AI Request/Response Types ----
export interface AnalyzeRequest {
  cv_text: string;
  job_description: string;
  job_title?: string;
  company?: string;
}

export interface AnalyzeResponse {
  ats_score: number;
  match_score: number;
  confidence_score: number;
  missing_skills: SkillItem[];
  matched_skills: SkillItem[];
  weak_areas: WeakArea[];
  strengths: string[];
  suggestions: string;
  keyword_density: Record<string, number>;
  interview_questions: InterviewQuestion[];
}

export interface CVImproveRequest {
  cv_text: string;
  job_description: string;
  analysis: AnalyzeResponse;
}

export interface StreamChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ---- API Response Wrapper ----
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

// ---- Status Metadata ----
export const APPLICATION_STATUS_META: Record<ApplicationStatus, {
  label: string;
  color: string;
  emoji: string;
  description: string;
}> = {
  draft: { label: 'Draft', color: '#6b7280', emoji: '📝', description: 'Not yet submitted' },
  applied: { label: 'Applied', color: '#3b82f6', emoji: '📨', description: 'Application submitted' },
  screening: { label: 'Screening', color: '#8b5cf6', emoji: '🔍', description: 'Under review' },
  interview: { label: 'Interview', color: '#f59e0b', emoji: '🎙️', description: 'Interview scheduled' },
  technical: { label: 'Technical', color: '#f97316', emoji: '💻', description: 'Technical round' },
  final_round: { label: 'Final Round', color: '#ec4899', emoji: '🏆', description: 'Final interview' },
  offer: { label: 'Offer! 🎉', color: '#10b981', emoji: '🎉', description: 'Offer received!' },
  rejected: { label: 'Rejected', color: '#ef4444', emoji: '❌', description: 'Not selected' },
  withdrawn: { label: 'Withdrawn', color: '#9ca3af', emoji: '🚫', description: 'Application withdrawn' },
};
