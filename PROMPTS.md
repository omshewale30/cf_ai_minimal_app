# PROMPTS

This document records the high-level prompts used to build this minimal Cloudflare AI app.

## Initial instruction
- "Set up a minimal Cloudflare Workers app with a Durable Object for chat memory, Workers AI (Llama 3.x) for responses, a basic HTML chat UI, and required docs. Keep it simple."

## System prompt used inside the app
```
You are a concise helpful assistant. Keep replies short.
```

## Development notes
- Use Workers AI `@cf/meta/llama-3.1-8b-instruct` by default and allow override via `MODEL` var
- Store last 20 messages in Durable Object storage as conversation memory
- Provide a single `/api/chat` endpoint and inline HTML UI
