import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { createColumnHelper, type PaginationState, type ColumnDef } from '@tanstack/react-table';
import { useAdminApiClient } from '../api/apiClientContext';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import type { Tag, TagCreate } from '../types/api';

const col = createColumnHelper<Tag>();
const PAGE_SIZE = 50;

export function TagsPage() {
  const client = useAdminApiClient();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [editTarget, setEditTarget] = useState<Tag | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const skip = pagination.pageIndex * PAGE_SIZE;

  const tagsQuery = useQuery({
    queryKey: ['admin', 'tags', skip, activeSearch],
    queryFn: () => client.getAllTags(skip, PAGE_SIZE, false, activeSearch || undefined),
  });

  const createMut = useMutation({
    mutationFn: (data: TagCreate) => client.createTag(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'tags'] }); toast.success('Tag created'); setAddOpen(false); },
    onError: () => toast.error('Failed to create tag'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name, id_translation }: { id: number; name: string; id_translation: string }) =>
      client.updateTag(id, { name, id_translation }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'tags'] }); toast.success('Tag updated'); setEditTarget(null); },
    onError: () => toast.error('Failed to update tag'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => client.deleteTag(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'tags'] }); toast.success('Tag deleted'); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete tag'),
  });

  const translateMut = useMutation({
    mutationFn: () => client.translateAllTags(),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['admin', 'tags'] }); toast.success(`Translated ${res.translated} tags`); },
    onError: () => toast.error('Translation failed'),
  });

  const toggleBlockMut = useMutation({
    mutationFn: ({ id, blocked }: { id: number; blocked: boolean }) => client.toggleTagBlocked(id, blocked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tags'] }),
    onError: () => toast.error('Failed to update blocked status'),
  });

  const columns = [
    col.accessor('name', { header: 'Name' }),
    col.accessor('id_translation', {
      header: 'Translation (ID)',
      cell: ({ getValue }) => getValue() || <span style={{ color: '#94a3b8' }}>—</span>,
    }),
    col.accessor('blocked', {
      header: 'Blocked',
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.original.blocked}
          onChange={(e) => toggleBlockMut.mutate({ id: row.original.id, blocked: e.target.checked })}
          style={{ width: 'auto' }}
        />
      ),
    }),
    col.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#ccfbf1', color: '#0f766e', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => navigate({ to: '/', search: { q: row.original.name } })}>View</button>
          <button style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#ede9fe', color: '#6d28d9', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setEditTarget(row.original)}>Edit</button>
          <button style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setDeleteTarget(row.original)}>Delete</button>
        </div>
      ),
    }),
  ] as ColumnDef<Tag, unknown>[];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tags</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => translateMut.mutate()}
            disabled={translateMut.isPending}
            style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            {translateMut.isPending ? 'Translating…' : '🌐 Translate All'}
          </button>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Add Tag</button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Search tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setActiveSearch(search);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }
          }}
          style={{ maxWidth: 320 }}
        />
        <button className="btn-primary" onClick={() => { setActiveSearch(search); setPagination((p) => ({ ...p, pageIndex: 0 })); }}>
          Search
        </button>
        {activeSearch && (
          <button onClick={() => { setSearch(''); setActiveSearch(''); setPagination((p) => ({ ...p, pageIndex: 0 })); }} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={tagsQuery.data ?? []}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={tagsQuery.isLoading}
        />
      </div>

      <TagFormModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={(d) => createMut.mutate(d)} isLoading={createMut.isPending} title="Add Tag" />

      {editTarget && (
        <TagFormModal
          open={true}
          onClose={() => setEditTarget(null)}
          onSubmit={(d) => updateMut.mutate({ id: editTarget.id, name: d.name, id_translation: d.id_translation ?? '' })}
          isLoading={updateMut.isPending}
          title="Edit Tag"
          initial={editTarget}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Tag"
        message={`Delete tag "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

function TagFormModal({ open, onClose, onSubmit, isLoading, title, initial }: {
  open: boolean; onClose: () => void;
  onSubmit: (data: TagCreate) => void;
  isLoading: boolean; title: string; initial?: Tag;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [translation, setTranslation] = useState(initial?.id_translation ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setError('');
    onSubmit({ name: name.trim(), id_translation: translation.trim() });
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Tag Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="animals" />
        </div>
        <div className="form-group">
          <label>Indonesian Translation</label>
          <input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="hewan" />
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 12px' }}>{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
