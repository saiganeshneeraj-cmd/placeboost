import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AnalysisResult } from "./resume.functions";

export type CloudVersion = {
  id: string;
  createdAt: number;
  label: string;
  score: number;
  jobTarget: string;
  fileName: string | null;
  text: string;
  result: AnalysisResult;
};

export const listCloudVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CloudVersion[]> => {
    const { data, error } = await context.supabase
      .from("resume_versions")
      .select("id, label, score, job_target, file_name, resume_text, result, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
      id: r.id,
      createdAt: new Date(r.created_at).getTime(),
      label: r.label,
      score: r.score,
      jobTarget: r.job_target || "",
      fileName: r.file_name,
      text: r.resume_text,
      result: r.result as AnalysisResult,
    }));
  });

export const saveCloudVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    label: string; score: number; jobTarget: string;
    fileName: string | null; text: string; result: AnalysisResult;
  }) => {
    if (!d?.text || d.text.length < 20) throw new Error("Resume text too short");
    return {
      label: String(d.label || "Analysis").slice(0, 200),
      score: Math.max(0, Math.min(100, Math.round(Number(d.score) || 0))),
      jobTarget: String(d.jobTarget || "").slice(0, 400),
      fileName: d.fileName ? String(d.fileName).slice(0, 200) : null,
      text: String(d.text).slice(0, 40000),
      result: d.result,
    };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("resume_versions")
      .insert({
        user_id: context.userId,
        label: data.label,
        score: data.score,
        job_target: data.jobTarget,
        file_name: data.fileName,
        resume_text: data.text,
        result: data.result as any,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row!.id };
  });

export const deleteCloudVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return { id: String(d.id) };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("resume_versions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
