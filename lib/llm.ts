import { getDecryptedApiConfig, LlmProvider } from "./jobpilot-store";

export type LLMResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Call the user's configured LLM provider.
 * Picks the most recently updated API config automatically.
 */
export async function callLLM(
  userId: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResult> {
  const config = await getDecryptedApiConfig(userId);
  if (!config) {
    return {
      ok: false,
      error: "No API key configured. Please go to Settings → API Keys and add one.",
    };
  }

  try {
    const text = await routeToProvider(
      config.provider,
      config.modelName,
      config.apiKey,
      systemPrompt,
      userPrompt,
    );
    return { ok: true, text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `LLM error (${config.provider}): ${msg}` };
  }
}

async function routeToProvider(
  provider: LlmProvider,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (provider === "Anthropic") {
    return callAnthropic(model, apiKey, systemPrompt, userPrompt);
  }
  if (provider === "Gemini") {
    return callGemini(model, apiKey, systemPrompt, userPrompt);
  }
  const baseUrls: Record<string, string> = {
    OpenAI: "https://api.openai.com/v1",
    Groq: "https://api.groq.com/openai/v1",
    OpenRouter: "https://openrouter.ai/api/v1",
  };
  return callOpenAICompat(
    baseUrls[provider] || "https://api.openai.com/v1",
    provider,
    model,
    apiKey,
    systemPrompt,
    userPrompt,
  );
}

async function callAnthropic(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGemini(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAICompat(
  baseUrl: string,
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (provider === "OpenRouter") {
    headers["HTTP-Referer"] = "https://jobpilot.app";
    headers["X-Title"] = "JobPilot";
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
