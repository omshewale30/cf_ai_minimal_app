// .wrangler/tmp/bundle-PyGSjS/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/index.ts
var worker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChat(request, env);
    }
    if (url.pathname === "/" || url.pathname.startsWith("/assets") || url.pathname.endsWith(".html") || url.pathname === "/favicon.ico") {
      return serveStatic(env, request);
    }
    return new Response("Not found", { status: 404 });
  }
};
var src_default = worker;
async function handleChat(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.message) {
    return Response.json({ error: "Missing message" }, { status: 400 });
  }
  const roomName = body.room || "default";
  const id = env.CHAT_ROOM.idFromName(roomName);
  const stub = env.CHAT_ROOM.get(id);
  return stub.fetch("https://do/chat", { method: "POST", body: JSON.stringify({ message: body.message }) });
}
async function serveStatic(env, request) {
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
	<\/script>
</body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
var ChatRoom = class {
  state;
  env;
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  // Store last N messages in durable state memory
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/chat" && request.method === "POST") {
      const { message } = await request.json();
      if (!message)
        return Response.json({ error: "Missing message" }, { status: 400 });
      const history = await this.state.storage.get("history") || [];
      history.push({ role: "user", content: message });
      const model = this.env.MODEL || "@cf/meta/llama-3.1-8b-instruct";
      const systemPrompt = "You are a concise helpful assistant. Keep replies short.";
      const response = await this.env.AI.run(model, {
        messages: [
          { role: "system", content: systemPrompt },
          ...history
        ]
      });
      const reply = response?.response ?? "(no response)";
      history.push({ role: "assistant", content: reply });
      await this.state.storage.put("history", history.slice(-20));
      return Response.json({ reply });
    }
    return new Response("Not found", { status: 404 });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
};
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-PyGSjS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}

// .wrangler/tmp/bundle-PyGSjS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker2) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker2;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = function(request, env, ctx) {
    if (worker2.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker2.fetch(request, env, ctx);
  };
  return {
    ...worker2,
    fetch(request, env, ctx) {
      const dispatcher = function(type, init) {
        if (type === "scheduled" && worker2.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker2.scheduled(controller, env, ctx);
        }
      };
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  ChatRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
