import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

// export const STARTER_PROMPTS: StartScreenPrompt[] = [
//   {
//     label: "What can you do?",
//     prompt: "What can you do?",
//     icon: "circle-question",
//   },
// ];
export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "My provisional deadline is approaching",
    prompt: "My provisional patent application deadline is approaching. Help me understand the decisions and next steps before the deadline. Give general next steps first. If needed, ask only for a rough time window and broad filing stage. Do not request invention details or confidential documents.",
    icon: "lightbulb",
  },
  {
    label: "I have a patent to license",
    prompt: "I have a patent I want to license to a company. Help me assess my readiness, find a path to potential licensees, and decide what to do next. Give a general licensing-readiness checklist first. If needed, ask one optional question about broad stage or goal. Do not ask what the invention is or how it works.",
    icon: "lightbulb",
  },
  {
    label: "I need a path to market",
    prompt: "I need a path to market for my invention. Help me compare practical commercialization options, including licensing, and identify my next step. Give broad commercialization options first. If needed, ask only whether I am at idea, prototype, filed application, or issued patent stage. Do not request confidential details.",
    icon: "lightbulb",
  },
];

export const PLACEHOLDER_INPUT = "Ask TIMA about licensing";

export const GREETING = "Ask TIMA without describing your invention.";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  colorScheme: theme,
  color: {
    grayscale: {
      hue: 195,
      tint: 4,
      shade: -1,
    },
    accent: {
      primary: "#70e4ed",
      level: 1,
    },
    surface: {
      background: "#1e3741",
      foreground: "#294a55",
    },
  },
  radius: "round",
});
