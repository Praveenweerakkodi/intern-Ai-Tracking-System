import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(dateStr));
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#6366f1';
  if (score >= 65) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'Fair';
  return 'Needs Work';
}

export function getStatusClass(status: string): string {
  return `status-${status}`;
}

export function truncate(str: string, len = 60): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function getApiUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${path}`;
}

export function cleanErrorMessage(errorInput: any): string {
  if (!errorInput) return 'An unexpected error occurred';
  
  let rawStr = '';
  if (typeof errorInput === 'object') {
    rawStr = errorInput.message || errorInput.error || JSON.stringify(errorInput);
  } else {
    rawStr = String(errorInput);
  }

  // Attempt to parse stringified JSON (Gemini wraps errors in nested JSON)
  try {
    if (rawStr.trim().startsWith('{') || rawStr.trim().startsWith('[')) {
      const parsed = JSON.parse(rawStr);
      if (parsed.error) return cleanErrorMessage(parsed.error);
      if (parsed.message) return cleanErrorMessage(parsed.message);
    }
  } catch (e) {}

  try {
    const cleaned = JSON.parse(rawStr);
    if (cleaned && typeof cleaned === 'object') {
      return cleanErrorMessage(cleaned);
    }
  } catch (e) {}

  // User-friendly mappings for Gemini error codes
  if (rawStr.includes('experiencing high demand') || rawStr.includes('503') || rawStr.includes('UNAVAILABLE')) {
    return 'The AI Service is currently experiencing high demand. Please try again in a few moments.';
  }
  if (rawStr.includes('API key') || rawStr.includes('API_KEY_INVALID')) {
    return 'AI service configuration is invalid. Please check backend environment configuration.';
  }
  if (rawStr.includes('quota') || rawStr.includes('limit exceeded') || rawStr.includes('429')) {
    return 'AI request limit reached. Please wait a minute before requesting again.';
  }

  // Fallback to cleaner string formatting, stripping trailing bracket leftovers
  return rawStr.replace(/^[{"'\s:]+/, '').replace(/[}"'\s:]+$/, '').trim() || 'Request failed';
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  if (!isFormData) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  const res = await fetch(getApiUrl(path), {
    ...options,
    headers,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(cleanErrorMessage(json.error || json.message || 'Request failed'));
  return (json.data ?? json) as T;
}
