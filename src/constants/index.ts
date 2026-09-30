export const DEFAULT_OPENROUTER_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'inclusionai/ling-3.0-flash-sante:free',
];
export const DISPLAY_OPENROUTER_MODEL =
  process.env.NEXT_PUBLIC_OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODELS[0];
