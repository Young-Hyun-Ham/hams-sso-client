function firstHeader(value) {
  return Array.isArray(value) ? value[0] : value;
}

function requestOrigin(request) {
  const forwardedProtocol = firstHeader(request.headers["x-forwarded-proto"])
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = firstHeader(request.headers["x-forwarded-host"])
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol || (request.socket.encrypted ? "https" : "http");
  const host = forwardedHost || request.headers.host || "localhost";
  return `${protocol}://${host}`;
}

function webHeaders(nodeHeaders) {
  const headers = new Headers();
  Object.entries(nodeHeaders).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  });
  return headers;
}

function setCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const combined = headers.get("set-cookie");
  return combined ? [combined] : [];
}

export function createWebRequest(request) {
  return new Request(new URL(request.url || "/", requestOrigin(request)), {
    method: request.method,
    headers: webHeaders(request.headers),
  });
}

export async function sendWebResponse(nodeResponse, webResponse) {
  nodeResponse.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => {
    if (name.toLowerCase() !== "set-cookie") {
      nodeResponse.setHeader(name, value);
    }
  });

  const cookies = setCookieHeaders(webResponse.headers);
  if (cookies.length > 0) nodeResponse.setHeader("Set-Cookie", cookies);

  nodeResponse.end(Buffer.from(await webResponse.arrayBuffer()));
}

export async function runWebHandler(nodeRequest, nodeResponse, handler) {
  if (nodeRequest.method !== "GET") {
    nodeResponse.statusCode = 405;
    nodeResponse.setHeader("Allow", "GET");
    nodeResponse.end("Method Not Allowed");
    return;
  }

  try {
    const response = await handler(createWebRequest(nodeRequest));
    await sendWebResponse(nodeResponse, response);
  } catch (error) {
    console.error("SSO endpoint failed", error);
    nodeResponse.statusCode = 500;
    nodeResponse.setHeader("Content-Type", "application/json; charset=utf-8");
    nodeResponse.end(
      JSON.stringify({ ok: false, error: "sso_endpoint_failed" }),
    );
  }
}
