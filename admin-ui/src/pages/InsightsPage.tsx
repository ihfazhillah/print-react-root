import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAdminApiClient } from '../api/apiClientContext';
import type { DeviceSummary } from '../types/api';

export function InsightsPage() {
  const client = useAdminApiClient();
  const navigate = useNavigate();

  const summaryQuery = useQuery({
    queryKey: ['admin', 'insights', 'summary'],
    queryFn: () => client.getInsightsSummary(),
  });

  const topTagsQuery = useQuery({
    queryKey: ['admin', 'insights', 'topTags'],
    queryFn: () => client.getTopTags(5),
  });

  const topImagesQuery = useQuery({
    queryKey: ['admin', 'insights', 'topImages'],
    queryFn: () => client.getTopImages(10),
  });

  const interestsQuery = useQuery({
    queryKey: ['admin', 'insights', 'interests'],
    queryFn: () => client.getInterests(),
  });

  const isLoading = summaryQuery.isLoading || topImagesQuery.isLoading;

  if (isLoading) return <div style={{ color: '#94a3b8', padding: 32 }}>Loading insights…</div>;

  const devices: DeviceSummary[] = summaryQuery.data ?? [];
  const topImages = topImagesQuery.data?.top_images ?? [];
  const shared = interestsQuery.data?.shared ?? [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Insights</h1>
      </div>

      {/* Per-child summary cards */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 16, color: '#475569' }}>Per-Child Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {devices.map((d) => (
            <div
              key={d.device_id}
              className="card"
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => void navigate({ to: '/insights/$deviceId', params: { deviceId: d.device_id } })}
            >
              <div style={{ fontWeight: 600, marginBottom: 12 }}>{d.device_name}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: '#64748b' }}>
                <span>👁️ {d.total_views}</span>
                <span>🔍 {d.total_details}</span>
                <span>🖨️ {d.total_prints}</span>
              </div>
              {topTagsQuery.data?.[d.device_id] && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {topTagsQuery.data[d.device_id].slice(0, 3).map((t) => (
                    <span key={t.tag_name} style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem' }}>
                      {t.id_translation || t.tag_name}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#94a3b8' }}>Click for timeline →</div>
            </div>
          ))}
        </div>
      </section>

      {/* Most printed images */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 16, color: '#475569' }}>Most Printed</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
          {topImages.map((img) => (
            <div key={img.page_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <img
                src={client.proxyImageUrl(img.thumbnail)}
                alt=""
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                loading="lazy"
              />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#6d28d9' }}>🖨️ {img.print_count}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                  {img.tags.slice(0, 2).join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shared interests */}
      {shared.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1rem', marginBottom: 16, color: '#475569' }}>Shared Interests</h2>
          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {shared.map((s) => (
                <div key={s.tag_name} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#15803d' }}>{s.tag_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{s.devices.length} children</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
