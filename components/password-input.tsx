"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false)

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={cn("pr-11", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-11 text-muted-foreground hover:bg-transparent hover:text-foreground"
          aria-label={isVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
    )
  },
)

PasswordInput.displayName = "PasswordInput"
