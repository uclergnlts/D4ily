import { FadeInDown } from 'react-native-reanimated';
import { useReducedMotion } from './useReducedMotion';

export function useStaggeredEntry() {
    const reducedMotion = useReducedMotion();

    const getEntryAnimation = (index: number) => {
        if (reducedMotion) return undefined;
        return FadeInDown
            .delay(index * 40)
            .duration(250)
            .springify()
            .damping(18);
    };

    return { getEntryAnimation, reducedMotion };
}
