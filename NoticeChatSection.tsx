import { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Notice } from '../../types';
import { aiUser, MODEL_NAME } from '../../lib/gemini';
import { Send, Paperclip, Loader2, Bot, User as UserIcon, X, Image as ImageIcon } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
}

export default function NoticeChatSection({ user }: { user: User }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am the Margdarshan AI Tutor. You can ask me questions about your studies, or attach a photo of a problem and I will explain it.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string, base64: string, type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch notices
    const q = query(collection(db, 'Notices'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice));
      setNotices(results);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG/JPG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setAttachment({
        url: URL.createObjectURL(file),
        base64: base64String.split(',')[1],
        type: file.type
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachment) return;

    const userMessageText = input.trim();
    const currentAttachment = attachment;
    
    // Add user message to UI
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMessageText, 
      image: currentAttachment?.url 
    }]);
    
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      let response;
      if (currentAttachment) {
        // Multimodal
        response = await aiUser.models.generateContent({
          model: MODEL_NAME,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: currentAttachment.base64, mimeType: currentAttachment.type } },
                { text: userMessageText || "Please explain this image." }
              ]
            }
          ]
        });
      } else {
        // Text only
        const history = messages.filter(m => !m.image).map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }));
        
        // Ensure first message is user
        if (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        const chat = aiUser.chats.create({
          model: MODEL_NAME,
          config: {
             thinkingConfig: { thinkingBudget: 1024 }
          }
        });
        
        response = await aiUser.models.generateContent({
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
        text: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
      {/* Left Column: Notices */}
      <div className="lg:w-1/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-emerald-600 p-4 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">📢 Institutional Notices</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {notices.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No recent notices.</p>
          ) : (
            notices.map(notice => (
              <div key={notice.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm mb-1">{notice.title}</h3>
                <p className="text-slate-600 text-sm whitespace-pre-wrap">{notice.content}</p>
                <p className="text-xs text-slate-400 mt-3">{new Date(notice.timestamp).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: AI Chat */}
      <div className="lg:w-2/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#0f172a] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold">Margdarshan AI Tutor</h2>
              <p className="text-xs text-slate-400">Powered by Gemini AI</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-emerald-600" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-sm' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
              }`}>
                {msg.image && (
                  <img src={msg.image} alt="Upload" className="max-w-full rounded-lg mb-3 max-h-64 object-cover" />
                )}
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                   {msg.text.split('\n').map((line, idx) => <p key={idx} className="m-0 min-h-[1em]">{line}</p>)}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5 text-slate-600" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-200">
          {attachment && (
            <div className="mb-3 flex items-center gap-2 bg-slate-100 p-2 rounded-lg w-max pr-4">
              <div className="w-10 h-10 bg-slate-200 rounded overflow-hidden">
                <img src={attachment.url} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <span className="text-sm text-slate-600 font-medium">Image attached</span>
              <button 
                onClick={() => setAttachment(null)}
                className="ml-2 p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors shrink-0"
              title="Attach Photo"
            >
              <Paperclip className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-100 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachment)}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
