import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { PreloadContextValue, PreloadProviderProps, PreloadStatus } from "./types";

const PreloadContext =
  createContext<PreloadContextValue | null>(null);

export function PreloadProvider({
  preload,
  children,
  fallback = null,
  onError,
}: PreloadProviderProps) {
  const [status, setStatus] =
    useState<PreloadStatus>("loading");

  const [error, setError] =
    useState<unknown>(null);

  const preloadRef = useRef(preload);
  const onErrorRef = useRef(onError);

  preloadRef.current = preload;
  onErrorRef.current = onError;

  const preloadPromiseRef =
    useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!preloadPromiseRef.current) {
      preloadPromiseRef.current =
        preloadRef.current();
    }

    preloadPromiseRef.current
      .then(() => {
        setStatus("ready");
      })
      .catch((error) => {
        console.error(
          "Cache preload failed:",
          error
        );

        setError(error);
        setStatus("error");

        onErrorRef.current?.(error);
      });
  }, []);

  const contextValue: PreloadContextValue = {
    status,
    error,
  };

  if (status !== "ready") {
    return (
      <PreloadContext.Provider
        value={contextValue}
      >
        {fallback}
      </PreloadContext.Provider>
    );
  }

  return (
    <PreloadContext.Provider
      value={contextValue}
    >
      {children}
    </PreloadContext.Provider>
  );
}

export function usePreloadStatus() {
  const context = useContext(PreloadContext);

  if (!context) {
    throw new Error(
      "usePreloadStatus must be used inside PreloadProvider"
    );
  }

  return context;
}