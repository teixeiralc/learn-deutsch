import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { useRoadStore } from '../stores/roadStore';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import type { RoadNodeSummary } from '../types';

function statusStyles(status: RoadNodeSummary['status']) {
  if (status === 'completed') return { bg: 'var(--dly-completed-bg)', border: 'var(--dly-completed-border)', text: '#fff' };
  if (status === 'in_progress') return { bg: 'var(--dly-active-bg)', border: 'var(--dly-active-border)', text: '#000' };
  if (status === 'unlocked') return { bg: 'var(--dly-ready-bg)', border: 'var(--dly-ready-border)', text: '#fff' };
  return { bg: 'var(--dly-locked-bg)', border: 'var(--dly-locked-border)', text: 'var(--dly-locked-text)' };
}

function statusLabel(status: RoadNodeSummary['status']) {
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In progress';
  if (status === 'unlocked') return 'Ready';
  return 'Locked';
}

function NodeCard({ node, index, onOpen }: { node: RoadNodeSummary; index: number; onOpen: (id: number) => void }) {
  const styles = statusStyles(node.status);
  const locked = !node.unlocked;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
      <button
        type="button"
        disabled={locked}
        onClick={() => onOpen(node.id)}
        className="card-dly"
        style={{
          width: '100%',
          maxWidth: '340px',
          textAlign: 'left',
          background: styles.bg,
          borderColor: styles.border,
          color: styles.text,
          padding: '16px 20px',
          cursor: locked ? 'not-allowed' : 'pointer',
          opacity: locked ? 0.7 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: locked ? styles.text : 'inherit' }}>{node.title}</p>
            <p style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>{node.description}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.95 }}>
              {statusLabel(node.status)}
            </p>
            <p style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>
              {'★'.repeat(node.stars)}{'☆'.repeat(Math.max(0, 3 - node.stars))}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function Road() {
  const navigate = useNavigate();
  const selectedLevel = useAppStore((s) => s.selectedLevel);
  const {
    nodes,
    isLoadingMap,
    mapError,
    loadRoadMap,
    page,
    totalPages,
    hideCompleted,
    totalNodes,
    completedNodes,
    remainingNodes,
    totalStories,
    completedStories,
    visibleStories,
    toggleHideCompleted,
    setRoadPage,
  } = useRoadStore();

  useEffect(() => {
    loadRoadMap(selectedLevel, { page: 1 });
  }, [selectedLevel]);

  const chapterGroups = useMemo(() => {
    const map = new Map<number, {
      chapterOrder: number;
      title: string;
      description: string;
      story: string;
      nodes: RoadNodeSummary[];
    }>();
    for (const node of nodes) {
      const existing = map.get(node.chapter_id);
      if (existing) {
        existing.nodes.push(node);
      } else {
        map.set(node.chapter_id, {
          chapterOrder: node.chapter_order,
          title: node.chapter_title,
          description: node.chapter_description,
          story: node.story_track_title,
          nodes: [node],
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.chapterOrder - b.chapterOrder)
      .map((chapter) => ({
        ...chapter,
        totalNodes: chapter.nodes.length,
        completedNodes: chapter.nodes.filter((node) => node.status === 'completed').length,
      }));
  }, [nodes]);

  if (isLoadingMap) {
    return <div style={{ padding: 60 }}><LoadingSpinner message="Building your learning road..." /></div>;
  }

  if (mapError) {
    return (
      <div style={{ padding: 60 }}>
        <ErrorMessage message={mapError} onRetry={() => loadRoadMap(selectedLevel)} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '44px 56px' }}>
      <div style={{ marginBottom: 26 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          Road Mode
        </p>
        <h1 style={{ fontSize: 30, color: 'var(--text-primary)', fontWeight: 800, marginTop: 5 }}>
          {selectedLevel} Story Path
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          Learn words first, apply them in context, then complete full conversations.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 18 }}>
          <div className="card-dly" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>Completed</p>
            <p style={{ fontSize: 24, color: 'var(--dly-completed-bg)', fontWeight: 900, marginTop: 2 }}>{completedNodes}/{totalNodes}</p>
          </div>
          <div className="card-dly" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>Stories</p>
            <p style={{ fontSize: 24, color: 'var(--dly-ready-bg)', fontWeight: 900, marginTop: 2 }}>{completedStories}/{totalStories}</p>
          </div>
          <div className="card-dly" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>Nodes Left</p>
            <p style={{ fontSize: 24, color: 'var(--dly-active-bg)', fontWeight: 900, marginTop: 2 }}>{remainingNodes}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              className="checkbox-dly"
              checked={hideCompleted}
              onChange={(e) => toggleHideCompleted(e.target.checked)}
            />
            Hide completed stories
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {visibleStories} stories on this filter
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {chapterGroups.length === 0 && (
          <div className="card-dly" style={{ padding: '18px 16px', textAlign: 'center', background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No stories match this filter on the current page.</p>
          </div>
        )}

        {chapterGroups.map((chapter, index) => {
          const storyDone = chapter.completedNodes === chapter.totalNodes;
          return (
            <div key={`${chapter.title}-${index}`} style={{ display: 'flex', flexDirection: 'column' }}>
              <section
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 18,
                  background: storyDone ? 'rgba(16,185,129,0.07)' : 'var(--bg-card)',
                  padding: '16px 18px',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <p style={{ fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    {chapter.story}
                  </p>
                  <p style={{ fontSize: 11, color: storyDone ? '#10b981' : 'var(--text-muted)', fontWeight: 700 }}>
                    {chapter.completedNodes}/{chapter.totalNodes}
                  </p>
                </div>

                <h2 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 700, marginTop: 4 }}>{chapter.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 12 }}>{chapter.description}</p>

                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
                  {chapter.nodes.map((node, nodeIndex) => {
                    const hasNext = nodeIndex + 1 < chapter.nodes.length;
                    
                    return (
                      <div key={node.id} style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                        <NodeCard
                          node={node}
                          index={nodeIndex}
                          onOpen={(id) => navigate(`/road/${selectedLevel}/node/${id}`)}
                        />
                        {hasNext && (
                          <div 
                            className="road-node-connector" 
                            style={{ 
                              height: 24, 
                              margin: '-6px auto',
                            }} 
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {index + 1 < chapterGroups.length && <div className="road-chapter-connector" />}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 18 }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setRoadPage(page - 1)}
          className="btn-dly"
          style={{ opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer', minWidth: 92 }}
        >
          Previous
        </button>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 120, textAlign: 'center' }}>
          Page {page} / {totalPages}
        </p>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setRoadPage(page + 1)}
          className="btn-dly"
          style={{ opacity: page >= totalPages ? 0.5 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer', minWidth: 92 }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
