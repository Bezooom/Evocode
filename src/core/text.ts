/**
 * Normalize OpenAI / agent message content to a plain string.
 * Multimodal parts: [{ type: 'text', text: '...' }, { type: 'image_url', ... }]
 */
export function contentToText(content: unknown): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'number' || typeof content === 'boolean') return String(content);
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const p = part as Record<string, unknown>;
          if (typeof p.text === 'string') return p.text;
          if (typeof p.content === 'string') return p.content;
          if (p.type === 'text' && typeof p.text === 'string') return p.text;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (typeof content === 'object') {
    const o = content as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text;
    if (typeof o.content === 'string') return o.content;
    if (typeof o.message === 'string') return o.message;
    try {
      return JSON.stringify(content);
    } catch {
      return '';
    }
  }
  return '';
}
