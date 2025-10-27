'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type TooltipDelayContextValue = number

const TooltipDelayContext = React.createContext<TooltipDelayContextValue>(0)

interface TooltipContextValue {
  open: boolean
  setOpen: (value: boolean) => void
  triggerRef: React.RefObject<HTMLElement>
  delay: number
  contentId: string
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipContext(component: string): TooltipContextValue {
  const context = React.useContext(TooltipContext)
  if (!context) {
    throw new Error(`${component} must be used within a <Tooltip> component`)
  }
  return context
}

function TooltipProvider({
  delayDuration = 0,
  children,
}: {
  delayDuration?: number
  children: React.ReactNode
}) {
  return (
    <TooltipDelayContext.Provider value={delayDuration}>
      {children}
    </TooltipDelayContext.Provider>
  )
}

type TooltipProps = {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Tooltip({ defaultOpen, open: openProp, onOpenChange, children }: TooltipProps) {
  const delay = React.useContext(TooltipDelayContext)
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const triggerRef = React.useRef<HTMLElement>(null)
  const id = React.useId()

  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolledOpen

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
    () => ({ open, setOpen, triggerRef, delay, contentId: id }),
    [open, setOpen, delay, id],
  )

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
}

function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') {
        ref(node)
      } else {
        ;(ref as React.MutableRefObject<T | null>).current = node
      }
    }
  }
}

function composeEventHandlers<E extends React.SyntheticEvent>(
  handler: ((event: E) => void) | undefined,
  listener: (event: E) => void,
) {
  return (event: E) => {
    handler?.(event)
    if (!event.defaultPrevented) {
      listener(event)
    }
  }
}

type TooltipTriggerProps = {
  asChild?: boolean
  children: React.ReactNode
} & React.ComponentPropsWithoutRef<'button'>

function TooltipTrigger({ asChild = false, children, ...props }: TooltipTriggerProps) {
  const context = useTooltipContext('TooltipTrigger')
  const delay = context.delay
  const openTimer = React.useRef<NodeJS.Timeout | null>(null)

  const handleOpen = React.useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
    }
    openTimer.current = setTimeout(() => context.setOpen(true), delay)
  }, [context, delay])

  const handleClose = React.useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
    context.setOpen(false)
  }, [context])

  React.useEffect(() => () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
    }
  }, [])

  const triggerProps: React.ComponentPropsWithoutRef<'button'> = {
    'data-slot': 'tooltip-trigger',
    'data-state': context.open ? 'open' : 'closed',
    'aria-describedby': context.open ? context.contentId : undefined,
    ...props,
    ref: composeRefs((props as { ref?: React.Ref<HTMLElement> }).ref, context.triggerRef),
    onPointerEnter: composeEventHandlers(props.onPointerEnter, handleOpen),
    onPointerLeave: composeEventHandlers(props.onPointerLeave, handleClose),
    onFocus: composeEventHandlers(props.onFocus, handleOpen),
    onBlur: composeEventHandlers(props.onBlur, handleClose),
    onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }),
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement
    return React.cloneElement(child, {
      ...triggerProps,
      ref: composeRefs((child as { ref?: React.Ref<HTMLElement> }).ref, triggerProps.ref),
    })
  }

  return (
    <button type="button" {...triggerProps}>
      {children}
    </button>
  )
}

type TooltipContentProps = {
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  hidden?: boolean
} & React.ComponentPropsWithoutRef<'div'>

function TooltipContent({
  className,
  side = 'top',
  align = 'center',
  sideOffset = 0,
  hidden,
  style,
  children,
  ...props
}: TooltipContentProps) {
  const context = useTooltipContext('TooltipContent')
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<{ top: number; left: number }>({ top: -9999, left: -9999 })

  const updatePosition = React.useCallback(() => {
    const trigger = context.triggerRef.current
    const content = contentRef.current
    if (!trigger || !content) return

    const triggerRect = trigger.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()

    let top = triggerRect.top + window.scrollY
    let left = triggerRect.left + window.scrollX

    switch (side) {
      case 'bottom':
        top = triggerRect.bottom + window.scrollY + sideOffset
        break
      case 'top':
        top = triggerRect.top + window.scrollY - contentRect.height - sideOffset
        break
      case 'left':
        top = triggerRect.top + window.scrollY + (triggerRect.height - contentRect.height) / 2
        left = triggerRect.left + window.scrollX - contentRect.width - sideOffset
        break
      case 'right':
        top = triggerRect.top + window.scrollY + (triggerRect.height - contentRect.height) / 2
        left = triggerRect.right + window.scrollX + sideOffset
        break
      default:
        break
    }

    if (side === 'top' || side === 'bottom') {
      switch (align) {
        case 'start':
          left = triggerRect.left + window.scrollX
          break
        case 'end':
          left = triggerRect.right + window.scrollX - contentRect.width
          break
        default:
          left = triggerRect.left + window.scrollX + (triggerRect.width - contentRect.width) / 2
      }
    } else {
      switch (align) {
        case 'start':
          top = triggerRect.top + window.scrollY
          break
        case 'end':
          top = triggerRect.bottom + window.scrollY - contentRect.height
          break
        default:
          // center already handled above
          break
      }
    }

    setPosition({ top, left })
  }, [align, context.triggerRef, side, sideOffset])

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

  if (!context.open || hidden) {
    return null
  }

  const arrowStyle = React.useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: '0.5rem',
      height: '0.5rem',
      backgroundColor: 'inherit',
      transform: 'rotate(45deg)',
    }

    if (side === 'top') {
      base.bottom = -4
      if (align === 'start') {
        base.left = 12
        base.transform = 'translateY(50%) rotate(45deg)'
      } else if (align === 'end') {
        base.right = 12
        base.transform = 'translateY(50%) rotate(45deg)'
      } else {
        base.left = '50%'
        base.transform = 'translate(-50%, 50%) rotate(45deg)'
      }
    } else if (side === 'bottom') {
      base.top = -4
      if (align === 'start') {
        base.left = 12
        base.transform = 'translateY(-50%) rotate(45deg)'
      } else if (align === 'end') {
        base.right = 12
        base.transform = 'translateY(-50%) rotate(45deg)'
      } else {
        base.left = '50%'
        base.transform = 'translate(-50%, -50%) rotate(45deg)'
      }
    } else if (side === 'left') {
      base.right = -4
      base.top = '50%'
      base.transform = 'translate(50%, -50%) rotate(45deg)'
    } else {
      base.left = -4
      base.top = '50%'
      base.transform = 'translate(-50%, -50%) rotate(45deg)'
    }

    return base
  }, [align, side])

  return createPortal(
    <div
      ref={composeRefs((props as { ref?: React.Ref<HTMLDivElement> }).ref, contentRef)}
      id={context.contentId}
      role="tooltip"
      data-slot="tooltip-content"
      data-state={context.open ? 'open' : 'closed'}
      data-side={side}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        pointerEvents: 'none',
        ...style,
      }}
      className={cn(
        'bg-foreground text-background shadow-sm animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs',
        className,
      )}
      {...props}
    >
      {children}
      <span aria-hidden className="bg-foreground block" style={arrowStyle} />
    </div>,
    document.body,
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
