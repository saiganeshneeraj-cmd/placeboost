import { jsPDF } from "jspdf";
import type { AnalysisResult } from "@/lib/resume.functions";

const INK = "#0B0B12";
const MUTE = "#5A5A6E";
const ACCENT = "#7A5CFF";
const OK = "#22C55E";
const WARN = "#F5B942";

export function downloadAnalysisPdf(r: AnalysisResult, meta: { fileName?: string | null; jobTarget?: string }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > H - M) { doc.addPage(); y = M; }
  };

  const text = (t: string, size: number, opts: { color?: string; bold?: boolean; x?: number; maxW?: number } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(opts.color || INK);
    const x = opts.x ?? M;
    const lines = doc.splitTextToSize(t, opts.maxW ?? (W - M * 2));
    ensure(lines.length * size * 1.25);
    doc.text(lines, x, y);
    y += lines.length * size * 1.25;
  };

  const hr = () => { ensure(14); doc.setDrawColor("#E6E6E6"); doc.line(M, y + 4, W - M, y + 4); y += 14; };

  // Header banner
  doc.setFillColor("#7A5CFF");
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PlaceBoost — ATS Analysis Report", M, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), W - M, 44, { align: "right" });
  y = 96;

  // Meta line
  const metaLine = [
    meta.fileName ? `Source: ${meta.fileName}` : "Source: pasted text",
    meta.jobTarget ? `Target: ${meta.jobTarget.slice(0, 80)}` : "Target: general SDE",
    `Role guess: ${r.role_guess || "—"}`,
  ].join("   •   ");
  text(metaLine, 9, { color: MUTE });
  y += 4; hr();

  // Score band
  ensure(120);
  const cardW = (W - M * 2 - 24) / 3;
  const scoreCard = (label: string, val: number, x: number, color: string) => {
    doc.setDrawColor("#E6E6E6"); doc.setFillColor("#FAFAFA");
    doc.roundedRect(x, y, cardW, 90, 8, 8, "FD");
    doc.setTextColor(MUTE); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(label.toUpperCase(), x + 14, y + 22);
    doc.setTextColor(color); doc.setFont("helvetica", "bold"); doc.setFontSize(36);
    doc.text(String(val), x + 14, y + 66);
    doc.setTextColor(MUTE); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("/100", x + 14 + doc.getTextWidth(String(val)) + 4, y + 66);
  };
  scoreCard("Blended ATS score", r.score, M, ACCENT);
  scoreCard("Deterministic (rules)", r.heuristic_score, M + cardW + 12, INK);
  scoreCard("AI model score", r.ai_score, M + (cardW + 12) * 2, INK);
  y += 108;

  // Metric bars
  text("Metric breakdown", 13, { bold: true });
  const barMax = W - M * 2 - 160;
  Object.entries(r.metrics).forEach(([k, v]) => {
    ensure(22);
    doc.setTextColor(INK); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(k[0].toUpperCase() + k.slice(1), M, y + 12);
    doc.setDrawColor("#E6E6E6"); doc.setFillColor("#F0F0F0");
    doc.roundedRect(M + 110, y + 4, barMax, 10, 5, 5, "F");
    doc.setFillColor("#7A5CFF");
    doc.roundedRect(M + 110, y + 4, Math.max(2, (barMax * v) / 100), 10, 5, 5, "F");
    doc.setTextColor(MUTE); doc.text(`${v}/100`, W - M, y + 12, { align: "right" });
    y += 22;
  });
  y += 6; hr();

  // Heuristic report
  text("Deterministic report", 13, { bold: true });
  const h = r.heuristic;
  const stats = [
    ["Word count", `${h.word_count}  (${h.readability_flag})`],
    ["Bullets", `${h.bullet_count}  •  ${h.quantified_pct}% quantified  •  ${h.action_verb_pct}% start with action verbs`],
    ["Sections found", h.sections_found.join(", ") || "—"],
    ["Sections missing", h.sections_missing.join(", ") || "none"],
    ["Contact", `email:${h.contact.email ? "✓" : "✗"}  phone:${h.contact.phone ? "✓" : "✗"}  linkedin:${h.contact.linkedin ? "✓" : "✗"}  github:${h.contact.github ? "✓" : "✗"}`],
    ["Hard skills detected", h.hard_skills_found.join(", ") || "—"],
    ["JD keyword match", meta.jobTarget ? `${h.jd_match_pct}%  (${h.jd_hits.length} hits / ${h.jd_misses.length} misses)` : "n/a — no JD provided"],
  ];
  stats.forEach(([k, v]) => {
    ensure(18);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(INK);
    doc.text(k + ":", M, y + 10);
    doc.setFont("helvetica", "normal"); doc.setTextColor(MUTE);
    const lines = doc.splitTextToSize(String(v), W - M * 2 - 130);
    doc.text(lines, M + 130, y + 10);
    y += Math.max(18, lines.length * 12 + 6);
  });
  y += 4; hr();

  const bulletList = (title: string, items: string[], color = ACCENT) => {
    if (!items.length) return;
    text(title, 12, { bold: true });
    items.forEach((it) => {
      ensure(16);
      doc.setFillColor(color as string); doc.circle(M + 4, y + 4, 2, "F");
      doc.setTextColor(INK); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const lines = doc.splitTextToSize(it, W - M * 2 - 14);
      doc.text(lines, M + 14, y + 7);
      y += Math.max(16, lines.length * 12 + 4);
    });
    y += 6;
  };

  if (r.missing_keywords.length) {
    text("Missing high-yield keywords", 12, { bold: true });
    let x = M; const lh = 22;
    r.missing_keywords.forEach((k) => {
      const w = doc.getTextWidth(k) + 18;
      if (x + w > W - M) { y += lh; x = M; ensure(lh); }
      doc.setDrawColor("#7A5CFF"); doc.setFillColor("#F5F2FF");
      doc.roundedRect(x, y, w, 16, 8, 8, "FD");
      doc.setTextColor(ACCENT); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text("+ " + k, x + 9, y + 11);
      x += w + 6;
    });
    y += lh + 4;
  }

  if (r.buzzwords.length) {
    text("Dead buzzwords → replacements", 12, { bold: true });
    r.buzzwords.forEach((b) => {
      ensure(16);
      doc.setTextColor(WARN); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(b.term, M, y + 10);
      doc.setTextColor(MUTE); doc.setFont("helvetica", "normal");
      doc.text("→", M + doc.getTextWidth(b.term) + 8, y + 10);
      doc.setTextColor(INK);
      const rep = doc.splitTextToSize(b.replacement, W - M - (M + doc.getTextWidth(b.term) + 24));
      doc.text(rep, M + doc.getTextWidth(b.term) + 22, y + 10);
      y += Math.max(16, rep.length * 12 + 4);
    });
    y += 6;
  }

  bulletList("Suggested fixes", r.suggestions, OK);
  bulletList("Strengths", r.strengths, "#4D9CFF");
  bulletList("Tailored rewritten bullets", r.tailored_bullets, ACCENT);

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(MUTE); doc.setFont("helvetica", "normal");
    doc.text(`PlaceBoost ATS Report  •  Page ${i} of ${pages}`, W / 2, H - 20, { align: "center" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`placeboost-ats-report-${stamp}.pdf`);
}
