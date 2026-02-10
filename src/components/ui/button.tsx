import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm hover:shadow-md',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-500/20',
        destructive: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-red-500/20',
        outline: 'border-2 border-indigo-300 bg-background hover:bg-gradient-to-r hover:from-indigo-50 hover:to-teal-50 hover:text-indigo-700 hover:border-indigo-500',
        secondary: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300',
        ghost: 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-teal-50 hover:text-indigo-700',
        link: 'text-indigo-600 underline-offset-4 hover:underline hover:text-indigo-700',
      },
      size: {
        default: 'h-11 min-h-[44px] px-4 py-2 sm:h-10',
        sm: 'h-10 min-h-[44px] rounded-md px-3 sm:h-9',
        lg: 'h-12 min-h-[44px] rounded-md px-8 sm:h-11',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px] sm:h-10 sm:w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

