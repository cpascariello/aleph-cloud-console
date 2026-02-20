import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import { useToast } from '@dt/providers/toast-provider'
import { instanceKeys } from '@/hooks/queries/use-instances'
import { volumeKeys } from '@/hooks/queries/use-volumes'
import { domainKeys } from '@/hooks/queries/use-domains'
import { sshKeyKeys } from '@/hooks/queries/use-ssh-keys'
import { programKeys } from '@/hooks/queries/use-programs'
import { websiteKeys } from '@/hooks/queries/use-websites'
import type {
  Instance,
  Volume,
  Domain,
  SSHKey,
  Program,
  Website,
} from 'aleph-sdk'

export function useDeleteInstance() {
  const { instanceManager } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      for await (const _ of instanceManager.delSteps(id)) {
        // Each yield is a signing step
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: instanceKeys.detail(id) })
      queryClient.setQueriesData<Instance[]>(
        { queryKey: instanceKeys.all },
        (old) => Array.isArray(old) ? old.filter((i) => i.id !== id) : old,
      )
      queryClient.invalidateQueries({ queryKey: sshKeyKeys.all })
      queryClient.invalidateQueries({ queryKey: domainKeys.all })
      queryClient.invalidateQueries({ queryKey: volumeKeys.all })
      addToast({ message: 'Instance deleted', variant: 'success' })
    },
    onError: (error) => {
      addToast({ message: error.message, variant: 'error', duration: 8000 })
    },
  })
}

export function useDeleteVolume() {
  const { volumeManager } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      for await (const _ of volumeManager.delSteps(id)) {
        // Each yield is a signing step
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: volumeKeys.detail(id) })
      queryClient.setQueriesData<Volume[]>(
        { queryKey: volumeKeys.all },
        (old) => Array.isArray(old) ? old.filter((v) => v.id !== id) : old,
      )
      addToast({ message: 'Volume deleted', variant: 'success' })
    },
    onError: (error) => {
      addToast({ message: error.message, variant: 'error', duration: 8000 })
    },
  })
}

export function useDeleteDomain() {
  const { domainManager } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      for await (const _ of domainManager.delSteps(id)) {
        // Each yield is a signing step
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: domainKeys.detail(id) })
      queryClient.setQueriesData<Domain[]>(
        { queryKey: domainKeys.all },
        (old) => Array.isArray(old) ? old.filter((d) => d.id !== id) : old,
      )
      addToast({ message: 'Domain deleted', variant: 'success' })
    },
    onError: (error) => {
      addToast({ message: error.message, variant: 'error', duration: 8000 })
    },
  })
}

export function useDeleteSSHKey() {
  const { sshKeyManager } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      for await (const _ of sshKeyManager.delSteps(id)) {
        // Each yield is a signing step
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: sshKeyKeys.detail(id) })
      queryClient.setQueriesData<SSHKey[]>(
        { queryKey: sshKeyKeys.all },
        (old) => Array.isArray(old) ? old.filter((k) => k.id !== id) : old,
      )
      addToast({ message: 'SSH key deleted', variant: 'success' })
    },
    onError: (error) => {
      addToast({ message: error.message, variant: 'error', duration: 8000 })
    },
  })
}

export function useDeleteProgram() {
  const { programManager } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      for await (const _ of programManager.delSteps(id)) {
        // Each yield is a signing step
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: programKeys.detail(id) })
      queryClient.setQueriesData<Program[]>(
        { queryKey: programKeys.all },
        (old) => Array.isArray(old) ? old.filter((p) => p.id !== id) : old,
      )
      queryClient.invalidateQueries({ queryKey: domainKeys.all })
      queryClient.invalidateQueries({ queryKey: volumeKeys.all })
      addToast({ message: 'Function deleted', variant: 'success' })
    },
    onError: (error) => {
      addToast({ message: error.message, variant: 'error', duration: 8000 })
    },
  })
}

export function useDeleteWebsite() {
  const { websiteManager } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      for await (const _ of websiteManager.delSteps(id)) {
        // Each yield is a signing step
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: websiteKeys.detail(id) })
      queryClient.setQueriesData<Website[]>(
        { queryKey: websiteKeys.all },
        (old) => Array.isArray(old) ? old.filter((w) => w.id !== id) : old,
      )
      queryClient.invalidateQueries({ queryKey: domainKeys.all })
      queryClient.invalidateQueries({ queryKey: volumeKeys.all })
      addToast({ message: 'Website deleted', variant: 'success' })
    },
    onError: (error) => {
      addToast({ message: error.message, variant: 'error', duration: 8000 })
    },
  })
}
