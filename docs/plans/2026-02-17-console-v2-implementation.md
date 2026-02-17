# Console v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the Aleph Cloud console using the data-terminal design system with Next.js 16 App Router, React 19, and React Query.

**Architecture:** Monorepo with two packages: `packages/aleph-sdk` (domain logic extracted from current app) and `packages/console` (Next.js app using data-terminal components). The SDK is framework-agnostic; the console is a thin UI layer over it. React Query replaces the Context+useReducer store for server state.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TanStack React Query, React Hook Form + Zod, Reown SDK, data-terminal design system, Vitest, oxlint, TypeScript 5.9 strict.

**Source design:** `docs/plans/2026-02-17-console-v2-design.md`

**Reference codebases:**
- Current console: `/Users/dio/Library/CloudStorage/Dropbox/Claudio/repos/front-aleph-cloud-page/`
- Design system: `/Users/dio/repos/data-terminal/`

---

## Phase 0: Project Scaffolding

### Task 0.1: Create New Repository & Monorepo Structure

**Files:**
- Create: `aleph-cloud-console/package.json` (workspace root)
- Create: `aleph-cloud-console/pnpm-workspace.yaml`
- Create: `aleph-cloud-console/tsconfig.base.json`
- Create: `aleph-cloud-console/.gitignore`
- Create: `aleph-cloud-console/.npmrc`

**Step 1: Create directory and initialize git**

```bash
mkdir -p ~/repos/aleph-cloud-console
cd ~/repos/aleph-cloud-console
git init
```

**Step 2: Create root package.json**

```json
{
  "name": "aleph-cloud-console",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter console dev",
    "build": "pnpm --filter aleph-sdk build && pnpm --filter console build",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  },
  "packageManager": "pnpm@10.12.1"
}
```

**Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

**Step 4: Create base tsconfig**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 5: Create .gitignore**

```
node_modules/
.next/
dist/
.env
.env.local
*.tsbuildinfo
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo root"
```

---

### Task 0.2: Scaffold Console Package (Next.js 16 App)

**Files:**
- Create: `packages/console/package.json`
- Create: `packages/console/tsconfig.json`
- Create: `packages/console/next.config.ts`
- Create: `packages/console/postcss.config.ts`
- Create: `packages/console/src/app/layout.tsx`
- Create: `packages/console/src/app/globals.css`
- Create: `packages/console/src/app/page.tsx`
- Create: `packages/console/src/lib/cn.ts`

**Step 1: Create package.json**

```json
{
  "name": "console",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack --port 3000",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint src/"
  },
  "dependencies": {
    "next": "16.1.6",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "clsx": "2.1.1",
    "tailwind-merge": "3.4.0",
    "lucide-react": "0.564.0",
    "@tanstack/react-query": "5.80.7",
    "react-hook-form": "7.56.4",
    "@hookform/resolvers": "5.0.1",
    "zod": "3.25.67"
  },
  "devDependencies": {
    "tailwindcss": "4.1.18",
    "@tailwindcss/postcss": "4.1.18",
    "typescript": "5.9.3",
    "@types/node": "25.2.3",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "oxlint": "1.48.0",
    "vitest": "4.0.18"
  }
}
```

**Step 2: Create tsconfig.json extending base**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }],
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Consume data-terminal as source (not published package)
  transpilePackages: ['data-terminal'],
}

export default nextConfig
```

**Step 4: Create postcss.config.ts**

```typescript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
```

**Step 5: Copy theme files from data-terminal**

Copy these files from `~/repos/data-terminal/src/theme/` into `packages/console/src/theme/`:
- `tokens.css`
- `animations.css`
- `utilities.css`
- `fonts.css`

Then create `packages/console/src/app/globals.css`:

```css
@import 'tailwindcss';
@import '../theme/tokens.css';
@import '../theme/animations.css';
@import '../theme/utilities.css';
@import '../theme/fonts.css';

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-border: var(--border);
  --color-border-hover: var(--border-hover);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-error: var(--error);
}

@layer base {
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
  h1, h2, h3, h4 {
    @apply font-heading;
  }
}
```

**Step 6: Create root layout**

```tsx
// packages/console/src/app/layout.tsx
import type { Metadata } from 'next'
import { Titillium_Web, Source_Code_Pro, JetBrains_Mono, Inter } from 'next/font/google'
import './globals.css'

const titillium = Titillium_Web({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700'],
  variable: '--font-titillium',
})

const sourceCode = Source_Code_Pro({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-source-code',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-rigid-square',
})

export const metadata: Metadata = {
  title: 'Aleph Cloud Console',
  description: 'Deploy and manage compute resources on the Aleph network',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${titillium.variable} ${sourceCode.variable} ${jetbrains.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("aleph-console-theme");if(t&&["dark","light","contrast","warm","cool"].includes(t)){document.documentElement.classList.add("theme-"+t)}else{document.documentElement.classList.add("theme-dark")}}catch(e){document.documentElement.classList.add("theme-dark")}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**Step 7: Create placeholder page**

```tsx
// packages/console/src/app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

**Step 8: Create cn utility**

```typescript
// packages/console/src/lib/cn.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

**Step 9: Install dependencies and verify**

```bash
cd ~/repos/aleph-cloud-console
pnpm install
pnpm --filter console dev
```

Expected: Dev server starts on port 3000, redirects to /dashboard (404 for now).

**Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold console package with Next.js 16 and data-terminal theme"
```

---

### Task 0.3: Integrate Data-Terminal Components

**Decision:** Rather than publishing data-terminal as an npm package, symlink it as a workspace dependency or use path imports via `transpilePackages`. This preserves the ability to iterate on both projects simultaneously.

**Files:**
- Modify: `packages/console/package.json` (add data-terminal dependency)
- Modify: `packages/console/tsconfig.json` (add path alias)
- Modify: `pnpm-workspace.yaml` (if using local path)
- Create: `packages/console/src/components/data-terminal.ts` (barrel re-export)

**Step 1: Add data-terminal as local dependency**

Option A — symlink via pnpm workspace (preferred if data-terminal moves into monorepo):
```json
// packages/console/package.json
"dependencies": {
  "data-terminal": "link:../../../repos/data-terminal"
}
```

Option B — use tsconfig paths to import directly:
```json
// packages/console/tsconfig.json
"paths": {
  "@/*": ["./src/*"],
  "@dt/atoms": ["../../../repos/data-terminal/src/atoms"],
  "@dt/molecules": ["../../../repos/data-terminal/src/molecules"],
  "@dt/hooks/*": ["../../../repos/data-terminal/src/hooks/*"],
  "@dt/providers/*": ["../../../repos/data-terminal/src/providers/*"],
  "@dt/lib/*": ["../../../repos/data-terminal/src/lib/*"],
  "@dt/types/*": ["../../../repos/data-terminal/src/types/*"]
}
```

**Step 2: Create barrel re-export for convenience**

```typescript
// packages/console/src/components/data-terminal.ts
// Re-export all data-terminal components for console use
export {
  Badge, BlinkingCursor, Caption, Code, CornerNotch,
  DataStream, DotGrid, FadeIn, GlitchText, GlowBorder,
  GlowLine, Heading, HoverScanline, HudLabel, ProgressBar,
  ScanlineOverlay, ScrollProgressBar, ServiceTag, Skeleton,
  StatusDot, TerminalTopBar, Text, TextFlicker, TypewriterText,
} from '@dt/atoms'

export {
  Accordion, Alert, Button, Card, Checkbox, CodeBlock,
  CommandInput, CopyButton, DataTable, IconButton, Modal,
  MultiSelect, Navbar, ProcessCard, RadioGroup, SearchInput,
  Section, SectionHeading, Select, Sidebar, StatCard,
  StickySection, Textarea, TerminalCard, TerminalModal,
  TerminalPrompt, TerminalTabs, TerminalWindow, ToastContainer,
  Toggle, Tooltip,
} from '@dt/molecules'
```

**Step 3: Verify imports work**

Update `packages/console/src/app/page.tsx` temporarily:
```tsx
import { Heading, Text } from '@/components/data-terminal'

export default function Home() {
  return (
    <main className="p-8">
      <Heading level={1}>Aleph Console</Heading>
      <Text>Design system integration works.</Text>
    </main>
  )
}
```

Run: `pnpm --filter console dev`
Expected: Page renders with data-terminal typography.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: integrate data-terminal design system components"
```

---

### Task 0.4: Set Up Providers (Theme, Toast, React Query)

**Files:**
- Create: `packages/console/src/providers/theme-provider.tsx`
- Create: `packages/console/src/providers/toast-provider.tsx`
- Create: `packages/console/src/providers/query-provider.tsx`
- Create: `packages/console/src/providers/index.tsx`
- Modify: `packages/console/src/app/layout.tsx`

**Step 1: Create theme provider (mirror data-terminal's)**

```tsx
// packages/console/src/providers/theme-provider.tsx
'use client'

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'

export const THEMES = ['dark', 'light', 'contrast', 'warm', 'cool'] as const
export type Theme = (typeof THEMES)[number]

export const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({
  theme: 'dark',
  setTheme: () => {},
})

const STORAGE_KEY = 'aleph-console-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && THEMES.includes(stored as Theme)) {
      setThemeState(stored as Theme)
    }
  }, [])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    const root = document.documentElement
    THEMES.forEach((t) => root.classList.remove(`theme-${t}`))
    root.classList.add(`theme-${newTheme}`)
  }, [])

  return (
    <ThemeContext value={{ theme, setTheme }}>
      {children}
    </ThemeContext>
  )
}
```

**Step 2: Create toast provider (mirror data-terminal's)**

```tsx
// packages/console/src/providers/toast-provider.tsx
'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration: number
}

export interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
})

const MAX_TOASTS = 5

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, MAX_TOASTS))
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext>
  )
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}
```

**Step 3: Create React Query provider**

```tsx
// packages/console/src/providers/query-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 2,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Step 4: Create composed providers**

```tsx
// packages/console/src/providers/index.tsx
'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from '@/providers/theme-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { QueryProvider } from '@/providers/query-provider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
```

**Step 5: Wire providers into layout**

Update `packages/console/src/app/layout.tsx` body:
```tsx
import { Providers } from '@/providers'
import { ToastContainer } from '@/components/data-terminal'

// ... (fonts and metadata unchanged)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <head>{/* theme script */}</head>
      <body>
        <Providers>
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
```

**Step 6: Verify**

Run: `pnpm --filter console dev`
Expected: No errors, page renders with providers active.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add theme, toast, and React Query providers"
```

---

## Phase 1: Application Shell

### Task 1.1: Build Console Layout with Sidebar + Navbar

**Files:**
- Create: `packages/console/src/app/(console)/layout.tsx`
- Create: `packages/console/src/components/shell/console-sidebar.tsx`
- Create: `packages/console/src/components/shell/console-navbar.tsx`
- Create: `packages/console/src/components/shell/sidebar-config.ts`
- Create: `packages/console/src/hooks/use-sidebar.ts`

**Step 1: Define sidebar navigation config**

```typescript
// packages/console/src/components/shell/sidebar-config.ts
import type { NavItem } from '@dt/types/nav'
import {
  LayoutDashboard, Activity, Server, Key,
  HardDrive, Globe, FileCode, Store, Package,
  User, CreditCard,
} from 'lucide-react'
import { createElement } from 'react'

export const sidebarItems: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    children: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: createElement(LayoutDashboard, { size: 18 }) },
      { id: 'monitoring', label: 'Monitoring', href: '/monitoring', icon: createElement(Activity, { size: 18 }) },
    ],
  },
  {
    id: 'compute',
    label: 'Compute',
    children: [
      { id: 'compute-resources', label: 'Compute', href: '/compute', icon: createElement(Server, { size: 18 }) },
      { id: 'ssh-keys', label: 'SSH Keys', href: '/compute/ssh-keys', icon: createElement(Key, { size: 18 }) },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    children: [
      { id: 'volumes', label: 'Volumes', href: '/infrastructure/volumes', icon: createElement(HardDrive, { size: 18 }) },
      { id: 'domains', label: 'Domains', href: '/infrastructure/domains', icon: createElement(Globe, { size: 18 }) },
      { id: 'websites', label: 'Websites', href: '/infrastructure/websites', icon: createElement(FileCode, { size: 18 }) },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    children: [
      { id: 'templates', label: 'Templates', href: '/marketplace/templates', icon: createElement(Store, { size: 18 }) },
      { id: 'images', label: 'Community Images', href: '/marketplace/images', icon: createElement(Package, { size: 18 }) },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    children: [
      { id: 'account', label: 'Account', href: '/settings/account', icon: createElement(User, { size: 18 }) },
      { id: 'billing', label: 'Billing', href: '/settings/billing', icon: createElement(CreditCard, { size: 18 }) },
    ],
  },
]
```

**Step 2: Build console sidebar component**

```tsx
// packages/console/src/components/shell/console-sidebar.tsx
'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/data-terminal'
import { sidebarItems } from '@/components/shell/sidebar-config'

function getActiveId(pathname: string): string {
  for (const group of sidebarItems) {
    for (const item of group.children ?? []) {
      if (item.href && pathname.startsWith(item.href)) {
        return item.id
      }
    }
  }
  return 'dashboard'
}

export function ConsoleSidebar() {
  const pathname = usePathname()
  const activeId = getActiveId(pathname)

  return (
    <Sidebar
      items={sidebarItems}
      activeId={activeId}
      header={
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="font-display text-accent text-sm tracking-wider">
            ALEPH
          </span>
        </div>
      }
    />
  )
}
```

**Step 3: Build console navbar component**

```tsx
// packages/console/src/components/shell/console-navbar.tsx
'use client'

import { Navbar } from '@/components/data-terminal'
import { Button, Badge } from '@/components/data-terminal'
import { Search, Bell, Wallet } from 'lucide-react'

export function ConsoleNavbar() {
  return (
    <Navbar
      logo={
        <span className="font-display text-accent text-base tracking-wider">
          ALEPH CONSOLE
        </span>
      }
      items={[]}
      activeId=""
      actions={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Search size={16} />
            <span className="text-muted-foreground text-xs ml-2">
              Search... <kbd className="ml-1 text-xs opacity-50">⌘K</kbd>
            </span>
          </Button>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Bell size={18} />
          </button>
          <Button variant="primary" size="sm">
            <Wallet size={16} />
            Connect Wallet
          </Button>
        </div>
      }
    />
  )
}
```

**Step 4: Build the console layout**

```tsx
// packages/console/src/app/(console)/layout.tsx
import { ConsoleSidebar } from '@/components/shell/console-sidebar'
import { ConsoleNavbar } from '@/components/shell/console-navbar'

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <ConsoleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ConsoleNavbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Step 5: Move dashboard redirect into console group**

```tsx
// packages/console/src/app/(console)/dashboard/page.tsx
import { Heading, Text } from '@/components/data-terminal'

export default function DashboardPage() {
  return (
    <div>
      <Heading level={1}>Dashboard</Heading>
      <Text variant="muted">Welcome to Aleph Cloud Console</Text>
    </div>
  )
}
```

**Step 6: Verify**

Run: `pnpm --filter console dev`
Expected: Sidebar + navbar shell renders with sidebar navigation. Dashboard page visible.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: build console shell with sidebar and navbar"
```

---

### Task 1.2: Build Error Boundary

**Files:**
- Create: `packages/console/src/components/shell/error-boundary.tsx`
- Modify: `packages/console/src/app/(console)/layout.tsx`

**Step 1: Create error boundary component**

```tsx
// packages/console/src/components/shell/error-boundary.tsx
'use client'

import { Component, type ReactNode } from 'react'
import { Alert, Button, CodeBlock, Heading, Text } from '@/components/data-terminal'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackHref?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8 max-w-2xl mx-auto">
          <Heading level={2}>Something went wrong</Heading>
          <Alert variant="error" className="w-full">
            {this.state.error.message}
          </Alert>
          <CodeBlock language="text" code={this.state.error.stack ?? 'No stack trace available'} />
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => this.setState({ error: null })}>
              Retry
            </Button>
            <Button variant="secondary" href={this.props.fallbackHref ?? '/dashboard'}>
              Go to Dashboard
            </Button>
            <Button
              variant="ghost"
              href="https://github.com/aleph-im/aleph-cloud-console/issues"
            >
              Report Issue
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Step 2: Wrap layout with error boundary**

Add `<ErrorBoundary>` around `{children}` in `packages/console/src/app/(console)/layout.tsx`.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add error boundary with recovery UI"
```

---

### Task 1.3: Build Command Palette

**Files:**
- Create: `packages/console/src/components/shell/command-palette.tsx`
- Create: `packages/console/src/hooks/use-command-palette.ts`
- Modify: `packages/console/src/components/shell/console-navbar.tsx`

**Step 1: Create command palette hook**

```typescript
// packages/console/src/hooks/use-command-palette.ts
'use client'

import { useCallback, useEffect, useState } from 'react'

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, toggle, close])

  return { isOpen, open, close }
}
```

**Step 2: Build command palette component**

```tsx
// packages/console/src/components/shell/command-palette.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalModal, CommandInput, GlowLine, HudLabel } from '@/components/data-terminal'
import { sidebarItems } from '@/components/shell/sidebar-config'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  label: string
  href: string
  group: string
}

function flattenNavItems(): CommandItem[] {
  const items: CommandItem[] = []
  for (const group of sidebarItems) {
    for (const item of group.children ?? []) {
      if (item.href) {
        items.push({
          id: item.id,
          label: item.label,
          href: item.href,
          group: group.label,
        })
      }
    }
  }
  return items
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const allCommands = useMemo(() => flattenNavItems(), [])

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands
    const lower = query.toLowerCase()
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.group.toLowerCase().includes(lower),
    )
  }, [query, allCommands])

  function handleSelect(item: CommandItem) {
    router.push(item.href)
    setQuery('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <TerminalModal isOpen={isOpen} onClose={onClose} size="md" title="Command Palette">
      <div className="flex flex-col gap-4">
        <CommandInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command or search..."
          autoFocus
        />
        <GlowLine />
        <div className="max-h-80 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded transition-colors flex items-center justify-between"
            >
              <span className="font-display text-sm">{item.label}</span>
              <HudLabel>{item.group}</HudLabel>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              No results found
            </p>
          )}
        </div>
      </div>
    </TerminalModal>
  )
}
```

**Step 3: Wire into navbar and layout**

Add command palette state to layout, pass trigger to navbar, render `<CommandPalette>` in layout.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add command palette with Cmd+K navigation"
```

---

## Phase 2: SDK Extraction

### Task 2.1: Scaffold SDK Package

**Files:**
- Create: `packages/aleph-sdk/package.json`
- Create: `packages/aleph-sdk/tsconfig.json`
- Create: `packages/aleph-sdk/src/index.ts`
- Create: `packages/aleph-sdk/src/types/index.ts`
- Create: `packages/aleph-sdk/src/managers/index.ts`
- Create: `packages/aleph-sdk/src/constants.ts`

**Step 1: Create SDK package.json**

```json
{
  "name": "aleph-sdk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "oxlint src/",
    "test": "vitest run"
  },
  "dependencies": {
    "@aleph-sdk/core": "1.1.4",
    "@aleph-sdk/client": "1.1.4",
    "@aleph-sdk/ethereum": "1.1.4",
    "@aleph-sdk/solana": "1.1.4",
    "@aleph-sdk/superfluid": "1.1.4",
    "zod": "3.25.67"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vitest": "4.0.18",
    "oxlint": "1.48.0"
  }
}
```

**Step 2: Copy domain logic from current app**

The following files from the current app's `src/domain/` should be copied into `packages/aleph-sdk/src/`:

```
packages/aleph-sdk/src/
  types/
    entity.ts        <- EntityType, VolumeType, PaymentMethod, CheckoutStepType enums
    instance.ts      <- Instance, AddInstance, InstanceCost types
    volume.ts        <- Volume, AddVolume, VolumeCost types
    domain.ts        <- Domain, AddDomain, DomainStatus types
    ssh.ts           <- SSHKey, AddSSHKey types
    program.ts       <- Program, AddProgram types
    website.ts       <- Website, AddWebsite types
    executable.ts    <- ExecutableStatus, PaymentConfiguration types
    cost.ts          <- CostLine, CostSummary, PricingAggregate types
    connect.ts       <- Blockchain, BlockchainId, blockchains
    index.ts         <- barrel export
  managers/
    base.ts          <- EntityManager<T,AT>, ReadOnlyEntityManager<T> interfaces
    aggregate.ts     <- AggregateManager abstract class
    executable.ts    <- ExecutableManager abstract class
    instance.ts      <- InstanceManager
    gpu-instance.ts  <- GpuInstanceManager
    confidential.ts  <- ConfidentialManager
    volume.ts        <- VolumeManager
    domain.ts        <- DomainManager
    ssh.ts           <- SSHKeyManager
    program.ts       <- ProgramManager
    website.ts       <- WebsiteManager
    cost.ts          <- CostManager
    factory.ts       <- createManagers() factory function
    index.ts         <- barrel export
  schemas/
    base.ts          <- shared Zod schemas
    instance.ts      <- instance validation schemas
    volume.ts        <- volume validation schemas
    program.ts       <- program validation schemas
    website.ts       <- website validation schemas
    domain.ts        <- domain validation schemas
    ssh.ts           <- SSH key validation schemas
    index.ts         <- barrel export
  constants.ts       <- API URLs, channels, addresses
  index.ts           <- root barrel export
```

**This is the largest task in the project.** Each manager file should be copied and minimally adapted:
- Remove React-specific imports
- Remove store dispatch calls (managers should be pure — the React hooks in the console handle state updates)
- Keep all Aleph SDK interactions unchanged
- Keep all Zod schemas unchanged
- Keep all async generator patterns unchanged

**Step 3: Create the manager factory**

```typescript
// packages/aleph-sdk/src/managers/factory.ts
import { AlephHttpClient, AuthenticatedAlephHttpClient } from '@aleph-sdk/client'
import type { Account } from '@aleph-sdk/core'
import { InstanceManager } from '@/managers/instance'
import { GpuInstanceManager } from '@/managers/gpu-instance'
import { ConfidentialManager } from '@/managers/confidential'
import { VolumeManager } from '@/managers/volume'
import { DomainManager } from '@/managers/domain'
import { SSHKeyManager } from '@/managers/ssh'
import { ProgramManager } from '@/managers/program'
import { WebsiteManager } from '@/managers/website'
import { CostManager } from '@/managers/cost'
// ... other managers

export interface AlephManagers {
  instance: InstanceManager
  gpuInstance: GpuInstanceManager
  confidential: ConfidentialManager
  volume: VolumeManager
  domain: DomainManager
  ssh: SSHKeyManager
  program: ProgramManager
  website: WebsiteManager
  cost: CostManager
}

export function createManagers(account?: Account): AlephManagers {
  const sdkClient = account
    ? new AuthenticatedAlephHttpClient(account)
    : new AlephHttpClient()

  // Build in dependency order (same as current app's createDefaultManagers)
  const fileManager = new FileManager(account, undefined, sdkClient)
  const nodeManager = new NodeManager(fileManager, sdkClient, account)
  const costManager = new CostManager(sdkClient)
  const messageManager = new MessageManager(account, sdkClient)
  const sshKeyManager = new SSHKeyManager(account, sdkClient)
  const domainManager = new DomainManager(account, sdkClient)
  const volumeManager = new VolumeManager(account, sdkClient, fileManager)
  const forwardedPortsManager = new ForwardedPortsManager(account, sdkClient)

  const instanceManager = new InstanceManager(
    account, sdkClient, volumeManager, domainManager,
    sshKeyManager, fileManager, nodeManager, costManager,
    forwardedPortsManager,
  )

  const gpuInstanceManager = new GpuInstanceManager(
    account, sdkClient, volumeManager, domainManager,
    sshKeyManager, fileManager, nodeManager, costManager,
    forwardedPortsManager,
  )

  const confidentialManager = new ConfidentialManager(
    account, sdkClient, volumeManager, domainManager,
    sshKeyManager, fileManager, nodeManager, costManager,
    forwardedPortsManager,
  )

  const programManager = new ProgramManager(
    account, sdkClient, volumeManager, domainManager,
    messageManager, fileManager, nodeManager,
  )

  const websiteManager = new WebsiteManager(
    account, sdkClient, volumeManager, domainManager,
  )

  return {
    instance: instanceManager,
    gpuInstance: gpuInstanceManager,
    confidential: confidentialManager,
    volume: volumeManager,
    domain: domainManager,
    ssh: sshKeyManager,
    program: programManager,
    website: websiteManager,
    cost: costManager,
  }
}
```

**Step 4: Verify SDK compiles**

```bash
pnpm --filter aleph-sdk typecheck
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: extract domain logic into aleph-sdk package"
```

---

### Task 2.2: Build React Query Hooks Layer

**Files:**
- Create: `packages/console/src/hooks/use-managers.ts`
- Create: `packages/console/src/hooks/queries/use-instances.ts`
- Create: `packages/console/src/hooks/queries/use-volumes.ts`
- Create: `packages/console/src/hooks/queries/use-domains.ts`
- Create: `packages/console/src/hooks/queries/use-ssh-keys.ts`
- Create: `packages/console/src/hooks/queries/use-programs.ts`
- Create: `packages/console/src/hooks/queries/use-websites.ts`
- Create: `packages/console/src/hooks/queries/index.ts`
- Create: `packages/console/src/hooks/mutations/use-create-instance.ts`
- Create: `packages/console/src/hooks/mutations/use-delete-resource.ts`
- Create: `packages/console/src/providers/managers-provider.tsx`

**Step 1: Create managers context**

```tsx
// packages/console/src/providers/managers-provider.tsx
'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createManagers, type AlephManagers } from 'aleph-sdk'
import { useWalletAccount } from '@/hooks/use-wallet'

const ManagersContext = createContext<AlephManagers | null>(null)

export function ManagersProvider({ children }: { children: ReactNode }) {
  const { account } = useWalletAccount()
  const managers = useMemo(() => createManagers(account), [account])

  return (
    <ManagersContext value={managers}>
      {children}
    </ManagersContext>
  )
}

export function useManagers(): AlephManagers {
  const ctx = useContext(ManagersContext)
  if (!ctx) throw new Error('useManagers must be used within ManagersProvider')
  return ctx
}
```

**Step 2: Build query hooks (one per entity)**

Example pattern for instances (other entities follow the same pattern):

```typescript
// packages/console/src/hooks/queries/use-instances.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useManagers } from '@/providers/managers-provider'
import type { Instance } from 'aleph-sdk'

export const instanceKeys = {
  all: ['instances'] as const,
  detail: (id: string) => ['instances', id] as const,
}

export function useInstances() {
  const { instance } = useManagers()

  return useQuery({
    queryKey: instanceKeys.all,
    queryFn: () => instance.getAll(),
    refetchInterval: 30_000,
  })
}

export function useInstance(id: string) {
  const { instance } = useManagers()

  return useQuery({
    queryKey: instanceKeys.detail(id),
    queryFn: () => instance.get(id),
    enabled: Boolean(id),
  })
}
```

Repeat for: `use-volumes.ts`, `use-domains.ts`, `use-ssh-keys.ts`, `use-programs.ts`, `use-websites.ts`.

**Step 3: Build mutation hooks**

```typescript
// packages/console/src/hooks/mutations/use-delete-resource.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useManagers } from '@/providers/managers-provider'
import { useToast } from '@/providers/toast-provider'

export function useDeleteInstance() {
  const { instance } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      for await (const _ of instance.delSteps(id)) {
        // Each yield is a signing step
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      // Cascade invalidation
      queryClient.invalidateQueries({ queryKey: ['ssh-keys'] })
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['volumes'] })
      addToast({ message: 'Instance deleted', variant: 'success', duration: 5000 })
    },
    onError: (error) => {
      addToast({ message: error.message, variant: 'error', duration: 8000 })
    },
  })
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add React Query hooks for all entity types"
```

---

## Phase 3: Core Pages

### Task 3.1: Dashboard Page

**Files:**
- Modify: `packages/console/src/app/(console)/dashboard/page.tsx`
- Create: `packages/console/src/components/dashboard/stat-cards.tsx`
- Create: `packages/console/src/components/dashboard/resource-health.tsx`
- Create: `packages/console/src/components/dashboard/quick-actions.tsx`
- Create: `packages/console/src/components/dashboard/getting-started.tsx`

Build the dashboard as described in design Section 2. Use `StatCard` for resource counts, `DataTable` + `StatusDot` + `Badge` for resource health, `TerminalCard` + `Checkbox` for onboarding checklist. Query all entity types via React Query hooks.

**Commit:** `feat: build dashboard page with stats, health, and onboarding`

---

### Task 3.2: Shared Resource List Components

**Files:**
- Create: `packages/console/src/components/resources/resource-page-header.tsx`
- Create: `packages/console/src/components/resources/resource-filter-bar.tsx`
- Create: `packages/console/src/components/resources/resource-pagination.tsx`
- Create: `packages/console/src/components/resources/resource-empty-state.tsx`
- Create: `packages/console/src/components/resources/bulk-action-bar.tsx`
- Create: `packages/console/src/components/resources/delete-confirmation-modal.tsx`
- Create: `packages/console/src/hooks/use-resource-list.ts`

Build the shared list view pattern from design Section 3. The `useResourceList` hook manages search, filtering, sorting, pagination, and selection state from URL params. The delete confirmation modal supports both type-to-confirm (high-risk) and simple confirm (low-risk) modes.

**Commit:** `feat: build shared resource list components`

---

### Task 3.3: Compute Page (Tabbed List View)

**Files:**
- Create: `packages/console/src/app/(console)/compute/page.tsx`
- Create: `packages/console/src/components/compute/instances-tab.tsx`
- Create: `packages/console/src/components/compute/gpu-tab.tsx`
- Create: `packages/console/src/components/compute/confidential-tab.tsx`
- Create: `packages/console/src/components/compute/functions-tab.tsx`
- Create: `packages/console/src/components/compute/instance-row-actions.tsx`

Uses `TerminalTabs` with 4 tabs. Each tab renders the shared resource list pattern with entity-specific columns. Row actions include Manage, Stop, Start, Reboot, Delete with appropriate confirmation modals.

**Commit:** `feat: build compute page with tabbed resource lists`

---

### Task 3.4: Infrastructure Pages (Volumes, Domains, Websites)

**Files:**
- Create: `packages/console/src/app/(console)/infrastructure/volumes/page.tsx`
- Create: `packages/console/src/app/(console)/infrastructure/domains/page.tsx`
- Create: `packages/console/src/app/(console)/infrastructure/websites/page.tsx`

Each follows the shared resource list pattern with entity-specific columns. Build all three in one task since they're structurally identical.

**Commit:** `feat: build infrastructure list pages for volumes, domains, websites`

---

### Task 3.5: SSH Keys Page

**Files:**
- Create: `packages/console/src/app/(console)/compute/ssh-keys/page.tsx`
- Create: `packages/console/src/components/ssh/add-ssh-key-modal.tsx`

Uses shared resource list pattern. SSH key creation uses a simple `TerminalModal` (not a wizard) with a `Textarea` for key paste and a `CommandInput` for the label.

**Commit:** `feat: build SSH keys page with add modal`

---

## Phase 4: Creation Wizards

### Task 4.1: Wizard Shell Component

**Files:**
- Create: `packages/console/src/components/wizard/wizard-shell.tsx`
- Create: `packages/console/src/components/wizard/wizard-progress.tsx`
- Create: `packages/console/src/components/wizard/wizard-footer.tsx`
- Create: `packages/console/src/components/wizard/wizard-step.tsx`
- Create: `packages/console/src/hooks/use-wizard.ts`

Build the shared wizard container from design Section 4. The `useWizard` hook manages step state, validation per step, back/next navigation, and localStorage draft auto-save. The footer shows running cost estimate + navigation buttons.

**Commit:** `feat: build wizard shell with progress, navigation, and auto-save`

---

### Task 4.2: Instance Creation Wizard

**Files:**
- Create: `packages/console/src/app/(console)/compute/new/page.tsx`
- Create: `packages/console/src/components/compute/wizard/template-step.tsx`
- Create: `packages/console/src/components/compute/wizard/configure-step.tsx`
- Create: `packages/console/src/components/compute/wizard/access-step.tsx`
- Create: `packages/console/src/components/compute/wizard/networking-step.tsx`
- Create: `packages/console/src/components/compute/wizard/review-step.tsx`
- Create: `packages/console/src/components/compute/wizard/deploy-progress.tsx`

Build the 5-step instance creation wizard from design Section 4. Uses `react-hook-form` with `zodResolver` and `InstanceManager.addSchema`. The deploy progress shows a `TerminalWindow` with real-time step updates from the async generator.

**Commit:** `feat: build instance creation wizard with 5 steps and deploy terminal`

---

### Task 4.3: Volume, Domain, Website Wizards

**Files:**
- Create: `packages/console/src/app/(console)/infrastructure/volumes/new/page.tsx`
- Create: `packages/console/src/app/(console)/infrastructure/domains/new/page.tsx`
- Create: `packages/console/src/app/(console)/infrastructure/websites/new/page.tsx`

Simpler wizards (2-3 steps each). Reuse the wizard shell from Task 4.1.

**Commit:** `feat: build volume, domain, and website creation wizards`

---

## Phase 5: Resource Detail Views

### Task 5.1: Instance Detail Page

**Files:**
- Create: `packages/console/src/app/(console)/compute/[id]/page.tsx`
- Create: `packages/console/src/components/compute/detail/overview-tab.tsx`
- Create: `packages/console/src/components/compute/detail/logs-tab.tsx`
- Create: `packages/console/src/components/compute/detail/networking-tab.tsx`
- Create: `packages/console/src/components/compute/detail/settings-tab.tsx`
- Create: `packages/console/src/components/compute/detail/detail-header.tsx`

Build the tabbed instance detail view from design Section 5. Logs tab uses `TerminalWindow` with the manager's `subscribeLogs` async generator. Settings tab includes danger zone with type-to-confirm delete.

**Commit:** `feat: build instance detail page with overview, logs, networking, settings`

---

### Task 5.2: Volume, Domain, Website Detail Pages

**Files:**
- Create: `packages/console/src/app/(console)/infrastructure/volumes/[id]/page.tsx`
- Create: `packages/console/src/app/(console)/infrastructure/domains/[id]/page.tsx`
- Create: `packages/console/src/app/(console)/infrastructure/websites/[id]/page.tsx`

Simpler detail views (2 tabs each). Domain detail includes DNS configuration `CodeBlock`.

**Commit:** `feat: build volume, domain, and website detail pages`

---

## Phase 6: Wallet & Payments

### Task 6.1: Wallet Connection

**Files:**
- Create: `packages/console/src/providers/wallet-provider.tsx`
- Create: `packages/console/src/hooks/use-wallet.ts`
- Create: `packages/console/src/components/wallet/connect-modal.tsx`
- Create: `packages/console/src/components/wallet/wallet-button.tsx`
- Create: `packages/console/src/components/wallet/chain-badge.tsx`
- Modify: `packages/console/src/components/shell/console-navbar.tsx`
- Modify: `packages/console/src/providers/index.tsx`

Integrate Reown SDK for wallet connection. Build the connect modal (wallet options + chain selection) and connected state UI (address, chain, balance). Wire into navbar.

**Commit:** `feat: integrate wallet connection with Reown SDK`

---

### Task 6.2: Payment Components

**Files:**
- Create: `packages/console/src/components/payment/payment-method-toggle.tsx`
- Create: `packages/console/src/components/payment/cost-breakdown.tsx`
- Create: `packages/console/src/components/payment/checkout-summary.tsx`
- Create: `packages/console/src/components/payment/insufficient-funds-alert.tsx`
- Create: `packages/console/src/hooks/use-cost-estimate.ts`
- Create: `packages/console/src/hooks/use-can-afford.ts`

Build the payment UI components from design Section 7. The `useCostEstimate` hook calls the SDK's `getCost` methods and updates live as wizard form values change.

**Commit:** `feat: build payment components and cost estimation`

---

## Phase 7: Monitoring & Marketplace

### Task 7.1: Monitoring Page

**Files:**
- Create: `packages/console/src/app/(console)/monitoring/page.tsx`
- Create: `packages/console/src/components/monitoring/status-summary.tsx`
- Create: `packages/console/src/components/monitoring/resource-usage.tsx`
- Create: `packages/console/src/components/monitoring/activity-log.tsx`

Build the fleet-wide monitoring dashboard from design Section 2. Uses `ProgressBar` for usage gauges, `TerminalWindow` for activity log, `Badge` for status counts.

**Commit:** `feat: build monitoring page with status, usage, and activity log`

---

### Task 7.2: Templates & Marketplace Pages

**Files:**
- Create: `packages/console/src/app/(console)/marketplace/templates/page.tsx`
- Create: `packages/console/src/app/(console)/marketplace/images/page.tsx`
- Create: `packages/console/src/components/marketplace/template-card.tsx`
- Create: `packages/console/src/components/marketplace/template-grid.tsx`
- Create: `packages/console/src/components/marketplace/image-browse.tsx`
- Create: `packages/console/src/components/marketplace/image-publish.tsx`
- Create: `packages/console/src/data/templates.ts`

Build templates catalog and community images pages from design Section 6. Templates are initially hardcoded JSON in `templates.ts`. Community images page includes the "Create & Publish" tab with docs.aleph.cloud link and publish form.

**Commit:** `feat: build marketplace pages for templates and community images`

---

## Phase 8: Settings & Polish

### Task 8.1: Settings Pages

**Files:**
- Create: `packages/console/src/app/(console)/settings/account/page.tsx`
- Create: `packages/console/src/app/(console)/settings/billing/page.tsx`

Account settings: theme selector, connected wallet info. Billing: payment history, current holds/streams, balance overview.

**Commit:** `feat: build settings and billing pages`

---

### Task 8.2: 404 Page & Loading States

**Files:**
- Create: `packages/console/src/app/not-found.tsx`
- Create: `packages/console/src/app/(console)/loading.tsx`
- Create: `packages/console/src/components/resources/resource-skeleton.tsx`

Build 404 page with `GlitchText` + `DataStream` background. Build loading states using `Skeleton` component for all page types.

**Commit:** `feat: add 404 page and loading skeletons`

---

### Task 8.3: Responsive Design Pass

**Files:**
- Modify: multiple layout and component files

Ensure all pages work at three breakpoints:
- Desktop (>=1024px): full sidebar
- Tablet (768-1023px): collapsed sidebar icon rail
- Mobile (<768px): hidden sidebar with hamburger, stacked layouts

Tables on mobile switch to card-based layout.

**Commit:** `feat: add responsive design for tablet and mobile`

---

### Task 8.4: Final Integration Testing

**Step 1:** Run full build: `pnpm build`
**Step 2:** Run type checker: `pnpm typecheck`
**Step 3:** Run linter: `pnpm lint`
**Step 4:** Manual smoke test of all 20 routes
**Step 5:** Fix any issues found

**Commit:** `fix: address integration issues from final testing`

---

## Summary

| Phase | Tasks | What's Built |
|-------|-------|-------------|
| 0 | 4 tasks | Monorepo, Next.js app, data-terminal integration, providers |
| 1 | 3 tasks | Shell (sidebar, navbar, error boundary, command palette) |
| 2 | 2 tasks | SDK extraction, React Query hooks |
| 3 | 5 tasks | Dashboard, compute, infrastructure, SSH keys list pages |
| 4 | 3 tasks | Wizard shell, instance wizard, other wizards |
| 5 | 2 tasks | Instance detail, other detail pages |
| 6 | 2 tasks | Wallet connection, payment components |
| 7 | 2 tasks | Monitoring, marketplace pages |
| 8 | 4 tasks | Settings, 404, responsive, final testing |

**Total: 27 tasks across 9 phases**

Each phase produces a working, committable increment. Phase 0-1 gives you a navigable shell. Phase 2-3 gives you data-connected list views. Phase 4-5 gives you full CRUD. Phase 6-8 rounds out the product.
