import React, { Suspense, lazy, StrictMode, ErrorInfo, ReactNode, Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Loading simples para o Suspense
const LoadingFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontFamily: 'sans-serif' }}>
    <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#6d28d9', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
    <p>Carregando módulos do sistema...</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Fix: Explicitly extend Component from 'react' to ensure TypeScript resolves inherited properties like setState, state and props correctly.
 * This resolves the reported errors where 'state', 'setState', and 'props' were not recognized as members of ErrorBoundary.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Initialize state
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  // Fix: Property 'setState' is now correctly inherited from Component
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    // Fix: Property 'state' is now correctly inherited from Component
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: '600px', width: '100%', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '32px', border: '1px solid #fecaca' }}>
            <h2 style={{ color: '#dc2626', marginTop: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Erro na Interface</h2>
            <p style={{ color: '#475569', marginBottom: '20px' }}>Ocorreu um problema ao tentar carregar a aplicação.</p>
            <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fee2e2', overflowX: 'auto', marginBottom: '24px' }}>
              <code style={{ color: '#b91c1c', fontSize: '0.875rem', whiteSpace: 'pre-wrap', display: 'block' }}>
                {this.state.error?.toString()}
              </code>
            </div>
            <button onClick={() => window.location.reload()} style={{ backgroundColor: '#6d28d9', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>
                Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }
    // Fix: Access children from this.props which is correctly inherited from Component
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <App />
          </Suspense>
        </ErrorBoundary>
      </StrictMode>
    );
}
