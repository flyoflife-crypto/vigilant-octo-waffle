'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Slot } from '@radix-ui/react-slot'

import { cn } from '@/lib/utils'

type TooltipContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  delayDuration: number
  closeDelay: number
  triggerRef: React.MutableRefObject<HTMLElement | null>
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  id: string
}

type TooltipSettings = {
  delayDuration: number
}

const CLOSE_DELAY = 100

const TooltipSettingsContext = React.createContext<TooltipSettings>({ delayDuration: 200 })
const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipSettings() {
  return React.useContext(TooltipSettingsContext)
}

function useTooltipContext(name: string) {
  const context = React.useContext(TooltipContext)
  if (!context) {
    throw new Error(`${name} must be used within a <Tooltip> component`)
  }
  return context
}

function composeEventHandlers<E extends Event | React.SyntheticEvent>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void,
) {
  return (event: E) => {
    theirHandler?.(event)
    if (!('defaultPrevented' in event) || !event.defaultPrevented) {
      ourHandler(event)
    }
  }
}

function assignRef<T>(ref: React.Ref<T | null> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref) {
    ;(ref as React.MutableRefObject<T | null>).current = value
  }
}

function useMergedRefs<T>(...refs: Array<React.Ref<T | null> | undefined>) {
  return React.useCallback(
    (value: T | null) => {
      for (const ref of refs) assignRef(ref, value)
    },
    refs,
  )
}

type TooltipProviderProps = {
  children: React.ReactNode
  delayDuration?: number
}

function TooltipProvider({ children, delayDuration = 200 }: TooltipProviderProps) {
  const value = React.useMemo(() => ({ delayDuration }), [delayDuration])
  return <TooltipSettingsContext.Provider value={value}>{children}</TooltipSettingsContext.Provider>
}

type TooltipProps = {
  children: React.ReactNode
  delayDuration?: number
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Tooltip({
  children,
  delayDuration,
  defaultOpen,
  open: openProp,
  onOpenChange,
}: TooltipProps) {
  const settings = useTooltipSettings()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(defaultOpen ?? false)
  const isControlled = openProp !== undefined
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const id = React.useId()

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  const contextValue = React.useMemo<TooltipContextValue>(
    () => ({
      open,
      setOpen,
      delayDuration: delayDuration ?? settings.delayDuration,
      closeDelay: CLOSE_DELAY,
      triggerRef,
      timerRef,
      id,
    }),
    [open, setOpen, delayDuration, settings.delayDuration, triggerRef, timerRef, id],
  )

  return <TooltipContext.Provider value={contextValue}>{children}</TooltipContext.Provider>
}

type TooltipTriggerProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean
}

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(function TooltipTrigger(
  { asChild = false, onMouseEnter, onMouseLeave, onFocus, onBlur, onKeyDown, ...props },
  forwardedRef,
) {
  const context = useTooltipContext('TooltipTrigger')

  const clearTimer = React.useCallback(() => {
    if (context.timerRef.current) {
      clearTimeout(context.timerRef.current)
      context.timerRef.current = null
    }
  }, [context])

  const openWithDelay = React.useCallback(() => {
    clearTimer()
    context.timerRef.current = setTimeout(() => {
      context.setOpen(true)
    }, context.delayDuration)
  }, [clearTimer, context])

  const closeWithDelay = React.useCallback(() => {
    clearTimer()
    context.timerRef.current = setTimeout(() => {
      context.setOpen(false)
    }, context.closeDelay)
  }, [clearTimer, context])

  const Comp = asChild ? Slot : 'button'
  const ref = useMergedRefs<HTMLElement>(forwardedRef, (node) => {
    context.triggerRef.current = node
  })

  return (
    <Comp
      data-slot="tooltip-trigger"
      data-state={context.open ? 'open' : 'closed'}
      aria-describedby={context.open ? context.id : undefined}
      type={asChild ? undefined : 'button'}
      onMouseEnter={composeEventHandlers(onMouseEnter, openWithDelay)}
      onMouseLeave={composeEventHandlers(onMouseLeave, closeWithDelay)}
      onFocus={composeEventHandlers(onFocus, () => context.setOpen(true))}
      onBlur={composeEventHandlers(onBlur, () => context.setOpen(false))}
      onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
          context.setOpen(false)
        }
      })}
      ref={ref}
      {...props}
    />
  )
})

const ALIGNMENTS = ['start', 'center', 'end'] as const
const SIDES = ['top', 'bottom', 'left', 'right'] as const

type TooltipSide = (typeof SIDES)[number]
type TooltipAlign = (typeof ALIGNMENTS)[number]

type TooltipContentProps = React.ComponentPropsWithoutRef<'div'> & {
  side?: TooltipSide
  align?: TooltipAlign
  sideOffset?: number
  alignOffset?: number
  hidden?: boolean
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(function TooltipContent(
  {
    className,
    children,
    side = 'top',
    align = 'center',
    sideOffset = 8,
    alignOffset = 0,
    hidden,
    style,
    onKeyDown,
    ...props
  },
  forwardedRef,
) {
  const context = useTooltipContext('TooltipContent')
  const [mounted, setMounted] = React.useState(false)
  const [position, setPosition] = React.useState<{ top: number; left: number }>({ top: -9999, left: -9999 })
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  const updatePosition = React.useCallback(() => {
    const trigger = context.triggerRef.current
    const content = contentRef.current
    if (!trigger || !content) return

    const triggerRect = trigger.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    let top = triggerRect.top + window.scrollY
    let left = triggerRect.left + window.scrollX

    if (side === 'top') {
      top -= contentRect.height + sideOffset
    } else if (side === 'bottom') {
      top += triggerRect.height + sideOffset
    } else if (side === 'left') {
      left -= contentRect.width + sideOffset
    } else if (side === 'right') {
      left += triggerRect.width + sideOffset
    }

    if (side === 'top' || side === 'bottom') {
      if (align === 'start') {
        left += alignOffset
      } else if (align === 'end') {
        left += triggerRect.width - contentRect.width + alignOffset
      } else {
        left += (triggerRect.width - contentRect.width) / 2 + alignOffset
      }
    } else {
      if (align === 'start') {
        top += alignOffset
      } else if (align === 'end') {
        top += triggerRect.height - contentRect.height + alignOffset
      } else {
        top += (triggerRect.height - contentRect.height) / 2 + alignOffset
      }
    }

    setPosition({ top, left })
  }, [context.triggerRef, side, align, sideOffset, alignOffset])

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  React.useLayoutEffect(() => {
    if (!context.open || hidden) return
    updatePosition()
  }, [context.open, hidden, updatePosition])

  React.useEffect(() => {
    if (!context.open || hidden) return
    const handle = () => updatePosition()
    window.addEventListener('resize', handle)
    window.addEventListener('scroll', handle, true)
    return () => {
      window.removeEventListener('resize', handle)
      window.removeEventListener('scroll', handle, true)
    }
  }, [context.open, hidden, updatePosition])

  const composedRef = useMergedRefs<HTMLDivElement>(forwardedRef, (node) => {
    contentRef.current = node
  })

  if (!mounted || hidden || !context.open) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      data-slot="tooltip-content"
      data-state={context.open ? 'open' : 'closed'}
      data-side={side}
      data-align={align}
      ref={composedRef}
      id={context.id}
      role="tooltip"
      style={{ position: 'fixed', top: position.top, left: position.left, ...style }}
      className={cn(
        'bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance shadow-sm',
        className,
      )}
      onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
          context.setOpen(false)
        }
      })}
      {...props}
    >
      {children}
    </div>,
    document.body,
  )
})

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
