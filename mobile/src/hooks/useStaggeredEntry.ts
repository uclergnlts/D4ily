import { FadeInDown } from 'react-native-reanimated';
import { useReducedMotion } from './useReducedMotion';

export function useStaggeredEntry() {
    const reducedMotion = useReducedMotion();

    const getEntryAnimation = (index: number) => {
        if (reducedMotion) return undefined;
        return FadeInDown
            .delay(index * 80)
            .duration(400)
            .springify()
            .damping(15);
    };

    return { getEntryAnimation, reducedMotion };
}
