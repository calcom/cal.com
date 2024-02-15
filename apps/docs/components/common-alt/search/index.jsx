import { forwardRef, useCallback, useEffect, useReducer, useRef, useState } from "react"
import Fuse from "fuse.js"
import cn from "classnames"
import { Search as SearchIcon } from "@components/icons-alt/search"
import { Keys } from "@components/uicomp/keys-1"
import { removeFileExtension } from "@utils/files"
import Link from "next/link"

export const SearchResult = ({ result, selected, onMouseOver, onClick }) => {
  return <div
        className={cn("rounded cursor-pointer", {
          "bg-primary-700": selected
        })}
        onMouseOver={onMouseOver}>
      <Link
        className="block m-3"
        href={result.path}
        onClick={onClick}>
        <div className="flex flex-col gap-0.5">
          <div className={cn("text-lg font-semibold break-words md:truncate", {
            "text-white": selected,
            "text-primary-700": !selected
          })}>
            { result.title }
          </div>
          <div className={cn("text-base truncate", {
            "text-white": selected,
            "text-primary-700": !selected
          })}>
            { result.description }
          </div>
          { result.folders.length > 0 &&
            <div className={cn("text-sm mt-0.5 truncate", {
              "text-white": selected,
              "text-primary-700": !selected
            })}>
              { result.folders.join(" › ") }
            </div>
          }
        </div>
      </Link>
    </div>
}

export const SearchResults = ({ results, limit, selectedIndex, setSelectedIndex, onSubmit }) => {
  return <div className="flex flex-col p-3 bg-white rounded-md border border-neutral-200 antialiased z-50">
      { results.slice(0, limit || 5).map((result, i) => {
        return <SearchResult
            selected={i === selectedIndex}
            result={result}
            onMouseOver={() => { setSelectedIndex(i) }}
            onClick={onSubmit}
          />
      })}
    </div>
}

export const SearchInput = forwardRef(({ onKeyDown, onChange, onFocus, showKey, placeholder, idPathMetaMap }, inputRef) => {
  return <div className="relative antialiased group flex flex-row gap-4 items-center">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
        <SearchIcon className="w-5 h-5 text-primary-200 group-focus:text-primary-700" />
      </div>
      <input
        ref={inputRef}
        type="text"
        name="Search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck="false"
        placeholder={placeholder || "Search"}
        onKeyDown={(event) => {
            if (event.key === "Escape") {
              inputRef.current?.blur()
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
            }
            onKeyDown(event)
          }}
        onChange={onChange}
        onFocus={() => {
          onFocus()
        }}
        className="block border-2 bg-white/40 border-primary-200 focus:bg-white focus:border-primary-700 focus:text-primary-700 transition w-full rounded-full py-1.5 text-lg pl-12 pr-8 text-primary-700 placeholder:text-primary-200 focus:outline-none" />
        { !showKey &&
          <div className="absolute inset-y-0 right-0 flex items-center mr-4 pointer-events-none">
            <Keys plain large cmd char="/" />
          </div>
        }
    </div>
})

export const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_LIMIT': {
      return { ...state, limit: action.limit }
    }
    case 'SET_RESULTS': {
      return {
        ...state,
        results: action.results,
        selectedIndex: 0
      }
    }
    case 'SELECT_INDEX': {
      const numItems = state.limit ?
        Math.min(state.limit, state.results.length)
        : state.results.length
      return {
          ...state,
          selectedIndex: action.index % numItems
        }
    }
    case 'SELECT_NEXT': {
      const numItems = state.limit ?
        Math.min(state.limit, state.results.length)
        : state.results.length
      return {
          ...state,
          selectedIndex: (state.selectedIndex + 1) % numItems
        }
    }
    case 'SELECT_PREVIOUS': {
      const numItems = state.limit ?
        Math.min(state.limit, state.results.length)
        : state.results.length
      return {
          ...state,
          selectedIndex: (state.selectedIndex - 1 + numItems) % numItems
        }
    }
  }
}

export const initialState = {
  results: [],
  selectedIndex: 0,
  limit: 0,
}

export const Search = ({ data, limit = 5, placeholder, indexKeys = ['title', 'description'], idPathMetaMap }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const fuseRef = useRef()
  const searchInputRef = useRef()
  const searchResultsRef = useRef()

  useEffect(() => {
    dispatch({ type: "SET_LIMIT", limit })
    fuseRef.current = new Fuse(data, {
      includeScore: true,
      keys: indexKeys
    })
  }, [data, limit])

  useEffect(() => {
    const onKeyDown = () => {
      if (event.key === '/' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const onDocumentClick = useCallback((e) => {
    if (!searchInputRef.current.contains(e.target)
      && !searchResultsRef.current.contains(e.target)) {
      dispatch({ type: 'SET_RESULTS', results: [] })
    }
  }, [])

  useEffect(() => {
    document.addEventListener('click', onDocumentClick, true);
    return () => {
      document.removeEventListener('click', onDocumentClick, true);
    }
  }, [])

  const onKeyDown = useCallback((event) => {
    switch (event.key) {
      case "ArrowDown": dispatch({ type: 'SELECT_NEXT' }); break;
      case "ArrowUp": dispatch({ type: 'SELECT_PREVIOUS' }); break;
      case "Escape": dispatch({ type: 'SET_RESULTS', results: [] }); break;
      case "Enter": {
        dispatch({ type: 'SET_RESULTS', results: [] })
        window.open(state.results[state.selectedIndex]?.path, "_self");
        break;
      }
      default: break
    }
  }, [state])

  const search = useCallback((value) => {
    const fuseResult = fuseRef.current.search(value)
    dispatch({ type: 'SET_RESULTS', results: fuseResult.map(r => r.item) })
  }, [])

  const onFocus = useCallback(() => {
    if (searchInputRef.current.value) {
      search(searchInputRef.current.value)
    }
  }, [search])

  const onBlur = useCallback(() => {
    dispatch({ type: 'SET_RESULTS', results: [] })
  }, [])

  return <div className="flex flex-col">
      <SearchInput
        ref={searchInputRef}
        onKeyDown={onKeyDown}
        onChange={(e) => search(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        idPathMetaMap={idPathMetaMap}
      />
      <div
        ref={searchResultsRef}
        className={cn(
          "relative z-50",
          {
            "opacity-0": state.results.length === 0
          })}>
        <div className="absolute z-50 top-2 w-full md:w-auto md:right-[-320px] left-0 md:top-6">
          <SearchResults
            results={state.results}
            selectedIndex={state.selectedIndex}
            setSelectedIndex={i =>
              dispatch({ type: "SELECT_INDEX", index: i})
            }
            onSubmit={() => { dispatch({ type: 'SET_RESULTS', results: [] }) }}
            limit={state.limit}
          />
        </div>
      </div>
    </div>
}

export const getDescription = (file) => {
  return file.meta?.description
    || file.meta?.meta?.description
    || file.meta?.meta?.["og:description"]
}

export const getTitle = (file) => {
  return file.meta?.title
    || file.meta?.meta?.title
    || (file.name && removeFileExtension(file.name))
}

export const filesToSearchData = (folder, parentFolderNames, rootName = "Home") => {
  const isRoot = !parentFolderNames
  const folders = [
    ...(parentFolderNames || []),
    isRoot ? rootName : folder.name
  ]
  let data = folder.files?.map(f => ({
      path: f.path,
      title: getTitle(f),
      description: getDescription(f),
      folders: folders
    })) || []
  for (const f of (folder.folders || [])) {
    data = data.concat(filesToSearchData(f, folders, rootName))
  }
  return data
}

<Search />