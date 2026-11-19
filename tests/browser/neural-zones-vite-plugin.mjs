import { readFileSync } from 'node:fs';

/**
 * Serve exactly two synthetic fixtures during Vite development. This plugin has
 * no production route, auth bypass, wildcard asset handler or owner-data access.
 */
export function neuralZonesFixtureAssets() {
  const assets = new Map([
    ['/api/assets/nodus-fixture-reference-nd026', { file: new URL('./neural-zones-reference.png', import.meta.url), mime: 'image/png', name: 'storyboard-reference.png' }],
    ['/api/assets/nodus-fixture-script-nd026', { file: new URL('./neural-zones-script.txt', import.meta.url), mime: 'text/plain;charset=utf-8', name: 'story-notes.txt' }],
  ]);
  return {
    name: 'nodus-neural-zones-fixture-assets', apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://nodus-fixture.local');
        const asset = assets.get(url.pathname);
        if (!asset) return next();
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Nodus-Test-Fixture', 'neural-zones-nd026');
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.statusCode = 405; response.end('Synthetic assets are read-only.'); return;
        }
        const bytes = readFileSync(asset.file);
        response.setHeader('Content-Type', asset.mime);
        response.setHeader('Content-Length', String(bytes.byteLength));
        if (url.searchParams.has('download')) response.setHeader('Content-Disposition', `attachment; filename="${asset.name}"`);
        response.end(request.method === 'HEAD' ? undefined : bytes);
      });
    },
  };
}
