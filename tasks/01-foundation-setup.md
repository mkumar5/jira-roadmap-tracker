# Task 01 — Foundation Setup

**Agent:** architect
**Status:** PENDING
**Estimated scope:** ~20 files

## Context
Initialize the Vite + React + TypeScript project with all tooling configured.
This is the foundation — all subsequent tasks build on this.

## Inputs
- Working directory: project root
- Stack: Vite 5, React 18, TypeScript strict
- Package manager: npm

## Steps

### 1. Initialize Vite project
```bash
npm create vite@latest . -- --template react-ts
```
If directory is not empty, use `--force` flag.

### 2. Install all dependencies

**Core:**
```bash
npm install react-router-dom @tanstack/react-query zustand axios date-fns
```

**Salt DS:**
```bash
npm install @salt-ds/core @salt-ds/lab @salt-ds/icons @salt-ds/theme
```

**AG Grid:**
```bash
npm install ag-grid-react ag-grid-community
```

**Dev dependencies:**
```bash
npm install -D @types/react @types/react-dom @types/node
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D msw
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
npm install -D prettier eslint-config-prettier
```

### 3. Configure TypeScript (`tsconfig.json`)
Strict mode with path aliases:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@types/*": ["src/types/*"],
      "@services/*": ["src/services/*"],
      "@hooks/*": ["src/hooks/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 4. Configure Vite (`vite.config.ts`)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@types': resolve(__dirname, './src/types'),
      '@services': resolve(__dirname, './src/services'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/jira': {
        target: process.env.VITE_JIRA_BASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jira/, '/rest/api/3'),
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.VITE_JIRA_EMAIL}:${process.env.VITE_JIRA_API_TOKEN}`
          ).toString('base64')}`,
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/__tests__/'],
    },
  },
});
```

### 5. Create `.env.example`
```env
# Jira Cloud Configuration
VITE_JIRA_HOST=yourorg.atlassian.net
VITE_JIRA_EMAIL=your-email@company.com
VITE_JIRA_API_TOKEN=your-jira-api-token-here

# App Configuration
VITE_APP_NAME=Jira Roadmap Manager
VITE_JIRA_PROJECT_KEYS=PROJ1,PROJ2,PROJ3
VITE_HIERARCHY_STRATEGY=JIRA_PREMIUM

# GitHub (for MCP)
GITHUB_TOKEN=your-github-pat-here
```

### 6. Create `.gitignore` additions
Add to existing .gitignore:
```
.env
.env.local
.env.*.local
sprint-reports/
```

### 7. Create ESLint config (`.eslintrc.json`)
```json
{
  "root": true,
  "env": { "browser": true, "es2020": true },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaVersion": "latest", "sourceType": "module" },
  "plugins": ["react-refresh"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "settings": { "react": { "version": "detect" } }
}
```

### 8. Create Prettier config (`.prettierrc`)
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true
}
```

### 9. Create test setup file
`src/__tests__/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 10. Update `package.json` scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit"
  }
}
```

## Acceptance Criteria
- [ ] `npm run dev` starts the dev server on port 3000
- [ ] `npm run type-check` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run test` runs (even if 0 tests — just no errors)
- [ ] `npm run build` produces a `dist/` folder
- [ ] `.env.example` exists with all required variables documented
- [ ] Path aliases work (`@/`, `@components/`, etc.)

## Output
When done, update `TASK_REGISTRY.md`:
- Mark task 01 as `DONE`
- Note: "Vite + React + TypeScript project initialized with full toolchain"
- Mark task 02 as `IN_PROGRESS`
