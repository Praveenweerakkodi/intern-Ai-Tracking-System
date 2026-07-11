import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AnalyzeRequest, AnalyzeResponse } from '../../shared/types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;

  constructor(private config: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: config.get<string>('GEMINI_API_KEY')!,
    });
  }

  // Primary model — extremely capable and stable
  private readonly PRIMARY_MODEL = 'gemini-3.5-flash';
  // Fallback model if primary hits quota/errors
  private readonly FALLBACK_MODEL = 'gemini-flash-lite-latest';

  private isQuotaError(error: Error): boolean {
    const msg = error.message || '';
    return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
  }

  private async retryWithBackoff<T>(
    fn: (model: string) => Promise<T>,
    label: string,
  ): Promise<T> {
    const models = [this.PRIMARY_MODEL, this.FALLBACK_MODEL];
    let lastError: Error | null = null;

    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          this.logger.log(`[${label}] Attempt ${attempt} with ${model}`);
          return await fn(model);
        } catch (error) {
          lastError = error as Error;
          this.logger.warn(`[${label}] ${model} attempt ${attempt} failed: ${lastError.message}`);

          if (this.isQuotaError(lastError)) {
            if (attempt === 1) {
              // Wait 65s on quota errors before retrying the same model
              this.logger.warn(`[${label}] Quota exceeded — waiting 65s before retry...`);
              await this.delay(65_000);
            }
            // After 2 attempts on same model, try fallback
          } else {
            // Non-quota error: short backoff then retry
            if (attempt < 2) await this.delay(2000 * attempt);
          }
        }
      }
    }
    throw new Error(`${label} failed after all attempts: ${lastError?.message}`);
  }

  // ---- ATS Analysis (structured JSON output) ----
  async analyzeCV(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const startTime = Date.now();

    const result = await this.retryWithBackoff(async (model) => {
      const prompt = this.buildAnalysisPrompt(request);
      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });
      const text = response.text;
      if (!text) throw new Error('Empty response from Gemini');
      return JSON.parse(text) as AnalyzeResponse;
    }, 'analyzeCV');

    this.logger.log(`ATS analysis completed in ${Date.now() - startTime}ms`);
    return result;
  }

  // ---- CV Improvement (streaming) ----
  async *improveCV(
    cvText: string,
    jobDescription: string,
    analysis: AnalyzeResponse,
  ): AsyncGenerator<string> {
    const prompt = this.buildCVImprovePrompt(cvText, jobDescription, analysis);

    const stream = await this.ai.models.generateContentStream({
      model: this.PRIMARY_MODEL,
      contents: prompt,
      config: { temperature: 0.4, maxOutputTokens: 4096 },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }

  // ---- Rejection Analysis ----
  async analyzeRejection(
    jobTitle: string,
    company: string,
    atsScore: number,
    matchScore: number,
    missingSkills: string[],
    weakAreas: string[],
  ): Promise<string> {
    const prompt = `
You are a compassionate career coach analyzing why a job application may not have progressed.

APPLICATION DETAILS:
- Job: ${jobTitle} at ${company}
- ATS Score: ${atsScore}/100
- Match Score: ${matchScore}/100
- Missing Skills: ${missingSkills.join(', ')}
- Weak Areas: ${weakAreas.join(', ')}

Provide in 4 sections:
1. **Most Likely Reason** - be honest but kind
2. **Top 3 Improvements** - specific and actionable
3. **Better-fit Roles** - 3 similar roles to target
4. **Motivational Message** - encouraging closing

Keep tone empathetic and constructive. Use markdown formatting.
    `.trim();

    const response = await this.ai.models.generateContent({
      model: this.PRIMARY_MODEL,
      contents: prompt,
      config: { temperature: 0.7, maxOutputTokens: 2048 },
    });
    return response.text ?? '';
  }

  // ---- Interview Question Generator ----
  async generateInterviewQuestions(
    jobTitle: string,
    jobDescription: string,
    cvSummary: string,
  ): Promise<object[]> {
    const prompt = `
Generate 8 targeted interview preparation questions.

ROLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription.substring(0, 1500)}
CANDIDATE BACKGROUND: ${cvSummary.substring(0, 500)}

Return JSON array of objects with these fields:
- question (string)
- type ("behavioral" | "technical" | "situational")
- hint (string - what interviewer is really assessing)
- key_points (string[] - main things to cover)

Return ONLY valid JSON array.
    `.trim();

    const response = await this.ai.models.generateContent({
      model: this.PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.5, maxOutputTokens: 2048 },
    });
    return JSON.parse(response.text ?? '[]');
  }

  // ---- AI Coach Chat (streaming) ----
  async *chatStream(
    messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    systemPrompt: string,
  ): AsyncGenerator<string> {
    const stream = await this.ai.models.generateContentStream({
      model: this.PRIMARY_MODEL,
      contents: messages,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }

  // ---- Private: Prompt Builders ----
  private buildAnalysisPrompt(req: AnalyzeRequest): string {
    // Truncate to stay within free-tier token limits
    const cvText = (req.cv_text || '').substring(0, 3000);
    const jobDesc = (req.job_description || '').substring(0, 2000);

    return `
You are an expert ATS analyst. Analyze this CV against the job description.

CV TEXT:
${cvText}

JOB DESCRIPTION:
${jobDesc}

JOB TITLE: ${req.job_title || 'Not specified'}
COMPANY: ${req.company || 'Not specified'}

Return ONLY valid JSON:
{
  "ats_score": <0-100>,
  "match_score": <0-100>,
  "confidence_score": <0-100>,
  "missing_skills": [{"name": string, "category": string, "importance": "required"|"nice_to_have", "frequency": number}],
  "matched_skills": [{"name": string, "category": string}],
  "weak_areas": [{"section": string, "issue": string, "suggestion": string}],
  "strengths": [string],
  "suggestions": "top 3-5 actionable improvements",
  "keyword_density": {"keyword": count},
  "interview_questions": [{"question": string, "type": "behavioral"|"technical"|"situational", "hint": string}]
}
    `.trim();
  }

  private buildCVImprovePrompt(
    cvText: string,
    jobDescription: string,
    analysis: AnalyzeResponse,
  ): string {
    // Truncate inputs to stay within free-tier token limits
    const truncatedCV = (cvText || '').substring(0, 2500);
    const truncatedJob = (jobDescription || '').substring(0, 1500);
    const missingSkills = (analysis.missing_skills || []).slice(0, 5);
    const weakAreas = (analysis.weak_areas || []).slice(0, 3);

    return `
You are an expert CV writer. Rewrite this CV to maximize ATS score for the target role.

ORIGINAL CV:
${truncatedCV}

JOB REQUIREMENTS:
${truncatedJob}

GAPS TO ADDRESS: ${JSON.stringify(missingSkills)}
WEAK AREAS: ${JSON.stringify(weakAreas)}

Rules:
1. Add missing keywords naturally
2. Start bullets with action verbs (Developed, Built, Optimized...)
3. Add quantifiable metrics where realistic
4. Mark improved sections with [IMPROVED] prefix

Write the complete improved CV:
    `.trim();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
