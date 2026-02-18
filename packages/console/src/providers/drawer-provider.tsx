'use client'

import { createContext, useCallback, useState } from 'react'
import type { ReactNode } from 'react'

interface DrawerContent {
  content: ReactNode
  title?: string
  tag?: string
  footer?: ReactNode
  onClose?: () => void
}

export interface DrawerContextValue {
  isOpen: boolean
  drawerContent: DrawerContent | null
  openDrawer: (content: DrawerContent) => void
  closeDrawer: () => void
}

export const DrawerContext = createContext<DrawerContextValue | null>(null)

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null)

  const openDrawer = useCallback((content: DrawerContent) => {
    setDrawerContent(content)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerContent((prev) => {
      prev?.onClose?.()
      return null
    })
  }, [])

  return (
    <DrawerContext.Provider
      value={{
        isOpen: drawerContent !== null,
        drawerContent,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </DrawerContext.Provider>
  )
}
