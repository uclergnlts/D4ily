import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { Send, X, CornerDownRight } from 'lucide-react-native';

interface CommentFormProps {
    onSubmit: (text: string) => void;
    replyTo?: { id: string; username: string } | null;
    onCancelReply?: () => void;
    isLoading?: boolean;
    className?: string;
    placeholder?: string;
}

export const CommentForm = React.memo(({ onSubmit, replyTo, onCancelReply, isLoading, className, placeholder }: CommentFormProps) => {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        if (!text.trim()) return;
        onSubmit(text);
        setText('');
        Keyboard.dismiss();
    };

    return (
        <View className={`bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 pb-8 ${className}`}>

            {/* Reply Context Bar */}
            {replyTo && (
                <View className="flex-row items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-xl mb-3 border border-zinc-100 dark:border-zinc-800">
                    <View className="flex-row items-center gap-2">
                        <CornerDownRight size={14} color="#a1a1aa" />
                        <Text className="text-xs text-zinc-500 font-medium">
                            <Text className="font-bold text-zinc-900 dark:text-zinc-100">@{replyTo.username}</Text> yanıtlanıyor
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onCancelReply} className="p-1 bg-zinc-200 dark:bg-zinc-700 rounded-full">
                        <X size={12} color="#71717a" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Input Area */}
            <View className="flex-row items-end gap-3">
                <View className="flex-1 bg-zinc-50 dark:bg-zinc-800/80 rounded-[24px] px-5 border border-zinc-100 dark:border-zinc-700/50">
                    <TextInput
                        className={`text-base text-zinc-900 dark:text-white ${Platform.select({ ios: 'py-3', android: 'py-2' })} max-h-[120px]`}
                        placeholder={placeholder || "Yorumunu yaz..."}
                        placeholderTextColor="#a1a1aa"
                        multiline
                        value={text}
                        onChangeText={setText}
                        style={{ lineHeight: 20 }}
                    />
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!text.trim() || isLoading}
                    className={`w-11 h-11 rounded-full items-center justify-center mb-[1px] shadow-sm ${text.trim() ? 'bg-blue-600' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                >
                    <Send
                        size={20}
                        color={text.trim() ? "white" : "#a1a1aa"}
                        style={{ marginLeft: text.trim() ? 2 : 0 }} // Optical visual balance
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
});
