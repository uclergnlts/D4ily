import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useCronLogs } from '../hooks/useSystem';
import { useRunDigest, useRunWeekly, useRunScraper } from '../hooks/useCron';
import { RefreshCw, Play } from 'lucide-react';

const JOB_FILTERS = [
  { value: '', label: 'All Jobs' },
  { value: 'scraper', label: 'Scraper' },
  { value: 'digest', label: 'Digest' },
  { value: 'weekly', label: 'Weekly' },
];

export function CronLogsPage() {
  const [jobFilter, setJobFilter] = useState('');
  const { data: logs, isLoading, refetch } = useCronLogs(100, jobFilter || undefined);

  const runDigest = useRunDigest();
  const runWeekly = useRunWeekly();
  const runScraper = useRunScraper();

  return (
    <div>
      <Header title="Cron Logs" subtitle="Execution history and manual triggers" />
      <div className="p-8 space-y-6">
        <Card>
          <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Filter by job</label>
              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {JOB_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <Button variant="secondary" size="sm" onClick={() => refetch()} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => runScraper.mutate()} isLoading={runScraper.isPending} className="flex items-center gap-2">
                <Play className="h-3 w-3" /> Scraper
              </Button>
              <Button size="sm" onClick={() => runDigest.mutate()} isLoading={runDigest.isPending} className="flex items-center gap-2">
                <Play className="h-3 w-3" /> Digest
              </Button>
              <Button size="sm" onClick={() => runWeekly.mutate()} isLoading={runWeekly.isPending} className="flex items-center gap-2">
                <Play className="h-3 w-3" /> Weekly
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Executions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : !logs || logs.length === 0 ? (
              <p className="text-sm text-gray-500">No cron logs yet. Logs will appear after cron jobs run.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                        {log.status}
                      </Badge>
                      <Badge variant="info">{log.jobName}</Badge>
                      <span className="text-sm text-gray-700">{log.message}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {log.duration && <span>{log.duration}ms</span>}
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
