import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Cargando página…
      </div>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(index => <div key={index} className="h-28 rounded-lg bg-muted" />)}
        </div>
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
