'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useClickUpData } from '@/hooks/useClickUpData';
import { useGraphStore } from '@/store/graphStore';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Lazy load GraphCanvas to avoid SSR issues (React Flow requires browser APIs)
const GraphCanvas = dynamic(() => import('@/components/graph/GraphCanvas'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

const NodeDetailPanel = dynamic(() => import('@/components/ui/NodeDetailPanel'), {
  ssr: false,
});

function MapView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const spaceId = searchParams.get('spaceId') ?? '';
  const spaceName = searchParams.get('spaceName') ?? 'Space';
  const spaceColor = searchParams.get('spaceColor') ?? null;

  const space = useMemo(() => ({ 
    id: spaceId, 
    name: spaceName, 
    color: spaceColor 
  }), [spaceId, spaceName, spaceColor]);

  const { isLoading, isError, error } = useClickUpData(space);
  const { nodes, edges } = useGraphStore();

  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  return (
    <div className="map-page">
      {/* Top bar */}
      <header className="map-topbar">
        <button
          className="topbar-back"
          onClick={() => router.push('/')}
          aria-label="Voltar para seleção de Space"
        >
          ← Voltar
        </button>
        <div className="topbar-divider" />
        <h1 className="topbar-title">{spaceName}</h1>
        {!isLoading && nodeCount > 0 && (
          <span className="topbar-badge">
            {nodeCount} nós · {edgeCount} conexões
          </span>
        )}
      </header>

      {/* Canvas area */}
      <div className="map-body">
        {isLoading && <LoadingScreen />}

        {isError && (
          <div className="loading-screen">
            <div className="loading-inner">
              <span style={{ fontSize: 40 }}>⚠️</span>
              <p className="loading-title">Erro ao carregar dados</p>
              <p className="loading-sub">
                {error instanceof Error ? error.message : 'Tente novamente'}
              </p>
              <button
                onClick={() => router.push('/')}
                style={{
                  marginTop: 16,
                  padding: '10px 20px',
                  background: '#161616',
                  border: '1px solid #262626',
                  borderRadius: 8,
                  color: '#f0f0f0',
                  fontSize: 14,
                }}
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && <GraphCanvas />}
        <NodeDetailPanel />
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MapView />
    </Suspense>
  );
}
