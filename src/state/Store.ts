type Selector<T, S> = (state: T) => S

type Listener<S> = (value: S) => void

type Unsubscribe = () => void

export interface Store<T extends object> {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: <S>(
    selector: Selector<T, S>,
    listener: Listener<S>
  ) => Unsubscribe
  reset: (initial: T) => void
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()
  const selectorMap = new Map<
    Selector<T, unknown>,
    { prev: unknown; listener: Listener<unknown> }
  >()

  function getState(): T {
    return state
  }

  function setState(updater: (prev: T) => T): void {
    const next = updater(state)
    if (next === state) return
    state = next
    for (const notify of listeners) {
      notify()
    }
  }

  function subscribe<S>(
    selector: Selector<T, S>,
    listener: Listener<S>
  ): Unsubscribe {
    const entry = {
      prev: selector(state),
      listener: listener as Listener<unknown>,
    }
    selectorMap.set(selector as Selector<T, unknown>, entry)

    const notify = () => {
      const next = selector(state)
      if (next !== entry.prev) {
        entry.prev = next
        entry.listener(next)
      }
    }

    listeners.add(notify)

    return () => {
      listeners.delete(notify)
      selectorMap.delete(selector as Selector<T, unknown>)
    }
  }

  function reset(initial: T): void {
    state = initial
    for (const notify of listeners) {
      notify()
    }
  }

  return { getState, setState, subscribe, reset }
}
