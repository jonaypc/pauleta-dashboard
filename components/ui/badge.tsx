import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border border-input",
        // Estados de factura
        borrador:
          "bg-slate-100 text-slate-700 border border-slate-200",
        emitida:
          "bg-blue-100 text-blue-700 border border-blue-200",
        cobrada:
          "bg-green-100 text-green-700 border border-green-200",
        anulada:
          "bg-red-100 text-red-700 border border-red-200",
        pendiente:
          "bg-amber-100 text-amber-700 border border-amber-200",
        // Métodos de pago
        transferencia:
          "bg-indigo-100 text-indigo-700 border border-indigo-200",
        efectivo:
          "bg-emerald-100 text-emerald-700 border border-emerald-200",
        bizum:
          "bg-purple-100 text-purple-700 border border-purple-200",
        tarjeta:
          "bg-cyan-100 text-cyan-700 border border-cyan-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          variant === 'borrador' && "bg-slate-500",
          variant === 'emitida' && "bg-blue-500",
          variant === 'cobrada' && "bg-green-500",
          variant === 'anulada' && "bg-red-500",
          variant === 'pendiente' && "bg-amber-500",
        )} />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
