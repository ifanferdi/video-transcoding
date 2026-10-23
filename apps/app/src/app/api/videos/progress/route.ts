import { proxySSE } from "@/lib/sse-proxy";

export const GET = () => proxySSE("videos/progress");
