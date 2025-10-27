export {};

declare global {
  interface Window {
    api?: {
      exportFullpagePNG: () => Promise<{ ok: boolean; filePath?: string; canceled?: boolean; error?: string }>;
    };
    electron?: {
      savePng: (
        dataUrl: string,
        suggestedName?: string,
      ) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>;
    };
  }
}
