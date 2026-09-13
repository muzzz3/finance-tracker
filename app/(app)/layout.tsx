import { Sidebar } from '@/components/layout/sidebar'
import { ChatTray } from '@/components/ai/chat-tray'
import { PrivacyModeProvider } from '@/lib/privacy-mode'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const chatEnabled = process.env.NEXT_PUBLIC_ENABLE_CHAT === 'true'

  return (
    <PrivacyModeProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#0d1424' }}>
          {children}
        </main>
        {chatEnabled && <ChatTray />}
      </div>
    </PrivacyModeProvider>
  )
}
