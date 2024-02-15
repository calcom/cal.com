import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

export const TOCContext = createContext(undefined)

export const getParents = (entries, id, saveIds) => {
  if (!entries) {
    return undefined
  }

  if (entries.find((e) => e.id === id)) {
    return saveIds
  }

  for (const entry of entries) {
    const parents = getParents(entry.items, id, [...saveIds, entry.id])?.filter(
      Boolean
    )
    if (parents) {
      return parents
    }
  }

  return undefined
}

export const TOCProvider = ({
  entries = [],
  activeId = undefined,
  children = <></>,
}) => {
  const [currentHash, setCurrentHash] = useState(null)

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash)
    }

    window.addEventListener('hashchange', handleHashChange, false)

    handleHashChange()

    return () => {
      window.removeEventListener('hashchange', handleHashChange, false)
    }
  }, [])

  const isParentToActive = useCallback(
    (id) => {
      return !!getParents(entries, activeId, [])?.includes(id)
    },
    [activeId, entries]
  )

  const value = {
    currentHash,
    activeId,
    isParentToActive,
  }
  
  return (
    <TOCContext.Provider value={value}>{children}</TOCContext.Provider>
  )
}

export const useTOC = () => {
  const context = useContext(TOCContext)
  if (context === undefined) {
    throw new Error('useTOC must be used within a TOCProvider')
  }
  return context
}
