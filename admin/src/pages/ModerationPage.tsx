import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import {
  useBlacklist,
  useAddBlacklistWord,
  useRemoveBlacklistWord,
  useModerationQueue,
  useModerationDecision,
} from '../hooks/useModeration';
import { Plus, Trash2, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  { value: 'spam', label: 'Spam' },
  { value: 'offensive', label: 'Offensive' },
  { value: 'political', label: 'Political' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated', label: 'Escalated' },
];

export function ModerationPage() {
  // Blacklist state
  const [blPage, setBlPage] = useState(1);
  const [blCategory, setBlCategory] = useState('');
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newWordCategory, setNewWordCategory] = useState('other');

  // Queue state
  const [qPage, setQPage] = useState(1);
  const [qStatus, setQStatus] = useState('pending');

  // Queries
  const { data: blacklistData, isLoading: blLoading } = useBlacklist(blPage, 50, blCategory || undefined);
  const { data: queueData, isLoading: qLoading } = useModerationQueue(qPage, 20, qStatus);

  // Mutations
  const addWordMutation = useAddBlacklistWord();
  const removeWordMutation = useRemoveBlacklistWord();
  const decisionMutation = useModerationDecision();

  const handleAddWord = () => {
    if (!newWord.trim()) return;
    addWordMutation.mutate(
      { word: newWord.trim(), category: newWordCategory },
      {
        onSuccess: () => {
          setIsAddWordOpen(false);
          setNewWord('');
          setNewWordCategory('other');
        },
      }
    );
  };

  return (
    <div>
      <Header title="Moderation" subtitle="Blacklisted words and content queue" />

      <div className="p-8 space-y-6">
        {/* Blacklisted Words */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Blacklisted Words</CardTitle>
              <div className="flex items-center gap-3">
                <Select
                  options={[{ value: '', label: 'All Categories' }, ...CATEGORIES]}
                  value={blCategory}
                  onChange={(e) => { setBlCategory(e.target.value); setBlPage(1); }}
                />
                <Button size="sm" onClick={() => setIsAddWordOpen(true)} className="flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add Word
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {blLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : !blacklistData?.words.length ? (
              <p className="text-sm text-gray-500">No blacklisted words.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {blacklistData.words.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center gap-2 rounded-lg border px-3 py-1.5 bg-gray-50"
                    >
                      <span className="text-sm font-medium">{w.word}</span>
                      <Badge variant={
                        w.category === 'spam' ? 'warning' :
                        w.category === 'offensive' ? 'danger' :
                        w.category === 'political' ? 'info' : 'default'
                      }>
                        {w.category}
                      </Badge>
                      <button
                        type="button"
                        title="Remove word"
                        onClick={() => removeWordMutation.mutate(w.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Blacklist pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    {blacklistData.pagination.total} words total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setBlPage(p => Math.max(1, p - 1))} disabled={blPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">Page {blPage} / {blacklistData.pagination.totalPages || 1}</span>
                    <Button size="sm" variant="ghost" onClick={() => setBlPage(p => p + 1)} disabled={blPage >= blacklistData.pagination.totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Moderation Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Moderation Queue</CardTitle>
              <Select
                options={STATUS_OPTIONS}
                value={qStatus}
                onChange={(e) => { setQStatus(e.target.value); setQPage(1); }}
              />
            </div>
          </CardHeader>
          <CardContent>
            {qLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : !queueData?.items.length ? (
              <p className="text-sm text-gray-500">No items in the queue.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {queueData.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="info">{item.contentType}</Badge>
                          <span className="text-sm font-mono text-gray-600">{item.contentId}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Flagged by: {item.flaggedBy} &middot; {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {item.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => decisionMutation.mutate({ itemId: item.id, action: 'approve' })}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => decisionMutation.mutate({ itemId: item.id, action: 'reject' })}
                            className="flex items-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => decisionMutation.mutate({ itemId: item.id, action: 'escalate' })}
                            className="flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                          </Button>
                        </div>
                      ) : (
                        <Badge variant={item.status === 'resolved' ? 'success' : 'warning'}>
                          {item.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                {/* Queue pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    {queueData.pagination.total} items total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setQPage(p => Math.max(1, p - 1))} disabled={qPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">Page {qPage} / {queueData.pagination.totalPages || 1}</span>
                    <Button size="sm" variant="ghost" onClick={() => setQPage(p => p + 1)} disabled={qPage >= queueData.pagination.totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Word Modal */}
      <Modal isOpen={isAddWordOpen} onClose={() => setIsAddWordOpen(false)} title="Add Blacklisted Word">
        <div className="space-y-4">
          <Input
            label="Word"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Enter word to blacklist"
          />
          <Select
            label="Category"
            options={CATEGORIES}
            value={newWordCategory}
            onChange={(e) => setNewWordCategory(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsAddWordOpen(false)}>Cancel</Button>
            <Button onClick={handleAddWord} isLoading={addWordMutation.isPending} disabled={!newWord.trim()}>
              Add Word
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
