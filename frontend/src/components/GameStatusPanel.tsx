import { useGameLoopState, useProductSession, useSocialPresenceRegistry } from '@/lib/queries.ts';
import type { SocialPresence } from '#/schemas/SocialPresence/SocialPresence.schema.ts';

const STATE_META = {
    MENUS: { label: 'Menus', accent: 'bg-muted-foreground/40' },
    REPLAY: { label: 'In Replay', accent: 'bg-sky-400/70' },
    PREGAME: { label: 'Agent select', accent: 'bg-amber-400' },
    INGAME: { label: 'In Game', accent: 'bg-emerald-400' },
} as const;

type GameLoopState = keyof typeof STATE_META;

function valorantScore(presence: SocialPresence | undefined) {
    if (!presence || presence.product !== 'valorant') return null;
    const d = presence.productData as
        | { partyOwnerMatchScoreAllyTeam?: number | null; partyOwnerMatchScoreEnemyTeam?: number | null }
        | undefined;
    const ally = d?.partyOwnerMatchScoreAllyTeam;
    const enemy = d?.partyOwnerMatchScoreEnemyTeam;
    if (ally == null || enemy == null) return null;
    return { ally, enemy };
}

export function GameStatusPanel() {
    const gameLoopState = useGameLoopState() as GameLoopState | undefined;
    const socialPresenceRegistry = useSocialPresenceRegistry();
    const session = useProductSession('valorant');

    if (!session || !gameLoopState) return null;

    const meta = STATE_META[gameLoopState] ?? {
        label: 'Unknown',
        accent: 'bg-muted-foreground/40',
    };
    const score = gameLoopState === 'INGAME' ? valorantScore(socialPresenceRegistry?.valorant) : null;
    const sub = score ? `${score.ally} – ${score.enemy}` : gameLoopState === 'INGAME' ? 'Round starting' : null;

    return (
        <div className="flex items-stretch gap-2.5 px-2 py-1.5">
            <span className="flex min-w-0 flex-col leading-snug w-full">
                <span className="text-s text-foreground">{meta.label}</span>
                <span className={`text-xs text-muted-foreground ${score ? 'font-mono tabular-nums' : ''}`}>
                    {sub}
                </span>
            </span>
            <span className={`w-0.5 shrink-0 rounded-full ${meta.accent}`} />
        </div>
    );
}