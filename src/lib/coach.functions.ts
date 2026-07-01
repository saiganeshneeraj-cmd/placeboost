import { createServerFn } from "@tanstack/react-start";

/* ---------------- Shared AI call ---------------- */

async function callAI(system: string, user: string): Promise<any> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI gateway not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
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
  return extractJson(content);
}

function extractJson(raw: string): any {
  if (!raw) throw new Error("Empty response from AI — try again.");
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[\{\[]/);
  if (start === -1) throw new Error("AI returned non-JSON output — try again.");
  const closer = s[start] === "[" ? "]" : "}";
  const end = s.lastIndexOf(closer);
  if (end === -1 || end < start) throw new Error("AI response was truncated — try again.");
  s = s.slice(start, end + 1);
  try { return JSON.parse(s); }
  catch {
    const repaired = s
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    return JSON.parse(repaired);
  }
}

const clampLen = (s: string, max: number) => (s || "").slice(0, max);

/* ---------------- Cover Letter ---------------- */

export type CoverLetterResult = {
  letter: string;                 // 3-4 short paragraphs, ready to paste
  subject: string;                // email subject line
  hook: string;                   // one-line elevator opener
  key_matches: string[];          // resume ↔ JD alignment bullets
};

export const generateCoverLetter = createServerFn({ method: "POST" })
  .inputValidator((d: { resume: string; jobTarget: string; company?: string; tone?: string }) => {
    if (!d?.resume || d.resume.trim().length < 50) throw new Error("Resume too short (min 50 chars).");
    if (!d?.jobTarget || d.jobTarget.trim().length < 15) throw new Error("Add a target role / JD (min 15 chars) for a tailored letter.");
    return {
      resume: clampLen(d.resume.trim(), 30000),
      jobTarget: clampLen(d.jobTarget.trim(), 4000),
      company: clampLen(d.company || "", 120),
      tone: clampLen(d.tone || "confident, warm, specific", 80),
    };
  })
  .handler(async ({ data }): Promise<CoverLetterResult> => {
    const sys = `You write concise, high-signal cover letters for Indian tech new-grad/intern applications.
Rules:
- 180-260 words total, 3-4 short paragraphs, plain text, no fluff or "I am writing to apply".
- Open with a specific hook tying candidate to the company/role.
- Cite 2-3 concrete resume achievements that match JD requirements (use their real metrics only).
- Close with a soft ask for a conversation.
- Zero buzzwords ("hard-working", "team player", "passionate"). No emojis.
Return STRICT JSON only.`;
    const user = `Company: ${data.company || "(unspecified)"}
Target role / JD:
"""${data.jobTarget}"""

Candidate resume:
"""${data.resume}"""

Tone: ${data.tone}

Return JSON:
{
  "letter": string,        // full plain-text cover letter
  "subject": string,       // email subject (<80 chars)
  "hook": string,          // one-line pitch
  "key_matches": string[]  // 3-5 short bullets showing resume↔JD alignment
}`;
    const p = await callAI(sys, user);
    return {
      letter: String(p.letter ?? "").trim(),
      subject: String(p.subject ?? "").trim().slice(0, 140),
      hook: String(p.hook ?? "").trim().slice(0, 220),
      key_matches: (p.key_matches || []).slice(0, 8).map(String),
    };
  });

/* ---------------- Interview Prep Pack ---------------- */

export type InterviewQuestion = {
  question: string;
  category: "technical" | "behavioral" | "system-design" | "role-specific";
  difficulty: "easy" | "medium" | "hard";
  why_asked: string;                // why interviewer picks this given the resume
  model_answer: string;             // STAR for behavioral, structured for tech
  key_points: string[];             // bullet checklist candidate must hit
};

export type InterviewPack = {
  role: string;
  summary: string;                                // 1-2 sentence read on the candidate
  focus_areas: string[];                          // 4-6 topics to revise
  dsa_topics: { topic: string; leetcode_pattern: string; priority: "must" | "should" | "nice" }[];
  system_design: string[];                        // 3-5 SD prompts likely for this profile (empty for non-SDE)
  questions: InterviewQuestion[];                 // 10-14 mixed questions
  red_flags: string[];                            // things in resume that will be probed hard
  quick_wins: string[];                           // things to prepare that give outsized ROI in 2-3 days
};

export const generateInterviewPack = createServerFn({ method: "POST" })
  .inputValidator((d: { resume: string; jobTarget?: string }) => {
    if (!d?.resume || d.resume.trim().length < 50) throw new Error("Resume too short (min 50 chars).");
    return {
      resume: clampLen(d.resume.trim(), 30000),
      jobTarget: clampLen((d.jobTarget || "").trim(), 4000),
    };
  })
  .handler(async ({ data }): Promise<InterviewPack> => {
    const sys = `You are a senior Indian tech interviewer (Google, Flipkart, Razorpay, Zerodha) building a targeted interview prep pack.
- Generate questions the interviewer WILL actually ask given this specific resume — probe projects, tools, and gaps.
- Behavioral answers must use STAR (Situation, Task, Action, Result) with concrete metrics.
- Technical answers must be structurally correct, mention time/space complexity where relevant.
- DSA topics: only patterns that map to problems the candidate's target role screens for. Mark priority honestly.
- red_flags = specific claims/gaps the interviewer will drill (e.g. "'improved performance' with no metric — expect follow-up on baseline & method").
- quick_wins = 2-3 day prep items with outsized ROI for THIS candidate.
Return STRICT JSON only.`;
    const user = `Target role / JD: ${data.jobTarget || "General SDE / new-grad software engineering in India"}

Resume:
"""${data.resume}"""

Return JSON:
{
  "role": string,
  "summary": string,
  "focus_areas": string[],
  "dsa_topics": [{"topic": string, "leetcode_pattern": string, "priority": "must"|"should"|"nice"}],
  "system_design": string[],
  "questions": [{
    "question": string,
    "category": "technical"|"behavioral"|"system-design"|"role-specific",
    "difficulty": "easy"|"medium"|"hard",
    "why_asked": string,
    "model_answer": string,
    "key_points": string[]
  }],
  "red_flags": string[],
  "quick_wins": string[]
}
Rules: 10-14 questions total, mix of behavioral (3-4), technical (5-7), and 1-2 system design (only if SDE-ish role). 4-8 DSA topics. Answers should be 3-6 sentences, not essays.`;
    const p = await callAI(sys, user);
    return {
      role: String(p.role ?? "").trim(),
      summary: String(p.summary ?? "").trim(),
      focus_areas: (p.focus_areas || []).slice(0, 8).map(String),
      dsa_topics: (p.dsa_topics || []).slice(0, 12).map((t: any) => ({
        topic: String(t?.topic ?? ""),
        leetcode_pattern: String(t?.leetcode_pattern ?? ""),
        priority: ["must", "should", "nice"].includes(t?.priority) ? t.priority : "should",
      })).filter((t: any) => t.topic),
      system_design: (p.system_design || []).slice(0, 6).map(String),
      questions: (p.questions || []).slice(0, 16).map((q: any) => ({
        question: String(q?.question ?? ""),
        category: ["technical", "behavioral", "system-design", "role-specific"].includes(q?.category) ? q.category : "technical",
        difficulty: ["easy", "medium", "hard"].includes(q?.difficulty) ? q.difficulty : "medium",
        why_asked: String(q?.why_asked ?? ""),
        model_answer: String(q?.model_answer ?? ""),
        key_points: (q?.key_points || []).slice(0, 6).map(String),
      })).filter((q: any) => q.question),
      red_flags: (p.red_flags || []).slice(0, 8).map(String),
      quick_wins: (p.quick_wins || []).slice(0, 8).map(String),
    };
  });

/* ---------------- Placement Probability + Salary Predictor ---------------- */

export type PlacementBucket = {
  tier: string;                    // e.g. "FAANG / Top Product", "Mid-tier Product", "Service (TCS/Infosys)"
  probability: number;             // 0-100
  ctc_min_lpa: number;
  ctc_max_lpa: number;
  reasoning: string;
  companies: string[];             // example companies
  action_items: string[];          // things to boost odds
};

export type PlacementPrediction = {
  overall_readiness: number;       // 0-100
  headline: string;                // one-liner take
  strongest_signals: string[];
  weakest_signals: string[];
  buckets: PlacementBucket[];      // 3-4 tiers
  timeline_advice: string;         // "you're 6-8 weeks away from X by doing Y"
};

export const predictPlacement = createServerFn({ method: "POST" })
  .inputValidator((d: {
    resume: string;
    college_tier?: string;         // "IIT/NIT", "Tier-1 private", "Tier-2", "Tier-3"
    cgpa?: number;
    target_role?: string;
    location_pref?: string;
    yoe?: number;                  // 0 = fresher
  }) => {
    if (!d?.resume || d.resume.trim().length < 50) throw new Error("Resume too short (min 50 chars).");
    return {
      resume: clampLen(d.resume.trim(), 30000),
      college_tier: clampLen(d.college_tier || "", 60),
      cgpa: typeof d.cgpa === "number" && d.cgpa >= 0 && d.cgpa <= 10 ? d.cgpa : undefined,
      target_role: clampLen(d.target_role || "", 200),
      location_pref: clampLen(d.location_pref || "", 80),
      yoe: typeof d.yoe === "number" && d.yoe >= 0 ? Math.min(d.yoe, 20) : 0,
    };
  })
  .handler(async ({ data }): Promise<PlacementPrediction> => {
    const sys = `You are a placement analytics engine for Indian tech recruiting.
Given a candidate profile, predict realistic hire probability and CTC range across company tiers.
Ground your estimates in current Indian market reality (${new Date().getFullYear()}):
- FAANG / top product (Google, Meta, Uber, Atlassian, Adobe, MSFT, Amazon SDE-1): 18-45 LPA new-grad
- Top product / unicorn (Flipkart, Razorpay, Zerodha, Zomato, Swiggy, PhonePe, CRED): 12-28 LPA
- Mid-tier product / early startup: 6-14 LPA
- Service (TCS/Infosys/Wipro/Cognizant/Accenture): 3.5-7 LPA (some digital roles 8-12)
Be honest, not encouraging. A weak resume for FAANG should get ~2-8% probability. Don't inflate.
CTC ranges must be realistic INR fresher/experienced numbers, not global.
Return STRICT JSON only.`;
    const user = `Candidate:
- College tier: ${data.college_tier || "unspecified"}
- CGPA: ${data.cgpa ?? "unspecified"}
- YOE: ${data.yoe}
- Target role: ${data.target_role || "unspecified"}
- Location preference: ${data.location_pref || "unspecified"}

Resume:
"""${data.resume}"""

Return JSON:
{
  "overall_readiness": number 0-100,
  "headline": string,
  "strongest_signals": string[],
  "weakest_signals": string[],
  "buckets": [{
    "tier": string,
    "probability": number 0-100,
    "ctc_min_lpa": number,
    "ctc_max_lpa": number,
    "reasoning": string,
    "companies": string[],
    "action_items": string[]
  }],
  "timeline_advice": string
}
Rules: exactly 4 buckets in decreasing tier (FAANG → Top product → Mid → Service). 3-5 items in each signals list. 2-4 action_items per bucket.`;
    const p = await callAI(sys, user);
    const clamp = (n: unknown, max = 100) => Math.max(0, Math.min(max, Number(n) || 0));
    return {
      overall_readiness: Math.round(clamp(p.overall_readiness)),
      headline: String(p.headline ?? "").trim(),
      strongest_signals: (p.strongest_signals || []).slice(0, 6).map(String),
      weakest_signals: (p.weakest_signals || []).slice(0, 6).map(String),
      buckets: (p.buckets || []).slice(0, 5).map((b: any) => ({
        tier: String(b?.tier ?? ""),
        probability: Math.round(clamp(b?.probability)),
        ctc_min_lpa: Math.round(clamp(b?.ctc_min_lpa, 200) * 10) / 10,
        ctc_max_lpa: Math.round(clamp(b?.ctc_max_lpa, 500) * 10) / 10,
        reasoning: String(b?.reasoning ?? ""),
        companies: (b?.companies || []).slice(0, 8).map(String),
        action_items: (b?.action_items || []).slice(0, 6).map(String),
      })).filter((b: any) => b.tier),
      timeline_advice: String(p.timeline_advice ?? "").trim(),
    };
  });
