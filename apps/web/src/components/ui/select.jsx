"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

const Select = React.forwardRef(({ className, children, value, onValueChange, placeholder, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value || "")

  React.useEffect(() => {
    setSelectedValue(value || "")
  }, [value])

  const handleSelect = (newValue) => {
    setSelectedValue(newValue)
    setOpen(false)
    if (onValueChange) {
      onValueChange(newValue)
    }
  }

  // Find the selected item's display text
  const getDisplayText = () => {
    if (!selectedValue) return placeholder
    const childrenArray = React.Children.toArray(children)
    const selectedItem = childrenArray.find(
      child => React.isValidElement(child) && child.props.value === selectedValue
    )
    if (selectedItem) {
      const childText = selectedItem.props.children
      // Handle different types of children
      if (typeof childText === 'string') {
        return childText
      } else if (typeof childText === 'number') {
        return childText.toString()
      } else if (Array.isArray(childText)) {
        return childText.join('')
      } else {
        // For complex children, try to extract text
        return React.isValidElement(childText) 
          ? childText.props.children || ''
          : ''
      }
    }
    return placeholder
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between",
            className
          )}
          ref={ref}
          {...props}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === SelectItem) {
            return React.cloneElement(child, {
              onClick: () => handleSelect(child.props.value),
              className: "cursor-pointer"
            })
          }
          return child
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
Select.displayName = "Select"

const SelectGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-1", className)} {...props} />
))
SelectGroup.displayName = "SelectGroup"

const SelectValue = React.forwardRef(({ placeholder, className, ...props }, ref) => (
  <span ref={ref} className={cn("block truncate", className)} {...props}>
    {placeholder}
  </span>
))
SelectValue.displayName = "SelectValue"

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <Button
    variant="outline"
    className={cn(
      "w-full justify-between",
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-50" />
  </Button>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)} {...props}>
    {children}
  </div>
))
SelectContent.displayName = "SelectContent"

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />
))
SelectLabel.displayName = "SelectLabel"

const SelectItem = React.forwardRef(({ className, children, onClick, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer",
      className
    )}
    onClick={onClick}
    {...props}
  >
    {children}
  </div>
))
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}
