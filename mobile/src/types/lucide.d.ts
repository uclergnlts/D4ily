// Type augmentation for lucide-react-native
// This extends the LucideProps interface to include commonly used props
// that are supported at runtime but missing from type definitions

import 'lucide-react-native';
import { ViewStyle } from 'react-native';

declare module 'lucide-react-native' {
    interface LucideProps {
        size?: number | string;
        color?: string;
        strokeWidth?: number | string;
        absoluteStrokeWidth?: boolean;
        fill?: string;
        className?: string;
        style?: ViewStyle | ViewStyle[];
    }
}
