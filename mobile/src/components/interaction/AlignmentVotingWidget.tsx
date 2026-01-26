import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { AlignmentDot } from '../ui/AlignmentDot';
import { Check } from 'lucide-react-native';

interface AlignmentVotingWidgetProps {
    currentScore: number;
    onVote: (score: number) => void;
    userVote?: number | null;
    className?: string;
}

export const AlignmentVotingWidget = React.memo(({ currentScore, onVote, userVote, className }: AlignmentVotingWidgetProps) => {
    const [sliderValue, setSliderValue] = useState(userVote || currentScore);
    const [hasChanged, setHasChanged] = useState(false);

    const handleVote = () => {
        onVote(Math.round(sliderValue));
        setHasChanged(false);
    };

    const roundedScore = Math.round(sliderValue);

    let label = 'Nötr';
    if (roundedScore <= -2) label = 'Muhalif';
    if (roundedScore >= 2) label = 'İktidar';

    // Dynamic colors for slider
    let trackColor = '#a1a1aa';
    if (roundedScore <= -2) trackColor = '#4f46e5'; // Indigo
    if (roundedScore >= 2) trackColor = '#d97706'; // Amber

    return (
        <View className={`bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 rounded-[24px] p-6 mx-4 ${className}`}>
            <View className="flex-row items-center justify-between mb-6">
                <Text className="text-[17px] font-bold text-zinc-900 dark:text-white">
                    Sizce kaynak hangi çizgide?
                </Text>
                {userVote !== undefined && userVote !== null && !hasChanged && (
                    <View className="flex-row items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                        <Check size={12} color="#15803d" />
                        <Text className="text-[10px] font-bold text-green-700 dark:text-green-500 uppercase">
                            OYLANDI
                        </Text>
                    </View>
                )}
            </View>

            {/* Visual Feedback - Enhanced */}
            <View className="items-center justify-center mb-6">
                <View className="flex-row items-center gap-4">
                    <Text className={`text-xs font-bold uppercase transition-colors ${roundedScore <= -2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-300 dark:text-zinc-600'}`}>Muhalif</Text>

                    <View className="items-center">
                        <View className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-full border border-zinc-100 dark:border-zinc-700/50 shadow-sm mb-2">
                            <AlignmentDot score={roundedScore} size={16} />
                        </View>
                        <Text className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{label}</Text>
                        <Text className="text-[10px] font-medium text-zinc-400">Puan: {roundedScore > 0 ? '+' : ''}{roundedScore}</Text>
                    </View>

                    <Text className={`text-xs font-bold uppercase transition-colors ${roundedScore >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}`}>İktidar</Text>
                </View>
            </View>

            {/* Slider */}
            <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={-5}
                maximumValue={5}
                step={1}
                value={sliderValue}
                onValueChange={(val) => {
                    setSliderValue(val);
                    setHasChanged(true);
                }}
                minimumTrackTintColor={trackColor}
                maximumTrackTintColor="#e4e4e7"
                thumbTintColor={trackColor}
            />

            {/* Submit Button */}
            {hasChanged && (
                <TouchableOpacity
                    onPress={handleVote}
                    className="mt-4 bg-zinc-900 dark:bg-white py-3.5 rounded-xl items-center active:scale-[0.98] transition-transform shadow-lg shadow-zinc-200 dark:shadow-none"
                >
                    <Text className="text-white dark:text-zinc-900 font-bold text-sm">
                        Oyu Kaydet ({roundedScore > 0 ? '+' : ''}{roundedScore})
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

AlignmentVotingWidget.displayName = 'AlignmentVotingWidget';
