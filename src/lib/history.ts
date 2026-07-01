/* Version history: localStorage for guests, cloud (Supabase) mirror when signed in.
   Public API remains sync (loadVersions/saveVersion/deleteVersion) so existing UI
   works unchanged; cloud syncing happens through separate async helpers. */
import type { AnalysisResult } from "./resume.functions";
import { listCloudVersions, saveCloudVersion, deleteCloudVersion } from "./versions.functions";

export type Version = {
  id: string;
  createdAt: number;
  label: string;
  score: number;
  jobTarget: string;
  fileName: string | null;
  text: string;
  result: AnalysisResult;
  cloudId?: string; // present if mirrored to cloud
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

function writeLocal(list: Version[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch {}
}

export function saveVersion(v: Omit<Version, "id" | "createdAt">): Version {
  const record: Version = {
    ...v,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  writeLocal([record, ...loadVersions()]);
  return record;
}

export function deleteVersion(id: string): void {
  writeLocal(loadVersions().filter((v) => v.id !== id));
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

/* ------------------------- Cloud sync (signed-in) ------------------------- */

// Fetch cloud versions and merge into local cache so the UI reads a unified list.
export async function syncFromCloud(): Promise<Version[]> {
  try {
    const cloud = await listCloudVersions();
    const local = loadVersions();
    // Cloud is source-of-truth for records with a cloudId; keep unmigrated locals too.
    const cloudMapped: Version[] = cloud.map((c) => ({
      id: `cloud-${c.id}`,
      cloudId: c.id,
      createdAt: c.createdAt,
      label: c.label,
      score: c.score,
      jobTarget: c.jobTarget,
      fileName: c.fileName,
      text: c.text,
      result: c.result,
    }));
    const localOnly = local.filter((l) => !l.cloudId);
    const merged = [...cloudMapped, ...localOnly]
      .sort((a, b) => b.createdAt - a.createdAt);
    writeLocal(merged);
    return merged;
  } catch (e) {
    console.warn("[history] cloud sync failed:", e);
    return loadVersions();
  }
}

// Mirror a locally-saved version up to the cloud (fire-and-forget from callers).
export async function mirrorToCloud(v: Version): Promise<void> {
  if (v.cloudId) return;
  try {
    const { id } = await saveCloudVersion({ data: {
      label: v.label, score: v.score, jobTarget: v.jobTarget,
      fileName: v.fileName, text: v.text, result: v.result,
    }});
    const list = loadVersions().map((x) => x.id === v.id ? { ...x, cloudId: id } : x);
    writeLocal(list);
  } catch (e) {
    console.warn("[history] cloud mirror failed:", e);
  }
}

export async function deleteEverywhere(v: Version): Promise<void> {
  deleteVersion(v.id);
  if (v.cloudId) {
    try { await deleteCloudVersion({ data: { id: v.cloudId } }); }
    catch (e) { console.warn("[history] cloud delete failed:", e); }
  }
}
