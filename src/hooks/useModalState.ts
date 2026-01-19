import { useState, useCallback } from 'react'

/**
 * Hook for managing modal open/close state with optional data.
 * Reduces boilerplate for common modal patterns.
 */
export function useModalState<T = undefined>() {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | undefined>(undefined)

  const open = useCallback((modalData?: T) => {
    setData(modalData)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Clear data after a short delay to allow exit animations
    setTimeout(() => setData(undefined), 200)
  }, [])

  const toggle = useCallback((modalData?: T) => {
    if (isOpen) {
      close()
    } else {
      open(modalData)
    }
  }, [isOpen, open, close])

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData,
  }
}

/**
 * Hook for managing multiple modals at once.
 * Useful when a component has several dialogs.
 */
export function useMultiModalState<T extends string>() {
  const [openModal, setOpenModal] = useState<T | null>(null)
  const [modalData, setModalData] = useState<Record<string, unknown>>({})

  const open = useCallback(<D = unknown>(modal: T, data?: D) => {
    if (data !== undefined) {
      setModalData(prev => ({ ...prev, [modal]: data }))
    }
    setOpenModal(modal)
  }, [])

  const close = useCallback(() => {
    setOpenModal(null)
  }, [])

  const isOpen = useCallback((modal: T) => openModal === modal, [openModal])

  const getData = useCallback(<D = unknown>(modal: T): D | undefined => {
    return modalData[modal] as D | undefined
  }, [modalData])

  return {
    openModal,
    open,
    close,
    isOpen,
    getData,
    setModalData,
  }
}

export type ModalState<T = undefined> = ReturnType<typeof useModalState<T>>
export type MultiModalState<T extends string> = ReturnType<typeof useMultiModalState<T>>
