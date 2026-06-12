"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, FileText } from "lucide-react"

interface PrintFormatSelectorProps {
  onSelect: (format: 'a4' | 'thermal') => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrintFormatSelector({ onSelect, open, onOpenChange }: PrintFormatSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar formato de impresión</DialogTitle>
          <DialogDescription>
            Elige el formato según la impresora que vayas a usar
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4">
          <Button
            variant="outline"
            className="h-auto py-6 flex flex-col items-start gap-2 hover:bg-blue-50 hover:border-blue-500"
            onClick={() => {
              onSelect('a4')
              onOpenChange(false)
            }}
          >
            <div className="flex items-center gap-3 w-full">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="text-left flex-1">
                <div className="font-semibold text-base">Formato A4</div>
                <div className="text-sm text-muted-foreground">
                  Para impresora de oficina (210 x 297 mm)
                </div>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-6 flex flex-col items-start gap-2 hover:bg-green-50 hover:border-green-500"
            onClick={() => {
              onSelect('thermal')
              onOpenChange(false)
            }}
          >
            <div className="flex items-center gap-3 w-full">
              <Printer className="h-8 w-8 text-green-600" />
              <div className="text-left flex-1">
                <div className="font-semibold text-base">Formato Térmico 80mm</div>
                <div className="text-sm text-muted-foreground">
                  Para impresora portátil AVPOS AVP-MP800R
                </div>
              </div>
            </div>
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Puedes cambiar el formato antes de cada impresión
        </div>
      </DialogContent>
    </Dialog>
  )
}
