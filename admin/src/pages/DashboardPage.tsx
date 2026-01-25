import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDashboard } from '../hooks/useDashboard';
import { useScrapeAllSources } from '../hooks/useSources';
import { useRunDigest } from '../hooks/useCron';
import { formatUptime } from '../lib/utils';
import { Users, Rss, Newspaper, Clock, RefreshCw, FileText, Globe } from 'lucide-react';

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboard();
  const scrapeAllMutation = useScrapeAllSources();
  const runDigestMutation = useRunDigest();

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users.total ?? '-',
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Active Sources',
      value: `${stats?.sources.active ?? '-'} / ${stats?.sources.total ?? '-'}`,
      icon: Rss,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Total Articles',
      value: stats?.articles?.total?.toLocaleString() ?? '-',
      icon: Newspaper,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Server Uptime',
      value: stats?.serverUptime ? formatUptime(stats.serverUptime) : '-',
      icon: Clock,
      color: 'text-orange-600 bg-orange-100',
    },
  ];

  const articlesByCountry = [
    { country: 'Turkey', flag: '🇹🇷', count: stats?.articles?.tr ?? 0 },
    { country: 'Germany', flag: '🇩🇪', count: stats?.articles?.de ?? 0 },
    { country: 'USA', flag: '🇺🇸', count: stats?.articles?.us ?? 0 },
  ];

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of your news platform" />

      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? '...' : stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Articles by Country */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Articles by Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {articlesByCountry.map((item) => (
                  <div key={item.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.flag}</span>
                      <span className="font-medium">{item.country}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      {isLoading ? '...' : item.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => scrapeAllMutation.mutate()}
                  isLoading={scrapeAllMutation.isPending}
                  className="flex items-center justify-center gap-2 w-full"
                >
                  <RefreshCw className="h-4 w-4" />
                  Scrape All Sources
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => runDigestMutation.mutate('morning')}
                  isLoading={runDigestMutation.isPending}
                  className="flex items-center justify-center gap-2 w-full"
                >
                  <FileText className="h-4 w-4" />
                  Generate Morning Digest
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => runDigestMutation.mutate('evening')}
                  isLoading={runDigestMutation.isPending}
                  className="flex items-center justify-center gap-2 w-full"
                >
                  <FileText className="h-4 w-4" />
                  Generate Evening Digest
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
