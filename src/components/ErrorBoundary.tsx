import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">صوت الدارجة - حدث تنبيه</h2>
            <p className="text-stone-300 text-sm leading-relaxed mb-6">
              وقع مشكل بسيط أثناء تحميل الواجهة. يرجى إعادة تحميل الصفحة لتحديث الاتصال بالسيرفر.
            </p>
            {this.state.errorMessage && (
              <div className="text-left bg-stone-950/80 p-3 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-400 mb-6 overflow-x-auto max-h-24">
                {this.state.errorMessage}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
