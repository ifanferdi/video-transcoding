import { API_URL } from "@/config/config";

/** Endpoint stream backend. GANTI saat porting — kalau backend butuh auth, injeksi header Authorization di sini. */
const SSE_URL = `${API_URL}/api/v1/sse`;

/**
 * Proxy SSE: `EventSource` tidak bisa kirim header, jadi stream backend
 * dipipe apa adanya lewat route handler Next.js.
 */
export async function proxySSE(route: string) {
  const upstream = await fetch(`${SSE_URL}/${route}`, {
    headers: { Accept: "text/event-stream" },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Progress stream unavailable.", {
      status: upstream.status || 502,
    });
  }

  // Pipe ReadableStream langsung — buffer menahan stream yang tak pernah selesai.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
