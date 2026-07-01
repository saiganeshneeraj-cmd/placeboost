/* Local-only version history for resume analyses. No auth, no server. */
import type { AnalysisResult } from "./resume.functions";

export type Version = {
  id: string;
  createdAt: number;
  label: string;
  score: number;
  jobTarget: string;
  fileName: string | null;
  text: string;
  result: AnalysisResult;
};

const KEY = "placeboost.versions.v1";
const MAX = 20;

function safeParse(s: string | null): Version[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; }
  catch { return []; }
}

export function loadVersions(): Version[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function saveVersion(v: Omit<Version, "id" | "createdAt">): Version {
  const record: Version = {
    ...v,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  const next = [record, ...loadVersions()].slice(0, MAX);
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return record;
}

export function deleteVersion(id: string): void {
  const next = loadVersions().filter((v) => v.id !== id);
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
}

export function clearVersions(): void {
  try { window.localStorage.removeItem(KEY); } catch {}
}

export function formatTimeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
