import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    imageSource?: any;
}

/**
 * EmptyState - Empty state component for displaying no data scenarios
 * Provides a clean, user-friendly way to show empty states
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    imageSource,
}) => {
    return (
        <View className="flex-1 items-center justify-center px-8 py-12">
            {/* Icon or Image */}
            {Icon ? (
                <View className="mb-6">
                    <Icon size={64} color="#a1a1aa" strokeWidth={1.5} />
                </View>
            ) : imageSource ? (
                <Image
                    source={imageSource}
                    className="w-32 h-32 mb-6 opacity-50"
                    resizeMode="contain"
                />
            ) : null}

            {/* Title */}
            <Text className="text-xl font-bold text-zinc-900 dark:text-white text-center mb-3">
                {title}
            </Text>

            {/* Description */}
            {description && (
                <Text className="text-base text-zinc-500 dark:text-zinc-400 text-center mb-8 leading-6">
                    {description}
                </Text>
            )}

            {/* Action Button */}
            {actionLabel && onAction && (
                <TouchableOpacity
                    onPress={onAction}
                    className="bg-primary px-8 py-3 rounded-xl active:opacity-80"
                >
                    <Text className="text-white font-bold text-base">{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

EmptyState.displayName = 'EmptyState';

/**
 * Pre-configured empty states for common scenarios
 */
export const EmptyStates = {
    NoArticles: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="Henüz haber yok"
            description="Seçtiğiniz kategoride henüz haber bulunmuyor. Başka bir kategori deneyin veya daha sonra tekrar kontrol edin."
            actionLabel="Yenile"
            {...props}
        />
    ),

    NoComments: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="Henüz yorum yok"
            description="Bu haber hakkında henüz yorum yapılmamış. İlk yorumu sen yap!"
            actionLabel="Yorum Yap"
            {...props}
        />
    ),

    NoSearchResults: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="Sonuç bulunamadı"
            description="Arama kriterlerinize uygun sonuç bulunamadı. Lütfen farklı anahtar kelimeler deneyin."
            actionLabel="Aramayı Temizle"
            {...props}
        />
    ),

    NoBookmarks: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="Kaydedilen haber yok"
            description="Henüz hiçbir haberi kaydetmedin. İlgini çeken haberleri kaydet ve daha sonra oku."
            actionLabel="Haberlere Git"
            {...props}
        />
    ),

    NoNotifications: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="Bildirim yok"
            description="Henüz bildirimin yok. Haberleri takip et ve güncel kal."
            {...props}
        />
    ),

    NoHistory: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="Okuma geçmişi yok"
            description="Henüz hiç haber okumadın. Haberleri keşfetmeye başla!"
            actionLabel="Haberleri Keşfet"
            {...props}
        />
    ),

    NoSources: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="Kaynak bulunamadı"
            description="Seçtiğiniz ülkede henüz kaynak eklenmemiş. Yönetici ile iletişime geçin."
            {...props}
        />
    ),

    NoDigests: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="Özet yok"
            description="Henüz günlük özet oluşturulmamış. Daha sonra tekrar kontrol edin."
            actionLabel="Yenile"
            {...props}
        />
    ),

    NetworkError: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="İnternet bağlantısı yok"
            description="Lütfen internet bağlantını kontrol et ve tekrar dene."
            actionLabel="Tekrar Dene"
            {...props}
        />
    ),

    GenericError: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            title="Bir hata oluştu"
            description="Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene."
            actionLabel="Tekrar Dene"
            {...props}
        />
    ),
};
