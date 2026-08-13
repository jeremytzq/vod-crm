// Vercel's Node.js runtime discovers serverless functions under api/ and
// calls the default export per-request. This just re-exports the same
// Express app used for local/traditional hosting (see src/index.js) — one
// codebase, two entrypoints.
export { default } from '../src/index.js';
