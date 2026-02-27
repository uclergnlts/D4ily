import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useSystemHealth } from '../hooks/useSystem';
import { formatUptime } from '../lib/utils';
import { Activity, Database, Cpu, DollarSign } from 'lucide-react';

const COUNTRY_LABELS: Record<string, string> = {
  tr: 'Turkey', de: 'Germany', us: 'United States', uk: 'United Kingdom',
  fr: 'France', es: 'Spain', it: 'Italy', ru: 'Russia',
};

export function SystemHealthPage() {
  const { data: health, isLoading } = useSystemHealth();

  if (isLoading) {
    return (
      <div>
        <Header title="System Health" subtitle="Server metrics and database stats" />
        <div className="p-8"><p className="text-gray-500">Loading...</p></div>
      </div>
    );
  }

  if (!health) {
    return (
      <div>
        <Header title="System Health" subtitle="Server metrics and database stats" />
        <div className="p-8"><p className="text-gray-500">Failed to load system health.</p></div>
      </div>
    );
  }

  const totalArticles = Object.values(health.database).reduce((sum, c) => sum + c.articles, 0);
  const totalDigests = Object.values(health.database).reduce((sum, c) => sum + c.digests, 0);
  const totalTweets = Object.values(health.database).reduce((sum, c) => sum + c.tweets, 0);

  return (
    <div>
      <Header title="System Health" subtitle="Server metrics, database stats, and AI usage" />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Uptime</p>
                <p className="text-2xl font-bold">{formatUptime(health.uptime)}</p>
              </div>
              <Activity className="h-6 w-6 text-green-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Memory (Heap)</p>
                <p className="text-2xl font-bold">{health.memory.heapUsed}MB <span className="text-sm text-gray-400">/ {health.memory.heapTotal}MB</span></p>
              </div>
              <Cpu className="h-6 w-6 text-orange-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Users</p>
                <p className="text-2xl font-bold">{health.users}</p>
              </div>
              <Badge variant="info">{health.registeredDevices} devices</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">Active Sources</p>
              <p className="text-2xl font-bold">{health.activeSources}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> Database Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-4 text-sm text-gray-600">
              <span>Total Articles: <strong>{totalArticles.toLocaleString()}</strong></span>
              <span>Total Digests: <strong>{totalDigests}</strong></span>
              <span>Total Tweets: <strong>{totalTweets.toLocaleString()}</strong></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4">Country</th>
                    <th className="py-2 pr-4">Articles</th>
                    <th className="py-2 pr-4">Digests</th>
                    <th className="py-2">Tweets</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(health.database).map(([cc, stats]) => (
                    <tr key={cc} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{COUNTRY_LABELS[cc] || cc.toUpperCase()}</td>
                      <td className="py-2 pr-4">{stats.articles.toLocaleString()}</td>
                      <td className="py-2 pr-4">{stats.digests}</td>
                      <td className="py-2">{stats.tweets.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {health.aiUsage && health.aiUsage.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" /> AI Usage (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Calls</th>
                      <th className="py-2 pr-4">Success</th>
                      <th className="py-2 pr-4">Failed</th>
                      <th className="py-2 pr-4">Input Tokens</th>
                      <th className="py-2 pr-4">Output Tokens</th>
                      <th className="py-2">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.aiUsage.map((metric) => (
                      <tr key={metric.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{metric.date}</td>
                        <td className="py-2 pr-4">{metric.totalCalls}</td>
                        <td className="py-2 pr-4 text-green-600">{metric.successfulCalls}</td>
                        <td className="py-2 pr-4 text-red-600">{metric.failedCalls}</td>
                        <td className="py-2 pr-4">{metric.totalInputTokens.toLocaleString()}</td>
                        <td className="py-2 pr-4">{metric.totalOutputTokens.toLocaleString()}</td>
                        <td className="py-2">${metric.estimatedCostUsd.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
