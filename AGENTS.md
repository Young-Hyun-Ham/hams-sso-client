# Repository instructions

## Package release

This repository publishes the public npm package `@hams-fam/sso-client`.

- Never publish implicitly. Run `npm publish` or `pnpm publish` only when the user explicitly asks for an actual npm release.
- Before a release, confirm the working tree and review the diff. Do not include generated `.tgz` files or unrelated changes.
- Keep the version in `package.json` aligned with the intended release. Use semantic versioning; a backward-compatible field addition or fix normally uses a patch version.
- Run `pnpm run build` and `pnpm pack --dry-run` before publishing.
- Confirm the npm account with `npm whoami`. The account must have publish permission for the `@hams-fam` scope; npm may also require 2FA or a granular access token.
- Publish from this directory with `pnpm publish --access public`. Do not use `--no-git-checks` unless the user explicitly accepts bypassing release safeguards.
- After publishing, verify the registry with `npm view @hams-fam/sso-client version` and report the published version.
- Publishing is not complete until consuming services update their dependency and lockfile, reinstall, and pass their own build or type check.

## Release checklist

```powershell
git status --short
git diff --check
pnpm run build
pnpm pack --dry-run
npm whoami
pnpm publish --access public
npm view @hams-fam/sso-client version
```

If `npm whoami` or publishing requires network access or authentication, request the necessary approval instead of changing registry or credential settings.
