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
    label: "I just have an idea",
    prompt: "I just have an idea",
    icon: "lightbulb",
  },
  {
    label: "I have an invention",
    prompt: "I have an invention",
    icon: "lightbulb",
  },
  {
    label: "I want to license",
    prompt: "I want to license",
    icon: "lightbulb",
  },
  {
    label: "I need next steps",
    prompt: "I need next steps",
    icon: "lightbulb",
  },
];

export const PLACEHOLDER_INPUT = "Select an option above or type your question here to get started.";

export const GREETING = "Hello! Where are you in your inventor journey?";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 220,
      tint: 6,
      shade: theme === "dark" ? -1 : -4,
    },
    accent: {
      primary: theme === "dark" ? "#faf7fe" : "#0f172a",
      level: 1,
    },
     surface: {
        background: '#faf7fe',
        foreground: '#c5f5fa'
      }
  },
  radius: 'pill',
  // Add other theme options here
  // chatkit.studio/playground to explore config options
});
