import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DataTable } from '../components/ui/DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import {
  useTwitterAccounts,
  useCreateTwitterAccount,
  useUpdateTwitterAccount,
  useDeleteTwitterAccount,
} from '../hooks/useTwitter';
import { COUNTRIES, type CountryCode, type TwitterAccount, type CreateTwitterAccountForm } from '../types';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'government', label: 'Government' },
  { value: 'news_agency', label: 'News Agency' },
  { value: 'journalist', label: 'Journalist' },
  { value: 'institution', label: 'Institution' },
  { value: 'political_party', label: 'Political Party' },
];

const schema = z.object({
  countryCode: z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru']),
  userName: z.string().min(1, 'Username is required'),
  displayName: z.string().min(1, 'Display name is required'),
  profileImageUrl: z.string().url().optional().or(z.literal('')),
  accountType: z.enum(['government', 'news_agency', 'journalist', 'institution', 'political_party']),
  isActive: z.boolean(),
  description: z.string().optional(),
  govAlignmentScore: z.coerce.number().int().min(-3).max(3),
});

type FormData = z.infer<typeof schema>;

function getCountry(code?: string): CountryCode | null {
  return COUNTRIES.find((c) => c.code === code)?.code ?? null;
}

export function TwitterAccountsPage() {
  const { countryCode } = useParams<{ countryCode: string }>();
  const resolvedCountry = getCountry(countryCode) ?? 'tr';
  const shouldRedirect = !getCountry(countryCode);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TwitterAccount | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TwitterAccount | null>(null);

  const { data: accounts, isLoading } = useTwitterAccounts(resolvedCountry);
  const createMutation = useCreateTwitterAccount();
  const updateMutation = useUpdateTwitterAccount();
  const deleteMutation = useDeleteTwitterAccount();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      countryCode: resolvedCountry,
      isActive: true,
      govAlignmentScore: 0,
    },
  });

  const countryInfo = COUNTRIES.find((c) => c.code === resolvedCountry)!;

  const openCreate = () => {
    setEditingAccount(null);
    reset({ countryCode: resolvedCountry, isActive: true, govAlignmentScore: 0, userName: '', displayName: '', description: '', profileImageUrl: '', accountType: 'news_agency' });
    setIsModalOpen(true);
  };

  const openEdit = (account: TwitterAccount) => {
    setEditingAccount(account);
    reset({
      countryCode: account.countryCode,
      userName: account.userName,
      displayName: account.displayName,
      profileImageUrl: account.profileImageUrl || '',
      accountType: account.accountType,
      isActive: account.isActive,
      description: account.description || '',
      govAlignmentScore: account.govAlignmentScore,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: CreateTwitterAccountForm = {
      ...data,
      profileImageUrl: data.profileImageUrl || null,
      description: data.description || null,
    };
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: payload }, { onSuccess: () => setIsModalOpen(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => setIsModalOpen(false) });
    }
  };

  const columnHelper = createColumnHelper<TwitterAccount>();
  const columns = [
    columnHelper.accessor('userName', {
      header: 'Username',
      cell: (info) => (
        <div className="flex items-center gap-2">
          {info.row.original.profileImageUrl && (
            <img src={info.row.original.profileImageUrl} alt="" className="w-6 h-6 rounded-full" />
          )}
          <span className="font-medium">@{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('displayName', { header: 'Display Name' }),
    columnHelper.accessor('accountType', {
      header: 'Type',
      cell: (info) => <Badge variant="info">{info.getValue().replace('_', ' ')}</Badge>,
    }),
    columnHelper.accessor('govAlignmentScore', {
      header: 'Alignment',
      cell: (info) => {
        const score = info.getValue();
        const variant = score > 0 ? 'success' : score < 0 ? 'danger' : 'default';
        return <Badge variant={variant}>{score > 0 ? `+${score}` : score}</Badge>;
      },
    }),
    columnHelper.accessor('isActive', {
      header: 'Status',
      cell: (info) => <Badge variant={info.getValue() ? 'success' : 'default'}>{info.getValue() ? 'Active' : 'Inactive'}</Badge>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(row.original)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    }),
  ];

  if (shouldRedirect) return <Navigate to="/twitter/tr" replace />;

  return (
    <div>
      <Header
        title={`${countryInfo.flag} ${countryInfo.name} Twitter Accounts`}
        subtitle="Manage X/Twitter accounts tracked for this country"
      />
      <div className="p-8">
        <div className="flex justify-end mb-4">
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>

        <Card className="p-0 overflow-hidden">
          <DataTable columns={columns} data={accounts || []} isLoading={isLoading} />
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? 'Edit Account' : 'Add Account'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Username" {...register('userName')} error={errors.userName?.message} placeholder="elonmusk" />
            <Input label="Display Name" {...register('displayName')} error={errors.displayName?.message} placeholder="Elon Musk" />
          </div>
          <Input label="Profile Image URL" {...register('profileImageUrl')} error={errors.profileImageUrl?.message} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Account Type"
              {...register('accountType')}
              error={errors.accountType?.message}
              options={ACCOUNT_TYPES}
            />
            <Select
              label="Country"
              {...register('countryCode')}
              error={errors.countryCode?.message}
              options={COUNTRIES.map(c => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Gov Alignment (-3 to 3)" type="number" {...register('govAlignmentScore')} error={errors.govAlignmentScore?.message} />
            <Select
              label="Status"
              {...register('isActive', { setValueAs: (v) => v === 'true' || v === true })}
              options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
            />
          </div>
          <Input label="Description" {...register('description')} />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingAccount ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Account" size="sm">
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete <strong>@{deleteConfirm?.userName}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => {
              if (deleteConfirm) {
                deleteMutation.mutate(deleteConfirm.id, { onSuccess: () => setDeleteConfirm(null) });
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
