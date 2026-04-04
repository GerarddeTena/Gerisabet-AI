import { useState, useCallback } from 'react'
import {
  addToHistory,
  navigateHistoryUp,
  navigateHistoryDown,
  resetHistoryNavigation,
  searchHistory,
} from '../history'

export function useCommandHistory() {
  const [currentInput, setCurrentInput] = useState('')
  const [isNavigating, setIsNavigating] = useState(false)

  const addEntry = useCallback((input: string) => {
    addToHistory(input)
  }, [])

  const navigateUp = useCallback(() => {
    const prev = navigateHistoryUp(currentInput)
    if (prev !== currentInput) {
      setCurrentInput(prev)
      setIsNavigating(true)
    }
    return prev
  }, [currentInput])

  const navigateDown = useCallback(() => {
    const next = navigateHistoryDown(currentInput)
    setCurrentInput(next)
    if (!next) setIsNavigating(false)
    return next
  }, [currentInput])

  const reset = useCallback(() => {
    resetHistoryNavigation()
    setIsNavigating(false)
  }, [])

  const search = useCallback((query: string) => {
    return searchHistory(query)
  }, [])

  return {
    currentInput,
    setCurrentInput,
    isNavigating,
    addEntry,
    navigateUp,
    navigateDown,
    reset,
    search,
  }
}
