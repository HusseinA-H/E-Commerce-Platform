'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store';
import { X, Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useTranslation } from './I18nProvider';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface RealtimeContextType {
  socket: Socket | null;
  isConnected: boolean;
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { locale } = useTranslation();
  const { currentUser } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const listenersRef = useRef<Record<string, Array<(data: any) => void>>>({});

  const localeRef = useRef(locale);
  useEffect(() => { localeRef.current = locale; }, [locale]);

  const addToast = React.useCallback((title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(-4);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!currentUser) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    // Connect to backend websocket gateway
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      console.log('Successfully connected to APEX Realtime Broker');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('Realtime Broker disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Realtime Broker Connection Error:', error.message);
    });

    // --- Standard Realtime Event Handlers ---

    // 1. New Order alert (Admins/Vendors)
    socketInstance.on('order.created', (data) => {
      const loc = localeRef.current;
      const displayTitle = loc === 'ar' ? 'طلب جديد وارد!' : 'New Order Received!';
      const displayMsg = loc === 'ar' 
        ? `تم استلام الطلب رقم #${data.orderId.slice(-8).toUpperCase()} بقيمة $${data.payoutShare?.toFixed(2) || '0.00'}`
        : `Order #${data.orderId.slice(-8).toUpperCase()} received. Net split: $${data.payoutShare?.toFixed(2) || '0.00'}`;
      
      addToast(displayTitle, displayMsg, 'success');
      triggerHookListeners('order.created', data);
    });

    // 2. Order updates (Customers/Vendors/Admins)
    socketInstance.on('order.updated', (data) => {
      const loc = localeRef.current;
      const displayTitle = loc === 'ar' ? 'تحديث حالة الطلب' : 'Order Status Update';
      const displayMsg = loc === 'ar'
        ? `حالة الطلب #${data.orderId.slice(-8).toUpperCase()} هي الآن: ${data.status.toUpperCase()}`
        : `Order #${data.orderId.slice(-8).toUpperCase()} status changed to: ${data.status.toUpperCase()}`;
      
      addToast(displayTitle, displayMsg, 'info');
      triggerHookListeners('order.updated', data);
    });

    // 3. Inventory Low Stock Alerts (Vendors)
    socketInstance.on('inventory.low_stock', (data) => {
      const loc = localeRef.current;
      const displayTitle = loc === 'ar' ? 'تنبيه: مخزون منخفض' : 'Low Stock Warning';
      const displayMsg = loc === 'ar'
        ? `المنتج "${data.name}" انخفض مخزونه إلى: ${data.stock}`
        : `Product "${data.name}" has reached low stock limit: ${data.stock} items remaining.`;
      
      addToast(displayTitle, displayMsg, 'warning');
      triggerHookListeners('inventory.low_stock', data);
    });

    // 4. Inventory Updates
    socketInstance.on('inventory.updated', (data) => {
      triggerHookListeners('inventory.updated', data);
    });

    // 5. Vendor payout completed
    socketInstance.on('vendor.payout.completed', (data) => {
      const loc = localeRef.current;
      const displayTitle = loc === 'ar' ? 'تم تحويل العوائد!' : 'Stripe Transfer Successful!';
      const displayMsg = loc === 'ar'
        ? `تم تحويل مبلغ $${data.amount.toFixed(2)} إلى حسابك المصرفي`
        : `Stripe payout split of $${data.amount.toFixed(2)} has been successfully transferred.`;
      
      addToast(displayTitle, displayMsg, 'success');
      triggerHookListeners('vendor.payout.completed', data);
    });

    // 6. Analytics updates
    socketInstance.on('analytics.updated', (data) => {
      triggerHookListeners('analytics.updated', data);
    });

    // 7. General streaming assistant answers
    socketInstance.on('ai.response.streaming', (data) => {
      triggerHookListeners('ai.response.streaming', data);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [currentUser, addToast]);

  // Hook listener register helpers
  const triggerHookListeners = (event: string, data: any) => {
    const list = listenersRef.current[event];
    if (list) {
      list.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in hook listener for event ${event}:`, e);
        }
      });
    }
  };

  return (
    <RealtimeContext.Provider value={{ socket, isConnected, toasts, addToast, removeToast }}>
      {children}

      {/* Sleek Floating Glass Toasts List */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-sm w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const Icon = {
            info: Info,
            success: CheckCircle,
            warning: AlertTriangle,
            error: X,
          }[toast.type];

          const colorClasses = {
            info: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
            success: 'border-green-500/20 bg-green-500/5 text-green-400',
            warning: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-500',
            error: 'border-red-500/20 bg-red-500/5 text-red-500',
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`p-4 border rounded-xl backdrop-blur-xl luxury-glass flex items-start gap-md pointer-events-auto shadow-2xl transition-all duration-300 animate-slide-in ${colorClasses}`}
            >
              <div className="mt-0.5 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-xs text-start">
                <p className="font-bold text-xs uppercase tracking-wider text-white">
                  {toast.title}
                </p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-on-surface-variant hover:text-white transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </RealtimeContext.Provider>
  );
};
