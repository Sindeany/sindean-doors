/**
 * LLM Helper — استدعاء نموذج الذكاء الاصطناعي
 */

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMOptions {
  messages: Message[];
  response_format?: { type: "json_object" } | { type: "text" } | { type: "json_schema"; json_schema: any };
  temperature?: number;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function invokeLLM(options: LLMOptions): Promise<LLMResponse> {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("LLM API credentials not configured");
  }

  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: options.messages,
      response_format: options.response_format || { type: "text" },
      temperature: options.temperature ?? 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error: ${response.status} — ${err}`);
  }

  return response.json();
}
