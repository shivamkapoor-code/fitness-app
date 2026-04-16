import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, MessageCircle } from 'lucide-react'
import { callClaude, buildContext } from '../ai/claude'
import { showToast } from '../utils/toast'

const QUICK_QUESTIONS = [
  'Why has my fat loss stalled?',
  'Am I eating enough protein?',
  'What should I eat today?',
  'How is my inflammation?',
  'Should I train today?',
  'Analyse my week',
]

export function AIChat({ state, addChatMessage, today }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.chatHistory])

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg) return
    if (!state.apiKey) { showToast('Add API key in Settings', 'warn'); return }

    setInput('')
    addChatMessage({ role: 'user', content: msg, ts: Date.now() })
    setLoading(true)

    try {
      const context = buildContext(state, today)
      const history = state.chatHistory
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      history.push({ role: 'user', content: msg })

      const reply = await callClaude(state.apiKey, history, context)
      addChatMessage({ role: 'assistant', content: reply, ts: Date.now() })
    } catch (e) {
      showToast(e.message, 'error')
      addChatMessage({ role: 'assistant', content: `Error: ${e.message}`, ts: Date.now(), error: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {state.chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <MessageCircle size={48} className="text-emerald-400 opacity-50" />
            <div>
              <div className="font-heading text-xl font-bold text-white">Ask Your AI Coach</div>
              <div className="text-slate-400 text-sm mt-1">Expert nutritionist + bodybuilder + physiotherapist</div>
            </div>
          </div>
        )}

        {state.chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-sm'
                  : msg.error
                  ? 'bg-red-900/50 text-red-300 rounded-bl-sm'
                  : 'bg-slate-800 text-slate-200 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 size={16} className="text-emerald-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {state.chatHistory.length === 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="flex-shrink-0 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs hover:border-emerald-500 hover:text-emerald-300 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask your AI coach..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl px-4 flex items-center"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
