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
            "radial-gradient(600px 600px at var(--mx,50%) var(--my,50%), rgba(59,130,246,0.20), transparent 60%)",
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
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#38BDF8] neon-ring">
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
            <Icon className="h-4 w-4 text-[#93C5FD] transition group-hover:text-[#38BDF8]" />
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
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#38BDF8" />
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
            background: "linear-gradient(90deg,#60A5FA,#3B82F6 50%,#38BDF8)",
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
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="60%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
        <path d="M40 90 C 160 20, 260 140, 360 60 S 540 100, 560 50" fill="none" stroke="url(#pathGrad)" strokeWidth="2" strokeDasharray="4 6" opacity="0.55"/>
        {[{x:40,y:90,id:phases[0].id},{x:300,y:70,id:phases[1].id},{x:560,y:50,id:phases[2].id}].map((n, i) => {
          const p = phases[i];
          const isActive = active === n.id;
          const color = p.state === "done" ? "#60A5FA" : p.state === "active" ? "#38BDF8" : "#3B82F6";
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
                <span className={`inline-block h-2 w-2 rounded-full ${p.state === "done" ? "bg-[#60A5FA]" : p.state === "active" ? "bg-[#38BDF8]" : "bg-white/40"}`} />
                <div className="text-xs uppercase tracking-widest text-white/60">{p.sub}</div>
              </div>
              <div className="mt-1 font-display text-sm font-semibold">{p.title}</div>
              <ul className="mt-2 space-y-1">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-[12px] text-white/70">
                    <CheckCircle2 className="mt-[2px] h-3 w-3 text-[#3B82F6]" /> {it}
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
        <Zap className="h-4 w-4 text-[#38BDF8]" />
      </div>
      <div className="relative mx-auto" style={{ width: size, height: size / 2 + 20 }}>
        <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
          <defs>
            <linearGradient id={`arc-${label}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#38BDF8" />
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
        <Trophy className="h-4 w-4 text-[#38BDF8]" />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="font-display text-3xl font-bold neon-text">₹{min}–{max}</div>
        <div className="text-sm text-white/60">LPA</div>
      </div>
      <div className="mt-4 h-2 rounded-full border border-white/10 bg-white/5">
        <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#60A5FA,#38BDF8)" }}/>
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

      <main className="mx-auto w-[min(1180px,92%)] pb-32">
        {/* HERO — centered, minimal */}
        <section className="flex min-h-[78vh] flex-col items-center justify-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/70 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7DD3FC]" />
            AI Placement Copilot
          </div>

          <h1 className="font-display text-[52px] font-semibold leading-[1.02] tracking-[-0.035em] text-white md:text-[80px]">
            Land the offer.
            <br />
            <span className="neon-text">Not just the interview.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/65 md:text-[16px]">
            Real-time ATS scoring, an AI resume booster, and a gamified skill roadmap —
            engineered for students who ship real work.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/sandbox"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1E3A8A] via-[#3B82F6] to-[#38BDF8] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_20px_60px_-15px_rgba(59,130,246,0.75)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-15px_rgba(56,189,248,0.95)]"
            >
              <Sparkles className="h-4 w-4" />
              Launch Analysis
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3.5 text-[14px] font-medium text-white/75 backdrop-blur transition hover:border-white/25 hover:text-white"
            >
              Explore features
            </a>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] uppercase tracking-[0.2em] text-white/40">
            <span>ATS-accurate scoring</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>AI resume booster</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>PDF report export</span>
          </div>
        </section>

        {/* FEATURE STRIP — quiet, three cards */}
        <section id="features" className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: FileText, title: "Resume Sandbox", body: "Drop a PDF or paste text. Instant ATS score with metric breakdown.", to: "/sandbox" },
            { icon: Wand2, title: "AI Boost", body: "Rewrite with quantified impact, verified score lift, one-click download." },
            { icon: LineChart, title: "Placement Signal", body: "Predicted probability and expected package range from your profile." },
          ].map(({ icon: Icon, title, body, to }) => {
            const Card = (
              <div className="glass group h-full p-5 transition hover:-translate-y-0.5 hover:border-white/20">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  <Icon className="h-4 w-4 text-[#BAE6FD]" />
                </div>
                <div className="font-display text-[15px] font-semibold tracking-tight">{title}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-white/60">{body}</p>
              </div>
            );
            return to ? (
              <Link key={title} to={to} className="block">{Card}</Link>
            ) : (
              <div key={title}>{Card}</div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
