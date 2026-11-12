export type User = { id: string; name: string; email: string; created_at: number }
export type Collection = { id: string; title: string; document_count: number; created_at: number; updated_at: number }
export type DocumentRecord = { id: string; collection_id: string; filename: string; mime: string; bytes: number; page_count: number; chunk_count: number; created_at: number }
export type Source = { label: string; chunk_id: string; document_id: string; filename: string; page: number; text: string; signal: number }
export type Message = { id: string; role: 'user' | 'assistant'; body: string; sources: Source[]; answer_mode: string; created_at: number }
export type OllamaStatus = { connected: boolean; chat_ready: boolean; embed_ready: boolean; chat_model: string; embed_model: string }
export type Answer = { answer: string; sources: Source[]; answer_mode: string; retrieval_mode?: string; message?: Message }

export async function api<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const isForm = body instanceof FormData
  const response = await fetch('/api' + path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/session' && path !== '/auth/login') window.dispatchEvent(new Event('docmind:expired'))
    let detail = 'Something went wrong. Please try again.'
    try {
      const data = await response.json()
      detail = typeof data.detail === 'string' ? data.detail : detail
    } catch { /* Keep the usable fallback message. */ }
    throw new Error(detail)
  }
  return response.json() as Promise<T>
}

export function saveText(filename: string, content: string, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
