import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useAdminApiClient } from '../api/apiClientContext';

const EVENT_ICONS: Record<string, string> = {
  view: '👁️',
  detail: '🔍',
  print: '🖨️',
};

export function DeviceTimelinePage() {
  const { deviceId } = useParams({ from: '/insights/$deviceId' });
  const navigate = useNavigate();
  const client = useAdminApiClient();

  const timelineQuery = useQuery({
    queryKey: ['admin', 'timeline', deviceId],
    queryFn: () => client.getDeviceTimeline(deviceId, 100, 0),
    enabled: !!deviceId,
  });

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => void navigate({ to: '/insights' })}
            style={{ padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            ← Back
          </button>
          <h1 className="page-title">Activity Timeline</h1>
        </div>
        <code style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{deviceId}</code>
      </div>

      {timelineQuery.isLoading && <div style={{ color: '#94a3b8', padding: 32 }}>Loading timeline…</div>}

      {timelineQuery.data?.map((day) => (
        <div key={day.date} style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {day.events.map((ev, i) => (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px' }}>
                {ev.thumbnail ? (
                  <img
                    src={client.proxyImageUrl(ev.thumbnail)}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f1f5f9', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{EVENT_ICONS[ev.event_type] ?? '•'}</span>
                    <span style={{ fontWeight: 500, fontSize: '0.88rem', textTransform: 'capitalize' }}>{ev.event_type}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                    {new Date(ev.event_timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {timelineQuery.data?.length === 0 && (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 48 }}>No activity recorded yet.</div>
      )}
    </div>
  );
}
