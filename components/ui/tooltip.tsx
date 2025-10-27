'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type TooltipContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
  delayDuration: number
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipContext(component: string) {
  const context = React.useContext(TooltipContext)
  if (!context) {
    throw new Error(`<${component}> must be used within a <Tooltip> component`)
  }
  return context
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
  delayDuration = 200,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: TooltipProps) {
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const isControlled = openProp !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  const value = React.useMemo(
    () => ({ open, setOpen, triggerRef, delayDuration }),
    [open, setOpen, delayDuration],
  )

  return (
    <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
  )
}

type TooltipProviderProps = {
  children: React.ReactNode
}

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

type TooltipTriggerProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean
}

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  (
    {
      asChild = false,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onTouchStart,
      onTouchEnd,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const { triggerRef, setOpen, delayDuration } = useTooltipContext('TooltipTrigger')
    const openTimeout = React.useRef<number | null>(null)
    const closeTimeout = React.useRef<number | null>(null)

    const clearTimers = React.useCallback(() => {
      if (openTimeout.current !== null) window.clearTimeout(openTimeout.current)
      if (closeTimeout.current !== null) window.clearTimeout(closeTimeout.current)
      openTimeout.current = null
      closeTimeout.current = null
    }, [])

    const scheduleOpen = React.useCallback(() => {
      clearTimers()
      openTimeout.current = window.setTimeout(() => setOpen(true), delayDuration)
    }, [clearTimers, delayDuration, setOpen])

    const scheduleClose = React.useCallback(() => {
      clearTimers()
      closeTimeout.current = window.setTimeout(() => setOpen(false), 80)
    }, [clearTimers, setOpen])

    const composedRef = React.useCallback(
      (node: HTMLElement | null) => {
        triggerRef.current = node
        if (typeof forwardedRef === 'function') {
          forwardedRef(node)
        } else if (forwardedRef) {
          ;(forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node
        }
      },
      [forwardedRef, triggerRef],
    )

    React.useEffect(() => clearTimers, [clearTimers])

    const childElement = React.isValidElement(children)
      ? (children as React.ReactElement)
      : null

    const child =
      asChild && childElement
        ? React.cloneElement(childElement, {
            ...props,
            ref: composedRef,
            onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
              childElement.props?.onMouseEnter?.(event)
              onMouseEnter?.(event)
              if (!event.defaultPrevented) scheduleOpen()
            },
            onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
              childElement.props?.onMouseLeave?.(event)
              onMouseLeave?.(event)
              if (!event.defaultPrevented) scheduleClose()
            },
            onFocus: (event: React.FocusEvent<HTMLElement>) => {
              childElement.props?.onFocus?.(event)
              onFocus?.(event)
              if (!event.defaultPrevented) scheduleOpen()
            },
            onBlur: (event: React.FocusEvent<HTMLElement>) => {
              childElement.props?.onBlur?.(event)
              onBlur?.(event)
              if (!event.defaultPrevented) scheduleClose()
            },
            onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
              childElement.props?.onTouchStart?.(event)
              onTouchStart?.(event)
              if (!event.defaultPrevented) scheduleOpen()
            },
            onTouchEnd: (event: React.TouchEvent<HTMLElement>) => {
              childElement.props?.onTouchEnd?.(event)
              onTouchEnd?.(event)
              if (!event.defaultPrevented) scheduleClose()
            },
          })
      : null

    if (child) {
      return child
    }

    return (
      <button
        ref={composedRef as React.Ref<HTMLButtonElement>}
        data-slot="tooltip-trigger"
        onMouseEnter={(event) => {
          onMouseEnter?.(event)
          if (!event.defaultPrevented) scheduleOpen()
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event)
          if (!event.defaultPrevented) scheduleClose()
        }}
        onFocus={(event) => {
          onFocus?.(event)
          if (!event.defaultPrevented) scheduleOpen()
        }}
        onBlur={(event) => {
          onBlur?.(event)
          if (!event.defaultPrevented) scheduleClose()
        }}
        onTouchStart={(event) => {
          onTouchStart?.(event)
          if (!event.defaultPrevented) scheduleOpen()
        }}
        onTouchEnd={(event) => {
          onTouchEnd?.(event)
          if (!event.defaultPrevented) scheduleClose()
        }}
        {...props}
      >
        {children}
      </button>
    )
  },
)
TooltipTrigger.displayName = 'TooltipTrigger'

type TooltipContentProps = React.ComponentPropsWithoutRef<'div'> & {
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  hidden?: boolean
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = 'top', align = 'center', sideOffset = 6, hidden, style, children, ...props }, forwardedRef) => {
    const { open, triggerRef } = useTooltipContext('TooltipContent')
    const contentRef = React.useRef<HTMLDivElement | null>(null)
    const combinedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node
        if (typeof forwardedRef === 'function') {
          forwardedRef(node)
        } else if (forwardedRef) {
          ;(forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      },
      [forwardedRef],
    )

    const [position, setPosition] = React.useState<{ top: number; left: number }>({ top: -9999, left: -9999 })

    React.useLayoutEffect(() => {
      if (!open || hidden) return
      if (typeof window === 'undefined' || !triggerRef.current) return
      const triggerRect = triggerRef.current.getBoundingClientRect()
      let top = triggerRect.top
      let left = triggerRect.left
      const spacing = sideOffset

      switch (side) {
        case 'bottom':
          top = triggerRect.bottom + spacing
          break
        case 'left':
          top = triggerRect.top + triggerRect.height / 2
          left = triggerRect.left - spacing
          break
        case 'right':
          top = triggerRect.top + triggerRect.height / 2
          left = triggerRect.right + spacing
          break
        case 'top':
        default:
          top = triggerRect.top - spacing
          break
      }

      if (side === 'top' || side === 'bottom') {
        if (align === 'start') {
          left = triggerRect.left
        } else if (align === 'end') {
          left = triggerRect.right
        } else {
          left = triggerRect.left + triggerRect.width / 2
        }
      } else {
        if (align === 'start') {
          top = triggerRect.top
        } else if (align === 'end') {
          top = triggerRect.bottom
        }
      }

      setPosition({ top, left })
    }, [open, hidden, side, align, sideOffset, triggerRef])

    const rendered = open && !hidden && typeof document !== 'undefined'

    if (!rendered) {
      return null
    }

    const baseClasses = cn(
      'z-50 origin-center rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md',
      'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
      'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
      className,
    )

    const portalNode = (
      <div
        ref={combinedRef}
        role="tooltip"
        data-slot="tooltip-content"
        data-side={side}
        data-align={align}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          transform:
            side === 'top' || side === 'bottom'
              ? align === 'start'
                ? 'translateX(0) translateY(-100%)'
                : align === 'end'
                  ? 'translateX(-100%) translateY(-100%)'
                  : 'translateX(-50%) translateY(-100%)'
              : side === 'left'
                ? 'translateX(-100%) translateY(-50%)'
                : 'translateX(0) translateY(-50%)',
          ...style,
        }}
        className={baseClasses}
        {...props}
      >
        {children}
      </div>
    )

    return createPortal(portalNode, document.body)
  },
)
TooltipContent.displayName = 'TooltipContent'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
