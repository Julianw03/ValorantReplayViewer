import { useMatchMetadata } from '@/lib/queries.ts';
import { Loader2 } from 'lucide-react';
import { ReplayRow } from '@/components/saved-replays/ReplayRow.tsx';

function InjectMatchInfoTab({ matchId }: { matchId: string }) {
    const { data, isLoading } = useMatchMetadata(matchId);
    if (isLoading) return <Loader2 className="animate-spin" />;
    if (data === null || data === undefined) return <div className="text-sm text-muted-foreground">Failed to load match info</div>;
    return <ReplayRow replay={data} shownButtons={[]}/>;
}

export default InjectMatchInfoTab;