import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';

// Node's native TypeScript eraser understands .ts, but (unlike the bundler)
// requires an explicit extension. Resolve the application's extensionless local
// imports for these tests without changing the production source.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});
