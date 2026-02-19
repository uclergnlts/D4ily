import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Rss, Globe, ChevronDown, ChevronUp } from 'lucide-react-native';

interface RssSource {
    name: string;
    url: string;
}

interface XAccount {
    userName: string;
    displayName: string;
    type: string;
}

interface CountryData {
    code: string;
    flag: string;
    name: string;
    rss: RssSource[];
    x: XAccount[];
}

const COUNTRIES: CountryData[] = [
    {
        code: 'tr', flag: '🇹🇷', name: 'Türkiye',
        rss: [
            { name: 'Hürriyet', url: 'hurriyet.com.tr' },
            { name: 'Sözcü', url: 'sozcu.com.tr' },
            { name: 'NTV', url: 'ntv.com.tr' },
            { name: 'Sabah', url: 'sabah.com.tr' },
            { name: 'Cumhuriyet', url: 'cumhuriyet.com.tr' },
            { name: 'TRT Haber', url: 'trthaber.com' },
            { name: 'CNN Türk', url: 'cnnturk.com' },
            { name: 'Milliyet', url: 'milliyet.com.tr' },
            { name: 'Habertürk', url: 'haberturk.com' },
            { name: 'Haberler.com', url: 'haberler.com' },
            { name: 'Haber7', url: 'haber7.net' },
            { name: 'Vatan', url: 'gazetevatan.com' },
            { name: 'SoL Haber', url: 'haber.sol.org.tr' },
        ],
        x: [
            { userName: 'RTErdogan', displayName: 'Recep Tayyip Erdoğan', type: 'Hükümet' },
            { userName: 'tcbaskanlik', displayName: 'T.C. Cumhurbaşkanlığı', type: 'Hükümet' },
            { userName: 'TC_Disisleri', displayName: 'Dışişleri Bakanlığı', type: 'Hükümet' },
            { userName: 'iaborakisim', displayName: 'İletişim Başkanlığı', type: 'Hükümet' },
            { userName: 'TC_Icisleri', displayName: 'İçişleri Bakanlığı', type: 'Hükümet' },
            { userName: 'adalet_bakanligi', displayName: 'Adalet Bakanlığı', type: 'Hükümet' },
            { userName: 'AFADBaskanlik', displayName: 'AFAD', type: 'Hükümet' },
            { userName: 'HakanFidan', displayName: 'Hakan Fidan', type: 'Hükümet' },
            { userName: 'fahrettinaltun', displayName: 'Fahrettin Altun', type: 'Hükümet' },
            { userName: 'omerrcelik', displayName: 'Ömer Çelik', type: 'Hükümet' },
            { userName: 'memetsimsek', displayName: 'Mehmet Şimşek', type: 'Hükümet' },
            { userName: 'AliYerlikaya', displayName: 'Ali Yerlikaya', type: 'Hükümet' },
            { userName: 'Yusuf__Tekin', displayName: 'Yusuf Tekin', type: 'Hükümet' },
            { userName: 'cevdetyilmaz', displayName: 'Cevdet Yılmaz', type: 'Hükümet' },
            { userName: 'NumanKurtulmus', displayName: 'Numan Kurtulmuş', type: 'Hükümet' },
            { userName: 'AlparslanBayrak', displayName: 'Alparslan Bayraktar', type: 'Hükümet' },
            { userName: 'a_uraloglu', displayName: 'Abdulkadir Uraloğlu', type: 'Hükümet' },
            { userName: 'dbdevletbahceli', displayName: 'Devlet Bahçeli', type: 'Siyaset' },
            { userName: 'eczozgurozel', displayName: 'Özgür Özel', type: 'Siyaset' },
            { userName: 'kilicdarogluk', displayName: 'Kemal Kılıçdaroğlu', type: 'Siyaset' },
            { userName: 'ekrem_imamoglu', displayName: 'Ekrem İmamoğlu', type: 'Siyaset' },
            { userName: 'mansuryavas06', displayName: 'Mansur Yavaş', type: 'Siyaset' },
            { userName: 'meral_aksener', displayName: 'Meral Akşener', type: 'Siyaset' },
            { userName: 'alibabacan', displayName: 'Ali Babacan', type: 'Siyaset' },
            { userName: 'MDervisogluTR', displayName: 'Müsavat Dervişoğlu', type: 'Siyaset' },
            { userName: 'erbakanfatih', displayName: 'Fatih Erbakan', type: 'Siyaset' },
            { userName: 'umitozdag', displayName: 'Ümit Özdağ', type: 'Siyaset' },
            { userName: 'MuharremInce', displayName: 'Muharrem İnce', type: 'Siyaset' },
            { userName: 'Ahmet_Davutoglu', displayName: 'Ahmet Davutoğlu', type: 'Siyaset' },
            { userName: 'herkesicinCHP', displayName: 'CHP', type: 'Siyaset' },
            { userName: 'HDPgenelmerkezi', displayName: 'HDP', type: 'Siyaset' },
            { userName: 'serakadigil', displayName: 'Sera Kadıgil', type: 'Siyaset' },
            { userName: 'MTanal', displayName: 'Mahmut Tanal', type: 'Siyaset' },
            { userName: 'tanjuozcanchp', displayName: 'Tanju Özcan', type: 'Siyaset' },
            { userName: 'nevsinmengu', displayName: 'Nevşin Mengü', type: 'Gazeteci' },
            { userName: 'cuneytozdemir', displayName: 'Cüneyt Özdemir', type: 'Gazeteci' },
            { userName: 'fatihportakal', displayName: 'Fatih Portakal', type: 'Gazeteci' },
            { userName: 'yilmazozdil', displayName: 'Yılmaz Özdil', type: 'Gazeteci' },
            { userName: 'ismailsaymaz', displayName: 'İsmail Saymaz', type: 'Gazeteci' },
            { userName: 'muratagirel', displayName: 'Murat Ağırel', type: 'Gazeteci' },
            { userName: 'baristerkoglu', displayName: 'Barış Terkoğlu', type: 'Gazeteci' },
            { userName: 'barispehlivan', displayName: 'Barış Pehlivan', type: 'Gazeteci' },
            { userName: 'ugur_dundar', displayName: 'Uğur Dündar', type: 'Gazeteci' },
            { userName: 'candundaradasi', displayName: 'Can Dündar', type: 'Gazeteci' },
            { userName: 'fatihaltayli', displayName: 'Fatih Altaylı', type: 'Gazeteci' },
            { userName: 'timursoykan', displayName: 'Timur Soykan', type: 'Gazeteci' },
            { userName: 'cigdemtoker', displayName: 'Çiğdem Toker', type: 'Gazeteci' },
            { userName: 'abdulkadir_selvi', displayName: 'Abdulkadir Selvi', type: 'Gazeteci' },
            { userName: 'saygi_ozturk', displayName: 'Saygı Öztürk', type: 'Gazeteci' },
            { userName: 'muratyetkin2', displayName: 'Murat Yetkin', type: 'Gazeteci' },
            { userName: 'ismailari_', displayName: 'İsmail Arı', type: 'Gazeteci' },
            { userName: 'kucukkayaismail', displayName: 'İsmail Küçükkaya', type: 'Gazeteci' },
            { userName: 'barisyarkadas', displayName: 'Barış Yarkadaş', type: 'Gazeteci' },
            { userName: 'eceuner12', displayName: 'Ece Üner', type: 'Gazeteci' },
            { userName: 'merdanyanardag', displayName: 'Merdan Yanardağ', type: 'Gazeteci' },
            { userName: 'fehimtastekin', displayName: 'Fehim Taştekin', type: 'Gazeteci' },
            { userName: 'haskologlu', displayName: 'Haskoloğlu', type: 'Gazeteci' },
            { userName: 'mahfiegilmez', displayName: 'Mahfi Eğilmez', type: 'Ekonomist' },
            { userName: 'OzgrDemirtas', displayName: 'Özgür Demirtaş', type: 'Ekonomist' },
            { userName: 'emrealkin1969', displayName: 'Emre Alkin', type: 'Ekonomist' },
            { userName: 'mustafasonmez', displayName: 'Mustafa Sönmez', type: 'Ekonomist' },
            { userName: 'ugurses', displayName: 'Uğur Gürses', type: 'Ekonomist' },
            { userName: 'AtillaYesilada7', displayName: 'Atilla Yeşilada', type: 'Ekonomist' },
            { userName: 'RefetGurkaynak', displayName: 'Refet Gürkaynak', type: 'Ekonomist' },
            { userName: 'aaborakans', displayName: 'Anadolu Ajansı', type: 'Medya' },
            { userName: 'trthaber', displayName: 'TRT Haber', type: 'Medya' },
            { userName: 't24comtr', displayName: 'T24', type: 'Medya' },
            { userName: 'gazeteduvar', displayName: 'Gazete Duvar', type: 'Medya' },
            { userName: 'medyascope', displayName: 'Medyascope', type: 'Medya' },
            { userName: 'dokuz8haber', displayName: 'Dokuz8 Haber', type: 'Medya' },
            { userName: 'bbcturkce', displayName: 'BBC Türkçe', type: 'Medya' },
            { userName: 'dw_turkce', displayName: 'DW Türkçe', type: 'Medya' },
            { userName: 'voaturkce', displayName: 'VOA Türkçe', type: 'Medya' },
            { userName: 'pusholder', displayName: 'Pusholder', type: 'Medya' },
            { userName: 'Fenerbahce', displayName: 'Fenerbahçe', type: 'Spor' },
            { userName: 'GalatasaraySK', displayName: 'Galatasaray', type: 'Spor' },
            { userName: 'Besiktas', displayName: 'Beşiktaş', type: 'Spor' },
            { userName: 'Trabzonspor', displayName: 'Trabzonspor', type: 'Spor' },
            { userName: 'TFF_Org', displayName: 'TFF', type: 'Spor' },
        ],
    },
    {
        code: 'de', flag: '🇩🇪', name: 'Almanya',
        rss: [
            { name: 'Der Spiegel', url: 'spiegel.de' },
            { name: 'Bild', url: 'bild.de' },
            { name: 'Die Zeit', url: 'zeit.de' },
            { name: 'The Local DE', url: 'thelocal.com/de' },
            { name: 'Tagesschau', url: 'tagesschau.de' },
            { name: 'FAZ', url: 'faz.net' },
            { name: 'DW', url: 'dw.com' },
        ],
        x: [
            { userName: 'Bundeskanzler', displayName: 'Bundeskanzler', type: 'Hükümet' },
            { userName: 'AusijirtigesAmt', displayName: 'Auswärtiges Amt', type: 'Hükümet' },
            { userName: 'RegSprecher', displayName: 'Regierungssprecher', type: 'Hükümet' },
            { userName: 'taborakesschau', displayName: 'tagesschau', type: 'Medya' },
            { userName: 'ZDFheute', displayName: 'ZDFheute', type: 'Medya' },
            { userName: 'dpa', displayName: 'dpa', type: 'Medya' },
        ],
    },
    {
        code: 'us', flag: '🇺🇸', name: 'ABD',
        rss: [
            { name: 'CNN', url: 'cnn.com' },
            { name: 'Reuters', url: 'reuters.com' },
            { name: 'The Guardian', url: 'theguardian.com' },
            { name: 'PBS', url: 'pbs.org' },
            { name: 'Al Jazeera', url: 'aljazeera.com' },
            { name: 'AP News', url: 'apnews.com' },
            { name: 'Defense One', url: 'defenseone.com' },
            { name: 'The Diplomat', url: 'thediplomat.com' },
            { name: 'NPR', url: 'npr.org' },
        ],
        x: [
            { userName: 'POTUS', displayName: 'President of the United States', type: 'Hükümet' },
            { userName: 'WhiteHouse', displayName: 'The White House', type: 'Hükümet' },
            { userName: 'StateDept', displayName: 'Department of State', type: 'Hükümet' },
            { userName: 'AP', displayName: 'The Associated Press', type: 'Medya' },
            { userName: 'Reuters', displayName: 'Reuters', type: 'Medya' },
            { userName: 'ABC', displayName: 'ABC News', type: 'Medya' },
        ],
    },
    {
        code: 'uk', flag: '🇬🇧', name: 'İngiltere',
        rss: [
            { name: 'Politics.co.uk', url: 'politics.co.uk' },
            { name: 'BBC News', url: 'bbc.co.uk' },
            { name: 'The Guardian', url: 'theguardian.com' },
            { name: 'Sky News', url: 'skynews.com' },
        ],
        x: [
            { userName: 'UKPrimeMinister', displayName: 'UK Prime Minister', type: 'Hükümet' },
            { userName: '10DowningStreet', displayName: '10 Downing Street', type: 'Hükümet' },
            { userName: 'FCDOGovUK', displayName: 'FCDO', type: 'Hükümet' },
            { userName: 'BBCNews', displayName: 'BBC News', type: 'Medya' },
            { userName: 'SkyNews', displayName: 'Sky News', type: 'Medya' },
        ],
    },
    {
        code: 'fr', flag: '🇫🇷', name: 'Fransa',
        rss: [
            { name: 'France TV Info', url: 'francetvinfo.fr' },
            { name: 'France 24', url: 'france24.com' },
            { name: 'Le Monde', url: 'lemonde.fr' },
        ],
        x: [
            { userName: 'EmmanuelMacron', displayName: 'Emmanuel Macron', type: 'Hükümet' },
            { userName: 'Elysee', displayName: 'Élysée', type: 'Hükümet' },
            { userName: 'francediplo', displayName: 'France Diplomatie', type: 'Hükümet' },
            { userName: 'gouvernementFR', displayName: 'Gouvernement', type: 'Hükümet' },
            { userName: 'AFP', displayName: 'AFP', type: 'Medya' },
            { userName: 'lemondefr', displayName: 'Le Monde', type: 'Medya' },
        ],
    },
    {
        code: 'es', flag: '🇪🇸', name: 'İspanya',
        rss: [
            { name: 'El Mundo', url: 'elmundo.es' },
            { name: 'El Diario', url: 'eldiario.es' },
            { name: 'El Español', url: 'elespanol.com' },
            { name: 'El País', url: 'elpais.com' },
        ],
        x: [
            { userName: 'saboraknchezcastejon', displayName: 'Pedro Sánchez', type: 'Hükümet' },
            { userName: 'lamoncloa', displayName: 'La Moncloa', type: 'Hükümet' },
            { userName: 'MAECgob', displayName: 'MAEC', type: 'Hükümet' },
            { userName: 'EFEnoticias', displayName: 'Agencia EFE', type: 'Medya' },
            { userName: 'el_pais', displayName: 'El País', type: 'Medya' },
        ],
    },
    {
        code: 'it', flag: '🇮🇹', name: 'İtalya',
        rss: [
            { name: 'Corriere della Sera', url: 'corriere.it' },
            { name: 'ANSA', url: 'ansa.it' },
            { name: 'La Repubblica', url: 'repubblica.it' },
        ],
        x: [
            { userName: 'GiorgiaMeloni', displayName: 'Giorgia Meloni', type: 'Hükümet' },
            { userName: 'PalazzoChigi', displayName: 'Palazzo Chigi', type: 'Hükümet' },
            { userName: 'ItalyMFA', displayName: 'Italy MFA', type: 'Hükümet' },
            { userName: 'Agenzia_Ansa', displayName: 'ANSA', type: 'Medya' },
            { userName: 'repubblica', displayName: 'la Repubblica', type: 'Medya' },
        ],
    },
    {
        code: 'ru', flag: '🇷🇺', name: 'Rusya',
        rss: [
            { name: 'Sputnik Globe', url: 'sputnikglobe.com' },
            { name: 'TASS', url: 'tass.com' },
            { name: 'Moscow Times', url: 'themoscowtimes.com' },
        ],
        x: [
            { userName: 'KremlinRussia_E', displayName: 'President of Russia', type: 'Hükümet' },
            { userName: 'mfa_russia', displayName: 'MFA Russia', type: 'Hükümet' },
            { userName: 'tass_agency', displayName: 'TASS', type: 'Medya' },
        ],
    },
];

const TYPE_COLORS: Record<string, string> = {
    'Hükümet': '#006FFF',
    'Siyaset': '#8b5cf6',
    'Gazeteci': '#f59e0b',
    'Ekonomist': '#10b981',
    'Medya': '#ef4444',
    'Spor': '#06b6d4',
};

function CountrySection({ country }: { country: CountryData }) {
    const [expanded, setExpanded] = useState(country.code === 'tr');
    const [showAllX, setShowAllX] = useState(false);

    const displayedX = showAllX ? country.x : country.x.slice(0, 10);
    const hasMoreX = country.x.length > 10;

    return (
        <View className="mx-4 mb-4">
            <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                className="flex-row items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800"
                activeOpacity={0.7}
            >
                <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">{country.flag}</Text>
                    <Text
                        className="text-[16px] text-zinc-900 dark:text-white"
                        style={{ fontFamily: 'DMSans_700Bold' }}
                    >
                        {country.name}
                    </Text>
                    <View className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        <Text
                            className="text-[11px] text-zinc-500"
                            style={{ fontFamily: 'DMSans_500Medium' }}
                        >
                            {country.rss.length + country.x.length}
                        </Text>
                    </View>
                </View>
                {expanded ? (
                    <ChevronUp size={20} color="#a1a1aa" />
                ) : (
                    <ChevronDown size={20} color="#a1a1aa" />
                )}
            </TouchableOpacity>

            {expanded && (
                <View className="mt-2">
                    {/* RSS */}
                    <View className="mb-3">
                        <View className="flex-row items-center gap-2 mb-2 px-1">
                            <Rss size={14} color="#f59e0b" />
                            <Text
                                className="text-[13px] text-zinc-500 dark:text-zinc-400"
                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                            >
                                RSS Kaynakları ({country.rss.length})
                            </Text>
                        </View>
                        <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                            {country.rss.map((source, idx) => (
                                <View
                                    key={source.url}
                                    className={`flex-row items-center px-4 py-3 ${
                                        idx < country.rss.length - 1 ? 'border-b border-zinc-50 dark:border-zinc-800' : ''
                                    }`}
                                >
                                    <View className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 items-center justify-center mr-3">
                                        <Rss size={14} color="#f59e0b" />
                                    </View>
                                    <View className="flex-1">
                                        <Text
                                            className="text-[14px] text-zinc-900 dark:text-white"
                                            style={{ fontFamily: 'DMSans_500Medium' }}
                                        >
                                            {source.name}
                                        </Text>
                                        <Text
                                            className="text-[11px] text-zinc-400"
                                            style={{ fontFamily: 'DMSans_400Regular' }}
                                        >
                                            {source.url}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* X Accounts */}
                    <View>
                        <View className="flex-row items-center gap-2 mb-2 px-1">
                            <Text className="text-[14px]">𝕏</Text>
                            <Text
                                className="text-[13px] text-zinc-500 dark:text-zinc-400"
                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                            >
                                X Hesapları ({country.x.length})
                            </Text>
                        </View>
                        <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                            {displayedX.map((account, idx) => (
                                <TouchableOpacity
                                    key={account.userName}
                                    onPress={() => Linking.openURL(`https://x.com/${account.userName}`)}
                                    className={`flex-row items-center px-4 py-3 ${
                                        idx < displayedX.length - 1 || (hasMoreX && !showAllX)
                                            ? 'border-b border-zinc-50 dark:border-zinc-800'
                                            : ''
                                    }`}
                                    activeOpacity={0.6}
                                >
                                    <View className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 items-center justify-center mr-3">
                                        <Text className="text-[12px]">𝕏</Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text
                                            className="text-[14px] text-zinc-900 dark:text-white"
                                            style={{ fontFamily: 'DMSans_500Medium' }}
                                        >
                                            {account.displayName}
                                        </Text>
                                        <Text
                                            className="text-[11px] text-zinc-400"
                                            style={{ fontFamily: 'DMSans_400Regular' }}
                                        >
                                            @{account.userName}
                                        </Text>
                                    </View>
                                    <View
                                        className="px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: (TYPE_COLORS[account.type] || '#a1a1aa') + '15' }}
                                    >
                                        <Text
                                            className="text-[10px]"
                                            style={{
                                                fontFamily: 'DMSans_500Medium',
                                                color: TYPE_COLORS[account.type] || '#a1a1aa',
                                            }}
                                        >
                                            {account.type}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {hasMoreX && !showAllX && (
                                <TouchableOpacity
                                    onPress={() => setShowAllX(true)}
                                    className="py-3 items-center"
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        className="text-[12px] text-[#006FFF]"
                                        style={{ fontFamily: 'DMSans_600SemiBold' }}
                                    >
                                        {country.x.length - 10} hesap daha göster
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

export default function SourcesScreen() {
    const router = useRouter();

    const totalRss = COUNTRIES.reduce((sum, c) => sum + c.rss.length, 0);
    const totalX = COUNTRIES.reduce((sum, c) => sum + c.x.length, 0);

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-black">
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView className="flex-1">
                <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center bg-white dark:bg-zinc-900">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ChevronLeft size={24} color="#006FFF" />
                    </TouchableOpacity>
                    <View className="flex-1 items-center flex-row">
                        <Globe size={24} color="#006FFF" />
                        <Text
                            className="text-xl text-zinc-900 dark:text-white ml-2"
                            style={{ fontFamily: 'DMSans_700Bold' }}
                        >
                            Kaynaklar
                        </Text>
                    </View>
                    <View className="w-10" />
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Summary Cards */}
                    <View className="mx-4 mt-4 mb-4 flex-row gap-3">
                        <View className="flex-1 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 items-center">
                            <Text
                                className="text-2xl text-zinc-900 dark:text-white"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                {totalRss}
                            </Text>
                            <Text
                                className="text-[11px] text-zinc-500 mt-0.5"
                                style={{ fontFamily: 'DMSans_500Medium' }}
                            >
                                RSS Kaynağı
                            </Text>
                        </View>
                        <View className="flex-1 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 items-center">
                            <Text
                                className="text-2xl text-zinc-900 dark:text-white"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                {totalX}
                            </Text>
                            <Text
                                className="text-[11px] text-zinc-500 mt-0.5"
                                style={{ fontFamily: 'DMSans_500Medium' }}
                            >
                                X Hesabı
                            </Text>
                        </View>
                        <View className="flex-1 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 items-center">
                            <Text
                                className="text-2xl text-zinc-900 dark:text-white"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                {COUNTRIES.length}
                            </Text>
                            <Text
                                className="text-[11px] text-zinc-500 mt-0.5"
                                style={{ fontFamily: 'DMSans_500Medium' }}
                            >
                                Ülke
                            </Text>
                        </View>
                    </View>

                    <Text
                        className="mx-5 mb-3 text-[12px] text-zinc-400"
                        style={{ fontFamily: 'DMSans_400Regular' }}
                    >
                        D4ily, aşağıdaki kaynaklardan haber toplayarak yapay zeka ile özetler oluşturur.
                    </Text>

                    {COUNTRIES.map(country => (
                        <CountrySection key={country.code} country={country} />
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
