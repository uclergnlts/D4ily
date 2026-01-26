import { client } from '../client';
import { ApiResponse, DailyDigest } from '../../types';

export const digestService = {
    getLatestDigest: async (country: string) => {
        // Backend: GET /digest/:country/latest
        const response = await client.get<ApiResponse<DailyDigest>>(`/digest/${country}/latest`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch digest');
        }

        return response.data.data;
    },

    getDigests: async (country: string) => {
        // Backend: GET /digest/:country (returns list of recent digests)
        try {
            const response = await client.get<ApiResponse<DailyDigest[]>>(`/digest/${country}`);

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to fetch digests');
            }

            return response.data.data;
        } catch (error) {
            console.warn('API connection failed, falling back to Mock Data for Digests.', error);
            await new Promise(resolve => setTimeout(resolve, 800));

            // Generate Mock Digests for the last 5 days
            const mockDigests: DailyDigest[] = [];
            const today = new Date();

            for (let i = 0; i < 5; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                // Morning Digest
                mockDigests.push({
                    id: `morning-${dateStr}`,
                    date: dateStr,
                    countryCode: country,
                    period: 'morning',
                    title: i === 0 ? 'Günün Başlangıcı: Kritik Gelişmeler' : `${date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} Sabah Özeti`,
                    summary: 'Piyasalar güne hızlı başladı. Siyasette yeni tartışmalar alevlenirken, teknoloji dünyasında önemli bir satın alma gerçekleşti.',
                    topTopics: [
                        { title: 'Ekonomi ve Piyasalar', description: 'Borsa İstanbul rekor seviyeyi test ediyor.' },
                        { title: 'Siyaset Gündemi', description: 'Meclis yeni yasayı oylamaya hazırlanıyor.' },
                        { title: 'Teknoloji', description: 'Yerli otomobil üretiminde yeni aşama.' }
                    ],
                    articleCount: 12,
                    createdAt: new Date().toISOString()
                });

                // Evening Digest (Skip for today if it's too early, but let's show it for demo)
                mockDigests.push({
                    id: `evening-${dateStr}`,
                    date: dateStr,
                    countryCode: country,
                    period: 'evening',
                    title: i === 0 ? 'Günün Özeti: Neler Oldu?' : `${date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} Akşam Bülteni`,
                    summary: 'Günü bitirirken bilmeniz gereken her şey. Spor dünyasındaki son dakika gelişmeleri ve dünyadan yankılar.',
                    topTopics: [
                        { title: 'Günün Analizi', description: 'Uzmanlar bugünkü ekonomik verileri yorumladı.' },
                        { title: 'Spor', description: 'Milli maç öncesi son durum.' },
                        { title: 'Dünya', description: 'Avrupa başkentlerinde iklim protestoları.' }
                    ],
                    articleCount: 15,
                    createdAt: new Date().toISOString()
                });
            }

            return mockDigests;
        }
    },

    getDigestById: async (country: string, digestId: string) => {
        const response = await client.get<ApiResponse<DailyDigest>>(`/digest/${country}/${digestId}`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch digest details');
        }

        return response.data.data;
    }
};
