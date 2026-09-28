"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import {
  STARTER_PROMPTS,
  PLACEHOLDER_INPUT,
  GREETING,
  CREATE_SESSION_ENDPOINT,
  WORKFLOW_ID,
  getThemeConfig,
} from "@/lib/config";
import { ErrorOverlay } from "./ErrorOverlay";
import type { ColorScheme } from "@/hooks/useColorScheme";

export type FactAction = {
  type: "save";
  factId: string;
  factText: string;
};

type ChatKitPanelProps = {
  theme: ColorScheme;
  onWidgetAction: (action: FactAction) => Promise<void>;
  onResponseEnd: () => void;
  onThemeRequest: (scheme: ColorScheme) => void;
};

type ErrorState = {
  script: string | null;
  session: string | null;
  integration: string | null;
  retryable: boolean;
};

const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

const createInitialErrors = (): ErrorState => ({
  script: null,
  session: null,
  integration: null,
  retryable: false,
});

export function ChatKitPanel({
  theme,
  onWidgetAction,
  onResponseEnd,
  onThemeRequest,
}: ChatKitPanelProps) {
  const processedFacts = useRef(new Set<string>());
  const [errors, setErrors] = useState<ErrorState>(() => createInitialErrors());
  const [isInitializingSession, setIsInitializingSession] = useState(true);
  const isMountedRef = useRef(true);
  const [scriptStatus, setScriptStatus] = useState<
    "pending" | "ready" | "error"
  >(() =>
    isBrowser && window.customElements?.get("openai-chatkit")
      ? "ready"
      : "pending"
  );
  const [widgetInstanceKey, setWidgetInstanceKey] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const setErrorState = useCallback((updates: Partial<ErrorState>) => {
    setErrors((current) => ({ ...current, ...updates }));
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    let timeoutId: number | undefined;

    const handleLoaded = () => {
      if (!isMountedRef.current) {
        return;
      }
      setScriptStatus("ready");
      setErrorState({ script: null });
    };

    const handleError = (event: Event) => {
      console.error("Failed to load chatkit.js for some reason", event);
      if (!isMountedRef.current) {
        return;
      }
      setScriptStatus("error");
      const detail = (event as CustomEvent<unknown>)?.detail ?? "unknown error";
      setErrorState({ script: `Error: ${detail}`, retryable: false });
      setIsInitializingSession(false);
    };

    window.addEventListener("chatkit-script-loaded", handleLoaded);
    window.addEventListener(
      "chatkit-script-error",
      handleError as EventListener
    );

    if (window.customElements?.get("openai-chatkit")) {
      handleLoaded();
    } else if (scriptStatus === "pending") {
      timeoutId = window.setTimeout(() => {
        if (!window.customElements?.get("openai-chatkit")) {
          handleError(
            new CustomEvent("chatkit-script-error", {
              detail:
                "ChatKit web component is unavailable. Verify that the script URL is reachable.",
            })
          );
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener("chatkit-script-loaded", handleLoaded);
      window.removeEventListener(
        "chatkit-script-error",
        handleError as EventListener
      );
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [scriptStatus, setErrorState]);

  const isWorkflowConfigured = Boolean(
    WORKFLOW_ID && !WORKFLOW_ID.startsWith("wf_replace")
  );

  useEffect(() => {
    if (!isWorkflowConfigured && isMountedRef.current) {
      setErrorState({
        session: "Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your .env.local file.",
        retryable: false,
      });
      setIsInitializingSession(false);
    }
  }, [isWorkflowConfigured, setErrorState]);

  const handleResetChat = useCallback(() => {
    processedFacts.current.clear();
    if (isBrowser) {
      setScriptStatus(
        window.customElements?.get("openai-chatkit") ? "ready" : "pending"
      );
    }
    setIsInitializingSession(true);
    setErrors(createInitialErrors());
    setWidgetInstanceKey((prev) => prev + 1);
  }, []);

  const getClientSecret = useCallback(
    async (currentSecret: string | null) => {
      if (isDev) {
        console.info("[ChatKitPanel] getClientSecret invoked", {
          currentSecretPresent: Boolean(currentSecret),
          workflowId: WORKFLOW_ID,
          endpoint: CREATE_SESSION_ENDPOINT,
        });
      }

      if (!isWorkflowConfigured) {
        const detail =
          "Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your .env.local file.";
        if (isMountedRef.current) {
          setErrorState({ session: detail, retryable: false });
          setIsInitializingSession(false);
        }
        throw new Error(detail);
      }

      if (isMountedRef.current) {
        if (!currentSecret) {
          setIsInitializingSession(true);
        }
        setErrorState({ session: null, integration: null, retryable: false });
      }

      try {
        const response = await fetch(CREATE_SESSION_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflow: { id: WORKFLOW_ID },
            chatkit_configuration: {
              // enable attachments
              file_upload: {
                enabled: true,
              },
            },
          }),
        });

        const raw = await response.text();

        if (isDev) {
          console.info("[ChatKitPanel] createSession response", {
            status: response.status,
            ok: response.ok,
            bodyPreview: raw.slice(0, 1600),
          });
        }

        let data: Record<string, unknown> = {};
        if (raw) {
          try {
            data = JSON.parse(raw) as Record<string, unknown>;
          } catch (parseError) {
            console.error(
              "Failed to parse create-session response",
              parseError
            );
          }
        }

        if (!response.ok) {
          const detail = extractErrorDetail(data, response.statusText);
          console.error("Create session request failed", {
            status: response.status,
            body: data,
          });
          throw new Error(detail);
        }

        const clientSecret = data?.client_secret as string | undefined;
        if (!clientSecret) {
          throw new Error("Missing client secret in response");
        }

        if (isMountedRef.current) {
          setErrorState({ session: null, integration: null });
        }

        return clientSecret;
      } catch (error) {
        console.error("Failed to create ChatKit session", error);
        const detail =
          error instanceof Error
            ? error.message
            : "Unable to start ChatKit session.";
        if (isMountedRef.current) {
          setErrorState({ session: detail, retryable: false });
        }
        throw error instanceof Error ? error : new Error(detail);
      } finally {
        if (isMountedRef.current && !currentSecret) {
          setIsInitializingSession(false);
        }
      }
    },
    [isWorkflowConfigured, setErrorState]
  );

  const chatkit = useChatKit({
    api: { getClientSecret },
    theme: {
      colorScheme: theme,
      density: "compact",
      ...getThemeConfig(theme),
    },
    startScreen: {
      greeting:"Hello inventor",
    //   // prompts: STARTER_PROMPTS,
    },
    composer: {
      placeholder: PLACEHOLDER_INPUT,
      attachments: {
        // Enable attachments
        enabled: false,
      },
    },
    history:{
      enabled: false,
    },
    header: {enabled: false,
    },
    threadItemActions: {
      feedback: false,
    },
    onClientTool: async (invocation: {
      name: string;
      params: Record<string, unknown>;
    }) => {
      if (invocation.name === "switch_theme") {
        const requested = invocation.params.theme;
        if (requested === "light" || requested === "dark") {
          if (isDev) {
            console.debug("[ChatKitPanel] switch_theme", requested);
          }
          onThemeRequest(requested);
          return { success: true };
        }
        return { success: false };
      }

      if (invocation.name === "record_fact") {
        const id = String(invocation.params.fact_id ?? "");
        const text = String(invocation.params.fact_text ?? "");
        if (!id || processedFacts.current.has(id)) {
          return { success: true };
        }
        processedFacts.current.add(id);
        void onWidgetAction({
          type: "save",
          factId: id,
          factText: text.replace(/\s+/g, " ").trim(),
        });
        return { success: true };
      }

      return { success: false };
    },
    onResponseEnd: () => {
      onResponseEnd();
    },
    onResponseStart: () => {
      setHasStarted(true);
      setErrorState({ integration: null, retryable: false });
    },
    onThreadChange: () => {
      processedFacts.current.clear();
    },
    onError: ({ error }: { error: unknown }) => {
      // Note that Chatkit UI handles errors for your users.
      // Thus, your app code doesn't need to display errors on UI.
      console.error("ChatKit error", error);
    },
  });

  const activeError = errors.session ?? errors.integration;
  const blockingError = errors.script ?? activeError;

  if (isDev) {
    console.debug("[ChatKitPanel] render state", {
      isInitializingSession,
      hasControl: Boolean(chatkit.control),
      scriptStatus,
      hasError: Boolean(blockingError),
      workflowId: WORKFLOW_ID,
    });
  }

  
  return (
  <div className="flex w-full flex-col py-4">

    {/* 🔵 Greeting + Starter Prompts */}
    {!hasStarted && (
      <div className="mx-auto w-full max-w-3xl">
         {/* Starter boxes */}
        <div className="mb-4 grid grid-cols-2 gap-3 px-3 sm:grid-cols-4">
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                chatkit.sendUserMessage({ text: p.prompt });
                setHasStarted(true);
              }}
              className="rounded-xl bg-[#8bedf8] px-2 py-4 text-[16px] text-[#2a8aba] hover:bg-[#1b73cd] hover:text-white transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* 🩶 BIG Chat Container */}
    <div className="flex flex-col px-3 pb-4">
      <div
        className={`
          relative mx-auto flex w-full min-w-0 max-w-2xl flex-col
          bg-[#faf7fe] dark:bg-[#faf7fe]
          shadow-lg
          justify-start
          overflow-hidden
          transition-all duration-500 ease-in-out
          rounded-[30px]
          ${hasStarted ? "min-h-[560px]" : ""}

        `}
      >
        <div
          className={`
            relative flex min-w-0 w-full flex-col overflow-hidden
            ${hasStarted ? "h-[560px]" : "h-[260px]"}
            
          `}
        >

            <ChatKit
              key={widgetInstanceKey}
              control={chatkit.control}
              className={
                blockingError || isInitializingSession
                  ? "pointer-events-none opacity-0"
                  : "block h-full min-w-0 w-full"
              }
            />
        </div>

        <ErrorOverlay
          error={blockingError}
          fallbackMessage={
            blockingError || !isInitializingSession
              ? null
              : "Loading assistant session..."
          }
          onRetry={blockingError && errors.retryable ? handleResetChat : null}
          retryLabel="Restart chat"
        />
      

      {/* 📝 Text below input (same grey box) */}
      {!hasStarted && (
        <div className="w-full space-y-4 px-2 pb-5">
          
          {/* ✅ Checklist */}
          <div className="mx-auto w-full max-w-2xl px-6">
            <div className="space-y-3 text-m text-[#11182c]">
              <div className="flex items-start gap-3">
                <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dadada] text-sm text-[#4f4f4f]">
                  ✔
                </span>
                <span>Free Early-Stage Due Diligence Checklist</span>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dadada] text-sm text-[#4f4f4f]">
                  ✔
                </span>
                <span>Free Inventor’s Next Step Guide</span>
              </div>
            </div>
          </div>

          {/* 🔒 Privacy Info Box */}
          <div className="mx-auto w-full max-w-2xl px-6">
            <div className="rounded-2xl bg-[#faf7fe] px-6 py-4 border border-slate-200 
              shadow-[0_0_8px_rgba(0,0,0,0.25)]">
              <p className="text-lg font-semibold text-slate-800">
                All information is private and not seen by me.
              </p>

              <p className="mt-1 text-m leading-relaxed text-[#11182c]">
                Get most of your questions answered without disclosing sensitive details.
                <br />
                Need specific help with your invention? Happy to sign an NDA for full confidentiality.
              </p>
            </div>
          </div>
          {/* 🔵 Book 1-on-1 CTA */}
          <div className="mx-auto w-full max-w-2xl px-6">
            <a
              href="https://maintenance.enzumosstrategy.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-block
                rounded-xl
                bg-[#8bedf8]
                px-5 py-3
                text-left
                text-base font-semibold
                text-[#1b73cd]
                transition
                hover:bg-blue-700
                hover:shadow-[0_0_18px_rgba(59,130,246,0.45)]
                hover:text-white
              "
            >
              Book 1-on-1 Mentoring
            </a>
          </div>

        </div>
)}


        </div>
    </div>

  </div>
);

}

function extractErrorDetail(
  payload: Record<string, unknown> | undefined,
  fallback: string
): string {
  if (!payload) {
    return fallback;
  }

  const error = payload.error;
  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  const details = payload.details;
  if (typeof details === "string") {
    return details;
  }

  if (details && typeof details === "object" && "error" in details) {
    const nestedError = (details as { error?: unknown }).error;
    if (typeof nestedError === "string") {
      return nestedError;
    }
    if (
      nestedError &&
      typeof nestedError === "object" &&
      "message" in nestedError &&
      typeof (nestedError as { message?: unknown }).message === "string"
    ) {
      return (nestedError as { message: string }).message;
    }
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}
