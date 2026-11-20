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
  let pendingPull = null;
  let closed = false;

  const finishPull = error => {
    if (!pendingPull) return;
    const pull = pendingPull;
    pendingPull = null;
    if (error) pull.reject(error);
    else pull.resolve();
  };

  const stream = new ReadableStream({
    start(value) {
      controller = value;
    },
    pull() {
      if (closed) return;
      return new Promise((resolve, reject) => {
        if (pendingPull) {
          reject(new Error("A download pull is already pending"));
          return;
        }
        pendingPull = { resolve, reject };
        try {
          port.postMessage({ type: "PULL" });
        } catch (error) {
          finishPull(error);
        }
      });
    },
    cancel(reason) {
      closed = true;
      finishPull(new Error(String(reason || "Download cancelled")));
      try {
        port.postMessage({ type: "ABORT", reason: String(reason || "cancelled") });
      } catch (error) {
      }
      try {
        port.close();
      } catch (error) {
      }
      release();
    }
  });

  port.onmessage = event => {
    const message = event.data || {};
    if (closed || !controller) return;
    if (message.type === "CHUNK") {
      if (!pendingPull) {
        closed = true;
        const error = new Error("Unexpected download chunk");
        try {
          controller.error(error);
        } catch (controllerError) {
        }
        try {
          port.postMessage({ type: "ABORT", reason: error.message });
          port.close();
        } catch (portError) {
        }
        release();
        return;
      }
      try {
        controller.enqueue(message.chunk);
        port.postMessage({ type: "ACK", seq: message.seq });
        finishPull();
      } catch (error) {
        closed = true;
        finishPull(error);
        try {
          controller.error(error);
          port.postMessage({ type: "ABORT", reason: error.message || "stream error" });
          port.close();
        } catch (portError) {
        }
        release();
      }
    } else if (message.type === "CLOSE") {
      closed = true;
      try {
        controller.close();
        finishPull();
        port.postMessage({ type: "CLOSED" });
      } catch (error) {
        finishPull(error);
      }
      try {
        port.close();
      } catch (error) {
      }
      release();
    } else if (message.type === "ERROR") {
      closed = true;
      const error = new Error(String(message.message || "Download cancelled"));
      try {
        controller.error(error);
      } catch (controllerError) {
      }
      finishPull(error);
      try {
        port.postMessage({ type: "CLOSED" });
        port.close();
      } catch (portError) {
      }
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
