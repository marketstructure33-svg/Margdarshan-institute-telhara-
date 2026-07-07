import { useState, useRef, useEffect } from 'react';
import { aiAdmin, MODEL_NAME } from '../../lib/gemini';
import { Bot, User, Send, Paperclip, Loader2, Sparkles, X, ArrowLeft } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
  images?: string[];
}

export default function AdminAILab({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Welcome to the Executive AI Research Lab. I can help you draft curriculum, generate exam papers, or analyze student data patterns. You can upload multiple reference files simultaneously.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string, base64: string, type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setAttachments(prev => [...prev, {
          url: URL.createObjectURL(file),
          base64: base64String.split(',')[1],
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;

    const userMessageText = input.trim();
    const currentAttachments = [...attachments];
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMessageText, 
      images: currentAttachments.map(a => a.url)
    }]);
    
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      let response;
      if (currentAttachments.length > 0) {
        // Multimodal
        const parts: any[] = currentAttachments.map(att => ({
          inlineData: { data: att.base64, mimeType: att.type }
        }));
        parts.push({ text: userMessageText || "Analyze these documents." });

        response = await aiAdmin.models.generateContent({
          model: MODEL_NAME,
          contents: [{ role: 'user', parts }]
        });
      } else {
        // Text only
        const history = messages.filter(m => !m.images || m.images.length === 0).map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }));
        
        if (history.length > 0 && history[0].role === 'model') history.shift();
        
        response = await aiAdmin.models.generateContent({
            model: MODEL_NAME,
            contents: [
                ...history,
                { role: 'user', parts: [{ text: userMessageText }] }
            ]
        });
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text || "I couldn't generate a response."
      }]);
    } catch (error) {
      console.warn("AI Error:", error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "Error executing command. Please verify keys and connection."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 flex flex-col w-full h-full">
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 shadow-sm overflow-hidden w-full max-w-5xl mx-auto h-full">
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b-4 border-emerald-500">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 -ml-2 mr-1 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-slate-300 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Back to Dashboard</span>
              </button>
            )}
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold">Admin AI Research Lab</h2>
              <p className="text-xs text-slate-400">Powered by Gemini High-Thinking Model</p>
            </div>
          </div>
        </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-6 h-6 text-emerald-400" />
              </div>
            )}
            
            <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-slate-800 text-white rounded-tr-sm' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
            }`}>
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {msg.images.map((img, idx) => (
                    <img key={idx} src={img} alt="Upload" className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-slate-300" />
                  ))}
                </div>
              )}
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed font-sans">
                 {msg.text.split('\n').map((line, idx) => <p key={idx} className="m-0 min-h-[1em]">{line}</p>)}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center shrink-0 shadow-sm">
                <User className="w-6 h-6 text-slate-700" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-5 shadow-sm flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span className="text-sm font-medium text-slate-500">Synthesizing response...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group">
                <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden border border-slate-300">
                  <img src={att.url} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button 
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-bold shrink-0 shadow-sm border border-slate-200"
          >
            <Paperclip className="w-5 h-5" />
            <span className="hidden sm:inline">+ Add Research Media</span>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Instruct the AI Research Lab..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-bold shrink-0 shadow-sm flex items-center gap-2"
          >
            Execute <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}
