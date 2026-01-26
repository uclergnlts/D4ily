import React from 'react';
import { render } from '@testing-library/react-native';
import { ArticleCard } from '../src/components/article/ArticleCard';
import { Article } from '../src/types';

const mockArticle: Article = {
    id: '1',
    originalTitle: 'Original Title',
    translatedTitle: 'Test Article Translated',
    summary: 'This is a test summary',
    originalContent: 'Content',
    originalLanguage: 'en',
    imageUrl: 'http://example.com/image.jpg',
    publishedAt: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    sentiment: 'neutral',
    viewCount: 100,
    commentCount: 5,
    likeCount: 10,
    dislikeCount: 2,
    isClickbait: false,
    isAd: false,
    isFiltered: false,
    sourceCount: 1,
    categoryId: 1,
    source: 'Test Source',
};

describe('ArticleCard', () => {
    it('renders correctly', () => {
        const { getByText } = render(<ArticleCard article={mockArticle} />);

        expect(getByText('Test Article Translated')).toBeTruthy();
        expect(getByText('This is a test summary')).toBeTruthy();
        expect(getByText('Test Source')).toBeTruthy();
    });
});
