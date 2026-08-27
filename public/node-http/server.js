import { createServer } from "node:http";

import { authLogoutEndpoint } from "./endpoints/auth-logout.js";
import { authMeEndpoint } from "./endpoints/auth-me.js";
import { ssoCallbackEndpoint } from "./endpoints/sso-callback.js";
import { ssoLoginEndpoint } from "./endpoints/sso-login.js";

const appUrl = new URL(
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4100",
);
const routes = new Map([
  ["/api/sso/login", ssoLoginEndpoint],
  ["/api/sso/callback", ssoCallbackEndpoint],
  ["/api/auth/logout", authLogoutEndpoint],
  ["/api/auth/me", authMeEndpoint],
]);

function html(response, body) {
  response.statusCode = 200;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(body);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", appUrl);
  const endpoint = routes.get(url.pathname);
  if (endpoint) {
    await endpoint(request, response);
    return;
  }

  if (url.pathname === "/" || url.pathname === "/login") {
    html(
      response,
      `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8"><title>HAMS SSO Node Sample</title></head>
  <body>
    <h1>HAMS SSO Node.js 샘플</h1>
    <p><a href="/api/sso/login?returnTo=/dashboard">SSO 로그인</a></p>
    <p><a href="/api/auth/me">내 로그인 정보 JSON</a></p>
    <p><a href="/api/auth/logout?returnTo=/">로그아웃</a></p>
  </body>
</html>`,
    );
    return;
  }

  if (url.pathname === "/dashboard") {
    html(
      response,
      `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8"><title>Dashboard</title></head>
  <body>
    <h1>로그인 완료</h1>
    <pre id="user">사용자 정보 조회 중...</pre>
    <p><a href="/api/auth/logout?returnTo=/">로그아웃</a></p>
    <script>
      fetch("/api/auth/me", { credentials: "same-origin" })
        .then((response) => response.json())
        .then((result) => {
          document.querySelector("#user").textContent = JSON.stringify(result, null, 2);
        });
    </script>
  </body>
</html>`,
    );
    return;
  }

  response.statusCode = 404;
  response.end("Not Found");
});

const port = Number(appUrl.port || (appUrl.protocol === "https:" ? 443 : 80));
server.listen(port, () => {
  console.log(`HAMS SSO Node.js sample: ${appUrl.origin}`);
});
