import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export const Cursor = ({ children }) => {
  const ref = useRef()
  const [state, setState] = useState({
    top: -50,
    left: 1000,
    opacity: 0
  })

  const onMouseMove = useCallback((event) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    setState({
        top: event.clientY - rect.top - 10,
        left: event.clientX - rect.left + 10,
        opacity: 1
      });
  }, [])

  const onMouseLeave = useCallback(() => {
    setState(s => ({ ...s, opacity: 0 }))
  }, [])

  const letters = useMemo(
    () => {
      return children.split('').map((l, i) => (
        <div
          key={`${l}_${i}`}
          className="absolute font-mono select-none"
          style={{
            transform: `translate(${state.left + i * 10}px, ${state.top}px)`,
            transition: `transform ${20*i*1.5}ms ease-out ${i * 0.8}ms` }}
        >
          <div
            className="transition duration-300"
            style={{
              opacity: state.opacity,
              animation: 'bounce 1.5s infinite',
              animationDelay: `${50*i}ms`
            }}>
            {l}
          </div>
        </div>
      ))
    },
    [children, state]
  );

  return <div
      ref={ref}
      className="relative w-full h-full"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      >{letters}</div>
}

<div className="w-80 h-80 bg-red-100 m-48">
  <Cursor>Try me out!</Cursor>
</div>