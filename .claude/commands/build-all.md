# /build-all

Full build validation: type-check, lint, test, and production build.

## Steps (run in order, stop on first failure)

1. **Type check:** `npx tsc --noEmit`
   - Fix any type errors before proceeding

2. **Lint:** `npx eslint src --ext .ts,.tsx --max-warnings 0`
   - Fix all warnings (zero tolerance in CI)

3. **Format check:** `npx prettier --check "src/**/*.{ts,tsx}"`
   - Run `npx prettier --write "src/**/*.{ts,tsx}"` if fails

4. **Tests:** `npx vitest run --coverage`
   - Must pass: coverage > 70% for utilities, > 60% overall
   - If tests fail, use `@tester` agent to investigate

5. **Production build:** `npx vite build`
   - Bundle size warning if > 2MB (investigate with `npx vite-bundle-analyzer`)

## On success
```
✅ BUILD PASSED
   TypeScript: OK
   ESLint: OK
   Prettier: OK
   Tests: {N} passed ({coverage}% coverage)
   Bundle: {size}MB
   Output: dist/
```

## On failure
Stop at first failure, report the error, and do NOT proceed to next step.
