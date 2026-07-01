import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText, Map as MapIcon, LineChart, Wand2, Sparkles, Github, Rocket,
  CircleAlert, CheckCircle2, ArrowRight, Zap, Target, Trophy, Cpu,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlaceBoost — AI Placement Copilot for Students" },
      { name: "description", content: "Real-time ATS scoring, gamified skill roadmap, and placement prediction. Built for students who ship." },
      { property: "og:title", content: "PlaceBoost — AI Placement Copilot" },
      { property: "og:description", content: "Real-time ATS scoring, gamified skill roadmap, and placement prediction." },
    ],
  }),
  component: Dashboard,
});

/* -------------------------- Cursor-reactive aurora -------------------------- */
function AuroraBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return (
    <>
      <div className="cosmic-bg" />
      <div className="cosmic-noise" />
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[1]"
        style={{
          background:
            "radial-gradient(600px 600px at var(--mx,50%) var(--my,50%), rgba(224,0,255,0.18), transparent 60%)",
          transition: "background 200ms ease",
        }}
      />
    </>
  );
}

/* --------------------------------- Header --------------------------------- */
function Header() {
  const nav = [
    { icon: FileText, label: "Resume" },
    { icon: MapIcon, label: "Roadmap" },
    { icon: LineChart, label: "Prediction" },
    { icon: Wand2, label: "Builder" },
  ];
  return (
    <header className="sticky top-4 z-30 mx-auto mt-4 flex w-[min(1240px,95%)] items-center justify-between glass px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4D00FF] to-[#E000FF] neon-ring">
          <Rocket className="h-4 w-4 text-white" />
        </div>
        <div className="font-display text-lg font-semibold tracking-tight">
          Place<span className="neon-text">Boost</span>
          <span className="ml-2 rounded-full border border-white/10 px-2 py-[2px] text-[10px] font-medium text-white/70">v2.0</span>
        </div>
      </div>
      <nav className="hidden items-center gap-1 md:flex">
        {nav.map(({ icon: Icon, label }) => (
          <button key={label} className="group flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">
            <Icon className="h-4 w-4 text-[#a78bfa] transition group-hover:text-[#E000FF]" />
            {label}
          </button>
        ))}
      </nav>
      <Link to="/sandbox" className="pill pill-hover text-sm">
        <Sparkles className="h-4 w-4" /> Launch Analysis
      </Link>
    </header>
  );
}

/* ------------------------------ Circular gauge ---------------------------- */
function ScoreGauge({ value }: { value: number }) {
  const size = 220, stroke = 14, r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = display; const to = value;
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
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4D9CFF" />
            <stop offset="50%" stopColor="#7A5CFF" />
            <stop offset="100%" stopColor="#E000FF" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} className="fill-none stroke-white/10" />
        <circle
          cx={size/2} cy={size/2} r={r} strokeWidth={stroke}
          strokeLinecap="round" stroke="url(#gauge)" fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 200ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-bold neon-text">{display}</div>
        <div className="mt-1 text-xs uppercase tracking-widest text-white/60">ATS Match</div>
      </div>
    </div>
  );
}

/* ---------------------------- Metric bar (glass) --------------------------- */
function MetricBar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <div className="text-sm text-white/80">{label}</div>
        <div className="font-display text-sm font-semibold text-white">{value}<span className="text-white/40">/100</span></div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full border border-white/10 bg-white/5">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{
            width: `${w}%`,
            background: "linear-gradient(90deg,#4D9CFF,#7A5CFF 50%,#E000FF)",
            boxShadow: "0 0 20px rgba(122,92,255,0.5)",
          }}
        />
      </div>
      {hint && <div className="mt-1 text-[11px] text-white/45">{hint}</div>}
    </div>
  );
}

/* --------------------------- Roadmap node path ---------------------------- */
type Phase = { id: string; title: string; sub: string; items: string[]; state: "done" | "active" | "pending" };
function Roadmap({ phases, active, onHover }: { phases: Phase[]; active: string | null; onHover: (id: string | null) => void }) {
  return (
    <div className="relative">
      <svg viewBox="0 0 600 140" className="w-full">
        <defs>
          <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4D9CFF" />
            <stop offset="60%" stopColor="#7A5CFF" />
            <stop offset="100%" stopColor="#E000FF" />
          </linearGradient>
        </defs>
        <path d="M40 90 C 160 20, 260 140, 360 60 S 540 100, 560 50" fill="none" stroke="url(#pathGrad)" strokeWidth="2" strokeDasharray="4 6" opacity="0.55"/>
        {[{x:40,y:90,id:phases[0].id},{x:300,y:70,id:phases[1].id},{x:560,y:50,id:phases[2].id}].map((n, i) => {
          const p = phases[i];
          const isActive = active === n.id;
          const color = p.state === "done" ? "#4D9CFF" : p.state === "active" ? "#E000FF" : "#7A5CFF";
          return (
            <g key={n.id} onMouseEnter={() => onHover(n.id)} onMouseLeave={() => onHover(null)} style={{ cursor: "pointer" }}>
              <circle cx={n.x} cy={n.y} r={isActive ? 20 : 14} fill={color} opacity="0.15" />
              <circle cx={n.x} cy={n.y} r="9" fill={color} style={{ filter: `drop-shadow(0 0 ${isActive ? 14 : 6}px ${color})`, transition: "all .25s" }} />
              <text x={n.x} y={n.y + 32} textAnchor="middle" className="fill-white/80" fontSize="11">Phase {i+1}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {phases.map((p) => {
          const isActive = active === p.id;
          return (
            <div
              key={p.id}
              onMouseEnter={() => onHover(p.id)}
              onMouseLeave={() => onHover(null)}
              className={`glass p-3 transition ${isActive ? "neon-ring -translate-y-0.5" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${p.state === "done" ? "bg-[#4D9CFF]" : p.state === "active" ? "bg-[#E000FF]" : "bg-white/40"}`} />
                <div className="text-xs uppercase tracking-widest text-white/60">{p.sub}</div>
              </div>
              <div className="mt-1 font-display text-sm font-semibold">{p.title}</div>
              <ul className="mt-2 space-y-1">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-[12px] text-white/70">
                    <CheckCircle2 className="mt-[2px] h-3 w-3 text-[#7A5CFF]" /> {it}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- Arc gauge (probability) ---------------------- */
function ArcGauge({ value, label, sub }: { value: number; label: string; sub: string }) {
  // 0-100 mapped over 180deg arc
  const size = 180, stroke = 12;
  const r = (size - stroke) / 2;
  const c = Math.PI * r; // half circle
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
    <div className="glass p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/60">{label}</div>
        <Zap className="h-4 w-4 text-[#E000FF]" />
      </div>
      <div className="relative mx-auto" style={{ width: size, height: size / 2 + 20 }}>
        <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
          <defs>
            <linearGradient id={`arc-${label}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4D9CFF" />
              <stop offset="100%" stopColor="#E000FF" />
            </linearGradient>
          </defs>
          <path d={`M ${stroke/2} ${size/2} A ${r} ${r} 0 0 1 ${size - stroke/2} ${size/2}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} strokeLinecap="round"/>
          <path
            d={`M ${stroke/2} ${size/2} A ${r} ${r} 0 0 1 ${size - stroke/2} ${size/2}`}
            fill="none" stroke={`url(#arc-${label})`} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <div className="font-display text-3xl font-bold neon-text">{display}%</div>
          <div className="text-[11px] text-white/55">{sub}</div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Package range dial --------------------------- */
function PackageDial({ score }: { score: number }) {
  // Map score → LPA range
  const min = Math.round(4 + (score / 100) * 6); // 4-10
  const max = Math.round(8 + (score / 100) * 22); // 8-30
  const pct = score;
  return (
    <div className="glass p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/60">Expected Package</div>
        <Trophy className="h-4 w-4 text-[#E000FF]" />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="font-display text-3xl font-bold neon-text">₹{min}–{max}</div>
        <div className="text-sm text-white/60">LPA</div>
      </div>
      <div className="mt-4 h-2 rounded-full border border-white/10 bg-white/5">
        <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#4D9CFF,#E000FF)" }}/>
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-white/45">
        <span>Entry</span><span>Mid</span><span>Top-tier</span>
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */
function Dashboard() {
  const [keywords, setKeywords] = useState(72);
  const [format, setFormat] = useState(84);
  const [structure, setStructure] = useState(78);
  const [experience, setExperience] = useState(64);
  const [skills, setSkills] = useState(80);
  const [activePhase, setActivePhase] = useState<string | null>("p2");

  const score = useMemo(
    () => Math.round(keywords * 0.3 + format * 0.15 + structure * 0.15 + experience * 0.2 + skills * 0.2),
    [keywords, format, structure, experience, skills]
  );

  const buzz = ["Team player", "Hard worker", "Detail oriented"];
  const boost = ["Shipped", "Optimized (32%)", "Architected", "Automated"];

  const phases: Phase[] = [
    { id: "p1", sub: "Immediate", title: "Structural cleanup", state: "done", items: ["Fix section overlaps", "Normalize date formatting", "Remove tracking noise"] },
    { id: "p2", sub: "2 weeks", title: "Keyword injection", state: "active", items: ["Add JD-matched stack terms", "Drop hollow filler words", "Quantify impact bullets"] },
    { id: "p3", sub: "1–2 months", title: "Portfolio depth", state: "pending", items: ["Deploy 2 flagship projects", "Add CI/CD & tests", "Publish a technical write-up"] },
  ];

  return (
    <div className="min-h-screen text-white">
      <AuroraBackdrop />
      <Header />

      <main className="mx-auto w-[min(1240px,95%)] pb-24 pt-10">
        {/* HERO */}
        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT: value prop + gauge */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E000FF]" />
                Real-time reactive scoring
              </div>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                Land the offer.<br />
                <span className="neon-text">Not just the interview.</span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
                PlaceBoost pairs an AI resume sandbox with a gamified roadmap and predictive
                placement analytics — engineered for students who ship real work.
              </p>
            </div>

            <div className="glass-strong p-6">
              <div className="flex flex-col items-center gap-8 md:flex-row">
                <ScoreGauge value={score} />
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-display text-lg font-semibold">Resume Sandbox</div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-widest text-white/60">Live</span>
                  </div>
                  <MetricBar label="Keywords" value={keywords} hint="JD-aligned tech terms" />
                  <MetricBar label="Formatting" value={format} hint="ATS-parseable structure" />
                  <MetricBar label="Structure" value={structure} hint="Section hierarchy" />
                  <MetricBar label="Experience" value={experience} hint="Impact quantification" />
                  <MetricBar label="Skills" value={skills} hint="Stack depth & breadth" />
                </div>
              </div>

              {/* Sandbox controls */}
              <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-widest text-white/55">Tune inputs — score reacts</div>
                  <div className="space-y-2">
                    {[
                      { label: "Keywords", v: keywords, set: setKeywords },
                      { label: "Experience", v: experience, set: setExperience },
                      { label: "Skills", v: skills, set: setSkills },
                    ].map((r) => (
                      <label key={r.label} className="flex items-center gap-3 text-sm text-white/70">
                        <span className="w-24 text-white/55">{r.label}</span>
                        <input
                          type="range" min={0} max={100} value={r.v}
                          onChange={(e) => r.set(Number(e.target.value))}
                          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#E000FF]"
                        />
                        <span className="w-8 text-right font-display text-xs">{r.v}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                    <CircleAlert className="h-3.5 w-3.5 text-[#F5B942]" /> Buzzword sweeper
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {buzz.map((b) => (
                      <span key={b} className="rounded-full border border-[#F5B942]/40 bg-[#F5B942]/10 px-3 py-1 text-xs text-[#F5B942] line-through">{b}</span>
                    ))}
                  </div>
                  <div className="mt-3 mb-1 text-[11px] uppercase tracking-widest text-white/45">Suggested replacements</div>
                  <div className="flex flex-wrap gap-2">
                    {boost.map((b) => (
                      <span key={b} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/85">
                        <span className="mr-1 text-[#7A5CFF]">↑</span>{b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: roadmap + telemetry */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-strong p-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/55">Gamified path</div>
                  <div className="font-display text-lg font-semibold">Skill-tree Roadmap</div>
                </div>
                <MapIcon className="h-5 w-5 text-[#7A5CFF]" />
              </div>
              <Roadmap phases={phases} active={activePhase} onHover={setActivePhase} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ArcGauge value={Math.min(96, Math.round(score * 0.95))} label="Placement Prob." sub="Top-3 drives" />
              <PackageDial score={score} />
            </div>

            <div className="glass p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/55">
                <Target className="h-3.5 w-3.5 text-[#E000FF]" /> Drive target
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Google", "Atlassian", "Razorpay", "Zoho", "Deloitte"].map((c) => (
                  <button key={c} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:border-[#E000FF]/50 hover:text-white">{c}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER FEATURE TUNNELS */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: Github, title: "GitHub Repo Scraper", body: "Auto-generate technical bullet points from your best repos.", cta: "Connect GitHub" },
            { icon: Cpu, title: "Project → Experience", body: "Turn academic projects into impact-driven résumé lines.", cta: "Synthesize" },
            { icon: Wand2, title: "Resume Builder", body: "Guided wizard with live ATS review at every step.", cta: "Start building" },
          ].map(({ icon: Icon, title, body, cta }) => (
            <div key={title} className="glass group p-5 float-slow transition hover:-translate-y-1">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4D00FF]/30 to-[#E000FF]/30 border border-white/10">
                <Icon className="h-5 w-5 text-[#c4b5fd]" />
              </div>
              <div className="font-display text-base font-semibold">{title}</div>
              <p className="mt-1 text-sm text-white/65">{body}</p>
              <button className="mt-4 inline-flex items-center gap-1 text-sm text-white/85 transition group-hover:text-[#E000FF]">
                {cta} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
