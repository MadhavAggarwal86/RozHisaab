// Shared chat-completion call for the AI features.
// Both providers expose an OpenAI-compatible chat API. The provider is picked from the key prefix;
// models can be overridden with GROQ_MODEL / XAI_MODEL in .env.
const PROVIDERS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    // gpt-oss models reason before answering; keep that short so the JSON fits in the token budget
    extra: { reasoning_effort: 'low' },
  },
  xai: {
    url: 'https://api.x.ai/v1/chat/completions',
    model: process.env.XAI_MODEL || 'grok-3-mini',
  },
};

const providerFor = (apiKey) => (apiKey.startsWith('xai-') ? PROVIDERS.xai : PROVIDERS.groq);

export class AiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Sends one system + user message and returns the parsed JSON reply, or null if it wasn't JSON.
export async function askModel(apiKey, systemPrompt, userContent) {
  const provider = providerFor(apiKey);
  let res;
  try {
    res = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        ...provider.extra,
        max_tokens: 1000,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: userContent,
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new AiError('Could not reach the AI service. Please try again.');
  }

  // xAI answers 400 for an incorrect key as well as for bad requests; Groq uses 401
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    console.error('AI provider rejected the request — check AI_API_KEY in .env', res.status);
    throw new AiError('The assistant is not available right now. Please try again later.', 503);
  }
  if (res.status === 429) throw new AiError('The assistant is busy right now. Please try again in a moment.');
  if (!res.ok) {
    console.error('AI provider error', res.status, (await res.text().catch(() => '')).slice(0, 500));
    if (res.status === 404) throw new AiError('The assistant is not available right now. Please try again later.', 503); // model name wrong: check GROQ_MODEL / XAI_MODEL
    throw new AiError('The AI service returned an error. Please try again.');
  }

  const data = await res.json().catch(() => null);
  return extractJson(data?.choices?.[0]?.message?.content || '');
}
