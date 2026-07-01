import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Upload, FileText, Sparkles, CircleAlert, CheckCircle2,
  Loader2, Wand2, Target, X, Download, Copy, Check, Mail, Phone, Linkedin, Github,
} from "lucide-react";
import { analyzeResume, type AnalysisResult } from "@/lib/resume.functions";
import { downloadAnalysisPdf } from "@/lib/report-pdf";

export const Route = createFileRoute("/sandbox")({
  head: () => ({
    meta: [
      { title: "Resume Sandbox — PlaceBoost" },
      { name: "description", content: "Paste or upload a resume for instant AI ATS scoring, metric breakdown, and keyword flagging." },
    ],
  }),
  component: Sandbox,
});

/* ----------------------------- PDF extraction ----------------------------- */
async function extractPdfText(file: File): Promise<string> {
  // Dynamic import so pdfjs only loads when needed
  const pdfjs: any = await import(/* @vite-ignore */ "pdfjs-dist/build/pdf.mjs" as string);
  // Use worker from CDN matching version to avoid bundler wiring
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => it.str).join(" ") + "\n\n";
  }
  return out.trim();
}

/* --------------------------------- Gauge ---------------------------------- */
function ScoreGauge({ value }: { value: number }) {
  const size = 200, stroke = 14, r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now(); const from = display; const to = value;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const offset = c - (display / 100) * c;
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="pulse-glow -rotate-90">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4D9CFF" />
            <stop offset="50%" stopColor="#7A5CFF" />
            <stop offset="100%" stopColor="#E000FF" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} className="fill-none stroke-white/10" />
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} strokeLinecap="round"
          stroke="url(#g)" fill="none" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 200ms linear" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-bold neon-text">{display}</div>
        <div className="mt-1 text-xs uppercase tracking-widest text-white/60">ATS Match</div>
      </div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(value)); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-sm text-white/80">{label}</div>
        <div className="font-display text-sm font-semibold">{value}<span className="text-white/40">/100</span></div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full border border-white/10 bg-white/5">
        <div className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{ width: `${w}%`, background: "linear-gradient(90deg,#4D9CFF,#7A5CFF 50%,#E000FF)", boxShadow: "0 0 20px rgba(122,92,255,0.5)" }} />
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */
function Sandbox() {
  const analyze = useServerFn(analyzeResume);
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [jobTarget, setJobTarget] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const canRun = text.trim().length >= 50 && !loading && !extracting;
  const charCount = text.length;

  const onFile = useCallback(async (f: File) => {
    setError(null);
    if (f.size > 8 * 1024 * 1024) { setError("File too large (max 8MB)."); return; }
    setFileName(f.name);
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
      setExtracting(true);
      try {
        const t = await extractPdfText(f);
        if (!t || t.length < 50) throw new Error("Couldn't extract text — this PDF may be scanned images.");
        setText(t);
      } catch (e: any) {
        setError(e?.message || "PDF extraction failed");
      } finally { setExtracting(false); }
    } else if (f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name)) {
      setText(await f.text());
    } else {
      setError("Unsupported file type. Use PDF or paste text.");
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await analyze({ data: { text: text.trim(), jobTarget: jobTarget.trim() } });
      setResult(r);
    } catch (e: any) {
      setError(e?.message || "Analysis failed");
    } finally { setLoading(false); }
  };

  const clear = () => { setText(""); setFileName(null); setResult(null); setError(null); };

  return (
    <div className="min-h-screen text-white">
      <div className="cosmic-bg" />
      <div className="cosmic-noise" />

      <header className="mx-auto mt-4 flex w-[min(1240px,95%)] items-center justify-between glass px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-sm text-white/75 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="font-display text-sm font-semibold">
          Resume <span className="neon-text">Sandbox</span>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={() => downloadAnalysisPdf(result, { fileName, jobTarget })}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/90 transition hover:border-[#7A5CFF]/60 hover:bg-white/10"
              title="Download PDF report"
            >
              <Download className="h-3.5 w-3.5" /> Report
            </button>
          )}
          <button
            onClick={run}
            disabled={!canRun}
            className="pill pill-hover text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-[min(1240px,95%)] grid-cols-1 gap-6 pb-20 pt-8 lg:grid-cols-12">
        {/* INPUT */}
        <section className="lg:col-span-7 space-y-4">
          <div className="glass-strong p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-base font-semibold">Your resume</div>
              <div className="flex items-center gap-2">
                {fileName && (
                  <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                    <FileText className="h-3 w-3" /> {fileName}
                    <button onClick={clear} className="ml-1 text-white/50 hover:text-white"><X className="h-3 w-3" /></button>
                  </span>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/85 transition hover:border-[#E000FF]/50"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload PDF
                </button>
                <input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="relative rounded-xl border border-dashed border-white/15 bg-black/20"
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={extracting ? "Extracting text from PDF…" : "Paste your resume text here, or drop a PDF anywhere on this box."}
                disabled={extracting}
                className="min-h-[340px] w-full resize-y rounded-xl bg-transparent p-4 text-sm leading-relaxed text-white/90 outline-none placeholder:text-white/35"
              />
              {extracting && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Loader2 className="h-4 w-4 animate-spin" /> Extracting PDF…
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
              <span>Min 50 chars · PDFs are parsed in your browser (never uploaded raw)</span>
              <span>{charCount.toLocaleString()} chars</span>
            </div>
          </div>

          <div className="glass p-4">
            <label className="mb-2 block text-xs uppercase tracking-widest text-white/55">
              <Target className="mr-1 inline h-3 w-3 text-[#E000FF]" /> Target role or JD keywords <span className="text-white/40">(optional)</span>
            </label>
            <input
              value={jobTarget}
              onChange={(e) => setJobTarget(e.target.value)}
              placeholder="e.g. Backend SDE intern — Node.js, PostgreSQL, AWS, system design"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-[#7A5CFF]/60"
            />
          </div>

          {error && (
            <div className="glass flex items-start gap-2 border border-red-500/30 p-3 text-sm text-red-200">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </section>

        {/* RESULTS */}
        <section className="lg:col-span-5 space-y-4">
          {!result && !loading && (
            <div className="glass-strong flex min-h-[500px] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4D00FF]/40 to-[#E000FF]/40 neon-ring">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div className="font-display text-lg font-semibold">Ready when you are</div>
              <p className="max-w-sm text-sm text-white/60">
                Paste or upload a resume, add a target role, then hit Analyze. You'll get a real ATS score,
                metric breakdown, dead-buzzword sweep, and missing high-yield keywords.
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-strong flex min-h-[500px] flex-col items-center justify-center gap-3 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#E000FF]" />
              <div className="font-display text-sm text-white/80">Running ATS pass…</div>
              <div className="text-xs text-white/50">Scoring keywords, structure, and impact</div>
            </div>
          )}

          {result && (
            <>
              <div className="glass-strong p-5">
                <div className="flex flex-col items-center gap-6 md:flex-row">
                  <ScoreGauge value={result.score} />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display text-base font-semibold">Metric breakdown</div>
                      {result.role_guess && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-widest text-white/70">
                          {result.role_guess}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/70">
                        Rules <b className="ml-1 text-white">{result.heuristic_score}</b>
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/70">
                        AI <b className="ml-1 text-white">{result.ai_score}</b>
                      </span>
                      <span className="rounded-full border border-[#7A5CFF]/40 bg-[#7A5CFF]/10 px-2 py-0.5 text-white">
                        Blended <b className="ml-1">{result.score}</b>
                      </span>
                    </div>
                    <Bar label="Keywords" value={result.metrics.keywords} />
                    <Bar label="Formatting" value={result.metrics.formatting} />
                    <Bar label="Structure" value={result.metrics.structure} />
                    <Bar label="Experience" value={result.metrics.experience} />
                    <Bar label="Skills" value={result.metrics.skills} />
                  </div>
                </div>
              </div>

              {/* Deterministic report */}
              <div className="glass p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-white/55">Deterministic scan</div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                    result.heuristic.readability_flag === "clean" ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]" :
                    result.heuristic.readability_flag === "dense" ? "border-[#F5B942]/40 bg-[#F5B942]/10 text-[#F5B942]" :
                    "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]"
                  }`}>{result.heuristic.readability_flag} · {result.heuristic.word_count} words</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Stat label="Bullets" value={String(result.heuristic.bullet_count)} />
                  <Stat label="Quantified" value={`${result.heuristic.quantified_pct}%`} />
                  <Stat label="Action verbs" value={`${result.heuristic.action_verb_pct}%`} />
                  <Stat label="Hard skills" value={String(result.heuristic.hard_skills_found.length)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(["contact","summary","education","experience","projects","skills","certifications","achievements"] as const).map((s) => {
                    const found = result.heuristic.sections_found.includes(s);
                    return (
                      <span key={s} className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${found ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]" : "border-white/10 bg-white/5 text-white/40 line-through"}`}>
                        {s}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/70">
                  <ContactChip ok={result.heuristic.contact.email} icon={<Mail className="h-3 w-3" />} label="Email" />
                  <ContactChip ok={result.heuristic.contact.phone} icon={<Phone className="h-3 w-3" />} label="Phone" />
                  <ContactChip ok={result.heuristic.contact.linkedin} icon={<Linkedin className="h-3 w-3" />} label="LinkedIn" />
                  <ContactChip ok={result.heuristic.contact.github} icon={<Github className="h-3 w-3" />} label="GitHub" />
                </div>
                {jobTarget.trim().length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="text-white/60">JD keyword match</span>
                      <span className="font-display font-semibold">{result.heuristic.jd_match_pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full" style={{ width: `${result.heuristic.jd_match_pct}%`, background: "linear-gradient(90deg,#4D9CFF,#E000FF)" }} />
                    </div>
                    <div className="mt-2 text-[11px] text-white/50">
                      {result.heuristic.jd_hits.length} hits · {result.heuristic.jd_misses.length} misses
                    </div>
                  </div>
                )}
              </div>

              {result.missing_keywords.length > 0 && (
                <div className="glass p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                    <Sparkles className="h-3.5 w-3.5 text-[#7A5CFF]" /> Missing high-yield keywords
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_keywords.map((k) => (
                      <span key={k} className="rounded-full border border-[#7A5CFF]/40 bg-[#7A5CFF]/10 px-3 py-1 text-xs text-white/90">
                        + {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.buzzwords.length > 0 && (
                <div className="glass p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                    <CircleAlert className="h-3.5 w-3.5 text-[#F5B942]" /> Dead buzzwords → replacements
                  </div>
                  <ul className="space-y-1.5">
                    {result.buzzwords.map((b) => (
                      <li key={b.term} className="flex items-center gap-2 text-sm">
                        <span className="rounded-full border border-[#F5B942]/40 bg-[#F5B942]/10 px-2 py-0.5 text-xs text-[#F5B942] line-through">{b.term}</span>
                        <span className="text-white/40">→</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/90">{b.replacement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestions.length > 0 && (
                <div className="glass p-4">
                  <div className="mb-2 text-xs uppercase tracking-widest text-white/55">Suggested fixes</div>
                  <ul className="space-y-1.5">
                    {result.suggestions.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-sm text-white/80">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7A5CFF]" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.strengths.length > 0 && (
                <div className="glass p-4">
                  <div className="mb-2 text-xs uppercase tracking-widest text-white/55">Strengths</div>
                  <ul className="space-y-1.5">
                    {result.strengths.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-sm text-white/80">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4D9CFF]" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
