'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Send, Square } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'How much did I spend this month?',
  'What is my biggest expense category?',
  'Am I saving enough?',
  'How does this month compare to last month?',
  'What are my recurring payments costing me per year?',
]

export function ChatTray() {
  const [mode, setMode] = useState<'idle' | 'bar' | 'panel'>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const barInputRef = useRef<HTMLInputElement>(null)
  const panelInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setMode(m => m === 'bar' ? 'idle' : 'bar')
      }
      if (e.key === 'Escape') setMode(m => m === 'bar' ? 'idle' : m)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (mode === 'bar') setTimeout(() => barInputRef.current?.focus(), 50)
    if (mode === 'panel') setTimeout(() => panelInputRef.current?.focus(), 50)
  }, [mode])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    const q = text.trim()
    if (!q || loading) return

    const userMsg: Message = { role: 'user', content: q }
    const next = [...messages, userMsg]
    setMessages([...next, { role: 'assistant', content: '' }])
    setInput('')
    setMode('panel')
    setLoading(true)
    abortRef.current = new AbortController()
    const timeout = setTimeout(() => abortRef.current?.abort(), 120_000)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
        signal: abortRef.current.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) throw new Error(await res.text())

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value)
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content }])
      }
    } catch (err) {
      clearTimeout(timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && !last.content)
            return [...prev.slice(0, -1), { role: 'assistant', content: 'Stopped.' }]
          return prev
        })
      } else {
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: msg }])
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  function stop() { abortRef.current?.abort() }

  function close() {
    abortRef.current?.abort()
    setMode('idle')
    setMessages([])
    setInput('')
    setLoading(false)
  }

  return (
    <>
      {/* FAB — only when panel is closed */}
      {mode !== 'panel' && (
        <button
          onClick={() => setMode('panel')}
          title="Finance Assistant (⌘K)"
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-xl flex items-center justify-center transition-all hover:scale-105"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      )}

      {/* Omni bar overlay — ⌘K */}
      {mode === 'bar' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setMode('idle') }}
        >
          <div className="w-full max-w-xl mx-4 rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ backgroundColor: '#1a2235' }}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <input
                ref={barInputRef}
                type="text"
                placeholder="Ask about your finances..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') send(input)
                  if (e.key === 'Escape') setMode('idle')
                }}
                className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
              />
              <kbd className="text-xs text-slate-600 border border-white/10 rounded px-1.5 py-0.5 shrink-0">esc</kbd>
            </div>
            <div className="border-t border-white/6 pb-1">
              <p className="px-4 pt-2 pb-1 text-xs text-slate-600 uppercase tracking-wider font-medium">Suggestions</p>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/4 transition-colors flex items-center gap-2"
                >
                  <span className="text-slate-600">↵</span> {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right panel */}
      {mode === 'panel' && (
        <div
          className="fixed top-0 right-0 bottom-0 z-40 flex flex-col border-l border-white/10 shadow-2xl"
          style={{ width: '380px', backgroundColor: '#0d1424' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/6 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Finance Assistant</span>
            </div>
            <button
              onClick={close}
              className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Empty state with suggestions */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col justify-center px-4 gap-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Suggestions</p>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'text-slate-200 rounded-bl-sm'
                    }`}
                    style={msg.role === 'assistant' ? { backgroundColor: 'rgba(255,255,255,0.06)' } : undefined}
                  >
                    {msg.content || (loading && i === messages.length - 1 && (
                      <span className="flex gap-1 items-center py-0.5">
                        {[0, 150, 300].map(delay => (
                          <span
                            key={delay}
                            className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 border-t border-white/6 px-4 py-4 flex items-center gap-2">
            <input
              ref={panelInputRef}
              type="text"
              placeholder={messages.length === 0 ? 'Ask about your finances...' : 'Ask a follow-up...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(input) }}
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
            />
            {loading ? (
              <button
                onClick={stop}
                className="w-9 h-9 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors shrink-0"
                title="Stop"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
