import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, type PaginationState, type ColumnDef } from '@tanstack/react-table';
import { useAdminApiClient } from '../api/apiClientContext';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import type { Page, PageCreate, PageUpdate } from '../types/api';

const col = createColumnHelper<Page>();

const PAGE_SIZE = 20;

export function PagesPage() {
  const client = useAdminApiClient();
  const qc = useQueryClient();
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const [editTarget, setEditTarget] = useState<Page | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);

  const skip = pagination.pageIndex * PAGE_SIZE;

  const pagesQuery = useQuery({
    queryKey: ['admin', 'pages', skip, activeSearch, tagFilter],
    queryFn: () =>
      activeSearch
        ? client.search(activeSearch, skip, PAGE_SIZE)
        : client.getItems(skip, PAGE_SIZE),
  });

  const tagsQuery = useQuery({
    queryKey: ['admin', 'topTags'],
    queryFn: () => client.getTopTagNames(20),
  });

  const createMut = useMutation({
    mutationFn: (data: PageCreate) => client.createPage(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      toast.success('Page created');
      setAddOpen(false);
    },
    onError: () => toast.error('Failed to create page'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PageUpdate }) => client.updatePage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      toast.success('Page updated');
      setEditTarget(null);
    },
    onError: () => toast.error('Failed to update page'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => client.deletePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pages'] });
      toast.success('Page deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete page'),
  });

  const columns = [
    col.display({
      id: 'thumb',
      header: '',
      cell: ({ row }) => (
        <img
          src={client.proxyImageUrl(row.original.thumbnail)}
          alt=""
          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
          loading="lazy"
        />
      ),
    }),
    col.accessor('url', {
      header: 'URL',
      cell: ({ getValue }) => (
        <a href={getValue()} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
          {getValue().substring(0, 60)}{getValue().length > 60 ? '…' : ''}
        </a>
      ),
    }),
    col.accessor('type', { header: 'Type' }),
    col.accessor('source', { header: 'Source' }),
    col.accessor('searches', {
      header: 'Tags',
      cell: ({ getValue }) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {getValue().slice(0, 4).map((s) => (
            <span key={s.text} style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '2px 6px', fontSize: '0.75rem' }}>
              {s.text}
            </span>
          ))}
          {getValue().length > 4 && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>+{getValue().length - 4}</span>}
        </div>
      ),
    }),
    col.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#ede9fe', color: '#6d28d9', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setEditTarget(row.original)}>
            Edit
          </button>
          <button style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setDeleteTarget(row.original)}>
            Delete
          </button>
        </div>
      ),
    }),
  ] as ColumnDef<Page, unknown>[];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pages</h1>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Add Page</button>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Search pages…"
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
          <button onClick={() => { setSearch(''); setActiveSearch(''); }} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Tag filters */}
      {tagsQuery.data && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {tagsQuery.data.slice(0, 12).map((tag) => (
            <button
              key={tag}
              onClick={() => { setTagFilter(tag); setActiveSearch(tag); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: activeSearch === tag ? '#667eea' : '#cbd5e1',
                background: activeSearch === tag ? '#ede9fe' : '#fff',
                color: activeSearch === tag ? '#6d28d9' : '#475569',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={pagesQuery.data ?? []}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={pagesQuery.isLoading}
        />
      </div>

      {/* Add modal */}
      <PageFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(data) => createMut.mutate(data)}
        isLoading={createMut.isPending}
        title="Add Page"
      />

      {/* Edit modal */}
      {editTarget && (
        <PageFormModal
          open={true}
          onClose={() => setEditTarget(null)}
          onSubmit={(data) => updateMut.mutate({ id: editTarget.id, data })}
          isLoading={updateMut.isPending}
          title="Edit Page"
          initial={editTarget}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Page"
        message={`Delete "${deleteTarget?.url.substring(0, 60)}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

function PageFormModal({
  open, onClose, onSubmit, isLoading, title, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PageCreate) => void;
  isLoading: boolean;
  title: string;
  initial?: Page;
}) {
  const [url, setUrl] = useState(initial?.url ?? '');
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? '');
  const [type, setType] = useState<'print' | 'collection'>(initial?.type ?? 'print');
  const [source, setSource] = useState(initial?.source ?? 'manual');
  const [tags, setTags] = useState(initial?.searches.map((s) => s.text).join(', ') ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) { setError('URL is required'); return; }
    setError('');
    onSubmit({
      url: url.trim(),
      thumbnail: thumbnail.trim(),
      type,
      source: source.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>URL *</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="form-group">
          <label>Thumbnail URL</label>
          <input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://…" />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as 'print' | 'collection')}>
            <option value="print">Print</option>
            <option value="collection">Collection</option>
          </select>
        </div>
        <div className="form-group">
          <label>Source</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Tags (comma-separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="animals, coloring, …" />
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
