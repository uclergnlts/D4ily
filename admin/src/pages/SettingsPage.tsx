import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCronStatus, useRunDigest, useRunWeekly } from '../hooks/useCron';
import { Clock, Play, Calendar } from 'lucide-react';

export function SettingsPage() {
  const { data: cronStatus, isLoading } = useCronStatus();
  const runDigestMutation = useRunDigest();
  const runWeeklyMutation = useRunWeekly();

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
                {/* Scraper */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">News Scraper</h4>
                    <p className="text-sm text-gray-500">{cronStatus?.scraper.schedule}</p>
                  </div>
                  <Badge variant={cronStatus?.scraper.status === 'active' ? 'success' : 'danger'}>
                    {cronStatus?.scraper.status}
                  </Badge>
                </div>

                {/* Digest */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Daily Digest</h4>
                    <p className="text-sm text-gray-500">{cronStatus?.digest.schedule}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cronStatus?.digest.status === 'active' ? 'success' : 'danger'}>
                      {cronStatus?.digest.status}
                    </Badge>
                  </div>
                </div>

                {/* Weekly */}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Manual Triggers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Morning Digest</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Generate morning digest for all countries
                </p>
                <Button
                  onClick={() => runDigestMutation.mutate('morning')}
                  isLoading={runDigestMutation.isPending}
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Run Morning Digest
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Evening Digest</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Generate evening digest for all countries
                </p>
                <Button
                  onClick={() => runDigestMutation.mutate('evening')}
                  isLoading={runDigestMutation.isPending}
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Run Evening Digest
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

        {/* System Info */}
        <Card className="mt-6">
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
