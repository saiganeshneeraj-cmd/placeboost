// Provider-agnostic chat completion helper.
// Picks a provider based on which env var is set, so the same code runs on
// Lovable hosting (LOVABLE_API_KEY) and on Vercel/other hosts (GEMINI_API_KEY
// or OPENAI_API_KEY — bring your own key).

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ProviderConfig = {
  url: string;
  model: string;
  headers: Record<string, string>;
  name: string;
};

function pickProvider(): ProviderConfig {
  const lovable = process.env.LOVABLE_API_KEY;
  const gemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  if (lovable) {
    return {
      name: "lovable",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-3-flash-preview",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovable },
    };
  }
  if (gemini) {
    return {
      name: "gemini",
      // Gemini's OpenAI-compatible endpoint
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gemini}`,
      },
    };
  }
  if (openai) {
    return {
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai}`,
      },
    };
  }
  throw new Error(
    "AI provider not configured. Set LOVABLE_API_KEY (Lovable hosting) or GEMINI_API_KEY / OPENAI_API_KEY (Vercel/other hosts).",
  );
}

export async function aiChatJSON(messages: ChatMessage[]): Promise<string> {
  const p = pickProvider();
  const res = await fetch(p.url, {
    method: "POST",
    headers: p.headers,
    body: JSON.stringify({
      model: p.model,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Rate limit hit — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits or a new API key.");
  if (res.status === 401 || res.status === 403) {
    throw new Error(`AI provider (${p.name}) rejected the API key. Check your key in the host env vars.`);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI provider (${p.name}) error ${res.status}: ${t.slice(0, 200)}`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty response from AI — try again.");
  return content;
}
