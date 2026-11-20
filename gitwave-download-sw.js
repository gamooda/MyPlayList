const DOWNLOAD_PREFIX = new URL("__gitwave_download__/", self.registration.scope).pathname;

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(DOWNLOAD_PREFIX)) return;
  let release;
  const lifetime = new Promise(resolve => {
    release = resolve;
  });
  event.waitUntil(lifetime);
  event.respondWith(createDownloadResponse(event, url, release));
});

async function createDownloadResponse(event, url, release) {
  const id = url.pathname.slice(DOWNLOAD_PREFIX.length).split("/")[0];
  let client = event.clientId ? await self.clients.get(event.clientId) : null;
  if (!client) {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    client = clients.find(item => new URL(item.url).origin === self.location.origin) || null;
  }
  if (!client || !/^[A-Za-z0-9_-]{8,100}$/.test(id)) {
    release();
    return new Response("Download unavailable", { status: 404 });
  }

  const fileName = url.searchParams.get("filename") || "download.bin";
  const mime = url.searchParams.get("type") || "application/octet-stream";
  const channel = new MessageChannel();
  const port = channel.port1;
  let controller = null;
  let pending = null;
  let closed = false;

  const stream = new ReadableStream({
    start(value) {
      controller = value;
    },
    pull(value) {
      if (pending) {
        const item = pending;
        pending = null;
        value.enqueue(item.chunk);
        port.postMessage({ type: "ACK", seq: item.seq });
      } else if (!closed) {
        port.postMessage({ type: "PULL" });
      }
    },
    cancel(reason) {
      closed = true;
      try {
        port.postMessage({ type: "ABORT", reason: String(reason || "cancelled") });
        port.close();
      } catch (error) {
        release();
      }
      release();
    }
  });

  port.onmessage = event => {
    const message = event.data || {};
    if (closed || !controller) return;
    if (message.type === "CHUNK") {
      if (pending) {
        closed = true;
        controller.error(new Error("Download stream overflow"));
        try {
          port.postMessage({ type: "ABORT", reason: "overflow" });
          port.close();
        } catch (error) {
        }
        release();
        return;
      }
      if (controller.desiredSize > 0) {
        controller.enqueue(message.chunk);
        port.postMessage({ type: "ACK", seq: message.seq });
      } else {
        pending = { chunk: message.chunk, seq: message.seq };
      }
    } else if (message.type === "CLOSE") {
      closed = true;
      if (pending) {
        controller.enqueue(pending.chunk);
        port.postMessage({ type: "ACK", seq: pending.seq });
        pending = null;
      }
      controller.close();
      port.postMessage({ type: "CLOSED" });
      port.close();
      release();
    } else if (message.type === "ERROR") {
      closed = true;
      controller.error(new Error(String(message.message || "Download cancelled")));
      port.postMessage({ type: "CLOSED" });
      port.close();
      release();
    }
  };
  port.start();
  client.postMessage({ type: "GITWAVE_DOWNLOAD_STREAM", id }, [channel.port2]);

  const fallbackName = fileName.replace(/[\u0000-\u001f\u007f"\\]/g, "_").replace(/[^\x20-\x7E]/g, "_") || "download.bin";
  const disposition = 'attachment; filename="' + fallbackName + '"; filename*=UTF-8\'\'' + encodeURIComponent(fileName);
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
