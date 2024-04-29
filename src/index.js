/// <reference types="@fastly/js-compute" />

import { createFanoutHandoff } from "fastly:fanout"
//import { SecretStore } from "fastly:secret-store"
import { env } from "fastly:env"

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  const req = event.request

  const reqUrl = new URL(req.url)
  const reqPath = reqUrl.pathname
  const pathMatch = reqPath.match(/^\/([0-9a-f]+)(?:\/([a-z\-]+))?$/)

  if (!pathMatch) return new Response("Not found", { status: 404 });

  const channel = pathMatch[1];
  const eventName = pathMatch[2];

  if (req.method === "POST" && eventName) {
    //const store = new SecretStore("cli_web_sync_creds")
    //const apiKeyEntry = await store.get("fanout-api-key")
    //if (!apiKeyEntry) return new Response("No API key available", { status: 400 })
    //const apiKey = apiKeyEntry.plaintext()
    const apiKey = "Vb4Qdy2ufI5cuvivk1M_X42U5mHyxij5";

    const fanoutItem = {
      channel,
      formats: {
        "http-stream": { content: "event: " + eventName + "\ndata: {}\n\n" },
      },
    };
    const payload = JSON.stringify({ items: [fanoutItem] })
    const serviceID = env("FASTLY_SERVICE_ID")
    const resp = await fetch(`https://api.fastly.com/service/${serviceID}/publish/`, {
      method: "post",
      headers: { "Fastly-Key": apiKey, "Content-type": "application/json", Accept: "application/json" },
      body: payload,
      backend: "fastly_api",
    })
    if (!resp.ok) {
      return new Response(null, { status: 502 })
    }
    return new Response(null, { status: 204 })

  } else if (req.headers.has("grip-sig")) {
    return new Response("", {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Grip-Hold": "stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, no-store",
        "Grip-Channel": channel,
      },
    })

  } else {
    return createFanoutHandoff(req, "self")
  }
}
