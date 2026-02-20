import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import { useToast } from '@dt/providers/toast-provider'
import { websiteKeys } from '@/hooks/queries/use-websites'
import { volumeKeys } from '@/hooks/queries/use-volumes'
import { domainKeys } from '@/hooks/queries/use-domains'
import type { AddWebsite, Website } from 'aleph-sdk'

export function useCreateWebsite() {
  const { websiteManager } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const stepMessages = [
    'Sign to upload volume to the network',
    'Sign to publish the website record',
  ]

  return useMutation<Website, Error, AddWebsite>({
    mutationFn: async (input) => {
      const steps = websiteManager.addSteps(input)
      let step = 0
      while (true) {
        const { value, done } = await steps.next()
        if (done) return value
        if (step < stepMessages.length) {
          addToast({ message: stepMessages[step]!, variant: 'info' })
        }
        step++
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: websiteKeys.all })
      queryClient.invalidateQueries({ queryKey: volumeKeys.all })
      queryClient.invalidateQueries({ queryKey: domainKeys.all })
      addToast({ message: 'Website created', variant: 'success' })
    },
    onError: (error) => {
      addToast({
        message: error.message,
        variant: 'error',
        duration: 8000,
      })
    },
  })
}
