import { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useDigestQuality, useDigests } from '../hooks/useDigest';
import { useRunDigest } from '../hooks/useCron';
import { COUNTRIES, type CountryCode, type DailyDigestAdmin, type DigestTopic } from '../types';
import { BarChart3, CalendarDays, MessageCircle, RefreshCw, Sparkles } from 'lucide-react';

const DAYS_OPTIONS = [3, 7, 14, 30];

function getCountry(code?: string): CountryCode | null {
  const found = COUNTRIES.find((c) => c.code === code);
  return found?.code ?? null;
}

function topicImportanceVariant(topic: DigestTopic): 'danger' | 'warning' | 'default' {
  if (topic.importanceTier === 'yuksek') return 'danger';
  if (topic.importanceTier === 'orta') return 'warning';
  return 'default';
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function DigestsByCountryPage() {
  const { countryCode } = useParams<{ countryCode: string }>();
  const resolvedCountry = getCountry(countryCode) ?? 'tr';
  const shouldRedirect = !getCountry(countryCode);
  const [days, setDays] = useState(7);
  const [selectedDigest, setSelectedDigest] = useState<DailyDigestAdmin | null>(null);

  const runDigestMutation = useRunDigest();

  const countryInfo = COUNTRIES.find((c) => c.code === resolvedCountry)!;

  const {
    data: quality,
    isLoading: qualityLoading,
    refetch: refetchQuality,
  } = useDigestQuality(resolvedCountry, days);

  const {
    data: digests,
    isLoading: digestsLoading,
    refetch: refetchDigests,
  } = useDigests(resolvedCountry);

  const sortedDigests = useMemo(() => {
    return [...(digests || [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [digests]);

  const refreshAll = async () => {
    await Promise.all([refetchQuality(), refetchDigests()]);
  };

  if (shouldRedirect) {
    return <Navigate to="/digests/tr" replace />;
  }

  return (
    <div>
      <Header
        title={`${countryInfo.flag} ${countryInfo.name} Digests`}
        subtitle="Digest quality, importance signals, and X highlights"
      />

      <div className="p-8 space-y-6">
        <Card>
          <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="days" className="text-sm text-gray-600">Time window</label>
              <select
                id="days"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {DAYS_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={refreshAll}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                onClick={() => runDigestMutation.mutate()}
                isLoading={runDigestMutation.isPending}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Run Daily Digest
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Digests</p>
                <p className="text-2xl font-bold text-gray-900">{qualityLoading ? '...' : quality?.digests ?? 0}</p>
              </div>
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Importance</p>
                <p className="text-2xl font-bold text-gray-900">{qualityLoading ? '...' : percent(quality?.avgImportanceScore ?? 0)}</p>
              </div>
              <BarChart3 className="h-6 w-6 text-red-600" />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">Counter Narrative Coverage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{qualityLoading ? '...' : percent(quality?.counterNarrativeCoverage ?? 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">Timeline Coverage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{qualityLoading ? '...' : percent(quality?.timelineCoverage ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Uncertainty Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Kesin</p>
                <p className="text-xl font-bold">{qualityLoading ? '...' : quality?.uncertaintyDistribution.Kesin ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Muhtemel</p>
                <p className="text-xl font-bold">{qualityLoading ? '...' : quality?.uncertaintyDistribution.Muhtemel ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Gelisiyor</p>
                <p className="text-xl font-bold">{qualityLoading ? '...' : quality?.uncertaintyDistribution.Gelisiyor ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Daily Digests</CardTitle>
          </CardHeader>
          <CardContent>
            {digestsLoading ? (
              <div className="text-sm text-gray-500">Loading digests...</div>
            ) : sortedDigests.length === 0 ? (
              <div className="text-sm text-gray-500">No digests found.</div>
            ) : (
              <div className="space-y-4">
                {sortedDigests.map((digest) => (
                  <div key={digest.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs uppercase text-gray-500">{digest.date}</p>
                        <h3 className="text-lg font-semibold text-gray-900">{digest.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Badge variant="info">Articles: {digest.articleCount}</Badge>
                        <Badge variant="default">Tweets: {digest.tweetCount ?? digest.socialHighlights?.length ?? 0}</Badge>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{digest.summary}</p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {(digest.topTopics || []).slice(0, 4).map((topic, idx) => (
                        <Badge key={`${digest.id}-${idx}`} variant={topicImportanceVariant(topic)}>
                          {topic.title}
                        </Badge>
                      ))}
                    </div>

                    <Button variant="secondary" size="sm" onClick={() => setSelectedDigest(digest)}>
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={!!selectedDigest}
        onClose={() => setSelectedDigest(null)}
        title={selectedDigest?.title || 'Digest Details'}
        size="xl"
      >
        {selectedDigest && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <p className="text-xs uppercase text-gray-500">{selectedDigest.date}</p>
              <p className="text-sm text-gray-700 mt-2">{selectedDigest.summary}</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Top Topics</h4>
              <div className="space-y-3">
                {selectedDigest.topTopics?.map((topic, idx) => (
                  <div key={`${selectedDigest.id}-topic-${idx}`} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{topic.title}</span>
                      <Badge variant={topicImportanceVariant(topic)}>{topic.importanceTier || 'orta'}</Badge>
                    </div>
                    <p className="text-sm text-gray-700">{topic.description}</p>
                    {topic.whyImportant && <p className="text-xs text-gray-600 mt-1">Why: {topic.whyImportant}</p>}
                    {topic.counterNarrative && <p className="text-xs text-gray-600 mt-1">Counter: {topic.counterNarrative}</p>}
                  </div>
                ))}
              </div>
            </div>

            {selectedDigest.sections && selectedDigest.sections.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Sections</h4>
                <div className="space-y-3">
                  {selectedDigest.sections.map((section, sIdx) => (
                    <div key={`${selectedDigest.id}-section-${sIdx}`} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{section.icon || 'o'}</span>
                        <span className="font-medium text-gray-900">{section.category}</span>
                        {typeof section.importanceScore === 'number' && (
                          <Badge variant="warning">{percent(section.importanceScore)}</Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 mb-2">{section.summary}</p>

                      {section.highlights && section.highlights.length > 0 && (
                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-2">
                          {section.highlights.map((h, hIdx) => (
                            <li key={`${selectedDigest.id}-sec-${sIdx}-h-${hIdx}`}>{h}</li>
                          ))}
                        </ul>
                      )}

                      {section.tweets && section.tweets.length > 0 && (
                        <div className="space-y-2">
                          {section.tweets.slice(0, 6).map((tweet, tIdx) => (
                            <div key={`${selectedDigest.id}-sec-${sIdx}-t-${tIdx}`} className="rounded-lg bg-gray-50 p-2.5">
                              <div className="flex items-center gap-2 mb-1">
                                {tweet.profileImageUrl ? (
                                  <img
                                    src={tweet.profileImageUrl}
                                    alt={tweet.author || tweet.handle}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center">
                                    {(tweet.author?.charAt(0) || tweet.handle?.replace('@', '').charAt(0) || 'X').toUpperCase()}
                                  </div>
                                )}
                                <span className="text-xs font-medium text-gray-900">{tweet.author || tweet.handle}</span>
                                <span className="text-xs text-gray-500">{tweet.handle}</span>
                              </div>
                              <p className="text-xs text-gray-700">{tweet.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDigest.socialHighlights && selectedDigest.socialHighlights.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  X Highlights
                </h4>
                <div className="space-y-2">
                  {selectedDigest.socialHighlights.slice(0, 10).map((tweet, idx) => (
                    <div key={`${selectedDigest.id}-social-${idx}`} className="rounded-lg border p-2.5">
                      <p className="text-xs text-gray-500 mb-1">{tweet.author} {tweet.handle}</p>
                      <p className="text-sm text-gray-700">{tweet.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
