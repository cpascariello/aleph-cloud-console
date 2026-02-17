'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface WizardStep {
  id: string
  label: string
  optional?: boolean
}

export interface UseWizardOptions {
  steps: WizardStep[]
  storageKey?: string
  onComplete?: (data: Record<string, unknown>) => void
}

export interface WizardState {
  currentStep: number
  steps: WizardStep[]
  data: Record<string, unknown>
  isFirst: boolean
  isLast: boolean
  progress: number
  goNext: () => void
  goBack: () => void
  goTo: (step: number) => void
  setStepData: (stepId: string, data: unknown) => void
  getStepData: <T = unknown>(stepId: string) => T | undefined
  canGoNext: boolean
  setCanGoNext: (valid: boolean) => void
  reset: () => void
}

const STORAGE_PREFIX = 'aleph-wizard-'

export function useWizard({
  steps,
  storageKey,
  onComplete,
}: UseWizardOptions): WizardState {
  const fullKey = storageKey ? `${STORAGE_PREFIX}${storageKey}` : null

  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<Record<string, unknown>>(() => {
    if (fullKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(fullKey)
      if (stored) {
        try {
          return JSON.parse(stored) as Record<string, unknown>
        } catch {
          // Ignore corrupt data
        }
      }
    }
    return {}
  })
  const [canGoNext, setCanGoNext] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (fullKey) {
      localStorage.setItem(fullKey, JSON.stringify(data))
    }
  }, [data, fullKey])

  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const progress = steps.length > 1
    ? (currentStep / (steps.length - 1)) * 100
    : 100

  const goNext = useCallback(() => {
    if (isLast) {
      onCompleteRef.current?.(data)
      return
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1))
    setCanGoNext(false)
  }, [isLast, data, steps.length])

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])

  const goTo = useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step)
      }
    },
    [steps.length],
  )

  const setStepData = useCallback(
    (stepId: string, stepData: unknown) => {
      setData((prev) => ({ ...prev, [stepId]: stepData }))
    },
    [],
  )

  const getStepData = useCallback(
    <T = unknown>(stepId: string): T | undefined => {
      return data[stepId] as T | undefined
    },
    [data],
  )

  const reset = useCallback(() => {
    setCurrentStep(0)
    setData({})
    setCanGoNext(false)
    if (fullKey) {
      localStorage.removeItem(fullKey)
    }
  }, [fullKey])

  return useMemo(
    () => ({
      currentStep,
      steps,
      data,
      isFirst,
      isLast,
      progress,
      goNext,
      goBack,
      goTo,
      setStepData,
      getStepData,
      canGoNext,
      setCanGoNext,
      reset,
    }),
    [
      currentStep,
      steps,
      data,
      isFirst,
      isLast,
      progress,
      goNext,
      goBack,
      goTo,
      setStepData,
      getStepData,
      canGoNext,
      setCanGoNext,
      reset,
    ],
  )
}
