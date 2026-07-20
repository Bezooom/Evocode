/**
 * OpenAI-compat response normalization for local "thinking" models
 * (reasoning_content without content → empty agent replies / AbortError).
 */

export function foldReasoningEnabled(): boolean {
  const v = (process.env.EVOCODE_FOLD_REASONING ?? 'true').toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
}

/** Stream delta: if only reasoning_content is present, promote it to content. */
export function foldReasoningDelta(delta: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
  if (!delta || !foldReasoningEnabled()) return delta;
  const content = delta.content;
  const reasoning = delta.reasoning_content;
  const contentEmpty =
    content == null || content === '' || (typeof content === 'string' && content.length === 0);
  if (contentEmpty && typeof reasoning === 'string' && reasoning.length > 0) {
    return { ...delta, content: reasoning };
  }
  return delta;
}

/** Non-stream message: fill empty content from reasoning_content. */
export function foldReasoningMessage(message: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
  if (!message || !foldReasoningEnabled()) return message;
  const content = message.content;
  const reasoning = message.reasoning_content;
  const contentEmpty =
    content == null || content === '' || (typeof content === 'string' && content.length === 0);
  if (contentEmpty && typeof reasoning === 'string' && reasoning.length > 0) {
    return {
      ...message,
      content: reasoning,
      // keep original for UIs that understand reasoning
      reasoning_content: reasoning,
    };
  }
  return message;
}

export function isAbortLikeError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string; code?: string };
  if (e.name === 'AbortError' || e.name === 'TimeoutError') return true;
  if (e.code === 'ABORT_ERR') return true;
  const msg = String(e.message || err);
  return /operation was aborted|aborted|AbortError|TimeoutError/i.test(msg);
}
