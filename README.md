# Goldoon (گلدون)
Persian home plant care app: watering reminders, AI-powered watering schedule suggestions, and plant disease detection from photos.

## Features
- Sign in & sign up with email (Supabase Auth)
- Garden: plant cards, today’s status, and weekly watering chart
- Add, edit, and delete plants with photo, type, light, and watering interval
- AI-powered watering interval suggestions
- Smart diagnosis: Persian chat with an AI plant expert, with photo upload support
- Reminders (today / week) and daily device notifications
- Watering history, total waterings, and consecutive days streak
- Profile and account information

## Tech Stack
React 19, TanStack Start & Router, Tailwind CSS 4, Supabase (Postgres + Auth), Vercel AI SDK with any OpenAI-compatible service (default: Google Gemini).

## Getting Started
```sh
cp .env.example .env   # Fill in your Supabase and AI_API_KEY values
npm install
npm run dev            # http://localhost:8080
