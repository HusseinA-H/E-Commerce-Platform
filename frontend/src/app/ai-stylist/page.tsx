'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  UploadCloud,
  Trash2,
  Send,
  History,
  Award,
  TrendingUp,
  CheckCircle,
  MessageSquare,
  ArrowRight,
  Lock,
  RefreshCw,
  Sliders,
  X,
  Layers,
  Heart,
  Plus,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuthStore } from '../../store';
import { apiClient } from '../../lib/api-client';
import { useCurrency } from '../../providers/CurrencyProvider';
import { useTranslation } from '../../providers/I18nProvider';

// Styling types & interfaces
interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  images: ProductImage[];
  category?: {
    name: string;
  };
}

interface Recommendation {
  id: string;
  productId: string;
  reason: string;
  matchScore: number;
  product: Product;
}

interface OutfitAnalysis {
  id: string;
  overallScore: number;
  styleCategory: string;
  outfitSummary: string;
  strengths: string[];
  weaknesses: string[];
  detectedColors: string[];
  fitAnalysis: string;
  confidenceScore: number;
  aestheticType: string;
  sportwearCompatibility: string;
  layeringAnalysis: string;
  recommendedImprovements: string[];
  imageUrls: string[];
  recommendations: Recommendation[];
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function AIStylistPage() {
  const { currentUser, login } = useAuthStore();
  const { formatPrice, usdToActive } = useCurrency();
  const { locale, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'stylist' | 'history' | 'generator' | 'admin'>('stylist');
  const [selectedPersona, setSelectedPersona] = useState<string>('performance-athlete');
  
  // Login fallback state
  const [email, setEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Outfit upload and analysis states
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<OutfitAnalysis | null>(null);
  
  // History states
  const [historyList, setHistoryList] = useState<OutfitAnalysis[]>([]);
  const [savedList, setSavedList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Chat states
  const [chatSessionId, setChatSessionId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Smart generator states
  const [selectedOutfitType, setSelectedOutfitType] = useState('streetwear outfit');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutfit, setGeneratedOutfit] = useState<any>(null);

  // Admin states
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Notification message
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // Generate chat session UUID if not present
  useEffect(() => {
    if (!chatSessionId) {
      setChatSessionId(`session-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    }
  }, [chatSessionId]);

  // Load history when tab is clicked
  useEffect(() => {
    if (currentUser && activeTab === 'history') {
      fetchHistory();
      fetchSaved();
    }
    if (currentUser && currentUser.role === 'admin' && activeTab === 'admin') {
      fetchAdminStats();
    }
  }, [currentUser, activeTab]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAuthError(t('aiStylist.emailRequired'));
      return;
    }
    setLoginLoading(true);
    setAuthError('');
    try {
      const res = await login(email);
      if (!res.success) {
        setAuthError(res.error || t('errors.loginFailed'));
      } else {
        triggerAlert('success', t('aiStylist.styleSessionSuccess'));
      }
    } catch (err: any) {
      setAuthError(t('errors.failedEstablishSession'));
    } finally {
      setLoginLoading(false);
    }
  };

  // Upload zones file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isFormat = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type);
      const isSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      if (!isFormat) triggerAlert('error', t('aiStylist.formatsError', { name: file.name }));
      if (!isSize) triggerAlert('error', t('aiStylist.sizeError', { name: file.name }));
      return isFormat && isSize;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setUploadPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(uploadPreviews[index]);
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    addFiles(files);
  };

  // Run AI Outfit Analysis
  const runOutfitAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      triggerAlert('error', t('aiStylist.uploadPrompt'));
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('personaKey', selectedPersona);

      const response = await apiClient.post('/ai-stylist/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAnalysisResult(response.data);
      triggerAlert('success', t('aiStylist.analysisSuccess'));
      
      // Auto populate chat assistant context
      setChatMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: t('aiStylist.welcomeStyle', { aesthetic: response.data.aestheticType, score: response.data.overallScore }),
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || t('errors.analysisFailed');
      triggerAlert('error', Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // History & Saved Outfits API
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get('/ai-stylist/history');
      setHistoryList(res.data);
    } catch (e) {
      console.warn('Failed to load history list.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchSaved = async () => {
    try {
      const res = await apiClient.get('/ai-stylist/saved');
      setSavedList(res.data);
    } catch (e) {
      console.warn('Failed to load saved outfits.');
    }
  };

  const saveCurrentOutfit = async () => {
    if (!analysisResult) return;
    try {
      await apiClient.post('/ai-stylist/save', {
        analysisId: analysisResult.id,
        name: `Style Coordinate - ${analysisResult.styleCategory}`,
      });
      triggerAlert('success', t('aiStylist.savedSuccess'));
      fetchSaved();
    } catch (error: any) {
      triggerAlert('error', t('errors.failedSaveOutfit'));
    }
  };

  // Conversational Assistant Chat API
  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: inputMessage,
      createdAt: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const response = await apiClient.post('/ai-stylist/chat', {
        sessionId: chatSessionId,
        content: userMsg.content,
        personaKey: selectedPersona,
      });

      const assistantMsg: ChatMessage = {
        id: response.data.id || `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: response.data.content,
        createdAt: response.data.createdAt || new Date().toISOString(),
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      triggerAlert('error', t('errors.stylistTimeout'));
    } finally {
      setChatLoading(false);
    }
  };

  // Complete Outfit Generation API
  const generateOutfitCombination = async () => {
    setIsGenerating(true);
    try {
      const res = await apiClient.post('/ai-stylist/generate-outfit', {
        outfitType: selectedOutfitType,
        personaKey: selectedPersona,
      });
      setGeneratedOutfit(res.data);
      triggerAlert('success', t('aiStylist.analysisSuccess'));
    } catch (e) {
      triggerAlert('error', t('errors.generationFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Admin stats
  const fetchAdminStats = async () => {
    setAdminLoading(true);
    try {
      const res = await apiClient.get('/ai-stylist/admin/analytics');
      setAdminStats(res.data);
    } catch (e) {
      console.warn('Failed to load admin stats.');
    } finally {
      setAdminLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US');
  };

  // Persona constants
  const personas = [
    {
      key: 'performance-athlete',
      name: t('aiStylist.personas.performance-athlete.name'),
      desc: t('aiStylist.personas.performance-athlete.desc'),
      badge: t('aiStylist.personas.performance-athlete.badge')
    },
    {
      key: 'minimalist-athlete',
      name: t('aiStylist.personas.minimalist-athlete.name'),
      desc: t('aiStylist.personas.minimalist-athlete.desc'),
      badge: t('aiStylist.personas.minimalist-athlete.badge')
    },
    {
      key: 'streetwear-hybrid',
      name: t('aiStylist.personas.streetwear-hybrid.name'),
      desc: t('aiStylist.personas.streetwear-hybrid.desc'),
      badge: t('aiStylist.personas.streetwear-hybrid.badge')
    },
    {
      key: 'luxury-gymwear',
      name: t('aiStylist.personas.luxury-gymwear.name'),
      desc: t('aiStylist.personas.luxury-gymwear.desc'),
      badge: t('aiStylist.personas.luxury-gymwear.badge')
    },
    {
      key: 'functional-runner',
      name: t('aiStylist.personas.functional-runner.name'),
      desc: t('aiStylist.personas.functional-runner.desc'),
      badge: t('aiStylist.personas.functional-runner.badge')
    },
    {
      key: 'oversized-urban',
      name: t('aiStylist.personas.oversized-urban.name'),
      desc: t('aiStylist.personas.oversized-urban.desc'),
      badge: t('aiStylist.personas.oversized-urban.badge')
    }
  ];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-start">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Neon accent glow */}
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-violet-600/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20 mb-4">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
              APEX LUXE
            </h1>
            <p className="text-neutral-400 text-sm mt-1 uppercase tracking-widest font-semibold">
              AI Stylist 2.0
            </p>
          </div>

          <p className="text-center text-neutral-300 text-sm mb-6 leading-relaxed">
            {t('aiStylist.fashionIntelRequired')}
          </p>

          <form onSubmit={handleDemoLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                {t('aiStylist.enterEmail')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="stylist@apexluxe.com"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none text-foreground placeholder-on-surface-variant/50 text-sm transition-all"
              />
            </div>

            {authError && (
              <p className="text-red-500 text-xs font-medium text-center">{authError}</p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 hover:scale-[1.02] cursor-pointer"
            >
              {loginLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t('aiStylist.initializeSession')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Mock Login tip */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-xs text-neutral-500">
              {t('aiStylist.testingEmailHint')}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 font-sans text-start">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-emerald-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Global alert feedback */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 ${
              alertMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/80 border-red-500/30 text-red-300'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{alertMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto flex flex-col min-h-screen relative z-10">
        
        {/* HEADER BAR */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold rounded-full uppercase tracking-wider">
                {t('aiStylist.platformIntel')}
              </span>
              <span className="text-xs text-neutral-500 font-mono">{t('aiStylist.vision')}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight mt-1 text-foreground flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-violet-500" /> {t('aiStylist.title')}
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              {t('aiStylist.subtitle')}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-foreground/5 border border-outline-variant p-1.5 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveTab('stylist')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'stylist'
                  ? 'bg-foreground/10 text-foreground shadow-lg'
                  : 'text-on-surface-variant hover:text-foreground'
              }`}
            >
              {t('aiStylist.analyzeFit')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-foreground/10 text-foreground shadow-lg'
                  : 'text-on-surface-variant hover:text-foreground'
              }`}
            >
              {t('aiStylist.historySaved')}
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'generator'
                  ? 'bg-foreground/10 text-foreground shadow-lg'
                  : 'text-on-surface-variant hover:text-foreground'
              }`}
            >
              {t('aiStylist.smartGenerator')}
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-foreground/10 text-foreground shadow-lg'
                    : 'text-on-surface-variant hover:text-foreground'
                }`}
              >
                {t('aiStylist.analytics')}
              </button>
            )}
          </div>
        </header>

        {/* TAB CONTENTS */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: AI STYLIST & ANALYSIS */}
            {activeTab === 'stylist' && (
              <motion.div
                key="stylist-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                
                {/* Left Column: Image upload & Persona Selector */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Upload Zone */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
                    <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-violet-400" /> {t('aiStylist.photoUpload')}
                    </h2>

                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-white/10 hover:border-violet-500/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/5 relative group"
                    >
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6 text-neutral-400 group-hover:text-violet-400 transition-colors" />
                      </div>
                      <p className="text-sm font-semibold text-neutral-200">{t('aiStylist.dragDrop')}</p>
                      <p className="text-xs text-neutral-500 mt-1">{t('aiStylist.formatsLimit')}</p>
                    </div>

                    {/* Previews */}
                    {uploadPreviews.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                          {t('aiStylist.readyAnalysis', { count: formatNumber(uploadPreviews.length) })}
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {uploadPreviews.map((url, idx) => (
                            <div key={idx} className="relative aspect-square bg-neutral-900 rounded-xl overflow-hidden group border border-white/10">
                              <img src={url} alt="Outfit preview" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeFile(idx)}
                                className="absolute top-1.5 right-1.5 p-1 bg-black/75 rounded-md opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all border-0 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Style Persona Selector */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                    <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-violet-400" /> {t('aiStylist.personaFilter')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {personas.map((p) => (
                        <div
                          key={p.key}
                          onClick={() => setSelectedPersona(p.key)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            selectedPersona === p.key
                              ? 'bg-violet-600/10 border-violet-500/50 shadow-md shadow-violet-500/5'
                              : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold">{p.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              selectedPersona === p.key
                                ? 'bg-violet-500/20 text-violet-300'
                                : 'bg-white/5 text-neutral-400'
                            }`}>
                              {p.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 leading-normal">{p.desc}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={runOutfitAnalysis}
                      disabled={isAnalyzing || uploadedFiles.length === 0}
                      className="w-full mt-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-2xl text-sm transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none cursor-pointer border-0"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {t('aiStylist.runningEval')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          {t('aiStylist.launchEval')}
                        </>
                      )}
                    </button>
                  </div>

                </div>

                {/* Right Column: Results & Chat Panel */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Results Panel */}
                  <AnimatePresence mode="wait">
                    {analysisResult ? (
                      <motion.div
                        key="result-pane"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                      >
                        
                        {/* Score Card / Main Summary */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden text-start">
                          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-violet-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                          
                          <div className="flex flex-col sm:flex-row items-center gap-6">
                            
                            {/* Animated radial progress */}
                            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle
                                  cx="56"
                                  cy="56"
                                  r="48"
                                  className="stroke-neutral-800"
                                  strokeWidth="8"
                                  fill="transparent"
                                />
                                <motion.circle
                                  cx="56"
                                  cy="56"
                                  r="48"
                                  className="stroke-violet-500"
                                  strokeWidth="8"
                                  fill="transparent"
                                  strokeDasharray={2 * Math.PI * 48}
                                  initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                                  animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - analysisResult.overallScore / 100) }}
                                  transition={{ duration: 1.2, ease: 'easeOut' }}
                                />
                              </svg>
                              <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-3xl font-black">{formatNumber(analysisResult.overallScore)}</span>
                                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">{t('aiStylist.score')}</span>
                              </div>
                            </div>

                            <div className="flex-1 text-center sm:text-left">
                              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                                <span className="px-2.5 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/20 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                  {analysisResult.styleCategory}
                                </span>
                                <span className="text-xs text-neutral-400 font-semibold">• {analysisResult.aestheticType}</span>
                              </div>
                              <h3 className="text-2xl font-bold tracking-tight">{t('aiStylist.diagnosticsComplete')}</h3>
                              <p className="text-neutral-300 text-sm mt-2 leading-relaxed">
                                {analysisResult.outfitSummary}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs text-neutral-400 flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              {t('aiStylist.confidenceMetric', { count: formatNumber(analysisResult.confidenceScore) })}
                            </span>
                            <button
                              onClick={saveCurrentOutfit}
                              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 hover:scale-[1.02] cursor-pointer border-0"
                            >
                              <Heart className="w-3.5 h-3.5" /> {t('aiStylist.saveCard')}
                            </button>
                          </div>
                        </div>

                        {/* Analysis Grid (Strengths, weaknesses, etc.) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-start">
                          
                          {/* Strengths & Weaknesses */}
                          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-violet-400">{t('aiStylist.diagnosticsBreakdown')}</h4>
                            
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">{t('aiStylist.strengths')}</p>
                              <ul className="space-y-1.5">
                                {analysisResult.strengths.map((str, i) => (
                                  <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 mt-1.5" />
                                    <span>{str}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-3 pt-2">
                              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">{t('aiStylist.weaknesses')}</p>
                              <ul className="space-y-1.5">
                                {analysisResult.weaknesses.map((weak, i) => (
                                  <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0 mt-1.5" />
                                    <span>{weak}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Technical attributes */}
                          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-violet-400">{t('aiStylist.garmentTech')}</h4>

                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{t('aiStylist.fitComp')}</p>
                              <p className="text-xs text-neutral-300 leading-normal">{analysisResult.fitAnalysis}</p>
                            </div>

                            <div className="space-y-1 pt-1.5">
                              <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{t('aiStylist.layeringSystem')}</p>
                              <p className="text-xs text-neutral-300 leading-normal">{analysisResult.layeringAnalysis}</p>
                            </div>

                            <div className="space-y-1 pt-1.5">
                              <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{t('aiStylist.sportswearComp')}</p>
                              <p className="text-xs text-neutral-300 leading-normal">{analysisResult.sportwearCompatibility}</p>
                            </div>

                            <div className="pt-2">
                              <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">{t('aiStylist.detectedPalette')}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {analysisResult.detectedColors.map((color, i) => (
                                  <span key={i} className="px-2 py-1 bg-black/40 border border-white/10 text-[10px] font-medium rounded-md">
                                    {color}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Product Recommendations */}
                        {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md text-start">
                            <h3 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
                              <ShoppingBag className="w-5 h-5 text-violet-400" /> {t('aiStylist.catalogMatches')}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {analysisResult.recommendations.map((rec) => {
                                const capName = rec.product.category?.name ? rec.product.category.name.charAt(0).toUpperCase() + rec.product.category.name.slice(1) : '';
                                const localizedCat = t('shop.cat' + capName, { defaultValue: rec.product.category?.name || 'Catalog Item' });
                                return (
                                  <div key={rec.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-violet-500/20 group">
                                    <div>
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                          <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">
                                            {localizedCat}
                                          </span>
                                          <h4 className="font-bold text-sm text-neutral-200 mt-0.5 group-hover:text-white transition-colors">
                                            {rec.product.name}
                                          </h4>
                                        </div>
                                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 rounded-md">
                                          {t('aiStylist.matchPercent', { count: formatNumber(rec.matchScore) })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                                        {rec.reason}
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-2">
                                      <span className="font-bold text-sm text-white">{formatPrice(usdToActive(rec.product.price))}</span>
                                      <a
                                        href={`/product/${rec.product.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 hover:scale-[1.02]"
                                      >
                                        {t('aiStylist.viewProduct')}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Interactive AI Chat Stylist Panel */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col h-[400px] text-start">
                          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4 shrink-0">
                            <MessageSquare className="w-5 h-5 text-violet-400" />
                            <div>
                              <h3 className="font-bold text-sm">{t('aiStylist.chatRefinement')}</h3>
                              <p className="text-[10px] text-neutral-400">{t('aiStylist.chatRefinementDesc')}</p>
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                            {chatMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                                  msg.role === 'user'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-black/40 border border-white/5 text-neutral-200'
                                }`}>
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                            {chatLoading && (
                              <div className="flex justify-start">
                                <div className="bg-black/40 border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-neutral-500 flex items-center gap-2">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  {t('aiStylist.thinking')}
                                </div>
                              </div>
                            )}
                            <div ref={chatBottomRef} />
                          </div>

                          <form onSubmit={sendChatMessage} className="flex gap-2 shrink-0">
                            <input
                              type="text"
                              value={inputMessage}
                              onChange={(e) => setInputMessage(e.target.value)}
                              placeholder={t('aiStylist.chatPlaceholder')}
                              className="flex-1 px-4 py-2.5 bg-surface border border-outline-variant rounded-xl focus:border-violet-500/50 outline-none text-foreground placeholder-on-surface-variant/50 text-xs transition-all"
                            />
                            <button
                              type="submit"
                              disabled={chatLoading || !inputMessage.trim()}
                              className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-violet-600/20 cursor-pointer border-0"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </form>
                        </div>

                      </motion.div>
                    ) : (
                      <motion.div
                        key="placeholder-pane"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-surface border border-outline-variant rounded-3xl p-12 text-center backdrop-blur-md flex flex-col items-center justify-center min-h-[400px]"
                      >
                        <div className="w-16 h-16 bg-surface-low border border-outline-variant rounded-2xl flex items-center justify-center mb-4">
                          <Sparkles className="w-8 h-8 text-neutral-500" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">{t('aiStylist.diagnosticsCenter')}</h3>
                        <p className="text-neutral-400 text-sm max-w-md mt-2 leading-relaxed">
                          {t('aiStylist.diagnosticsCenterDesc')}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

              </motion.div>
            )}

            {/* TAB 2: HISTORY & SAVED */}
            {activeTab === 'history' && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8 text-start"
              >
                
                {/* Saved Outfits List */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                  <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-violet-400" /> {t('aiStylist.savedCoordinates', { count: formatNumber(savedList.length) })}
                  </h2>

                  {savedList.length === 0 ? (
                    <p className="text-xs text-neutral-400">{t('aiStylist.noSavedOutfits')}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {savedList.map((item) => (
                        <div key={item.id} className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                          <div className="aspect-[4/3] bg-neutral-900 overflow-hidden relative">
                            <img src={item.analysis.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-violet-600/90 text-[10px] font-bold rounded">
                              {t('aiStylist.score')}: {formatNumber(item.analysis.overallScore)}
                            </div>
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-sm text-white">{item.name}</h4>
                              <p className="text-[11px] text-neutral-400 mt-1 uppercase tracking-wider font-semibold">
                                {item.analysis.styleCategory}
                              </p>
                              <p className="text-xs text-neutral-300 mt-2 line-clamp-3">
                                {item.analysis.outfitSummary}
                              </p>
                            </div>
                            <div className="pt-4 border-t border-white/5 mt-4 flex justify-end">
                              <button
                                onClick={() => {
                                  setAnalysisResult(item.analysis);
                                  setActiveTab('stylist');
                                }}
                                className="text-violet-400 hover:text-violet-300 text-xs font-semibold flex items-center gap-1 cursor-pointer border-0 bg-transparent"
                              >
                                {t('aiStylist.viewDiagnostics')}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* All Analysis History */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                  <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-violet-400" /> {t('aiStylist.historyTimeline', { count: formatNumber(historyList.length) })}
                  </h2>

                  {historyLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />
                    </div>
                  ) : historyList.length === 0 ? (
                    <p className="text-xs text-neutral-400">{t('aiStylist.noHistory')}</p>
                  ) : (
                    <div className="space-y-4">
                      {historyList.map((item) => (
                        <div key={item.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-neutral-900 overflow-hidden shrink-0 border border-white/10">
                              <img src={item.imageUrls[0]} alt="Outfit preview" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-neutral-400 uppercase">
                                  {item.styleCategory}
                                </span>
                                <span className="text-[10px] text-neutral-500">
                                  {formatDate(item.createdAt)}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-neutral-200 mt-1">{item.aestheticType}</h4>
                              <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5 max-w-xl">
                                {item.outfitSummary}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">{t('aiStylist.score')}</span>
                              <span className="text-lg font-black text-violet-400">{formatNumber(item.overallScore)}/100</span>
                            </div>
                            <button
                              onClick={() => {
                                  setAnalysisResult(item);
                                  setActiveTab('stylist');
                              }}
                              className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border-0"
                            >
                              {t('aiStylist.loadDiagnostics')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* TAB 3: SMART OUTFIT GENERATOR */}
            {activeTab === 'generator' && (
              <motion.div
                key="generator-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-start"
              >
                
                {/* Left panel inputs */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-surface border border-outline-variant rounded-3xl p-6 backdrop-blur-md">
                    <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet-400" /> {t('aiStylist.coordinatedGenerator')}
                    </h2>
                    <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                      {t('aiStylist.coordinatedGeneratorDesc')}
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                          {t('aiStylist.selectGoal')}
                        </label>
                        <select
                          value={selectedOutfitType}
                          onChange={(e) => setSelectedOutfitType(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-xl outline-none text-xs text-foreground transition-all focus:border-violet-500/50 cursor-pointer"
                        >
                          <option className="bg-surface text-foreground" value="gym outfit">{t('aiStylist.gymOutfit')}</option>
                          <option className="bg-surface text-foreground" value="streetwear outfit">{t('aiStylist.streetwearOutfit')}</option>
                          <option className="bg-surface text-foreground" value="running outfit">{t('aiStylist.runningOutfit')}</option>
                          <option className="bg-surface text-foreground" value="premium athletic outfit">{t('aiStylist.premiumOutfit')}</option>
                          <option className="bg-surface text-foreground" value="summer fit">{t('aiStylist.summerOutfit')}</option>
                          <option className="bg-surface text-foreground" value="winter fit">{t('aiStylist.winterOutfit')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                          {t('aiStylist.applyPersona')}
                        </label>
                        <select
                          value={selectedPersona}
                          onChange={(e) => setSelectedPersona(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-xl outline-none text-xs text-foreground transition-all focus:border-violet-500/50 cursor-pointer"
                        >
                          {personas.map((p) => (
                            <option className="bg-surface text-foreground" key={p.key} value={p.key}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={generateOutfitCombination}
                        disabled={isGenerating}
                        className="w-full mt-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-violet-600/30 flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50 cursor-pointer border-0"
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            {t('aiStylist.generatingStyle')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {t('aiStylist.generateStyle')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right panel outputs */}
                <div className="lg:col-span-8">
                  <AnimatePresence mode="wait">
                    {generatedOutfit ? (
                      <motion.div
                        key="gen-result"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                      >
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden text-start">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                {t('aiStylist.coordinatedSetup')}
                              </span>
                              <h3 className="text-2xl font-black mt-1.5">{generatedOutfit.theme}</h3>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">{t('aiStylist.synergyScore')}</span>
                              <span className="text-2xl font-black text-emerald-400">{formatNumber(generatedOutfit.overallScore)}/100</span>
                            </div>
                          </div>

                          <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                            {generatedOutfit.description}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {generatedOutfit.items && generatedOutfit.items.map((item: any) => {
                              const capName = item.category?.name ? item.category.name.charAt(0).toUpperCase() + item.category.name.slice(1) : '';
                              const localizedCat = t('shop.cat' + capName, { defaultValue: item.category?.name || 'Garment' });
                              return (
                                <div key={item.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group hover:border-violet-500/20 transition-all">
                                  <div>
                                    <div className="aspect-square bg-neutral-900 rounded-xl overflow-hidden border border-white/5 mb-3">
                                      <img
                                        src={item.images?.[0]?.url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600'}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </div>
                                    <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">
                                      {localizedCat}
                                    </span>
                                    <h4 className="font-bold text-xs text-neutral-200 line-clamp-1 mt-0.5">{item.name}</h4>
                                  </div>
                                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                                    <span className="text-xs font-bold text-white">{formatPrice(usdToActive(item.price))}</span>
                                    <a
                                      href={`/product/${item.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-md flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4">
                          <Sparkles className="w-8 h-8 text-neutral-500 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">{t('aiStylist.coordinateOutput')}</h3>
                        <p className="text-neutral-400 text-sm max-w-sm mt-2 leading-relaxed">
                          {t('aiStylist.coordinateOutputDesc')}
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

              </motion.div>
            )}

            {/* TAB 4: ADMIN ANALYTICS */}
            {activeTab === 'admin' && currentUser?.role === 'admin' && (
              <motion.div
                key="admin-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-start"
              >
                
                {adminLoading ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
                  </div>
                ) : adminStats ? (
                  <div className="space-y-6">
                    
                    {/* Diagnostic Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{t('aiStylist.stylingEvaluations')}</span>
                        <h4 className="text-3xl font-black text-white mt-2">{formatNumber(adminStats.totalAnalyses)}</h4>
                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> {t('aiStylist.wowTrend')}
                        </p>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{t('aiStylist.savedCoordinatesLabel')}</span>
                        <h4 className="text-3xl font-black text-white mt-2">{formatNumber(adminStats.savedCount)}</h4>
                        <p className="text-[10px] text-neutral-400 mt-1">{t('aiStylist.savedCoordinatesDesc')}</p>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{t('aiStylist.avgStylingScore')}</span>
                        <h4 className="text-3xl font-black text-white mt-2">{formatNumber(adminStats.averageScore)}/100</h4>
                        <p className="text-[10px] text-neutral-400 mt-1">{t('aiStylist.avgStylingScoreDesc')}</p>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{t('aiStylist.recommendationCtr')}</span>
                        <h4 className="text-3xl font-black text-white mt-2">{formatNumber(adminStats.recommendationCTR)}%</h4>
                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {t('aiStylist.recommendationCtrDesc')}
                        </p>
                      </div>

                    </div>

                    {/* Breakdown Graphs & Telemetry */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Popular categories */}
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400 mb-4">
                          {t('aiStylist.mostUploadedCategories')}
                        </h3>
                        <div className="space-y-4">
                          {adminStats.popularCategories.map((c: any, idx: number) => {
                            const capName = c.name ? c.name.charAt(0).toUpperCase() + c.name.slice(1) : '';
                            const localizedCat = t('shop.cat' + capName, { defaultValue: c.name });
                            return (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold">{localizedCat}</span>
                                  <span className="text-neutral-400">{t('aiStylist.evaluationsCount', { count: formatNumber(c.count) })}</span>
                                </div>
                                <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-violet-500 h-full rounded-full"
                                    style={{
                                      width: `${(c.count / Math.max(...adminStats.popularCategories.map((item: any) => item.count))) * 100}%`
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Popular Aesthetics */}
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400 mb-4">
                          {t('aiStylist.topAesthetics')}
                        </h3>
                        <div className="space-y-4">
                          {adminStats.popularAesthetics.map((a: any, idx: number) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold">{a.name}</span>
                                <span className="text-neutral-400">{t('aiStylist.countsCount', { count: formatNumber(a.count) })}</span>
                              </div>
                              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-400 h-full rounded-full"
                                  style={{
                                    width: `${(a.count / Math.max(...adminStats.popularAesthetics.map((item: any) => item.count))) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">{t('aiStylist.failedFetchMetrics')}</p>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </main>

        <footer className="border-t border-white/5 py-8 mt-12 text-center text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} {t('footer.copyright')}</p>
        </footer>

      </div>
    </div>
  );
}
