'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from '@/providers/theme-provider'
import { ToastProvider } from '@dt/providers/toast-provider'
import { QueryProvider } from '@/providers/query-provider'
import { WalletProvider } from '@/providers/wallet-provider'
import { ManagersProvider } from '@/providers/managers-provider'
import { DrawerProvider } from '@/providers/drawer-provider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <WalletProvider>
        <ManagersProvider>
          <ThemeProvider>
            <ToastProvider>
              <DrawerProvider>
                {children}
              </DrawerProvider>
            </ToastProvider>
          </ThemeProvider>
        </ManagersProvider>
      </WalletProvider>
    </QueryProvider>
  )
}
