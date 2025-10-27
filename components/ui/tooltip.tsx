'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type TooltipProviderContextValue = {
  delayDuration: number
}

const TooltipProviderContext = React.createContext<TooltipProviderContextValue>({
  delayDuration: 0,
})

type TooltipProviderProps = React.PropsWithChildren<{
  delayDuration?: number
}>

function TooltipProvider({ delayDuration = 0, children }: TooltipProviderProps) {
  const value = React.useMemo(
    () => ({ delayDuration }),
    [delayDuration],
  )

  return (
    <TooltipProviderContext.Provider value={value}>
      {children}
    </TooltipProviderContext.Provider>
  )
}

type TooltipContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
  delayDuration: number
  contentId: string
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipContext(component: string) {
  const context = React.useContext(TooltipContext)
  if (!context) {
    throw new Error(`${component} must be used within a <Tooltip> component.`)
  }
  return context
}

type TooltipProps = React.PropsWithChildren<{
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>

function Tooltip({
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: TooltipProps) {
  const { delayDuration } = React.useContext(TooltipProviderContext)
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const contentId = React.useId()

  const isControlled = openProp !== undefined
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

  const value = React.useMemo<TooltipContextValue>(
    () => ({
      open,
      setOpen,
      triggerRef,
      delayDuration,
      contentId,
    }),
    [open, setOpen, delayDuration, contentId],
  )

  return (
    <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
  )
}

type TooltipTriggerProps = {
  asChild?: boolean
} & React.HTMLAttributes<HTMLElement>

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  (
    {
      asChild = false,
      children,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onKeyDown,
      ...rest
    },
    forwardedRef,
  ) => {
    const { open, setOpen, triggerRef, delayDuration, contentId } = useTooltipContext(
      'TooltipTrigger',
    )
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearTimer = React.useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }, [])

    const setRefs = React.useCallback(
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

    const openWithDelay = React.useCallback(() => {
      clearTimer()
      if (delayDuration > 0) {
        timerRef.current = setTimeout(() => setOpen(true), delayDuration)
      } else {
        setOpen(true)
      }
    }, [clearTimer, delayDuration, setOpen])

    const closeTooltip = React.useCallback(() => {
      clearTimer()
      setOpen(false)
    }, [clearTimer, setOpen])

    React.useEffect(() => closeTooltip, [closeTooltip])

    const composedMouseEnter = React.useCallback<React.MouseEventHandler<HTMLElement>>(
      (event) => {
        onMouseEnter?.(event)
        if (!event.defaultPrevented) {
          openWithDelay()
        }
      },
      [onMouseEnter, openWithDelay],
    )

    const composedMouseLeave = React.useCallback<React.MouseEventHandler<HTMLElement>>(
      (event) => {
        onMouseLeave?.(event)
        if (!event.defaultPrevented) {
          closeTooltip()
        }
      },
      [closeTooltip, onMouseLeave],
    )

    const composedFocus = React.useCallback<React.FocusEventHandler<HTMLElement>>(
      (event) => {
        onFocus?.(event)
        if (!event.defaultPrevented) {
          setOpen(true)
        }
      },
      [onFocus, setOpen],
    )

    const composedBlur = React.useCallback<React.FocusEventHandler<HTMLElement>>(
      (event) => {
        onBlur?.(event)
        if (!event.defaultPrevented) {
          closeTooltip()
        }
      },
      [closeTooltip, onBlur],
    )

    const composedKeyDown = React.useCallback<React.KeyboardEventHandler<HTMLElement>>(
      (event) => {
        onKeyDown?.(event)
        if (!event.defaultPrevented && event.key === 'Escape') {
          closeTooltip()
        }
      },
      [closeTooltip, onKeyDown],
    )

    const triggerProps: React.HTMLAttributes<HTMLElement> & { ['data-state']?: string } = {
      ...rest,
      onMouseEnter: composedMouseEnter,
      onMouseLeave: composedMouseLeave,
      onFocus: composedFocus,
      onBlur: composedBlur,
      onKeyDown: composedKeyDown,
      'aria-describedby': open ? contentId : undefined,
      'data-state': open ? 'open' : 'closed',
    }

    if (asChild) {
      if (!React.isValidElement(children)) {
        throw new Error('TooltipTrigger with `asChild` expects a single React element child.')
      }

      const childElement = children as React.ReactElement & {
        ref?: React.Ref<HTMLElement>
      }

      const childProps = {
        ...childElement.props,
        ...triggerProps,
      }

      if (childElement.ref) {
        const existingRef = childElement.ref as React.Ref<HTMLElement>
        childProps.ref = (node: HTMLElement | null) => {
          setRefs(node)
          if (typeof existingRef === 'function') {
            existingRef(node)
          } else if (existingRef) {
            ;(existingRef as React.MutableRefObject<HTMLElement | null>).current = node
          }
        }
      } else {
        childProps.ref = setRefs
      }

      return React.cloneElement(childElement, childProps)
    }

    return React.createElement('button', { type: 'button', ref: setRefs, ...triggerProps }, children)
  },
)

TooltipTrigger.displayName = 'TooltipTrigger'

type TooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  hidden?: boolean
}

function getContentPosition(
  rect: DOMRect,
  side: TooltipContentProps['side'],
  align: TooltipContentProps['align'],
  sideOffset: number,
) {
  const scrollX = window.scrollX ?? window.pageXOffset
  const scrollY = window.scrollY ?? window.pageYOffset
  const alignment = align ?? 'center'
  const positionSide = side ?? 'top'

  const base = {
    top: rect.top + scrollY,
    bottom: rect.bottom + scrollY,
    left: rect.left + scrollX,
    right: rect.right + scrollX,
    centerX: rect.left + rect.width / 2 + scrollX,
    centerY: rect.top + rect.height / 2 + scrollY,
  }

  switch (positionSide) {
    case 'bottom': {
      if (alignment === 'start') {
        return {
          top: base.bottom,
          left: base.left,
          transform: `translate(0, ${sideOffset}px)`,
        }
      }
      if (alignment === 'end') {
        return {
          top: base.bottom,
          left: base.right,
          transform: `translate(-100%, ${sideOffset}px)`,
        }
      }
      return {
        top: base.bottom,
        left: base.centerX,
        transform: `translate(-50%, ${sideOffset}px)`,
      }
    }
    case 'left': {
      if (alignment === 'start') {
        return {
          top: base.top,
          left: base.left,
          transform: `translate(calc(-100% - ${sideOffset}px), 0)`,
        }
      }
      if (alignment === 'end') {
        return {
          top: base.bottom,
          left: base.left,
          transform: `translate(calc(-100% - ${sideOffset}px), -100%)`,
        }
      }
      return {
        top: base.centerY,
        left: base.left,
        transform: `translate(calc(-100% - ${sideOffset}px), -50%)`,
      }
    }
    case 'right': {
      if (alignment === 'start') {
        return {
          top: base.top,
          left: base.right,
          transform: `translate(${sideOffset}px, 0)`,
        }
      }
      if (alignment === 'end') {
        return {
          top: base.bottom,
          left: base.right,
          transform: `translate(${sideOffset}px, -100%)`,
        }
      }
      return {
        top: base.centerY,
        left: base.right,
        transform: `translate(${sideOffset}px, -50%)`,
      }
    }
    default: {
      if (alignment === 'start') {
        return {
          top: base.top,
          left: base.left,
          transform: `translate(0, calc(-100% - ${sideOffset}px))`,
        }
      }
      if (alignment === 'end') {
        return {
          top: base.top,
          left: base.right,
          transform: `translate(-100%, calc(-100% - ${sideOffset}px))`,
        }
      }
      return {
        top: base.top,
        left: base.centerX,
        transform: `translate(-50%, calc(-100% - ${sideOffset}px))`,
      }
    }
  }
}

function getArrowStyle(side: TooltipContentProps['side']) {
  switch (side) {
    case 'bottom':
      return { top: -4, left: '50%', transform: 'translate(-50%, -50%) rotate(45deg)' }
    case 'left':
      return { right: -4, top: '50%', transform: 'translate(50%, -50%) rotate(45deg)' }
    case 'right':
      return { left: -4, top: '50%', transform: 'translate(-50%, -50%) rotate(45deg)' }
    default:
      return { bottom: -4, left: '50%', transform: 'translate(-50%, 50%) rotate(45deg)' }
  }
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      className,
      side = 'top',
      align = 'center',
      sideOffset = 0,
      hidden,
      children,
      style,
      ...rest
    },
    forwardedRef,
  ) => {
    const { open, triggerRef, contentId } = useTooltipContext('TooltipContent')
    const [mounted, setMounted] = React.useState(false)
    const contentRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
      setMounted(true)
    }, [])

    const setRefs = React.useCallback(
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

    if (!mounted || !open || hidden) {
      return null
    }

    if (typeof document === 'undefined') {
      return null
    }

    const trigger = triggerRef.current
    if (!trigger) {
      return null
    }

    const rect = trigger.getBoundingClientRect()
    const position = getContentPosition(rect, side, align, sideOffset)
    const arrowStyle = getArrowStyle(side)

    const content = (
      <div
        ref={setRefs}
        id={contentId}
        role="tooltip"
        data-slot="tooltip-content"
        data-state={open ? 'open' : 'closed'}
        className={cn(
          'bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance shadow-lg',
          className,
        )}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          ...position,
          ...style,
        }}
        {...rest}
      >
        {children}
        <span
          data-slot="tooltip-arrow"
          className="pointer-events-none absolute z-50 block h-2.5 w-2.5 rounded-[2px] bg-foreground"
          style={arrowStyle}
        />
      </div>
    )

    return createPortal(content, document.body)
  },
)

TooltipContent.displayName = 'TooltipContent'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
