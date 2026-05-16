'use client'

import { createContext, useContext, useState } from 'react'

interface PrivacyModeContextType {
  privacyMode: boolean
  toggle: () => void
}

const PrivacyModeContext = createContext<PrivacyModeContextType>({
  privacyMode: false,
  toggle: () => {},
})

export function PrivacyModeProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false)
  return (
    <PrivacyModeContext.Provider value={{ privacyMode, toggle: () => setPrivacyMode(v => !v) }}>
      {children}
    </PrivacyModeContext.Provider>
  )
}

export function usePrivacyMode() {
  return useContext(PrivacyModeContext)
}
