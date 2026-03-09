import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, type PaginationState, type ColumnDef } from '@tanstack/react-table';
import { useAdminApiClient } from '../api/apiClientContext';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import type { Device } from '../types/api';

const col = createColumnHelper<Device>();
const PAGE_SIZE = 50;

export function DevicesPage() {
  const client = useAdminApiClient();
  const qc = useQueryClient();
  const toast = useToast();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [includeInactive, setIncludeInactive] = useState(false);
  const [filter, setFilter] = useState('');
  const [renameTarget, setRenameTarget] = useState<Device | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Device | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  const devicesQuery = useQuery({
    queryKey: ['admin', 'devices', includeInactive],
    queryFn: () => client.getDevices(includeInactive),
  });

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => client.renameDevice(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'devices'] }); toast.success('Device renamed'); setRenameTarget(null); },
    onError: () => toast.error('Failed to rename device'),
  });

  const adminMut = useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) => client.toggleDeviceAdmin(id, isAdmin),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'devices'] }),
    onError: () => toast.error('Failed to update admin status'),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => client.deactivateDevice(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'devices'] }); toast.success('Device deactivated'); setDeactivateTarget(null); },
    onError: () => toast.error('Failed to deactivate device'),
  });

  const mergeMut = useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) => client.mergeDevices(sourceId, targetId),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['admin', 'devices'] }); toast.success(`Merged ${res.merged_events} events`); setMergeOpen(false); },
    onError: () => toast.error('Merge failed'),
  });

  const allDevices = devicesQuery.data ?? [];
  const devices = filter
    ? allDevices.filter((d) => d.device_name.toLowerCase().includes(filter.toLowerCase()))
    : allDevices;

  const columns = [
    col.accessor('device_name', { header: 'Name' }),
    col.accessor('device_id', {
      header: 'Device ID',
      cell: ({ getValue }) => <code style={{ fontSize: '0.75rem', color: '#64748b' }}>{getValue().substring(0, 16)}…</code>,
    }),
    col.accessor('registered_at', {
      header: 'Registered',
      cell: ({ getValue }) => new Date(getValue()).toLocaleDateString(),
    }),
    col.accessor('is_active', {
      header: 'Active',
      cell: ({ getValue }) => getValue() ? '✅' : '❌',
    }),
    col.accessor('is_admin', {
      header: 'Admin',
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.original.is_admin}
          onChange={(e) => adminMut.mutate({ id: row.original.device_id, isAdmin: e.target.checked })}
          style={{ width: 'auto' }}
        />
      ),
    }),
    col.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#ede9fe', color: '#6d28d9', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setRenameTarget(row.original)}>Rename</button>
          {row.original.is_active && (
            <button style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setDeactivateTarget(row.original)}>Deactivate</button>
          )}
        </div>
      ),
    }),
  ] as ColumnDef<Device, unknown>[];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Devices</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} style={{ width: 'auto' }} />
            Show inactive
          </label>
          <button className="btn-primary" onClick={() => setMergeOpen(true)}>Merge Devices</button>
        </div>
      </div>

      {/* Client-side filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Filter by device name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={devices}
          pagination={pagination}
          onPaginationChange={setPagination}
          isLoading={devicesQuery.isLoading}
        />
      </div>

      {/* Rename modal */}
      {renameTarget && (
        <RenameModal
          device={renameTarget}
          onClose={() => setRenameTarget(null)}
          onSubmit={(name) => renameMut.mutate({ id: renameTarget.device_id, name })}
          isLoading={renameMut.isPending}
        />
      )}

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate Device"
        message={`Deactivate "${deactivateTarget?.device_name}"? This will prevent the device from tracking activity.`}
        confirmLabel="Deactivate"
        onConfirm={() => deactivateTarget && deactivateMut.mutate(deactivateTarget.device_id)}
        onCancel={() => setDeactivateTarget(null)}
        isLoading={deactivateMut.isPending}
      />

      {/* Merge modal */}
      <MergeModal
        open={mergeOpen}
        devices={allDevices.filter((d) => d.is_active)}
        onClose={() => setMergeOpen(false)}
        onSubmit={(sourceId, targetId) => mergeMut.mutate({ sourceId, targetId })}
        isLoading={mergeMut.isPending}
      />
    </div>
  );
}

function RenameModal({ device, onClose, onSubmit, isLoading }: {
  device: Device; onClose: () => void;
  onSubmit: (name: string) => void; isLoading: boolean;
}) {
  const [name, setName] = useState(device.device_name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <Modal open={true} onClose={onClose} title="Rename Device">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>New Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="button" onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function MergeModal({ open, devices, onClose, onSubmit, isLoading }: {
  open: boolean; devices: Device[]; onClose: () => void;
  onSubmit: (sourceId: string, targetId: string) => void; isLoading: boolean;
}) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId) { setError('Select both devices'); return; }
    if (sourceId === targetId) { setError('Source and target must differ'); return; }
    setError('');
    onSubmit(sourceId, targetId);
  };

  return (
    <Modal open={open} onClose={onClose} title="Merge Devices">
      <form onSubmit={handleSubmit}>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 0 }}>
          All activity events from the <strong>source</strong> device will be moved to the <strong>target</strong> device. The source device will be deactivated.
        </p>
        <div className="form-group">
          <label>Source device (will be merged away)</label>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">Select source…</option>
            {devices.map((d) => <option key={d.device_id} value={d.device_id}>{d.device_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Target device (keeps all activity)</label>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">Select target…</option>
            {devices.map((d) => <option key={d.device_id} value={d.device_id}>{d.device_name}</option>)}
          </select>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 12px' }}>{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? 'Merging…' : 'Merge'}</button>
        </div>
      </form>
    </Modal>
  );
}
