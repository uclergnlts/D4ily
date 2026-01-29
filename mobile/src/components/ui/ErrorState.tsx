import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AlertCircle, RefreshCw, XCircle, WifiOff, Server, AlertTriangle } from 'lucide-react-native';

interface ErrorStateProps {
    type?: 'network' | 'server' | 'general' | 'timeout' | 'unauthorized';
    title?: string;
    message?: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    showDismiss?: boolean;
}

/**
 * ErrorState - Error state component for displaying error scenarios
 * Provides a clean, user-friendly way to show error states with retry functionality
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
    type = 'general',
    title,
    message,
    onRetry,
    onDismiss,
    showDismiss = false,
}) => {
    const getErrorIcon = () => {
        switch (type) {
            case 'network':
                return <WifiOff size={48} color="#ef4444" strokeWidth={1.5} />;
            case 'server':
                return <Server size={48} color="#ef4444" strokeWidth={1.5} />;
            case 'timeout':
                return <AlertTriangle size={48} color="#f59e0b" strokeWidth={1.5} />;
            case 'unauthorized':
                return <XCircle size={48} color="#ef4444" strokeWidth={1.5} />;
            default:
                return <AlertCircle size={48} color="#ef4444" strokeWidth={1.5} />;
        }
    };

    const getDefaultTitle = () => {
        switch (type) {
            case 'network':
                return 'İnternet bağlantısı yok';
            case 'server':
                return 'Sunucu hatası';
            case 'timeout':
                return 'Zaman aşımı';
            case 'unauthorized':
                return 'Yetkilendirme hatası';
            default:
                return 'Bir hata oluştu';
        }
    };

    const getDefaultMessage = () => {
        switch (type) {
            case 'network':
                return 'Lütfen internet bağlantını kontrol et ve tekrar dene.';
            case 'server':
                return 'Sunucu şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.';
            case 'timeout':
                return 'İstek zaman aşımına uğradı. Lütfen tekrar dene.';
            case 'unauthorized':
                return 'Oturum süren dolmuş olabilir. Lütfen tekrar giriş yap.';
            default:
                return 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene.';
        }
    };

    return (
        <ScrollView className="flex-1 bg-zinc-50 dark:bg-black">
            <View className="flex-1 items-center justify-center px-8 py-12">
                {/* Icon */}
                <View className="mb-6">
                    {getErrorIcon()}
                </View>

                {/* Title */}
                <Text className="text-xl font-bold text-zinc-900 dark:text-white text-center mb-3">
                    {title || getDefaultTitle()}
                </Text>

                {/* Description */}
                <Text className="text-base text-zinc-500 dark:text-zinc-400 text-center mb-8 leading-6">
                    {message || getDefaultMessage()}
                </Text>

                {/* Action Buttons */}
                <View className="w-full gap-3">
                    {/* Retry Button */}
                    {onRetry && (
                        <TouchableOpacity
                            onPress={onRetry}
                            className="bg-primary px-6 py-3 rounded-xl flex-row items-center justify-center active:opacity-80"
                        >
                            <RefreshCw size={20} color="white" strokeWidth={2} className="mr-2" />
                            <Text className="text-white font-bold text-base">Tekrar Dene</Text>
                        </TouchableOpacity>
                    )}

                    {/* Dismiss Button */}
                    {showDismiss && onDismiss && (
                        <TouchableOpacity
                            onPress={onDismiss}
                            className="bg-zinc-200 dark:bg-zinc-800 px-6 py-3 rounded-xl active:opacity-80"
                        >
                            <Text className="text-zinc-900 dark:text-white font-bold text-base">Kapat</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Error Details (for development) */}
                {__DEV__ && (
                    <View className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full">
                        <Text className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-2">
                            Hata Tipi: {type}
                        </Text>
                        <Text className="text-xs text-zinc-500 dark:text-zinc-500">
                            Geliştirici modu aktif - Daha fazla hata detayı burada gösterilebilir
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

ErrorState.displayName = 'ErrorState';

/**
 * Pre-configured error states for common scenarios
 */
export const ErrorStates = {
    NetworkError: (props?: Partial<ErrorStateProps>) => (
        <ErrorState
            type="network"
            title="İnternet bağlantısı yok"
            message="Lütfen internet bağlantını kontrol et ve tekrar dene."
            {...props}
        />
    ),

    ServerError: (props?: Partial<ErrorStateProps>) => (
        <ErrorState
            type="server"
            title="Sunucu hatası"
            message="Sunucu şu anda kullanılamıyor. Lütfen daha sonra tekrar dene."
            {...props}
        />
    ),

    TimeoutError: (props?: Partial<ErrorStateProps>) => (
        <ErrorState
            type="timeout"
            title="Zaman aşımı"
            message="İstek zaman aşımına uğradı. Lütfen tekrar dene."
            {...props}
        />
    ),

    UnauthorizedError: (props?: Partial<ErrorStateProps>) => (
        <ErrorState
            type="unauthorized"
            title="Oturum süresi doldu"
            message="Oturum süren dolmış olabilir. Lütfen tekrar giriş yap."
            {...props}
        />
    ),

    GenericError: (props?: Partial<ErrorStateProps>) => (
        <ErrorState
            type="general"
            title="Bir hata oluştu"
            message="Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene."
            {...props}
        />
    ),

    // Error with dismiss option
    DismissibleError: (props?: Partial<ErrorStateProps>) => (
        <ErrorState
            showDismiss={true}
            {...props}
        />
    ),
};

/**
 * ErrorBoundary component wrapper for catching React errors
 */
export class ErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        
        // Log to Sentry if available
        if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
            // Sentry.captureException(error, { errorInfo });
        }
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            
            return (
                <ErrorState
                    type="general"
                    title="Uygulama hatası"
                    message="Beklenmeyen bir hata oluştu. Lütfen uygulamayı yeniden başlat."
                    onRetry={() => this.setState({ hasError: false })}
                />
            );
        }

        return this.props.children;
    }
}