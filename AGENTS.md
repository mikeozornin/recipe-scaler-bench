## Learned User Preferences

- Prefers simple flat lists over tables for general text; explicitly asked to convert tables to lists
- Accepts tables in `results.md` for structured experiment data tracking
- Communicates in Russian but accepts English deliverables
- Wants agents to proceed autonomously in the no-questions task variant (task-paper-en.md)
- Prefers plain text lists without excessive formatting headers
- Image generation is available via Nano Banana but may be skipped when it causes friction

## Learned Workspace Facts

- Workspace is a "Design with AI" workshop for benchmarking AI models on UI design tasks
- Product being designed: "Recipe Scaler" — a recipe scaling/cooking assistant app (recipe-scaler.ru)
- Design outputs go to Paper MCP (app.paper.design) and Figma MCP
- Experiment tests models × agents: Claude Code, Codex, Cursor, OpenCode, Kilo Code, Antigravity
- Task variants: `task-paper-en.md` (Paper, 3 screens), `task-paper-en-short.md` (Paper, desktop only), `task-figma-en.md` (Figma, 3 screens), `task-paper-with-questions-en.md` (with 3 clarifying questions)
- `plan.md` tracks experiment matrix grouped by agent with Paper and Figma sections
- `results.md` tracks experiment results in tables (agent/model/time/tokens/cost/comment), organized by Paper/Figma and sorted by agent and by model
- Two experiment phases: Phase 1 (no questions), Phase 2 (up to 3 clarifying questions)
- Screen sizes: desktop 1400px, mobile 375px, promo 1400px
- Pregenerated images for illustrations at adjacent directory `design with ai-tmp`
- Nano Banana image gen uses OpenRouter API with key in `~/.agents/openrouter-imagegen-env.txt`
- Claude Code Frontend Design skill used as additional design quality test variant
