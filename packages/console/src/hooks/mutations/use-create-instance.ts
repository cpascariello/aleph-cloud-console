import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import { useToast } from '@dt/providers/toast-provider'
import { instanceKeys } from '@/hooks/queries/use-instances'
import { volumeKeys } from '@/hooks/queries/use-volumes'
import { domainKeys } from '@/hooks/queries/use-domains'
import { sshKeyKeys } from '@/hooks/queries/use-ssh-keys'
import type { AddInstance, Instance } from 'aleph-sdk'

export function useCreateInstance() {
  const { instanceManager } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation<Instance | Instance[], Error, AddInstance>({
    mutationFn: async (input) => {
      let result: Instance | Instance[] | undefined
      for await (const _ of instanceManager.addSteps(input)) {
        // Each yield is a signing step
      }
      result = await instanceManager.get(input.name)
      return result as Instance | Instance[]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.all })
      queryClient.invalidateQueries({ queryKey: sshKeyKeys.all })
      queryClient.invalidateQueries({ queryKey: domainKeys.all })
      queryClient.invalidateQueries({ queryKey: volumeKeys.all })
      addToast({ message: 'Instance created', variant: 'success' })
    },
    onError: (error) => {
      addToast({ message: error.message, variant: 'error', duration: 8000 })
    },
  })
}
