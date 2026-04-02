'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ClickUpTeam, ClickUpSpace } from '@/types/clickup';

interface TeamsResponse { teams: ClickUpTeam[] }
interface SpacesResponse { spaces: ClickUpSpace[] }

async function fetchTeams(): Promise<TeamsResponse> {
  const res = await fetch('/api/clickup/teams');
  if (!res.ok) throw new Error('Não foi possível buscar os Workspaces do ClickUp');
  return res.json();
}

async function fetchSpaces(teamId: string): Promise<SpacesResponse> {
  const res = await fetch(`/api/clickup/spaces?teamId=${teamId}`);
  if (!res.ok) throw new Error('Não foi possível buscar os Spaces');
  return res.json();
}

function SpaceColor(color: string | null): string {
  return color ?? '#7c3aed';
}

export default function HomePage() {
  const router = useRouter();

  const { data: teamsData, isLoading: loadingTeams, isError: errorTeams, error: teamsError } =
    useQuery({ queryKey: ['teams'], queryFn: fetchTeams });

  const firstTeam = teamsData?.teams?.[0];

  const { data: spacesData, isLoading: loadingSpaces, isError: errorSpaces } =
    useQuery({
      queryKey: ['spaces', firstTeam?.id],
      queryFn: () => fetchSpaces(firstTeam!.id),
      enabled: !!firstTeam?.id,
    });

  const isLoading = loadingTeams || loadingSpaces;
  const isError = errorTeams || errorSpaces;

  function handleSelectSpace(space: ClickUpSpace) {
    const params = new URLSearchParams({
      spaceId: space.id,
      spaceName: space.name,
      spaceColor: space.color ?? '',
    });
    router.push(`/map?${params.toString()}`);
  }

  return (
    <main className="landing">
      <header className="landing-header">
        <div className="landing-eyebrow">
          <span>✦</span>
          <span>ClickUp Mind Map</span>
        </div>
        <h1 className="landing-title">
          Seu Workspace como um<br />
          <span>Mapa Mental Interativo</span>
        </h1>
        <p className="landing-sub">
          Visualize a hierarquia de Folders → Lists → Tasks do seu ClickUp como
          um grafo navegável. Clique em um Space para começar.
        </p>
      </header>

      <section className="space-selector" aria-label="Selecionar Space">
        <p className="space-selector-label">
          {firstTeam ? `Workspace: ${firstTeam.name}` : 'Seus Spaces'}
        </p>

        {isLoading && (
          <div className="spaces-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
        )}

        {isError && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p className="error-title">Falha ao conectar com o ClickUp</p>
            <p className="error-msg">
              {teamsError instanceof Error
                ? teamsError.message
                : 'Verifique se o CLICKUP_API_TOKEN está configurado no .env.local'}
            </p>
          </div>
        )}

        {spacesData?.spaces && (
          <div className="spaces-grid">
            {spacesData.spaces.map((space) => (
              <button
                key={space.id}
                id={`space-${space.id}`}
                className="space-card"
                style={{ '--space-color': SpaceColor(space.color) } as React.CSSProperties}
                onClick={() => handleSelectSpace(space)}
                aria-label={`Abrir mapa do Space ${space.name}`}
              >
                <div
                  className="space-card-dot"
                  style={{ background: SpaceColor(space.color) }}
                />
                <div className="space-card-name">{space.name}</div>
                <div className="space-card-meta">Space ID: {space.id}</div>
                <div className="space-card-arrow">→</div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
