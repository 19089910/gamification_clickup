'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useClickUpData } from '@/hooks/useClickUpData';
import { useGraphStore, Quarter } from '@/store/graphStore';
import LoadingScreen from '@/components/ui/LoadingScreen';

const QUARTER_BG: Record<Quarter, string> = {
  Q1: '#0f172a', // azul escuro (início)
  Q2: '#052e16', // verde escuro (crescimento)
  Q3: '#3f1d0b', // laranja escuro (expansão)
  Q4: '#2e1065', // roxo escuro (fechamento)
};

// Lazy load GraphCanvas to avoid SSR issues (React Flow requires browser APIs)
const GraphCanvas = dynamic(() => import('@/components/graph/GraphCanvas'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

const NodeDetailPanel = dynamic(() => import('@/components/ui/NodeDetailPanel'), {
  ssr: false,
});

const QuarterPickerModal = dynamic(() => import('@/components/ui/QuarterPickerModal'), {
  ssr: false,
});

const LayoutSettingsPanel = dynamic(() => import('@/components/ui/LayoutSettingsPanel'), {
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
  const { nodes, edges, selectedQuarter, setQuarter, setSpaceId } = useGraphStore();

  useEffect(() => {
    if (spaceId) setSpaceId(spaceId);
  }, [spaceId, setSpaceId]);

  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  return (
    <div 
      className="map-page"
      style={{ background: selectedQuarter ? QUARTER_BG[selectedQuarter] : undefined, transition: 'background 0.5s ease' }}
    >
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
        
        <select
          value={selectedQuarter || 'Q1'}
          onChange={(e) => setQuarter(e.target.value as Quarter)}
          style={{
            padding: '4px 8px',
            background: '#161616',
            color: '#f0f0f0',
            border: '1px solid #333',
            borderRadius: 6,
            fontSize: 12,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
        </select>

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
        <QuarterPickerModal />
        <LayoutSettingsPanel />
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
