'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createManagers, type AlephManagers, type Account } from 'aleph-sdk'
import { useWallet } from '@/providers/wallet-provider'

const ManagersContext = createContext<AlephManagers | null>(null)

export function ManagersProvider({ children }: { children: ReactNode }) {
  const { isConnected, getAlephAccount } = useWallet()
  const [account, setAccount] = useState<Account | undefined>()

  useEffect(() => {
    if (!isConnected) {
      setAccount(undefined)
      return
    }

    let cancelled = false
    getAlephAccount()
      .then((acc) => {
        if (!cancelled) setAccount(acc)
      })
      .catch((err: unknown) => {
        console.error('Failed to resolve Aleph account:', err)
      })

    return () => {
      cancelled = true
    }
  }, [isConnected, getAlephAccount])

  const managers = useMemo(() => createManagers(account), [account])

  return <ManagersContext value={managers}>{children}</ManagersContext>
}

export function useManagers(): AlephManagers {
  const ctx = useContext(ManagersContext)
  if (!ctx) {
    throw new Error('useManagers must be used within ManagersProvider')
  }
  return ctx
}
