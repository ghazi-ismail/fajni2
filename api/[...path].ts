import { createApp } from "../server/_core/app";

// Vercel routes /api/* requests to this single serverless Express function.
// The application keeps the existing /api/trpc and /api/oauth contracts.
export default createApp();
