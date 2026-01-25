import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MessageCircle, Mail, FileText, ChevronDown, Send, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <TouchableOpacity
            onPress={() => setIsOpen(!isOpen)}
            className="bg-white dark:bg-zinc-900 p-5 border-b border-zinc-100 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800"
        >
            <View className="flex-row justify-between items-center">
                <Text className={`text-zinc-900 dark:text-white font-bold flex-1 pr-4 text-base ${isOpen ? 'text-primary' : ''}`}>
                    {question}
                </Text>
                <ChevronDown size={20} color={isOpen ? "#006FFF" : "#a1a1aa"} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
            </View>
            {isOpen && (
                <View className="mt-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                    <Text className="text-zinc-600 dark:text-zinc-300 leading-6 text-sm">{answer}</Text>
                    <View className="flex-row items-center mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                        <Text className="text-xs text-zinc-400 mr-3">Bu cevap yardımcı oldu mu?</Text>
                        <TouchableOpacity className="p-1 mr-2"><ThumbsUp size={14} color="#71717a" /></TouchableOpacity>
                        <TouchableOpacity className="p-1"><ThumbsDown size={14} color="#71717a" /></TouchableOpacity>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function HelpScreen() {
    const router = useRouter();
    const [contactMessage, setContactMessage] = useState('');

    const handleSendSupport = () => {
        if (!contactMessage.trim()) return;
        Alert.alert('Mesaj Gönderildi', 'Destek ekibimiz en kısa sürede sizinle iletişime geçecektir.');
        setContactMessage('');
    };

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-4 py-3 flex-row items-center border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm z-10">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full mr-3">
                    <ChevronLeft size={24} color="#18181b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">Yardım Merkezi</Text>
            </View>

            <ScrollView className="flex-1" keyboardDismissMode="on-drag">

                {/* Hero Section */}
                <View className="bg-blue-600 px-6 py-8 items-center">
                    <Text className="text-white font-black text-2xl mb-2 text-center">Nasıl yardımcı olabiliriz?</Text>
                    <Text className="text-blue-100 text-center text-sm font-medium">Sorularınızı cevaplamak için buradayız.</Text>
                </View>

                {/* FAQ Section */}
                <View className="-mt-4 bg-zinc-50 dark:bg-black rounded-t-3xl pt-2">
                    <View className="px-6 py-4">
                        <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Sıkça Sorulan Sorular</Text>
                    </View>
                    <View className="border-t border-b border-zinc-200 dark:border-zinc-800">
                        <FAQItem
                            question="Dengeli Akış (Balanced Feed) nedir?"
                            answer="Yapay zeka algoritmamız, farklı politik görüşlere sahip kaynaklardan haberleri derleyerek size objektif bir perspektif sunar. Tek bir görüşe hapsolmanızı engeller."
                        />
                        <FAQItem
                            question="Haber kaynaklarını nasıl puanlıyorsunuz?"
                            answer="Her haber kaynağı; geçmiş içerikleri, kullanılan dil, doğruluk oranları ve bağımsız medya denetçilerinin raporlarına göre analiz edilir. Bu puanlar dinamik olarak güncellenir."
                        />
                        <FAQItem
                            question="Ücretli üyelik (Premium) avantajları nelerdir?"
                            answer="Reklamsız deneyim, sınırsız detaylı analiz raporları, 'Kıyasla' moduna tam erişim ve özel günlük bülten desteği sunar."
                        />
                        <FAQItem
                            question="Verilerim güvende mi?"
                            answer="Kesinlikle. Okuma alışkanlıklarınız sadece size özel öneriler sunmak için cihazınızda anonim olarak işlenir. Üçüncü taraflarla paylaşılmaz."
                        />
                    </View>
                </View>

                {/* Contact Form Details */}
                <View className="p-6 mt-2">
                    <Text className="text-zinc-900 dark:text-white text-lg font-bold mb-4">Bize Ulaşın</Text>

                    <View className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 mb-4 shadow-sm">
                        <TextInput
                            placeholder="Sorunuzu veya önerinizi yazın..."
                            placeholderTextColor="#a1a1aa"
                            multiline
                            numberOfLines={4}
                            value={contactMessage}
                            onChangeText={setContactMessage}
                            className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg text-zinc-900 dark:text-white min-h-[100px] mb-3 text-base"
                            textAlignVertical="top"
                        />
                        <TouchableOpacity
                            onPress={handleSendSupport}
                            className={`flex-row items-center justify-center p-3 rounded-xl ${contactMessage.trim() ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                            disabled={!contactMessage.trim()}
                        >
                            <Send size={18} color={contactMessage.trim() ? "white" : "#71717a"} className="mr-2" />
                            <Text className={`font-bold ${contactMessage.trim() ? 'text-white' : 'text-zinc-400'}`}>Gönder</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Direct Contact Links */}
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 flex-row items-center justify-center p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                            onPress={() => Linking.openURL('mailto:destek@d4ily.com')}
                        >
                            <Mail size={18} color="#006FFF" />
                            <Text className="text-zinc-700 dark:text-zinc-300 font-bold ml-2 text-sm">E-posta</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 flex-row items-center justify-center p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                        >
                            <MessageCircle size={18} color="#10b981" />
                            <Text className="text-zinc-700 dark:text-zinc-300 font-bold ml-2 text-sm">Canlı Sohbet</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Legal Links Footer */}
                <View className="pb-10 pt-4 items-center">
                    <View className="flex-row gap-6">
                        <Text className="text-zinc-400 text-xs font-medium underline">Gizlilik Politikası</Text>
                        <Text className="text-zinc-400 text-xs font-medium underline">Kullanım Koşulları</Text>
                    </View>
                    <Text className="text-zinc-300 text-[10px] mt-4">v1.0.2 Build 2024.1</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
