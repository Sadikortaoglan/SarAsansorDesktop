import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TransactionContext {
  service?: string
  customer?: string
  date?: string
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  variant?: 'default' | 'destructive' | 'success'
  amount?: string
  transactionContext?: TransactionContext
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText = 'Evet, Sil',
  cancelText = 'İptal',
  onConfirm,
  variant = 'destructive',
  amount,
  transactionContext,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const isSuccess = variant === 'success'
  const isPaymentModal = isSuccess && amount

  if (isPaymentModal) {
    // Corporate payment confirmation modal design
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[380px] h-auto max-h-[90vh] overflow-y-auto p-0 gap-0 flex flex-col">
          {/* Icon and Title Section */}
          <DialogHeader className="px-5 pt-5 pb-3">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">{title}</DialogTitle>
            </div>
          </DialogHeader>

          {/* Amount Display */}
          {amount && (
            <div className="px-5 pb-3">
              <div className="flex items-baseline justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs font-medium text-slate-500 mt-0.5">₺</span>
                <span className="text-xl font-semibold text-slate-900 tracking-tight">
                  {amount.replace(/₺/g, '').trim()}
                </span>
              </div>
            </div>
          )}

          {/* Transaction Context */}
          {transactionContext && (
            <div className="px-5 pb-3">
              <div className="rounded-md bg-slate-50/50 border border-slate-200/50 px-4 py-2.5 space-y-1.5">
                {transactionContext.service && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-slate-500 min-w-[50px]">İşlem:</span>
                    <span className="text-xs text-slate-700 font-medium flex-1">{transactionContext.service}</span>
                  </div>
                )}
                {transactionContext.customer && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-slate-500 min-w-[50px]">Bina:</span>
                    <span className="text-xs text-slate-700 flex-1">{transactionContext.customer}</span>
                  </div>
                )}
                {transactionContext.date && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-slate-500 min-w-[50px]">Tarih:</span>
                    <span className="text-xs text-slate-700 flex-1">{transactionContext.date}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message Section */}
          <div className="px-5 pb-3 space-y-0.5">
            <p className="text-sm text-foreground text-center leading-relaxed">
              Bu işlem sisteme "ödendi" olarak kaydedilecektir.
            </p>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Devam etmek istiyor musunuz?
            </p>
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="flex-row gap-2.5 px-5 pb-4 pt-3 border-t bg-slate-50/50 sm:justify-end mt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-initial min-h-[44px] text-sm font-medium bg-white hover:bg-slate-50 border-slate-300 text-slate-700"
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial min-h-[44px] text-sm font-medium bg-green-600 hover:bg-green-700 text-white shadow-sm"
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Default confirmation modal (for delete, etc.)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 min-h-[44px] min-w-[44px] sm:h-10 sm:w-10 sm:min-h-0 sm:min-w-0 items-center justify-center rounded-full',
                variant === 'destructive'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary'
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-semibold">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="pt-2 text-sm sm:text-base leading-relaxed text-foreground">
          {message}
        </DialogDescription>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
