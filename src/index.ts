export interface Env {
	AI: Ai;
	CHAT_ROOM: DurableObjectNamespace;
	MODEL: string;
	APP_NAME: string;
}

const worker: ExportedHandler<Env> = {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/chat" && request.method === "POST") {
			return handleChat(request, env);
		}

		// Fallback to static assets served from /public
		if (url.pathname === "/" || url.pathname.startsWith("/assets") || url.pathname.endsWith(".html") || url.pathname === "/favicon.ico") {
			return serveStatic(env, request);
		}

		return new Response("Not found", { status: 404 });
	},
};

export default worker;

async function handleChat(request: Request, env: Env): Promise<Response> {
	const body = await request.json().catch(() => null) as { room?: string; message?: string } | null;
	if (!body || !body.message) {
		return Response.json({ error: "Missing message" }, { status: 400 });
	}
	const roomName = body.room || "default";
	const id = env.CHAT_ROOM.idFromName(roomName);
	const stub = env.CHAT_ROOM.get(id);
	return stub.fetch("https://do/chat", { method: "POST", body: JSON.stringify({ message: body.message }) });
}

async function serveStatic(env: Env, request: Request): Promise<Response> {
	// Basic inline HTML as fallback if asset binding not available.
	const html = `<!doctype html>
<html>
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<title>${env.APP_NAME}</title>
	<style>
	body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;margin:0;background:#0f172a;color:#e2e8f0}
	.container{max-width:720px;margin:0 auto;padding:16px}
	header{padding:12px 0;margin-bottom:8px}
	.card{background:#111827;border:1px solid #1f2937;border-radius:8px;padding:12px}
	.row{display:flex;gap:8px}
	input,button{font-size:16px}
	input{flex:1;padding:10px;border-radius:6px;border:1px solid #334155;background:#0b1220;color:#e2e8f0}
	button{padding:10px 14px;border-radius:6px;border:1px solid #334155;background:#2563eb;color:white}
	.chat{display:flex;flex-direction:column;gap:8px;margin-top:12px}
	.msg{padding:10px;border-radius:6px}
	.user{background:#1e293b}
	.ai{background:#0b1220}
	.small{opacity:.7;font-size:12px}
	</style>
</head>
<body>
	<div class="container">
		<header>
			<h2>${env.APP_NAME}</h2>
			<p class="small">Minimal chat using Workers AI (Llama) + Durable Object memory.</p>
		</header>
		<div class="card">
			<div id="chat" class="chat"></div>
			<div class="row">
				<input id="input" placeholder="Type your message..." />
				<button id="send">Send</button>
			</div>
		</div>
	</div>
	<script type="module">
	const chat = document.getElementById('chat');
	const input = document.getElementById('input');
	const send = document.getElementById('send');
	const room = 'default';
	function append(text, who){
		const div = document.createElement('div');
		div.className = 'msg ' + who;
		div.textContent = text;
		chat.appendChild(div);
		chat.scrollTop = chat.scrollHeight;
	}
	send.addEventListener('click', async () => {
		const message = input.value.trim();
		if(!message) return;
		append(message, 'user');
		input.value = '';
		const res = await fetch('/api/chat', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ room, message })});
		if(!res.ok){ append('Error: ' + res.status, 'ai'); return; }
		const data = await res.json();
		append(data.reply, 'ai');
	});
	input.addEventListener('keydown', e => { if(e.key==='Enter') send.click(); });
	</script>
</body>
</html>`;
	return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export class ChatRoom implements DurableObject {
	state: DurableObjectState;
	env: Env;
	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}
	// Store last N messages in durable state memory
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === "/chat" && request.method === "POST") {
			const { message } = await request.json() as { message: string };
			if (!message) return Response.json({ error: "Missing message" }, { status: 400 });

			const history: { role: "user" | "assistant" | "system"; content: string }[] = (await this.state.storage.get("history")) || [];
			history.push({ role: "user", content: message });

			const model = (this.env.MODEL || "@cf/meta/llama-3.1-8b-instruct") as any;
			const systemPrompt = "You are a concise helpful assistant. Keep replies short.";
			const response: any = await (this.env.AI as any).run(model, {
				messages: [
					{ role: "system", content: systemPrompt },
					...history,
				],
			});
			const reply: string = response?.response ?? "(no response)";

			history.push({ role: "assistant", content: reply });
			// Cap memory to last 20 entries
			await this.state.storage.put("history", history.slice(-20));

			return Response.json({ reply });
		}
		return new Response("Not found", { status: 404 });
	}
}
