import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComparisonView } from '../../src/components/comparison/ComparisonView';

export default function ComparisonScreen() {
    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <ComparisonView />
        </SafeAreaView>
    );
}
