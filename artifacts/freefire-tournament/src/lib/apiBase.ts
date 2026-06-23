// VITE_API_URL must be set in Vercel / Netlify when the frontend and backend
// are hosted on different domains.  An empty string is treated as "not set"
// so that a misconfigured blank env var in the dashboard doesn't silently
// route all API traffic back to the frontend origin.
const raw = import.meta.env.VITE_API_URL as string | undefined;
const viteApiUrl = raw && raw.trim() !== "" ? raw.trim() : undefined;

if (import.meta.env.PROD && !viteApiUrl) {
  console.warn(
    "[FF Arena] VITE_API_URL is not set. API calls will use a relative base path. " +
    "If your frontend and backend are on different domains (e.g. Vercel + Render), " +
    "set VITE_API_URL to your backend URL in your hosting dashboard.",
  );
}

// Falls back to BASE_URL (relative path) when VITE_API_URL is absent.
// This is correct when frontend + backend are served from the same origin
// (e.g. Replit dev environment where Vite proxies /api to :8080).
export const apiBase: string = viteApiUrl
  ? viteApiUrl.replace(/\/+$/, "")
  : import.meta.env.BASE_URL.replace(/\/$/, "");
