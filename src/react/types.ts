export type PreloadStatus = 
  | "loading"
  | "ready"
  | "error";

export interface PreloadContextValue {
  status: PreloadStatus;
  error: unknown;
}

export interface PreloadProviderProps {
  preload: () => Promise<void>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: unknown) => void;
}