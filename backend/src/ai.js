function clampText(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function safeJsonBlock(value, maxLength) {
  const serialized = JSON.stringify(value ?? null, null, 2);
  if (serialized.length <= maxLength) return serialized;
  return `${serialized.slice(0, maxLength)}\n...[truncated]`;
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(item => item && (item.role === 'user' || item.role === 'assistant'))
    .slice(-8)
    .map(item => ({
      role: item.role,
      content: clampText(item.text || item.content || '', 1200)
    }))
    .filter(item => item.content);
}

function buildSystemPrompt(language) {
  const wantsPersian = language === 'fa';
  const responseLanguage = wantsPersian
    ? 'Always answer in clear Persian.'
    : 'Always answer in natural, professional English.';

  return [
    'You are AURA, a specialist AI coach for personal management.',
    'Your specialty is prioritization, time blocking, habit design, focus management, goal execution, routines, accountability, and personal productivity.',
    'Be practical, direct, and supportive.',
    'Prefer concrete action steps over generic motivation.',
    'When useful, structure the answer into: quick diagnosis, next best actions, and watch-outs.',
    'Keep answers concise but genuinely useful.',
    'Use the supplied app context and profile to personalize advice.',
    'Do not pretend you completed actions inside the product.',
    'If a request touches medical, legal, or financial matters, stay high level and recommend professional help where appropriate.',
    responseLanguage
  ].join('\n');
}

function normalizeGapGptContent(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

export function createMemoryRateLimiter({ windowMs, maxRequests }) {
  const buckets = new Map();

  return function check(identifier) {
    const now = Date.now();
    const safeId = String(identifier || 'anonymous');
    const existing = buckets.get(safeId) || [];
    const recent = existing.filter(timestamp => now - timestamp < windowMs);

    if (recent.length >= maxRequests) {
      const retryAfterMs = windowMs - (now - recent[0]);
      buckets.set(safeId, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
      };
    }

    recent.push(now);
    buckets.set(safeId, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

export async function requestPersonalCoachReply({
  apiKey,
  baseUrl,
  model,
  timeoutMs,
  message,
  profile,
  context,
  history,
  language
}) {
  if (!apiKey) {
    const error = new Error('AI chat is not configured on the server');
    error.statusCode = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const normalizedHistory = normalizeHistory(history);

  const messages = [
    { role: 'system', content: buildSystemPrompt(language) },
    ...normalizedHistory,
    {
      role: 'user',
      content: [
        `User profile:\n${safeJsonBlock(profile, 3500)}`,
        `App context:\n${safeJsonBlock(context, 7000)}`,
        `Current request:\n${clampText(message, 3000)}`
      ].join('\n\n')
    }
  ];

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        messages
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const error = new Error(
        data?.error?.message ||
        data?.error ||
        raw.slice(0, 300) ||
        'Upstream AI request failed'
      );
      error.statusCode = response.status;
      throw error;
    }

    const reply = normalizeGapGptContent(data?.choices?.[0]?.message?.content);
    if (!reply) {
      const error = new Error('AI provider returned an empty response');
      error.statusCode = 502;
      throw error;
    }

    return reply;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('AI request timed out');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
