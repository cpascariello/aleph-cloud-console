'use client'

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { createManagers, type AlephManagers, type Account } from 'aleph-sdk'

const ManagersContext = createContext<AlephManagers | null>(null)

export function ManagersProvider({
  account,
  children,
}: {
  account?: Account
  children: ReactNode
}) {
  const managers = useMemo(() => createManagers(account), [account])

  return (
    <ManagersContext value={managers}>
      {children}
    </ManagersContext>
  )
}

export function useManagers(): AlephManagers {
  const ctx = useContext(ManagersContext)
  if (!ctx) {
    throw new Error('useManagers must be used within ManagersProvider')
  }
  return ctx
}
