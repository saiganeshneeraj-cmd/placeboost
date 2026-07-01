import { createServerFn } from "@tanstack/react-start";

type Metrics = {
  keywords: number;
  formatting: number;
  structure: number;
  experience: number;
  skills: number;
};

export type AnalysisResult = {
  score: number;
  metrics: Metrics;
  missing_keywords: string[];
  buzzwords: { term: string; replacement: string }[];
  strengths: string[];
  suggestions: string[];
  role_guess: string;
};

const SYSTEM = `You are an elite ATS (Applicant Tracking System) analyzer for student resumes targeting tech placements in India.
Return STRICT JSON matching the schema. Score honestly (0-100). Prioritize measurable impact, tech keywords, and structural clarity.
Never wrap the JSON in prose or code fences.`;

const SCHEMA_HINT = `{
  "score": number (0-100 overall ATS match),
  "metrics": { "keywords": number, "formatting": number, "structure": number, "experience": number, "skills": number },
  "missing_keywords": string[]  // 5-10 high-yield keywords absent from resume,
  "buzzwords": [{ "term": string, "replacement": string }]  // dead buzzwords found + concrete replacement (max 6),
  "strengths": string[]  // 3-5 short bullets,
  "suggestions": string[]  // 4-6 specific fixes,
  "role_guess": string  // most likely target role
}`;

export const analyzeResume = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; jobTarget?: string }) => {
    if (!d || typeof d.text !== "string") throw new Error("text required");
    const text = d.text.trim();
    if (text.length < 50) throw new Error("Resume text too short (min 50 chars).");
    if (text.length > 30000) throw new Error("Resume text too long (max 30k chars).");
    return { text, jobTarget: (d.jobTarget || "").slice(0, 200) };
  })
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");

    const userPrompt = `Target role/JD context: ${data.jobTarget || "General SDE / Software Engineer intern & new-grad roles in India"}

Resume text:
"""
${data.text}
"""

Return JSON matching exactly this shape (no markdown, no commentary):
${SCHEMA_HINT}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit hit — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    let parsed: AnalysisResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Model returned non-JSON output");
      parsed = JSON.parse(m[0]);
    }

    // Clamp / defaults
    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    return {
      score: clamp(parsed.score),
      metrics: {
        keywords: clamp(parsed.metrics?.keywords),
        formatting: clamp(parsed.metrics?.formatting),
        structure: clamp(parsed.metrics?.structure),
        experience: clamp(parsed.metrics?.experience),
        skills: clamp(parsed.metrics?.skills),
      },
      missing_keywords: (parsed.missing_keywords || []).slice(0, 12).map(String),
      buzzwords: (parsed.buzzwords || []).slice(0, 8).map((b) => ({
        term: String(b?.term ?? ""),
        replacement: String(b?.replacement ?? ""),
      })).filter((b) => b.term),
      strengths: (parsed.strengths || []).slice(0, 6).map(String),
      suggestions: (parsed.suggestions || []).slice(0, 8).map(String),
      role_guess: String(parsed.role_guess ?? ""),
    };
  });
