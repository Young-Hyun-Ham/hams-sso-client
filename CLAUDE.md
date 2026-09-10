# Project notes

Read and follow `AGENTS.md` for the authoritative npm release procedure.

## npm 배포 메모

- npm 패키지: `@hams-fam/sso-client`
- 공개 범위 패키지이므로 배포 명령은 `pnpm publish --access public`을 사용한다.
- 실제 배포는 사용자가 명시적으로 요청한 경우에만 수행한다.
- 배포 전 `package.json` 버전, 변경 diff, `pnpm run build`, `pnpm pack --dry-run`, `npm whoami`를 확인한다.
- npm 조직 권한, 2FA 또는 granular access token이 필요할 수 있다. 인증 정보를 파일이나 로그에 남기지 않는다.
- 배포 후 `npm view @hams-fam/sso-client version`으로 공개된 버전을 확인한다.
- 서비스 프로젝트에서는 새 버전으로 의존성과 lockfile을 갱신하고 빌드 또는 타입 검사를 수행해야 한다.

현재 `0.1.8` 변경에는 서비스 세션 사용자 타입과 HttpOnly 세션 쿠키 payload의
`hampoBalance` 지원이 포함된다. 이 값은 로그인 시점의 스냅샷이므로 잔액 변경 후에는
서비스 세션을 다시 발급해야 최신 값이 반영된다.
