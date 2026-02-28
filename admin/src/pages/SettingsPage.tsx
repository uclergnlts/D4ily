import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCronStatus, useRunDigest, useRunWeekly, useDigestStatus } from '../hooks/useCron';
import { Clock, Play, Calendar, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { DigestCountryStatus } from '../api/services/cronService';

const COUNTRY_FLAGS: Record<string, string> = {
  tr: 'TR', de: 'DE', us: 'US', uk: 'UK', fr: 'FR', es: 'ES', it: 'IT', ru: 'RU',
};

function CountryStatusIcon({ status }: { status: DigestCountryStatus['status'] }) {
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
  if (status === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
  return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
}

export function SettingsPage() {
  const { data: cronStatus, isLoading } = useCronStatus();
  const runDigestMutation = useRunDigest();
  const runWeeklyMutation = useRunWeekly();
  const [pollDigest, setPollDigest] = useState(false);
  // Always fetch status (enabled=true), poll at 3s intervals only when pollDigest is true
  const { data: digestStatus } = useDigestStatus(pollDigest);

  // Start polling when digest is triggered
  useEffect(() => {
    if (runDigestMutation.isSuccess) {
      setPollDigest(true);
    }
  }, [runDigestMutation.isSuccess]);

  // Auto-detect running job on initial load and manage polling lifecycle
  useEffect(() => {
    if (!digestStatus) return;
    if (digestStatus.running) {
      setPollDigest(true);
    } else if (pollDigest && digestStatus.finishedAt) {
      // Stop polling 5s after completion
      const timer = setTimeout(() => setPollDigest(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [digestStatus, pollDigest]);

  const isDigestRunning = digestStatus?.running || false;
  const successCount = digestStatus?.countries.filter(c => c.status === 'success').length ?? 0;
  const errorCount = digestStatus?.countries.filter(c => c.status === 'error').length ?? 0;
  const elapsed = digestStatus?.startedAt
    ? Math.round(((digestStatus.finishedAt || Date.now()) - digestStatus.startedAt) / 1000)
    : 0;

  return (
    <div>
      <Header title="Settings" subtitle="System configuration and cron jobs" />

      <div className="p-8">
        {/* Cron Jobs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cron Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">News Scraper</h4>
                    <p className="text-sm text-gray-500">{cronStatus?.scraper.schedule}</p>
                  </div>
                  <Badge variant={cronStatus?.scraper.status === 'active' ? 'success' : 'danger'}>
                    {cronStatus?.scraper.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Daily Digest</h4>
                    <p className="text-sm text-gray-500">{cronStatus?.digest.schedule}</p>
                  </div>
                  <Badge variant={cronStatus?.digest.status === 'active' ? 'success' : 'danger'}>
                    {cronStatus?.digest.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Weekly Comparison</h4>
                    <p className="text-sm text-gray-500">{cronStatus?.weekly.schedule}</p>
                  </div>
                  <Badge variant={cronStatus?.weekly.status === 'active' ? 'success' : 'danger'}>
                    {cronStatus?.weekly.status}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Triggers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Manual Triggers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Daily Digest</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Generate daily digest for all countries
                </p>
                <Button
                  onClick={() => runDigestMutation.mutate()}
                  isLoading={runDigestMutation.isPending}
                  disabled={isDigestRunning}
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {isDigestRunning ? 'Running...' : 'Run Daily Digest'}
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Weekly Comparison</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Generate weekly country comparison
                </p>
                <Button
                  onClick={() => runWeeklyMutation.mutate()}
                  isLoading={runWeeklyMutation.isPending}
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Run Weekly
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Digest Generation Status */}
        {digestStatus && (digestStatus.running || digestStatus.finishedAt) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isDigestRunning ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                ) : errorCount > 0 ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                Digest Generation Status
                {isDigestRunning && (
                  <Badge variant="info">{elapsed}s</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <span className="text-gray-500">
                  Trigger: <span className="font-medium text-gray-900">{digestStatus.trigger}</span>
                </span>
                {!isDigestRunning && (
                  <>
                    <span className="text-green-600 font-medium">{successCount} success</span>
                    {errorCount > 0 && <span className="text-red-600 font-medium">{errorCount} failed</span>}
                    <span className="text-gray-500">{elapsed}s total</span>
                  </>
                )}
              </div>

              {/* Per-country status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {digestStatus.countries.map((cs) => (
                  <div
                    key={cs.country}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      cs.status === 'running' ? 'border-blue-200 bg-blue-50' :
                      cs.status === 'success' ? 'border-green-200 bg-green-50' :
                      cs.status === 'error' ? 'border-red-200 bg-red-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <CountryStatusIcon status={cs.status} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{COUNTRY_FLAGS[cs.country] || cs.country.toUpperCase()}</p>
                      {cs.status === 'error' && cs.error && (
                        <p className="text-xs text-red-600 truncate" title={cs.error}>
                          {cs.error.length > 40 ? cs.error.substring(0, 40) + '...' : cs.error}
                        </p>
                      )}
                      {cs.status === 'running' && (
                        <p className="text-xs text-blue-600">Processing...</p>
                      )}
                      {cs.status === 'success' && cs.startedAt && cs.finishedAt && (
                        <p className="text-xs text-green-600">
                          {Math.round((cs.finishedAt - cs.startedAt) / 1000)}s
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Global error */}
              {digestStatus.error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-medium">Error: {digestStatus.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">API URL</p>
                <p className="font-mono">{import.meta.env.VITE_API_URL || 'http://localhost:3333'}</p>
              </div>
              <div>
                <p className="text-gray-500">Environment</p>
                <p className="font-mono">{import.meta.env.MODE}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
