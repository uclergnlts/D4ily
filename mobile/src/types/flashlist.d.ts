// Type augmentation for @shopify/flash-list
// Fixes missing estimatedItemSize prop in FlashList types

import '@shopify/flash-list';

declare module '@shopify/flash-list' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export interface FlashListProps<T> {
    estimatedItemSize?: number;
  }
}
