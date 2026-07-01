import { createServerFn } from "@tanstack/react-start";
import { aiChatJSON } from "./ai-provider";

type Metrics = {
  keywords: number;
  formatting: number;
  structure: number;
  experience: number;
  skills: number;
};

export type HeuristicReport = {
  word_count: number;
  bullet_count: number;
  quantified_bullets: number;
  quantified_pct: number;
  action_verb_pct: number;
  sections_found: string[];
  sections_missing: string[];
  contact: { email: boolean; phone: boolean; linkedin: boolean; github: boolean };
  jd_match_pct: number;           // % of JD keywords present in resume
  jd_hits: string[];
  jd_misses: string[];
  hard_skills_found: string[];
  readability_flag: "clean" | "dense" | "sparse";
};

export type AnalysisResult = {
  score: number;                   // blended, 0-100
  ai_score: number;                // model's raw score
  heuristic_score: number;         // deterministic score
  metrics: Metrics;
  missing_keywords: string[];
  buzzwords: { term: string; replacement: string }[];
  strengths: string[];
  suggestions: string[];
  role_guess: string;
  heuristic: HeuristicReport;
  tailored_bullets: string[];      // rewritten sample bullets
};

/* ---------------- Heuristic scoring (deterministic, JobScan-like) ---------------- */

const ACTION_VERBS = new Set([
  "achieved","architected","automated","built","collaborated","conceived","created","cut",
  "delivered","deployed","designed","developed","directed","drove","engineered","enhanced",
  "established","evaluated","executed","expanded","generated","grew","implemented","improved",
  "increased","initiated","integrated","launched","led","managed","migrated","optimized",
  "orchestrated","owned","pioneered","produced","reduced","refactored","researched","scaled",
  "shipped","simplified","solved","spearheaded","streamlined","tested","transformed","translated"
]);

const SECTION_PATTERNS: Record<string, RegExp> = {
  contact: /(email|phone|linkedin|github|portfolio)/i,
  summary: /(^|\n)\s*(summary|objective|profile|about\s*me)\b/i,
  education: /(^|\n)\s*education\b/i,
  experience: /(^|\n)\s*(experience|employment|work\s*history|internship)/i,
  projects: /(^|\n)\s*projects?\b/i,
  skills: /(^|\n)\s*(skills|technical\s*skills|tech\s*stack)/i,
  certifications: /(^|\n)\s*(certifications?|licenses?|courses?)\b/i,
  achievements: /(^|\n)\s*(achievements?|awards?|honors?)\b/i,
};

const COMMON_HARD_SKILLS = [
  "python","java","javascript","typescript","c\\+\\+","c#","go","rust","kotlin","swift",
  "react","next\\.js","node\\.js","express","tailwind","redux",
  "django","flask","fastapi","spring","spring boot",
  "postgresql","mysql","mongodb","redis","sqlite","dynamodb",
  "aws","gcp","azure","docker","kubernetes","terraform","ci/cd","git","github",
  "tensorflow","pytorch","pandas","numpy","scikit-learn","opencv","nlp","llm",
  "rest","graphql","grpc","microservices","system design","dsa","algorithms",
];

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9+#./-]{2,}/g) ?? [];
}

function computeHeuristic(text: string, jd: string): HeuristicReport {
  const lower = text.toLowerCase();
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => /^([-•*·▪●▸►]|\d+[.)])/.test(l));
  // Fallback: many PDFs lose bullet glyphs on extract. Treat medium-length
  // lines starting with a verb-like word as bullets so scoring stays fair.
  const isBulletish = (l: string) =>
    l.length >= 15 && l.length <= 240 && /^[A-Z]?[a-z]+(ed|ing|s)?\b/.test(l);
  const effectiveBullets = bulletLines.length >= 4 ? bulletLines : lines.filter(isBulletish);
  const bulletCount = effectiveBullets.length;
  const quantified = effectiveBullets.filter((l) =>
    /(\d+%|\$\d|\d[\d,]*\s?(x|k|m|users|ms|s|hrs|hours|days|weeks|months|reqs|rows|records|customers|downloads|stars|commits))/i.test(l)
    || /\b\d{2,}\b/.test(l)
  ).length;

  const words = tokenize(text);
  const firstWords = effectiveBullets
    .map((l) => (l.match(/^[-•*·▪●▸►\d.)\s]*([a-zA-Z]+)/)?.[1] || "").toLowerCase())
    .filter(Boolean);
  const verbHits = firstWords.filter((w) => ACTION_VERBS.has(w)).length;
  const bulletish = Math.max(firstWords.length, 1);

  const sections_found: string[] = [];
  const sections_missing: string[] = [];
  for (const [name, re] of Object.entries(SECTION_PATTERNS)) {
    (re.test(text) ? sections_found : sections_missing).push(name);
  }

  const contact = {
    email: /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text),
    phone: /(\+?\d[\d\s().-]{7,}\d)/.test(text),
    linkedin: /linkedin\.com\/[a-z0-9-]+/i.test(text),
    github: /github\.com\/[a-z0-9-]+/i.test(text),
  };

  const jdTokens = Array.from(new Set(
    tokenize(jd).filter((t) => t.length > 2 && !STOP.has(t))
  ));
  const resumeSet = new Set(words);
  const jd_hits = jdTokens.filter((t) => resumeSet.has(t));
  const jd_misses = jdTokens.filter((t) => !resumeSet.has(t));
  const jd_match_pct = jdTokens.length ? Math.round((jd_hits.length / jdTokens.length) * 100) : 0;

  const hard_skills_found = COMMON_HARD_SKILLS.filter((s) => new RegExp(`(^|[^a-z0-9])${s}([^a-z0-9]|$)`, "i").test(lower));

  const wc = words.length;
  const readability_flag: HeuristicReport["readability_flag"] =
    wc < 200 ? "sparse" : wc > 900 ? "dense" : "clean";

  return {
    word_count: wc,
    bullet_count: bulletCount,
    quantified_bullets: quantified,
    quantified_pct: bulletCount ? Math.round((quantified / bulletCount) * 100) : 0,
    action_verb_pct: Math.round((verbHits / bulletish) * 100),
    sections_found,
    sections_missing,
    contact,
    jd_match_pct,
    jd_hits: jd_hits.slice(0, 40),
    jd_misses: jd_misses.slice(0, 40),
    hard_skills_found,
    readability_flag,
  };
}

const STOP = new Set([
  "the","and","for","with","you","your","our","are","was","were","that","this","from","have","has",
  "will","not","but","any","all","who","what","where","when","why","how","into","out","per","use",
  "using","used","able","team","teams","work","role","roles","job","jobs","etc","and/or","new","old",
  "good","great","must","should","can","may","get","also","across","within","over","under","about",
  "in","on","of","to","a","an","or","as","by","is","be","it","at","we","us","if","so",
  "yrs","yr","year","years","month","months","day","days","week","weeks","full","time","part",
  "candidate","candidates","experience","required","preferred","strong","working","knowledge",
]);

function scoreHeuristic(h: HeuristicReport, hasJd: boolean): { total: number; metrics: Metrics } {
  // Sub-scores (0-100)
  const structure = Math.min(100,
    (h.sections_found.includes("experience") ? 20 : 0) +
    (h.sections_found.includes("education") ? 15 : 0) +
    (h.sections_found.includes("skills") ? 15 : 0) +
    (h.sections_found.includes("projects") ? 15 : 0) +
    (h.sections_found.includes("summary") ? 10 : 0) +
    (h.sections_found.includes("certifications") ? 5 : 0) +
    (h.sections_found.includes("achievements") ? 5 : 0) +
    (Object.values(h.contact).filter(Boolean).length * 3.75)
  );

  const formatting = Math.min(100,
    (h.readability_flag === "clean" ? 55 : h.readability_flag === "dense" ? 30 : 20) +
    (h.bullet_count >= 8 ? 25 : h.bullet_count >= 4 ? 15 : 5) +
    (h.contact.email ? 10 : 0) +
    (h.contact.phone ? 10 : 0)
  );

  const experience = Math.min(100,
    Math.round(h.quantified_pct * 0.55) +
    Math.round(h.action_verb_pct * 0.35) +
    (h.bullet_count >= 6 ? 10 : 0)
  );

  const skills = Math.min(100,
    Math.min(60, h.hard_skills_found.length * 6) +
    (h.sections_found.includes("skills") ? 20 : 0) +
    (hasJd ? Math.round(h.jd_match_pct * 0.2) : 20)
  );

  const keywords = hasJd
    ? h.jd_match_pct
    : Math.min(100, 40 + h.hard_skills_found.length * 4);

  // Weighted blend — mirrors JobScan-style weighting
  const total = Math.round(
    keywords * 0.35 +
    experience * 0.25 +
    skills * 0.15 +
    structure * 0.15 +
    formatting * 0.10
  );

  return { total, metrics: { keywords, formatting, structure, experience, skills } };
}

/* ---------------- AI call ---------------- */

const SYSTEM = `You are a strict ATS (Applicant Tracking System) analyzer used by recruiters at Indian tech companies (SDE, Data, ML, Product).
You score resumes the way Jobscan / Resume Worded / Enhancv do: keyword coverage, quantified impact, section structure, action verbs, parseability.
Be honest and specific. Never invent achievements that aren't in the text.
Return STRICT JSON matching the schema. No prose, no markdown.`;

const SCHEMA_HINT = `{
  "score": number (0-100 overall ATS match, be strict),
  "metrics": { "keywords": number, "formatting": number, "structure": number, "experience": number, "skills": number },
  "missing_keywords": string[]     // 6-12 high-impact keywords absent (technical, tools, frameworks),
  "buzzwords": [{ "term": string, "replacement": string }]  // dead phrases found + concrete rewrite (max 6),
  "strengths": string[]            // 3-5 short bullets,
  "suggestions": string[]          // 5-8 SPECIFIC, ACTIONABLE fixes. Each MUST follow this shape: "[SECTION] concrete problem — Fix: exact rewrite or step". Reference the actual section (Experience, Projects, Skills, Summary, Education, Contact) and quote the offending phrase in single quotes when it exists in the resume. Bad: "Add more metrics." Good: "[Projects] 'Built a chat app' has no scale — Fix: 'Built a real-time chat app in Node.js + Socket.IO serving 50 concurrent users with <150 ms message latency.'",
  "tailored_bullets": string[]     // 3-5 rewritten sample bullets from THIS resume with quantified impact + strong verbs,
  "role_guess": string
}`;

export const analyzeResume = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; jobTarget?: string }) => {
    if (!d || typeof d.text !== "string") throw new Error("text required");
    const text = d.text.trim();
    if (text.length < 50) throw new Error("Resume text too short (min 50 chars).");
    if (text.length > 30000) throw new Error("Resume text too long (max 30k chars).");
    return { text, jobTarget: (d.jobTarget || "").slice(0, 400) };
  })
  .handler(async ({ data }): Promise<AnalysisResult> => {
    // Provider key is validated inside aiChatJSON


    const hasJd = data.jobTarget.trim().length > 0;
    const heuristic = computeHeuristic(data.text, data.jobTarget);
    const hs = scoreHeuristic(heuristic, hasJd);

    const userPrompt = `Target role / JD: ${data.jobTarget || "General SDE / Software Engineer intern & new-grad roles in India"}

Deterministic pre-analysis (trust this — it comes from parsing the actual bytes):
- Word count: ${heuristic.word_count}
- Bullets: ${heuristic.bullet_count} (${heuristic.quantified_pct}% quantified, ${heuristic.action_verb_pct}% start with action verbs)
- Sections found: ${heuristic.sections_found.join(", ") || "none"}
- Sections missing: ${heuristic.sections_missing.join(", ") || "none"}
- Contact: email=${heuristic.contact.email} phone=${heuristic.contact.phone} linkedin=${heuristic.contact.linkedin} github=${heuristic.contact.github}
- Detected hard skills: ${heuristic.hard_skills_found.join(", ") || "none"}
${hasJd ? `- JD keyword match: ${heuristic.jd_match_pct}% (missing: ${heuristic.jd_misses.slice(0, 20).join(", ")})` : ""}

Resume text:
"""
${data.text}
"""

Return JSON exactly matching:
${SCHEMA_HINT}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
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
    let parsed: any;
    try { parsed = JSON.parse(content); }
    catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Model returned non-JSON output");
      parsed = JSON.parse(m[0]);
    }

    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const ai_score = clamp(parsed.score);

    // Blended score: 60% deterministic (grounded) + 40% AI (nuance)
    const blended = Math.round(hs.total * 0.6 + ai_score * 0.4);

    // Blended metrics too
    const blendMetric = (aiVal: unknown, hVal: number) =>
      Math.round(hVal * 0.6 + clamp(aiVal) * 0.4);

    return {
      score: blended,
      ai_score,
      heuristic_score: hs.total,
      metrics: {
        keywords: blendMetric(parsed.metrics?.keywords, hs.metrics.keywords),
        formatting: blendMetric(parsed.metrics?.formatting, hs.metrics.formatting),
        structure: blendMetric(parsed.metrics?.structure, hs.metrics.structure),
        experience: blendMetric(parsed.metrics?.experience, hs.metrics.experience),
        skills: blendMetric(parsed.metrics?.skills, hs.metrics.skills),
      },
      missing_keywords: Array.from(new Set([
        ...(parsed.missing_keywords || []).map(String),
        ...heuristic.jd_misses.slice(0, 8),
      ])).slice(0, 14),
      buzzwords: (parsed.buzzwords || []).slice(0, 8).map((b: any) => ({
        term: String(b?.term ?? ""),
        replacement: String(b?.replacement ?? ""),
      })).filter((b: any) => b.term),
      strengths: (parsed.strengths || []).slice(0, 6).map(String),
      suggestions: (parsed.suggestions || []).slice(0, 8).map(String),
      tailored_bullets: (parsed.tailored_bullets || []).slice(0, 6).map(String),
      role_guess: String(parsed.role_guess ?? ""),
      heuristic,
    };
  });

/* ---------------- Resume Booster (AI rewrite) ---------------- */

const BOOST_SYSTEM = `You are an elite resume writer & ATS optimizer for Indian tech recruiting (SDE, Data, ML, Product).
Rewrite the given resume so it scores 85+ on ATS scanners like Jobscan / Resume Worded / Enhancv, WITHOUT fabricating facts.
Rules:
- Preserve every real fact: names, companies, dates, degrees, GPAs, projects, tools the person actually used.
- You MAY infer stronger action verbs, tighten phrasing, add plausible quantifications ONLY when the original hints at scale (e.g. "many users" -> "1,000+ users" is NOT allowed; but converting "improved speed" using an existing metric IS).
- Weave in missing high-yield keywords from the JD/target role ONLY where they truthfully apply to the candidate's stated experience.
- Kill buzzwords ("hard-working", "team player", "responsible for"), replace with concrete outcomes.
- Use a clean ATS-friendly single-column plain-text layout with clear SECTION HEADERS in ALL CAPS on their own line: CONTACT, SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS, ACHIEVEMENTS. Include only sections that apply.
- Bullets start with "- " and a strong past-tense verb. Aim for 60–70% quantified bullets.
- No tables, no columns, no emojis, no markdown bold/italic — plain text ready to paste into Word or a PDF.
Return STRICT JSON only.`;

const BOOST_SCHEMA = `{
  "rewritten_resume": string,       // full plain-text resume, section headers in ALL CAPS
  "projected_score": number,        // realistic ATS score you expect (0-100)
  "changes": string[],              // 4-8 items. Each MUST be shaped as "[SECTION] Before: 'original phrase' → After: 'new phrase' — Why: one short reason". Reference real sections and quote real substrings from the ORIGINAL resume so the user can find them.
  "keywords_added": string[]        // technical keywords you truthfully wove in
}`;

export type BoostResult = {
  rewritten_resume: string;
  projected_score: number;
  changes: string[];
  keywords_added: string[];
};

export const boostResume = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; jobTarget?: string; missingKeywords?: string[] }) => {
    if (!d || typeof d.text !== "string") throw new Error("text required");
    const text = d.text.trim();
    if (text.length < 50) throw new Error("Resume text too short (min 50 chars).");
    if (text.length > 30000) throw new Error("Resume text too long (max 30k chars).");
    return {
      text,
      jobTarget: (d.jobTarget || "").slice(0, 400),
      missingKeywords: (d.missingKeywords || []).slice(0, 20).map(String),
    };
  })
  .handler(async ({ data }): Promise<BoostResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");

    const userPrompt = `Target role / JD: ${data.jobTarget || "General SDE / Software Engineer roles in India"}
${data.missingKeywords.length ? `High-yield keywords to weave in truthfully where they apply: ${data.missingKeywords.join(", ")}` : ""}

Original resume:
"""
${data.text}
"""

Return JSON exactly matching:
${BOOST_SCHEMA}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: BOOST_SYSTEM },
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
    let parsed: any;
    try { parsed = JSON.parse(content); }
    catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Model returned non-JSON output");
      parsed = JSON.parse(m[0]);
    }

    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    return {
      rewritten_resume: String(parsed.rewritten_resume ?? "").trim(),
      projected_score: clamp(parsed.projected_score),
      changes: (parsed.changes || []).slice(0, 10).map(String),
      keywords_added: (parsed.keywords_added || []).slice(0, 20).map(String),
    };
  });
