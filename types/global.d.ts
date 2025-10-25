export {};

declare global {
  interface Window {
    api?: {
      exportFullpagePNG: () => Promise<{ ok: boolean; filePath?: string; canceled?: boolean; error?: string }>;
    };
  }
}
