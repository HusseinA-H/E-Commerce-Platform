'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useUIStore } from '../store';
import { useProductsQuery } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { Product } from '../types/index';
import { SafeImage } from './SafeImage';
import { useCurrency } from '../providers/CurrencyProvider';
import { useTranslation } from '../providers/I18nProvider';
import { apiClient } from '../lib/api-client';

let idCounter = 0;
const generateId = (prefix: string) => `${prefix}-${idCounter++}-${Math.random().toString(36).substring(2, 9)}`;

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  recommendations?: Product[];
}

export default function AIAssistant() {
  const isOpen = useUIStore((state) => state.isAIStylistOpen);
  const closeAIStylist = useUIStore((state) => state.closeAIStylist);
  const { data: products = [] } = useProductsQuery({}, { enabled: isOpen });
  const { addToCart } = useCart();
  const { formatPrice, usdToActive } = useCurrency();
  const { locale, t } = useTranslation();

  const [chatSessionId, setChatSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message on translation mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: t('assistant.welcome')
        }
      ]);
    }
  }, [t, messages.length]);

  // Initialize unique chat session ID on open
  useEffect(() => {
    if (isOpen && !chatSessionId) {
      setChatSessionId(`session-assistant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    }
  }, [isOpen, chatSessionId]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: generateId('msg'),
      sender: 'user',
      text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await apiClient.post('/ai-stylist/chat', {
        sessionId: chatSessionId,
        content: text,
      });

      const aiMsg: Message = {
        id: response.data.id || generateId('msg-ai'),
        sender: 'ai',
        text: response.data.content,
        recommendations: []
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id: generateId('msg-err'),
        sender: 'ai',
        text: t('errors.assistantUnreachable')
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddKit = (recs: Product[]) => {
    recs.forEach(p => {
      // Add standard default size and color for instant checkout helper
      const defaultSize = p.sizes[0] || 'L';
      const defaultColor = p.colors[0] || 'Onyx Black';
      addToCart({ product: p, quantity: 1, size: defaultSize, color: defaultColor });
    });
    
    // Simulate notification text response
    const notifyMsg: Message = {
      id: generateId('notify'),
      sender: 'ai',
      text: t('assistant.kitAdded')
    };
    setMessages(prev => [...prev, notifyMsg]);
  };

  const openAIStylist = useUIStore((state) => state.openAIStylist);

  if (!isOpen) {
    return (
      <button
        onClick={openAIStylist}
        className="fixed bottom-24 end-6 lg:bottom-6 lg:end-6 z-40 w-14 h-14 rounded-full bg-tertiary text-on-tertiary shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center group border-0 cursor-pointer"
        title={t('assistant.title')}
      >
        <Sparkles className="h-6 w-6 animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 end-0 z-50 w-full sm:w-[480px] bg-surface border-s border-outline-variant shadow-2xl flex flex-col justify-between animate-slide-in duration-300">
      
      {/* Header */}
      <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-low">
        <div className="flex items-center gap-sm">
          <Sparkles className="animate-pulse text-tertiary" />
          <div>
            <h3 className="font-headline-lg text-sm text-foreground uppercase tracking-wider">{t('assistant.title').toUpperCase()}</h3>
            <div className="flex items-center gap-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span className="text-[10px] text-green-500 font-label-caps tracking-widest">{t('assistant.online')}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={closeAIStylist}
          className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:border-tertiary transition-colors"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-md space-y-lg no-scrollbar bg-background">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-sm`}>
            
            {/* Message Bubble */}
            <div className={`p-4 rounded-xl max-w-[85%] text-sm leading-relaxed text-pretty ${
              msg.sender === 'user' 
                ? 'bg-foreground text-background font-medium rounded-tr-none rtl:rounded-tr-xl rtl:rounded-tl-none' 
                : 'bg-surface border border-outline-variant text-on-surface-variant rounded-tl-none rtl:rounded-tl-xl rtl:rounded-tr-none'
            }`}>
              <p>{msg.text}</p>
            </div>

            {/* Curated Product Recommendations */}
            {msg.recommendations && msg.recommendations.length > 0 && (
              <div className="w-full space-y-md pt-xs">
                <div className="grid grid-cols-1 gap-sm">
                  {msg.recommendations.map((prod) => (
                    <div key={prod.id} className="p-sm bg-surface-low border border-outline-variant rounded-lg flex gap-sm items-center">
                      <div className="w-14 h-16 bg-surface-lowest overflow-hidden rounded relative flex-shrink-0">
                        <SafeImage className="w-full h-full object-cover" src={prod.images[0]} alt={prod.name} />
                      </div>
                      <div className="flex-1 py-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-foreground uppercase break-normal text-pretty">{prod.name}</h4>
                        <p className="text-xs text-on-surface-variant">{formatPrice(usdToActive(prod.price))}</p>
                      </div>
                      <button 
                        onClick={() => addToCart({ product: prod, quantity: 1, size: prod.sizes[0] || 'L', color: prod.colors[0] || 'Onyx Black' })}
                        className="bg-foreground hover:bg-tertiary hover:text-on-tertiary text-background px-3 py-1.5 rounded font-button text-[10px] uppercase transition-colors shrink-0"
                      >
                        {t('assistant.addKit')}
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => handleAddKit(msg.recommendations!)}
                  className="w-full py-3 bg-tertiary text-on-tertiary font-button text-[11px] uppercase tracking-widest rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-tertiary/10 border-0 cursor-pointer"
                >
                  {t('assistant.addFullKit')}
                </button>
              </div>
            )}

          </div>
        ))}

        {/* Typing Loader */}
        {isTyping && (
          <div className="flex flex-col items-start space-y-sm">
            <div className="p-4 bg-surface border border-outline-variant text-on-surface-variant rounded-xl rounded-tl-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary/60 animate-bounce delay-100"></span>
              <span className="w-2 h-2 rounded-full bg-tertiary/80 animate-bounce delay-200"></span>
              <span className="w-2 h-2 rounded-full bg-tertiary animate-bounce delay-300"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Input Chips (pinned above text box) */}
      <div className="px-md py-sm border-t border-outline-variant/30 bg-surface flex gap-sm overflow-x-auto no-scrollbar shrink-0">
        {[
          t('assistant.chipDrizzle'),
          t('assistant.chipSquat'),
          t('assistant.chipVolt'),
          t('assistant.chipTravel')
        ].map((chip, idx) => (
          <button 
            key={idx}
            onClick={() => handleSend(chip)}
            className="px-3 py-1.5 border border-outline-variant hover:border-tertiary hover:text-tertiary transition-all font-button text-[10px] rounded-full whitespace-nowrap text-on-surface-variant bg-transparent cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Text Box Input Area */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(inputText); }}
        className="p-md border-t border-outline-variant flex gap-sm bg-surface-low items-center"
      >
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('assistant.chatPlaceholder')}
          disabled={isTyping}
          className="flex-1 bg-background border border-outline-variant focus:border-tertiary focus:ring-0 px-md py-3 rounded-lg outline-none text-sm text-foreground placeholder-on-surface-variant/50 disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={isTyping || !inputText.trim()}
          className="w-11 h-11 bg-tertiary text-on-tertiary rounded-lg flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform border-0 cursor-pointer"
        >
          <ArrowRight className="h-5 w-5 rtl:rotate-180" />
        </button>
      </form>

    </div>
  );
}
