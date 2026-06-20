const viteApiUrl = import.meta.env.VITE_API_URL as string | undefined;
export const apiBase: string = viteApiUrl
  ? viteApiUrl.replace(/\/+$/, "")
  : import.meta.env.BASE_URL.replace(/\/$/, "");
