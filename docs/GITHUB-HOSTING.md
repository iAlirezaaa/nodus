# Nodus: GitHub hosting feasibility (ND-023)

**Status: Blocked — not a public deployment.** The canonical private source repository is `iAlirezaaa/nodus` and the existing app is `https://nodus-hades.ialirezaaa.chatgpt.site/`.

GitHub Pages only serves static files. The current Nodus is not a static site: `app/api/workspace/route.ts` contains authenticated GET/PUT handlers, `app/chatgpt-auth.ts` depends on the Sites-injected identity, and `.openai/hosting.json` binds Cloudflare D1 (`DB`) and R2 (`BUCKET`) to the existing Site project. A frontend-only Pages export would fail workspace save/reload, attachment access, shared rooms and login. A redirect to the existing Site would not constitute a second working Nodus deployment.

## Safe deployment gate

1. Keep this GitHub repo private and do not expose existing workspaces/attachments or change the audience.
2. Choose a **dynamic server-capable** deployment for a separate GitHub-triggered copy; provision independent persistent DB/object storage, migrate via a reviewed non-destructive plan, and provide a supported authentication design. Do not forward the Sites identity header from an untrusted external client.
3. Confirm the exact hosting service, access policy, new credentials and potential costs before initiating an external deployment. Avoid hard-coding keys and do not use production data as test fixtures.
4. Add a CI workflow and build from the exact guarded GitHub commit; verify Node full tests, project TypeScript, build, auth/session isolation, 390px/mobile and desktop, data import/save/reload, authorization and two-user conflict handling.
5. Publish only after preserving existing Site unchanged and proving the second deployment works with its own authorized backend; record the deployment ID and origin/tree match.

**This execution:** no GitHub Pages site activated, no GitHub Actions workflow changed, no runtime credentials requested or copied, no audience changes. GitHub Pages API configuration was not available through the connected repository tools. The working user-facing readability changes remain on `feat/nd-013-dense-graph-readability` pending full verification.
