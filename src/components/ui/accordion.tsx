"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import * as Icons from "lucide-react"

import { cn } from "@/lib/utils"

// Define types for the event handlers
type AccordionEvents = {
  onAccordionClick?: (event: React.MouseEvent) => void
  onExpand?: (value: string) => void
  onCollapse?: (value: string) => void
}

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("group border-b border-zinc-400", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>,
  AccordionEvents {
  value: string
  iconName: keyof typeof Icons
}

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, iconName, onAccordionClick, onExpand, onCollapse, value, ...props }, ref) => {
  const handleClick = (event: React.MouseEvent) => {
    onAccordionClick?.(event)
  }

  const IconComponent = (iconName ? Icons[iconName] : <Icons.Circle />) as React.ElementType

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          "flex flex-1 items-center justify-between py-5 font-semibold text-lg !text-left sm:text-2xl",
          "transition-all duration-500 ease-[cubic-bezier(0.87,0,0.13,1)]",
          "hover:bg-zinc-50 group/trigger",
          className
        )}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e as unknown as React.MouseEvent)
          }
        }}
        {...props}
      >
        <div className="flex items-center gap-3">
          <IconComponent
            className={cn(
              "transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)]",
              "group-hover/trigger:rotate-180",
              "group-data-[state=open]:rotate-0"
            )}
            size={36}
            strokeWidth={1.1}
          />
          {children}
        </div>
        <div className="flex">
          <Icons.Plus
            className={cn(
              "h-6 w-6",
              "transition-all duration-500 ease-[cubic-bezier(0.87,0,0.13,1)]",
              "group-data-[state=open]:hidden group-data-[state=closed]:block"
            )}
          />
          <Icons.Minus
            className={cn(
              "h-6 w-6",
              "transition-all duration-500 ease-[cubic-bezier(0.87,0,0.13,1)]",
              "group-data-[state=open]:block group-data-[state=closed]:hidden"
            )}
          />
        </div>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
})
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm text-gray-500",
      "transition-all duration-500 ease-[cubic-bezier(0.87,0,0.13,1)]",
      "data-[state=closed]:animate-[accordion-up_500ms_cubic-bezier(0.87,0,0.13,1)]",
      "data-[state=open]:animate-[accordion-down_500ms_cubic-bezier(0.87,0,0.13,1)]",
      className
    )}
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

// Create a wrapper component to handle state changes
interface AccordionWrapperProps extends AccordionEvents {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  value?: string | string[]
  className?: string
  children?: React.ReactNode
}

const AccordionWrapper: React.FC<AccordionWrapperProps> = ({
  type = "single",
  defaultValue,
  value,
  className,
  children,
  onExpand,
  onCollapse,
}) => {
  const handleValueChange = (value: string | string[]) => {
    const isExpanded = Array.isArray(value) ? value.length > 0 : value.length > 0
    if (isExpanded) {
      onExpand?.(Array.isArray(value) ? value.join(" ") : value)
    } else {
      onCollapse?.(Array.isArray(value) ? value.join(" ") : value)
    }
  }

  return (
    <>
      {type === "single" ? (
        <AccordionPrimitive.Root
          type="single"
          defaultValue={defaultValue as string}
          value={value as string}
          className={className}
          onValueChange={handleValueChange}
        >
          {children}
        </AccordionPrimitive.Root>
      ) : (
        <AccordionPrimitive.Root
          type="multiple"
          defaultValue={defaultValue as string[]}
          value={value as string[]}
          className={className}
          onValueChange={handleValueChange}
        >
          {children}
        </AccordionPrimitive.Root>
      )}
    </>
  )
}

export {
  AccordionWrapper as Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  type AccordionEvents,
  type AccordionWrapperProps
}