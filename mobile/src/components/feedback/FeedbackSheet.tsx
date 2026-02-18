import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X, Send, MessageSquarePlus } from 'lucide-react-native';
import { client } from '../../api/client';

type FeedbackType = 'istek' | 'oneri' | 'sikayet' | 'genel';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
    { value: 'oneri', label: 'Öneri', emoji: '💡' },
    { value: 'istek', label: 'İstek', emoji: '🙏' },
    { value: 'sikayet', label: 'Şikayet', emoji: '😤' },
    { value: 'genel', label: 'Genel', emoji: '💬' },
];

interface FeedbackSheetProps {
    visible: boolean;
    onClose: () => void;
}

export const FeedbackSheet: React.FC<FeedbackSheetProps> = ({ visible, onClose }) => {
    const [type, setType] = useState<FeedbackType>('oneri');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim() || content.trim().length < 5) {
            Alert.alert('Uyarı', 'En az 5 karakter yazmalısın.');
            return;
        }

        setSubmitting(true);
        try {
            await client.post('/feedback', {
                type,
                content: content.trim(),
            });

            Alert.alert(
                'Teşekkürler!',
                'Geri bildirimin bize ulaştı. En kısa sürede değerlendireceğiz.',
                [{ text: 'Tamam', onPress: onClose }]
            );
            setContent('');
            setType('oneri');
        } catch {
            Alert.alert('Hata', 'Geri bildirim gönderilemedi. Tekrar dene.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="flex-1 justify-end">
                    {/* Backdrop */}
                    <TouchableOpacity
                        className="flex-1"
                        activeOpacity={1}
                        onPress={onClose}
                    />

                    {/* Sheet */}
                    <View className="bg-white dark:bg-zinc-900 rounded-t-3xl px-5 pb-10 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        {/* Handle */}
                        <View className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full self-center mb-4" />

                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-5">
                            <Text
                                className="text-lg text-zinc-900 dark:text-white"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                Geri Bildirim Gönder
                            </Text>
                            <TouchableOpacity onPress={onClose} className="p-1">
                                <X size={22} color="#a1a1aa" />
                            </TouchableOpacity>
                        </View>

                        {/* Type selector */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                            <View className="flex-row gap-2">
                                {FEEDBACK_TYPES.map((ft) => (
                                    <TouchableOpacity
                                        key={ft.value}
                                        onPress={() => setType(ft.value)}
                                        className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full border ${
                                            type === ft.value
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                        }`}
                                    >
                                        <Text className="text-[14px]">{ft.emoji}</Text>
                                        <Text
                                            className={`text-[13px] ${
                                                type === ft.value
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-zinc-600 dark:text-zinc-400'
                                            }`}
                                            style={{ fontFamily: 'DMSans_600SemiBold' }}
                                        >
                                            {ft.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Text input */}
                        <TextInput
                            value={content}
                            onChangeText={setContent}
                            placeholder="Fikrini, isteğini veya şikayetini yaz..."
                            placeholderTextColor="#a1a1aa"
                            multiline
                            numberOfLines={4}
                            maxLength={2000}
                            className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 text-[14px] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 min-h-[120px]"
                            style={{ fontFamily: 'DMSans_400Regular', textAlignVertical: 'top' }}
                        />

                        {/* Character count */}
                        <Text className="text-[11px] text-zinc-400 text-right mt-1 mr-1">
                            {content.length}/2000
                        </Text>

                        {/* Submit */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!content.trim() || content.trim().length < 5 || submitting}
                            className="mt-3 bg-[#006FFF] rounded-full py-3.5 flex-row items-center justify-center gap-2"
                            style={{ opacity: !content.trim() || content.trim().length < 5 || submitting ? 0.5 : 1 }}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Send size={16} color="#fff" />
                                    <Text
                                        className="text-white text-[15px]"
                                        style={{ fontFamily: 'DMSans_700Bold' }}
                                    >
                                        Gönder
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// Reusable button to trigger the feedback sheet
export const FeedbackButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        className="mx-4 mb-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 flex-row items-center gap-3"
        activeOpacity={0.7}
    >
        <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
            <MessageSquarePlus size={20} color="#006FFF" />
        </View>
        <View className="flex-1">
            <Text
                className="text-[14px] text-zinc-900 dark:text-white"
                style={{ fontFamily: 'DMSans_700Bold' }}
            >
                Geri Bildirim Gönder
            </Text>
            <Text
                className="text-[12px] text-zinc-500 dark:text-zinc-400"
                style={{ fontFamily: 'DMSans_400Regular' }}
            >
                İstek, öneri veya şikayetini paylaş
            </Text>
        </View>
    </TouchableOpacity>
);
