"use client"

import { useEffect } from "react"

export function AppRuntime() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return

    const register = () => {
      // Static assets only: private pages and live data always use the network.
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).catch(error => console.warn("No se pudo iniciar el modo app:", error))
    }

    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })

    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
