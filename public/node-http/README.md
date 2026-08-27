# 비-Next.js Node HTTP 샘플

Node.js 기본 `http` 서버에서 `@hams-fam/sso-client/web`을 사용하는 예제입니다.
Express나 다른 Node 프레임워크를 사용하지 않으며 Node.js 20.9 이상이 필요합니다.

## 준비

SSO 서버에 다음 서비스 정보를 등록합니다.

```text
서비스 URL: http://localhost:4100
Callback URL: http://localhost:4100/api/sso/callback
```

샘플 디렉터리를 별도 서비스 폴더로 복사한 뒤 환경변수를 설정합니다.

```powershell
Copy-Item .env.example .env
npm install
npm start
```

브라우저에서 `http://localhost:4100`을 열고 `SSO 로그인`을 선택합니다.

## Endpoint 구성

```text
GET /api/sso/login
GET /api/sso/callback
GET /api/auth/logout
GET /api/auth/me
```

각 endpoint 파일은 `@hams-fam/sso-client/web`의 표준 Web handler를 호출합니다.
`http-adapter.js`가 Node의 `IncomingMessage`와 `ServerResponse`를 표준
`Request`와 `Response`로 변환합니다.

## 환경변수

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:4100
HAMS_OAUTH_SERVER_URL=http://localhost:3000
HAMS_OAUTH_CLIENT_ID=sample-node-service
HAMS_OAUTH_CLIENT_SECRET=SSO에서_발급한_Client_Secret
HAMS_SESSION_SECRET=충분히_긴_서비스_세션_난수
HAMS_COOKIE_PREFIX=sample_node_service
HAMS_SSO_SESSION_MAX_AGE_SEC=604800
NEXT_PUBLIC_DEV_MOCK_LOGIN=false
```

Client Secret과 Session Secret은 브라우저 코드나 Git 저장소에 포함하면 안 됩니다.
운영 환경에서 reverse proxy를 사용한다면 원래 프로토콜과 호스트가
`X-Forwarded-Proto`, `X-Forwarded-Host`로 전달되어야 Secure 쿠키와 callback URL이
정상적으로 계산됩니다.
