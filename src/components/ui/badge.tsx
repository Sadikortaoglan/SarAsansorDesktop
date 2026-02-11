import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[88px] h-7 justify-center',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#4F46E5] text-white',
        secondary: 'border-transparent bg-gray-100 text-gray-800',
        destructive: 'border-transparent bg-[#EF4444] text-white',
        outline: 'text-foreground border-2',
        // Corporate badge styles - Standardized color palette
        success: 'border-transparent bg-[#DCFCE7] text-[#166534]',
        warning: 'border-transparent bg-[#FEF3C7] text-[#92400E]',
        expired: 'border-transparent bg-[#FEE2E2] text-[#991B1B]',
        green: 'border-transparent bg-[#DCFCE7] text-[#166534]',
        blue: 'border-transparent bg-[#DBEAFE] text-[#1E40AF]',
        yellow: 'border-transparent bg-[#FEF3C7] text-[#92400E]',
        red: 'border-transparent bg-[#FEE2E2] text-[#991B1B]',
        orange: 'border-transparent bg-[#FED7AA] text-[#9A3412]',
        active: 'border-transparent bg-[#DCFCE7] text-[#166534]',
        pending: 'border-transparent bg-[#FEF3C7] text-[#92400E]',
        // Status badges - Corporate colors
        passed: 'border-transparent bg-[#DCFCE7] text-[#166534]',
        failed: 'border-transparent bg-[#FEE2E2] text-[#991B1B]',
        open: 'border-transparent bg-[#FEE2E2] text-[#991B1B]',
        completed: 'border-transparent bg-[#DCFCE7] text-[#166534]',
        // Premium SaaS Status Badges - Blue + Emerald system
        planned: 'border-transparent bg-[#DBEAFE] text-[#1E40AF]', // Blue for PLANNED
        inProgress: 'border-transparent bg-[#FED7AA] text-[#9A3412]', // Orange for IN_PROGRESS
        aborted: 'border-transparent bg-[#FEE2E2] text-[#991B1B]', // Red for ABORTED
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

