import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Allow `any` in platform adapter stubs (will tighten later)
      "@typescript-eslint/no-explicit-any": "warn",
      // Enforce consistent returns
      "no-unreachable": "error",
      // No console.log in components (allow in main.ts)
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/**", "src-tauri/**", "node_modules/**", "*.config.*"],
  }
);
