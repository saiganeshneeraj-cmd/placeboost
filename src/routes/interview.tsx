import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft, Upload, FileText, Loader2, CircleAlert, Sparkles, Target,
  Brain, MessageSquare, Code2, Layers, Copy, Check, X, ChevronDown, ChevronRight,
} from "lucide-react";
import { generateInterviewPack, type InterviewPack, type InterviewQuestion } from "@/lib/coach.functions";

export const Route = createFileRoute("/interview")({
  head: () => ({
    meta: [
      { title: "Interview Prep Pack — PlaceBoost" },
      { name: "description", content: "AI-generated technical + behavioral questions, STAR answers, and DSA topics targeted to your resume." },
    ],
  }),
  component: InterviewPage,
});

async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
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

const catIcon = (c: InterviewQuestion["category"]) => {
  if (c === "behavioral") return <MessageSquare className="h-3.5 w-3.5" />;
  if (c === "system-design") return <Layers className="h-3.5 w-3.5" />;
  if (c === "role-specific") return <Target className="h-3.5 w-3.5" />;
  return <Code2 className="h-3.5 w-3.5" />;
};

const diffColor = (d: InterviewQuestion["difficulty"]) =>
  d === "easy" ? "text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10"
  : d === "hard" ? "text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10"
  : "text-[#F5B942] border-[#F5B942]/40 bg-[#F5B942]/10";

const prioColor = (p: "must" | "should" | "nice") =>
  p === "must" ? "text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10"
  : p === "should" ? "text-[#F5B942] border-[#F5B942]/40 bg-[#F5B942]/10"
  : "text-white/60 border-white/15 bg-white/5";

function InterviewPage() {
  const runPack = useServerFn(generateInterviewPack);
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [jobTarget, setJobTarget] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<InterviewPack | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const onFile = useCallback(async (f: File) => {
    setError(null);
    if (f.size > 8 * 1024 * 1024) { setError(`${f.name} is too large (max 8 MB).`); return; }
    setFileName(f.name);
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      setExtracting(true);
      try {
        const t = await extractPdfText(f);
        if (!t || t.length < 50) throw new Error("Couldn't extract text — is this a scanned PDF?");
        setText(t);
      } catch (e: any) { setError(e?.message || "PDF extraction failed"); }
      finally { setExtracting(false); }
    } else if (f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name)) {
      setText(await f.text());
    } else setError("Upload a PDF or .txt file, or paste text.");
  }, []);

  const run = async () => {
    setLoading(true); setError(null); setPack(null); setOpen({});
    try {
      const r = await runPack({ data: { resume: text.trim(), jobTarget: jobTarget.trim() } });
      setPack(r);
    } catch (e: any) { setError(e?.message || "Failed to generate pack"); }
    finally { setLoading(false); }
  };

  const copy = (id: string, txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(id); setTimeout(() => setCopied(null), 1400);
  };

  const canRun = text.trim().length >= 50 && !loading && !extracting;

  return (
    <div className="min-h-screen text-white">
      <div className="cosmic-bg" />
      <div className="cosmic-noise" />

      <header className="mx-auto mt-4 flex w-[min(1240px,95%)] items-center justify-between glass px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-sm text-white/75 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="font-display text-sm font-semibold">Interview <span className="neon-text">Prep Pack</span></div>
        <div className="w-24" />
      </header>

      <main className="mx-auto grid w-[min(1240px,95%)] grid-cols-1 gap-6 pb-20 pt-8 lg:grid-cols-12">
        <section className="lg:col-span-5 space-y-4">
          <div className="glass-strong p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-base font-semibold">Your resume</div>
              <div className="flex items-center gap-2">
                {fileName && (
                  <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                    <FileText className="h-3 w-3" /> {fileName}
                    <button onClick={() => { setFileName(null); setText(""); }} className="ml-1 text-white/50 hover:text-white"><X className="h-3 w-3" /></button>
                  </span>
                )}
                <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:border-[#38BDF8]/50">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
                <input ref={fileRef} type="file" accept=".pdf,.txt,.md" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={extracting ? "Extracting PDF…" : "Paste your resume text here, or upload a PDF."}
              disabled={extracting}
              className="min-h-[280px] w-full resize-y rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-sm leading-relaxed text-white/90 outline-none placeholder:text-white/35"
            />
          </div>

          <div className="glass p-4">
            <label className="mb-2 block text-xs uppercase tracking-widest text-white/55">
              <Target className="mr-1 inline h-3 w-3 text-[#38BDF8]" /> Target role / JD <span className="text-white/40">(optional but recommended)</span>
            </label>
            <input
              value={jobTarget} onChange={(e) => setJobTarget(e.target.value)}
              placeholder="e.g. Backend SDE — Node.js, PostgreSQL, AWS, system design"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#38BDF8]/60"
            />
          </div>

          {error && (
            <div className="glass flex items-start gap-2 border border-red-500/30 p-3 text-sm text-red-200">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <button onClick={run} disabled={!canRun}
            className="pill pill-hover w-full justify-center py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Brain className="h-5 w-5" />}
            {loading ? "Generating prep pack…" : pack ? "Regenerate pack" : "Generate interview pack"}
          </button>
          <div className="text-center text-[11px] text-white/40">
            {text.trim().length < 50 ? `Add ${50 - text.trim().length} more chars` : "10-14 tailored questions · STAR answers · DSA topics"}
          </div>
        </section>

        <section className="lg:col-span-7 space-y-4">
          {!pack && !loading && (
            <div className="glass-strong flex min-h-[500px] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E3A8A]/60 to-[#38BDF8]/50 neon-ring">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div className="font-display text-lg font-semibold">Ready to grill you</div>
              <p className="max-w-sm text-sm text-white/60">
                Paste your resume and a target role. You'll get behavioral + technical questions the interviewer will actually ask,
                model STAR answers, DSA topics ranked by ROI, and the exact gaps to plug.
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-strong flex min-h-[500px] flex-col items-center justify-center gap-3 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#38BDF8]" />
              <div className="font-display text-sm text-white/80">Building your pack…</div>
              <div className="text-xs text-white/50">Probing resume · matching to role · drafting answers</div>
            </div>
          )}

          {pack && (
            <>
              <div className="glass-strong p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/50">Interviewer's read</div>
                    <div className="mt-0.5 font-display text-lg font-semibold neon-text">{pack.role}</div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">{pack.questions.length} questions</span>
                </div>
                <p className="mt-2 text-sm text-white/75">{pack.summary}</p>
                {pack.focus_areas.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {pack.focus_areas.map((f) => (
                      <span key={f} className="rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-2 py-0.5 text-[11px] text-white/90">{f}</span>
                    ))}
                  </div>
                )}
              </div>

              {pack.quick_wins.length > 0 && (
                <div className="glass p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                    <Sparkles className="h-3.5 w-3.5 text-[#22C55E]" /> Quick wins (2-3 day ROI)
                  </div>
                  <ul className="space-y-1.5">
                    {pack.quick_wins.map((q) => (
                      <li key={q} className="flex items-start gap-2 text-sm text-white/85">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]" /> {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pack.red_flags.length > 0 && (
                <div className="glass p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                    <CircleAlert className="h-3.5 w-3.5 text-[#F5B942]" /> Red flags they'll drill
                  </div>
                  <ul className="space-y-1.5">
                    {pack.red_flags.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm text-white/80">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5B942]" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pack.dsa_topics.length > 0 && (
                <div className="glass p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                    <Code2 className="h-3.5 w-3.5 text-[#38BDF8]" /> DSA topics to revise
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {pack.dsa_topics.map((t) => (
                      <div key={t.topic} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <div>
                          <div className="text-sm font-medium text-white">{t.topic}</div>
                          <div className="text-[11px] text-white/55">{t.leetcode_pattern}</div>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${prioColor(t.priority)}`}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pack.system_design.length > 0 && (
                <div className="glass p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                    <Layers className="h-3.5 w-3.5 text-[#38BDF8]" /> Likely system-design prompts
                  </div>
                  <ul className="space-y-1.5">
                    {pack.system_design.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-sm text-white/80">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#38BDF8]" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="glass-strong p-4">
                <div className="mb-3 font-display text-sm font-semibold">Questions & model answers</div>
                <div className="space-y-2">
                  {pack.questions.map((q, i) => {
                    const isOpen = !!open[i];
                    return (
                      <div key={i} className="rounded-xl border border-white/10 bg-black/20">
                        <button onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))} className="flex w-full items-start gap-3 p-3 text-left">
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/70">
                            {catIcon(q.category)} {q.category}
                          </span>
                          <span className={`mt-0.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${diffColor(q.difficulty)}`}>{q.difficulty}</span>
                          <span className="flex-1 text-sm text-white/90">{q.question}</span>
                          {isOpen ? <ChevronDown className="mt-1 h-4 w-4 text-white/50" /> : <ChevronRight className="mt-1 h-4 w-4 text-white/50" />}
                        </button>
                        {isOpen && (
                          <div className="border-t border-white/5 p-3 pt-2 space-y-2">
                            {q.why_asked && <div className="text-[11px] italic text-white/55">Why: {q.why_asked}</div>}
                            <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
                              <div className="mb-1 flex items-center justify-between">
                                <div className="text-[10px] uppercase tracking-widest text-white/55">Model answer</div>
                                <button onClick={() => copy(`a-${i}`, q.model_answer)} className="inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white">
                                  {copied === `a-${i}` ? <Check className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
                                  {copied === `a-${i}` ? "Copied" : "Copy"}
                                </button>
                              </div>
                              <div className="text-sm text-white/85 whitespace-pre-wrap">{q.model_answer}</div>
                            </div>
                            {q.key_points.length > 0 && (
                              <div>
                                <div className="mb-1 text-[10px] uppercase tracking-widest text-white/55">Must-hit checklist</div>
                                <ul className="space-y-1">
                                  {q.key_points.map((kp, j) => (
                                    <li key={j} className="flex items-start gap-2 text-xs text-white/80">
                                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#38BDF8]" /> {kp}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
