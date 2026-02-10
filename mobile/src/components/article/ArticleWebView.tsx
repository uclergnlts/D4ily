import React, { useState, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, useColorScheme } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface ArticleWebViewProps {
    url: string;
    onError?: (error: string) => void;
}

export function ArticleWebView({ url, onError }: ArticleWebViewProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const webViewRef = useRef<WebView>(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleLoadStart = () => {
        setLoading(true);
        setError(null);
    };

    const handleLoadEnd = () => {
        setLoading(false);
    };

    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        setLoading(false);
        setError(nativeEvent.description || 'Sayfa yüklenemedi');
        onError?.(nativeEvent.description);
    };

    const handleNavigationStateChange = (navState: WebViewNavigation) => {
        setCanGoBack(navState.canGoBack);
        setCanGoForward(navState.canGoForward);
    };

    const handleReload = () => {
        setError(null);
        setLoading(true);
        webViewRef.current?.reload();
    };

    const handleGoBack = () => {
        if (canGoBack) {
            webViewRef.current?.goBack();
        }
    };

    const handleGoForward = () => {
        if (canGoForward) {
            webViewRef.current?.goForward();
        }
    };

    if (error) {
        return (
            <View className="flex-1 items-center justify-center px-6 bg-zinc-50 dark:bg-black">
                <AlertCircle size={48} color="#ef4444" />
                <Text className="text-lg font-semibold text-zinc-900 dark:text-white mt-4 text-center">
                    Sayfa Yüklenemedi
                </Text>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                    {error}
                </Text>
                <TouchableOpacity
                    onPress={handleReload}
                    className="mt-6 bg-[#006FFF] px-6 py-3 rounded-lg flex-row items-center gap-2"
                >
                    <RefreshCw size={18} color="white" />
                    <Text className="text-white font-semibold">Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1">
            {/* Navigation Bar */}
            <View className="flex-row items-center justify-center gap-4 py-2 px-4 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <TouchableOpacity
                    onPress={handleGoBack}
                    disabled={!canGoBack}
                    className={`p-2 rounded-full ${canGoBack ? 'bg-zinc-200 dark:bg-zinc-800' : 'opacity-40'}`}
                >
                    <ChevronLeft size={20} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleGoForward}
                    disabled={!canGoForward}
                    className={`p-2 rounded-full ${canGoForward ? 'bg-zinc-200 dark:bg-zinc-800' : 'opacity-40'}`}
                >
                    <ChevronRight size={20} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleReload}
                    className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800"
                >
                    <RefreshCw size={18} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
            </View>

            {/* Loading Indicator */}
            {loading && (
                <View className="absolute inset-0 items-center justify-center bg-zinc-50/80 dark:bg-black/80 z-10" style={{ top: 48 }}>
                    <ActivityIndicator size="large" color="#006FFF" />
                    <Text className="text-zinc-500 dark:text-zinc-400 mt-2">Yükleniyor...</Text>
                </View>
            )}

            {/* WebView */}
            <WebView
                ref={webViewRef}
                source={{ uri: url }}
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
                onNavigationStateChange={handleNavigationStateChange}
                startInLoadingState={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={true}
                style={{ flex: 1 }}
            />
        </View>
    );
}
