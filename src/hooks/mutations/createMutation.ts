import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Extract error message from various error types.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}

/**
 * Check if an error is a user cancellation.
 */
export function isCancelledError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  return message.includes('cancelled') || message.includes('canceled') || message.includes('aborted')
}

interface MutationMessages<TData> {
  /**
   * Toast message shown on success
   */
  success?: string | ((data: TData) => string)
  /**
   * Toast message shown on error (if not cancelled)
   */
  error?: string | ((error: unknown) => string)
  /**
   * Toast message shown when mutation starts (loading)
   */
  loading?: string
}

interface CreateMutationConfig<TData, TVariables> {
  /**
   * The mutation function
   */
  mutationFn: (variables: TVariables) => Promise<TData>
  /**
   * Toast messages for success/error/loading states
   */
  messages?: MutationMessages<TData>
  /**
   * Query keys to invalidate on success
   */
  invalidateKeys?: QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[])
  /**
   * Whether to suppress error toasts for cancelled operations
   * @default true
   */
  ignoreCancelled?: boolean
  /**
   * Additional onSuccess callback
   */
  onSuccess?: (data: TData, variables: TVariables) => void
  /**
   * Additional onError callback
   */
  onError?: (error: Error, variables: TVariables) => void
}

/**
 * Factory for creating standardized mutation hooks.
 *
 * Features:
 * - Consistent toast messages for success/error states
 * - Automatic query invalidation
 * - Suppresses error toasts for cancelled operations
 * - Type-safe error extraction
 *
 * @example
 * ```typescript
 * export const useCreateAsset = createMutation({
 *   mutationFn: (params: CreateAssetParams) => window.hymn.createServerAsset(params),
 *   messages: {
 *     success: 'Asset created!',
 *     error: 'Failed to create asset',
 *   },
 *   invalidateKeys: (_, params) => [queryKeys.assets.all(params.projectPath)],
 * })
 * ```
 */
export function createMutation<TData, TVariables>(
  config: CreateMutationConfig<TData, TVariables>
) {
  const {
    mutationFn,
    messages = {},
    invalidateKeys,
    ignoreCancelled = true,
    onSuccess: onSuccessCallback,
    onError: onErrorCallback,
  } = config

  return function useMutationHook() {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn,
      onMutate: () => {
        if (messages.loading) {
          toast.info(messages.loading)
        }
      },
      onSuccess: (data: TData, variables: TVariables) => {
        // Show success toast
        if (messages.success) {
          const message = typeof messages.success === 'function'
            ? messages.success(data)
            : messages.success
          if (message) {
            toast.success(message)
          }
        }

        // Invalidate queries
        if (invalidateKeys) {
          const keys = typeof invalidateKeys === 'function'
            ? invalidateKeys(data, variables)
            : invalidateKeys
          keys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key })
          })
        }

        onSuccessCallback?.(data, variables)
      },
      onError: (error: Error, variables: TVariables) => {
        // Skip error toast for cancelled operations
        if (ignoreCancelled && isCancelledError(error)) {
          return
        }

        // Show error toast
        if (messages.error) {
          const message = typeof messages.error === 'function'
            ? messages.error(error)
            : messages.error
          toast.error(message)
        } else {
          // Default error behavior - show extracted error message
          toast.error(extractErrorMessage(error))
        }

        onErrorCallback?.(error, variables)
      },
    })
  }
}

/**
 * Helper type for mutation result checking.
 * Many IPC handlers return { success: boolean, error?: string }
 */
export interface MutationResult {
  success: boolean
  error?: string
}

/**
 * Checks if a mutation result indicates success.
 * Useful for IPC responses that have a success flag.
 */
export function isSuccessResult(result: MutationResult): boolean {
  return result.success
}

/**
 * Factory for mutations that return a success/error result object.
 * Automatically handles the success flag check.
 */
export function createResultMutation<TData extends MutationResult, TVariables>(
  config: CreateMutationConfig<TData, TVariables> & {
    /**
     * Message to show when result.success is false
     */
    failureMessage?: string | ((result: TData) => string)
  }
) {
  const { failureMessage, messages = {}, onSuccess: userOnSuccess, ...rest } = config

  return createMutation<TData, TVariables>({
    ...rest,
    messages: {
      ...messages,
      success: (data: TData) => {
        if (!data.success) {
          // Don't show success toast if result indicates failure
          return ''
        }
        if (typeof messages.success === 'function') {
          return messages.success(data)
        }
        return messages.success || ''
      },
    },
    onSuccess: (data: TData, variables: TVariables) => {
      if (!data.success) {
        // Show failure message
        const message = typeof failureMessage === 'function'
          ? failureMessage(data)
          : failureMessage || data.error || 'Operation failed'
        toast.error(message)
      }
      userOnSuccess?.(data, variables)
    },
  })
}
