import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useNotificationHistory, useDeviceStats, useSendNotification } from '../hooks/useNotifications';
import { Send, Smartphone, Bell } from 'lucide-react';

const NOTIF_TYPES = [
  { value: 'system', label: 'System' },
  { value: 'digest', label: 'Digest' },
  { value: 'breaking', label: 'Breaking News' },
  { value: 'premium', label: 'Premium' },
];

interface SendForm {
  title: string;
  body: string;
  type: string;
}

export function NotificationsPage() {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const { data: history, isLoading: historyLoading } = useNotificationHistory();
  const { data: devices } = useDeviceStats();
  const sendMutation = useSendNotification();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SendForm>({
    defaultValues: { title: '', body: '', type: 'system' },
  });

  const onSubmit = (data: SendForm) => {
    sendMutation.mutate(data, {
      onSuccess: () => {
        setIsSendModalOpen(false);
        reset();
      },
    });
  };

  return (
    <div>
      <Header title="Push Notifications" subtitle="Send notifications and view history" />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Devices</p>
                <p className="text-2xl font-bold">{devices?.total ?? 0}</p>
              </div>
              <Smartphone className="h-6 w-6 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">iOS</p>
              <p className="text-2xl font-bold">{devices?.ios ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">Android</p>
              <p className="text-2xl font-bold">{devices?.android ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-center">
              <Button onClick={() => setIsSendModalOpen(true)} className="flex items-center gap-2">
                <Send className="h-4 w-4" /> Send Notification
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : !history || history.length === 0 ? (
              <p className="text-sm text-gray-500">No notifications sent yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((notif) => (
                  <div key={notif.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{notif.type}</Badge>
                        <span className="font-medium text-gray-900 text-sm">{notif.title}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(notif.sentAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{notif.body}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} title="Send Push Notification" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title"
            {...register('title', { required: 'Title is required' })}
            error={errors.title?.message}
            placeholder="Notification title"
          />
          <Input
            label="Body"
            {...register('body', { required: 'Body is required' })}
            error={errors.body?.message}
            placeholder="Notification message"
          />
          <Select
            label="Type"
            {...register('type')}
            options={NOTIF_TYPES}
          />
          <p className="text-xs text-gray-500">This will send to all registered devices ({devices?.total ?? 0} devices).</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsSendModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={sendMutation.isPending}>Send</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
