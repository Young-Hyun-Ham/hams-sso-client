# @hams-fam/sso-client

`hams-oauth`와 서비스 애플리케이션 사이의 SSO 연동을 공통으로 처리하는 패키지입니다.
Next.js 전용 handler와 프레임워크 독립적인 표준 Web API handler를 함께 제공합니다.

## 제공 기능

- SSO 로그인 시작, 콜백 및 로그아웃 Route Handler
- authorization code 교환
- `state` 및 `returnTo` 임시 쿠키 관리
- HMAC 기반 서비스 세션 생성 및 검증
- SSO 서비스 access token의 AES-256-GCM 암호화 쿠키 보관
- Next.js `proxy.ts`용 인증 함수
- 표준 Web `Request`/`Response` 기반 비-Next.js handler
- API Route용 사용자 조회 및 인증 응답
- 로컬 개발용 mock 로그인

Next.js가 파일 위치를 요구하는 `app/**/route.ts`와 루트 `proxy.ts`에는 이 패키지의 함수를 다시 export하는 얇은 adapter만 둡니다.

## 서비스 프로젝트 환경 변수

패키지 폴더가 아니라 이 패키지를 사용하는 서비스의 `.env`에 설정합니다.

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3005
HAMS_OAUTH_SERVER_URL=http://localhost:3000
HAMS_OAUTH_CLIENT_ID=hams-planning-board
HAMS_OAUTH_CLIENT_SECRET=replace-with-issued-client-secret
HAMS_SESSION_SECRET=replace-with-session-secret

# 선택 사항. 생략하면 HAMS_OAUTH_CLIENT_ID를 정규화해 사용합니다.
HAMS_COOKIE_PREFIX=hams_planning_board
HAMS_SSO_SESSION_MAX_AGE_SEC=604800
```

Client Secret과 Session Secret은 브라우저 코드에서 사용하거나 로그에 기록하면 안 됩니다.
`HAMS_SESSION_SECRET`은 서비스마다 서로 다른 난수로 설정합니다.

쿠키 이름은 서비스별 prefix를 사용해 다음과 같이 생성됩니다.

```text
{prefix}_session
{prefix}_sso_access_token
{prefix}_sso_state
{prefix}_sso_return_to
```

`HAMS_COOKIE_PREFIX`를 생략하면 `HAMS_OAUTH_CLIENT_ID`를 소문자로 바꾸고 영문자,
숫자, 밑줄 이외의 문자를 밑줄로 치환합니다. 예를 들어
`hams-planning-board`는 `hams_planning_board`가 됩니다. 같은 hostname에서 실행하는
서비스들은 서로 다른 Client ID 또는 cookie prefix를 사용해야 합니다.

SSO 서버의 중앙 세션 쿠키도 서비스 쿠키와 구분해야 합니다. `hams-oauth`에는 다음과
같이 별도 이름을 설정합니다.

```dotenv
AUTH_SESSION_COOKIE_NAME=hams_oauth_session
```

로그인 콜백이 성공하면 사용자 세션 쿠키와 별도로 SSO 서비스 access token을
암호화된 HttpOnly 쿠키에 저장합니다. API Route에서는 다음 함수로 토큰을 읽어
SSO 서버 전용 API를 호출할 수 있습니다. 토큰은 브라우저 응답이나 Zustand 상태에
포함하지 않습니다.

```ts
import { getSsoAccessTokenFromRequest } from "@hams-fam/sso-client";

const accessToken = getSsoAccessTokenFromRequest(request);
```

access token의 유효기간이 끝나면 `null`이 반환되므로 사용자를 SSO 로그인으로 다시
보내야 합니다.

## 개발용 SSO 우회

서비스 프로젝트의 `.env`에 다음 값을 설정하면 개발 서버에서 SSO 인증 서버를 거치지 않습니다.

```dotenv
NEXT_PUBLIC_DEV_MOCK_LOGIN=true

# 선택 사항: 생략하면 패키지의 기본 mock 사용자 값이 적용됩니다.
HAMS_SSO_DEV_MOCK_USER_ID=dev-user
HAMS_SSO_DEV_MOCK_USER_EMAIL=dev@localhost
HAMS_SSO_DEV_MOCK_USER_LOGIN_ID=dev
HAMS_SSO_DEV_MOCK_USER_NAME=개발자
```

이 설정이 활성화되면 Proxy는 요청을 통과시키고, `getSsoUserFromRequest()`는 mock 사용자를 반환하며, 로그인과 로그아웃 Route는 SSO 서버 대신 서비스 내부 경로로 이동합니다.

안전을 위해 `NODE_ENV=production`에서는 `NEXT_PUBLIC_DEV_MOCK_LOGIN=true`여도 mock 로그인이 비활성화됩니다. 환경 변수 값을 바꾼 후에는 Next.js 개발 서버를 다시 시작해야 합니다.

## 사용 예

### Next.js

```ts
import {
  getSsoUserFromRequest,
  handleSsoCallback,
  handleSsoLogin,
  handleSsoLogout,
  unauthorizedSsoResponse,
} from "@hams-fam/sso-client";

import { createSsoProxy } from "@hams-fam/sso-client/proxy";
```

### 비-Next.js 서비스

Node.js 20 이상에서 표준 Web `Request`와 `Response`를 지원하거나 변환할 수 있는
서버 프레임워크는 `web` 진입점을 사용합니다. 아래 handler는 `next` 패키지를
import하지 않습니다.

```js
import {
  handleAuthMe,
  handleSsoCallback,
  handleSsoLogin,
  handleSsoLogout,
} from "@hams-fam/sso-client/web";
```

다음 URL에 각각 연결합니다.

```text
GET /api/sso/login     -> handleSsoLogin(request)
GET /api/sso/callback  -> handleSsoCallback(request)
GET /api/auth/logout   -> handleSsoLogout(request)
GET /api/auth/me       -> handleAuthMe(request)
```

각 함수는 표준 `Response`를 반환합니다. Express처럼 자체 `req`/`res` 객체를
사용하는 프레임워크에서는 요청을 표준 `Request`로 변환하고, 반환된 status,
headers, body를 프레임워크 응답에 복사하는 얇은 adapter가 필요합니다. 특히
여러 개의 `Set-Cookie` 헤더를 하나로 합치지 않고 각각 전달해야 합니다.

인증·세션 하위 수준 함수만 필요하면 Next.js 의존성이 없는 core 진입점을
사용할 수 있습니다.

```js
import {
  getSsoUserFromRequest,
  verifySsoSessionToken,
} from "@hams-fam/sso-client/core";
```

실행 가능한 Node.js 기본 HTTP 서버 예제는 패키지의
`public/node-http` 디렉터리에 포함되어 있습니다.
