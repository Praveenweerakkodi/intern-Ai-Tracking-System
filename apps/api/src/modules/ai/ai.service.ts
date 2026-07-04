import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AnalyzeRequest, AnalyzeResponse } from '@internai/shared';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;

  constructor(private config: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: config.get<string>('GEMINI_API_KEY')!,
    });
  }

  // ---- ATS Analysis (structured JSON output) ----
  async analyzeCV(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const startTime = Date.now();
    const prompt = this.buildAnalysisPrompt(request);

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        });
        const text = response.text;
        if (!text) throw new Error('Empty response from Gemini');
        const parsed = JSON.parse(text) as AnalyzeResponse;
        this.logger.log(
          `ATS analysis completed in ${Date.now() - startTime}ms (attempt ${attempt})`,
        );
        return parsed;
      } catch (error) {
        lastError = error as Error;
        this.logger.error(`Attempt ${attempt} failed: ${(error as Error).message}`, (error as Error).stack);
        if (attempt < 3) await this.delay(1000 * attempt);
      }
    }
    throw new Error(`AI analysis failed after 3 attempts: ${lastError?.message}`);
  }

  // ---- CV Improvement (streaming) ----
  async *improveCV(
    cvText: string,
    jobDescription: string,
    analysis: AnalyzeResponse,
  ): AsyncGenerator<string> {
    const prompt = this.buildCVImprovePrompt(cvText, jobDescription, analysis);

    const stream = await this.ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.4, maxOutputTokens: 8192 },
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
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.7, maxOutputTokens: 4096 },
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
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.5 },
    });
    return JSON.parse(response.text ?? '[]');
  }

  // ---- AI Coach Chat (streaming) ----
  async *chatStream(
    messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    systemPrompt: string,
  ): AsyncGenerator<string> {
    const stream = await this.ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: messages,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }

  // ---- Private: Prompt Builders ----
  private buildAnalysisPrompt(req: AnalyzeRequest): string {
    return `
You are an expert ATS analyst and career coach. Analyze this CV against the job description.

CV TEXT:
${req.cv_text}

JOB DESCRIPTION:
${req.job_description}

JOB TITLE: ${req.job_title || 'Not specified'}
COMPANY: ${req.company || 'Not specified'}

Return ONLY valid JSON with this exact structure:
{
  "ats_score": <0-100>,
  "match_score": <0-100>,
  "confidence_score": <0-100, probability of interview callback>,
  "missing_skills": [{"name": string, "category": string, "importance": "required"|"nice_to_have", "frequency": number}],
  "matched_skills": [{"name": string, "category": string}],
  "weak_areas": [{"section": string, "issue": string, "suggestion": string}],
  "strengths": [string],
  "suggestions": "detailed paragraph with top 5 actionable improvements",
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
    return `
You are an expert CV writer for tech internship applications.
Rewrite this CV to maximize ATS score and appeal for the target role.

ORIGINAL CV:
${cvText}

JOB REQUIREMENTS:
${jobDescription.substring(0, 2000)}

IDENTIFIED GAPS: ${JSON.stringify(analysis.missing_skills)}
WEAK AREAS: ${JSON.stringify(analysis.weak_areas)}

Rules:
1. Add missing keywords naturally — no keyword stuffing
2. Start every bullet with a strong action verb (Developed, Built, Optimized, Led...)
3. Add quantifiable metrics where realistic
4. Keep authentic — improve presentation, don't invent experiences
5. Add a compelling professional summary targeting this role
6. Mark improved sections with [IMPROVED] prefix

Write the complete improved CV:
    `.trim();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
