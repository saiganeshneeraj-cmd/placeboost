import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft, Upload, FileText, Loader2, CircleAlert, Target,
  TrendingUp, TrendingDown, Sparkles, Trophy, Building2, X,
} from "lucide-react";
import { predictPlacement, type PlacementPrediction } from "@/lib/coach.functions";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Placement Probability — PlaceBoost" },
      { name: "description", content: "Predict shortlist odds for FAANG / product / service companies and expected CTC range in INR from your resume." },
    ],
  }),
  component: PredictPage,
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

function probColor(p: number) {
  if (p >= 60) return "from-[#22C55E] to-[#38BDF8]";
  if (p >= 30) return "from-[#F5B942] to-[#38BDF8]";
  return "from-[#EF4444] to-[#F5B942]";
}

function ProbRing({ value }: { value: number }) {
  const size = 90, stroke = 8, r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`p-${value}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-white/10" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round"
          stroke={`url(#p-${value})`} fill="none" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-xl font-bold text-white">{value}%</div>
      </div>
    </div>
  );
}

function PredictPage() {
  const runPredict = useServerFn(predictPlacement);
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [collegeTier, setCollegeTier] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [locationPref, setLocationPref] = useState("");
  const [yoe, setYoe] = useState("0");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementPrediction | null>(null);

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
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await runPredict({
        data: {
          resume: text.trim(),
          college_tier: collegeTier || undefined,
          cgpa: cgpa ? Number(cgpa) : undefined,
          target_role: targetRole || undefined,
          location_pref: locationPref || undefined,
          yoe: Number(yoe) || 0,
        },
      });
      setResult(r);
    } catch (e: any) { setError(e?.message || "Prediction failed"); }
    finally { setLoading(false); }
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
        <div className="font-display text-sm font-semibold">Placement <span className="neon-text">Predictor</span></div>
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
              value={text} onChange={(e) => setText(e.target.value)}
              placeholder={extracting ? "Extracting PDF…" : "Paste your resume text here, or upload a PDF."}
              disabled={extracting}
              className="min-h-[220px] w-full resize-y rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-sm leading-relaxed text-white/90 outline-none placeholder:text-white/35"
            />
          </div>

          <div className="glass p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-white/55">
              <Target className="mr-1 inline h-3 w-3 text-[#38BDF8]" /> Profile signals
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] text-white/55">College tier</label>
                <select value={collegeTier} onChange={(e) => setCollegeTier(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#38BDF8]/60">
                  <option value="">Select…</option>
                  <option>IIT / NIT / IIIT / BITS</option>
                  <option>Tier-1 private (VIT, SRM, Manipal, etc.)</option>
                  <option>Tier-2 (state / autonomous)</option>
                  <option>Tier-3</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-white/55">CGPA (0-10)</label>
                <input value={cgpa} onChange={(e) => setCgpa(e.target.value)} type="number" step="0.01" min="0" max="10"
                  placeholder="e.g. 8.4"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#38BDF8]/60" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-white/55">Years of experience</label>
                <input value={yoe} onChange={(e) => setYoe(e.target.value)} type="number" min="0" max="20"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#38BDF8]/60" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-white/55">Location preference</label>
                <input value={locationPref} onChange={(e) => setLocationPref(e.target.value)}
                  placeholder="Bangalore / Remote / anywhere"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#38BDF8]/60" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-white/55">Target role</label>
              <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Backend SDE-1, ML Engineer, Data Analyst"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#38BDF8]/60" />
            </div>
          </div>

          {error && (
            <div className="glass flex items-start gap-2 border border-red-500/30 p-3 text-sm text-red-200">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <button onClick={run} disabled={!canRun}
            className="pill pill-hover w-full justify-center py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trophy className="h-5 w-5" />}
            {loading ? "Crunching numbers…" : result ? "Re-predict" : "Predict my placement"}
          </button>
          <div className="text-center text-[11px] text-white/40">
            {text.trim().length < 50 ? `Add ${50 - text.trim().length} more chars` : "AI grounded in current Indian market ranges (INR)"}
          </div>
        </section>

        <section className="lg:col-span-7 space-y-4">
          {!result && !loading && (
            <div className="glass-strong flex min-h-[500px] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E3A8A]/60 to-[#38BDF8]/50 neon-ring">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div className="font-display text-lg font-semibold">Where do you actually stand?</div>
              <p className="max-w-sm text-sm text-white/60">
                Get honest shortlist odds and CTC ranges across FAANG, top product, mid-tier, and service companies —
                with the exact action items to move up a tier.
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-strong flex min-h-[500px] flex-col items-center justify-center gap-3 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#38BDF8]" />
              <div className="font-display text-sm text-white/80">Modelling your profile…</div>
            </div>
          )}

          {result && (
            <>
              <div className="glass-strong p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-widest text-white/50">Overall readiness</div>
                    <div className="mt-1 font-display text-3xl font-bold neon-text">{result.overall_readiness}<span className="text-lg text-white/40">/100</span></div>
                    <p className="mt-2 text-sm text-white/80">{result.headline}</p>
                  </div>
                  <ProbRing value={result.overall_readiness} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {result.strongest_signals.length > 0 && (
                  <div className="glass p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                      <TrendingUp className="h-3.5 w-3.5 text-[#22C55E]" /> Strengths
                    </div>
                    <ul className="space-y-1.5">
                      {result.strongest_signals.map((s) => (
                        <li key={s} className="flex items-start gap-2 text-sm text-white/85">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.weakest_signals.length > 0 && (
                  <div className="glass p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                      <TrendingDown className="h-3.5 w-3.5 text-[#F5B942]" /> Weak spots
                    </div>
                    <ul className="space-y-1.5">
                      {result.weakest_signals.map((s) => (
                        <li key={s} className="flex items-start gap-2 text-sm text-white/80">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5B942]" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {result.buckets.map((b) => (
                  <div key={b.tier} className="glass-strong overflow-hidden p-0">
                    <div className={`h-1 w-full bg-gradient-to-r ${probColor(b.probability)}`} />
                    <div className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                            <Building2 className="h-4 w-4 text-[#BAE6FD]" />
                          </div>
                          <div>
                            <div className="font-display text-base font-semibold text-white">{b.tier}</div>
                            <div className="mt-0.5 text-xs text-white/60">{b.companies.slice(0, 6).join(" · ")}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-widest text-white/50">CTC</div>
                            <div className="font-display text-base font-bold text-white">₹{b.ctc_min_lpa}–{b.ctc_max_lpa} <span className="text-xs text-white/50">LPA</span></div>
                          </div>
                          <ProbRing value={b.probability} />
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-white/75">{b.reasoning}</p>
                      {b.action_items.length > 0 && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/55">
                            <Sparkles className="h-3 w-3 text-[#38BDF8]" /> To improve odds
                          </div>
                          <ul className="space-y-1">
                            {b.action_items.map((a) => (
                              <li key={a} className="flex items-start gap-2 text-xs text-white/80">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#38BDF8]" /> {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {result.timeline_advice && (
                <div className="glass p-4">
                  <div className="mb-1 text-xs uppercase tracking-widest text-white/55">Timeline advice</div>
                  <p className="text-sm text-white/85">{result.timeline_advice}</p>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
