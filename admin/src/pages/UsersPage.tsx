import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useUsers, useUpdateUser, useUserDetails, useBanUser, useUnbanUser } from '../hooks/useUsers';
import type { User } from '../types';
import { createColumnHelper } from '@tanstack/react-table';
import { formatDate } from '../lib/utils';
import { ChevronLeft, ChevronRight, Pencil, Ban, ShieldCheck } from 'lucide-react';

const columnHelper = createColumnHelper<User>();

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editSubscription, setEditSubscription] = useState<'free' | 'premium'>('free');
  const [banningUser, setBanningUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data, isLoading } = useUsers(page, 20);
  const updateMutation = useUpdateUser();
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const { data: userDetails } = useUserDetails(selectedUserId);

  const columns = [
    columnHelper.accessor('name', {
      header: 'User',
      cell: (info) => (
        <div className="flex items-center gap-3">
          {info.row.original.avatarUrl && (
            <img
              src={info.row.original.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          )}
          <div>
            <p className="font-medium">{info.getValue()}</p>
            <p className="text-sm text-gray-500">{info.row.original.email}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('userRole', {
      header: 'Role',
      cell: (info) => (
        <Badge variant={info.getValue() === 'admin' ? 'info' : 'default'}>
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('subscriptionStatus', {
      header: 'Subscription',
      cell: (info) => (
        <Badge variant={info.getValue() === 'premium' ? 'success' : 'default'}>
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Joined',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingUser(info.row.original);
              setEditRole(info.row.original.userRole);
              setEditSubscription(info.row.original.subscriptionStatus);
              setSelectedUserId(info.row.original.id);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedUserId(info.row.original.id);
              setBanningUser(info.row.original);
              setBanReason('');
              setBanDuration('');
            }}
            className="text-red-600 hover:text-red-700"
          >
            <Ban className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ];

  const handleUpdate = () => {
    if (!editingUser) return;

    updateMutation.mutate(
      {
        id: editingUser.id,
        data: {
          userRole: editRole,
          subscriptionStatus: editSubscription,
        },
      },
      {
        onSuccess: () => {
          setEditingUser(null);
        },
      }
    );
  };

  const handleBan = () => {
    if (!banningUser || !banReason) return;

    banMutation.mutate(
      {
        id: banningUser.id,
        reason: banReason,
        durationDays: banDuration ? parseInt(banDuration, 10) : undefined,
      },
      {
        onSuccess: () => {
          setBanningUser(null);
        },
      }
    );
  };

  const handleUnban = (userId: string) => {
    unbanMutation.mutate(userId);
  };

  return (
    <div>
      <Header title="Users" subtitle="Manage user accounts and permissions" />

      <div className="p-8">
        {/* Users Table */}
        <Card className="p-0 overflow-hidden">
          <DataTable columns={columns} data={data?.users ?? []} isLoading={isLoading} />

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {page}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data?.pagination.hasMore}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            {editingUser?.avatarUrl && (
              <img
                src={editingUser.avatarUrl}
                alt=""
                className="h-12 w-12 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{editingUser?.name}</p>
              <p className="text-sm text-gray-500">{editingUser?.email}</p>
            </div>
          </div>

          {userDetails?.banStatus && (
            <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 p-3">
              <div>
                <p className="text-sm font-medium text-red-800">User is banned</p>
                <p className="text-xs text-red-600">{userDetails.banStatus.reason}</p>
                {userDetails.banStatus.expiresAt && (
                  <p className="text-xs text-red-500 mt-1">
                    Expires: {formatDate(userDetails.banStatus.expiresAt)}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleUnban(editingUser!.id)}
                isLoading={unbanMutation.isPending}
                className="flex items-center gap-1"
              >
                <ShieldCheck className="h-3 w-3" /> Unban
              </Button>
            </div>
          )}

          <Select
            label="Role"
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as 'user' | 'admin')}
          />

          <Select
            label="Subscription"
            options={[
              { value: 'free', label: 'Free' },
              { value: 'premium', label: 'Premium' },
            ]}
            value={editSubscription}
            onChange={(e) => setEditSubscription(e.target.value as 'free' | 'premium')}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ban User Modal */}
      <Modal
        isOpen={!!banningUser}
        onClose={() => setBanningUser(null)}
        title="Ban User"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            {banningUser?.avatarUrl && (
              <img
                src={banningUser.avatarUrl}
                alt=""
                className="h-12 w-12 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{banningUser?.name}</p>
              <p className="text-sm text-gray-500">{banningUser?.email}</p>
            </div>
          </div>

          <Input
            label="Reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Why is this user being banned?"
          />

          <Input
            label="Duration (days, leave empty for permanent)"
            type="number"
            value={banDuration}
            onChange={(e) => setBanDuration(e.target.value)}
            placeholder="e.g. 7"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setBanningUser(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleBan}
              isLoading={banMutation.isPending}
              disabled={!banReason}
            >
              Ban User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
