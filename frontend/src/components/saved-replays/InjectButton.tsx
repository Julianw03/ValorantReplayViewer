import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { Button } from '@/components/ui/button.tsx';
import { BugPlay, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProductSession, useShippingVersion, useStartInject } from '@/lib/queries.ts';
import type { ReplayMetadata } from '@/lib/api.ts';
import { checkCompatibility, VersionComparisonResult } from '@/lib/VersionUtils.ts';

export type InjectButtonProps = {
    replay: ReplayMetadata;
}

type DisabledInfo = {
    isDisabled: boolean;
    tooltip: string;
}

type GetDisabledInfoParams = {
    isInjecting: boolean;
    currentGameVersion: string | null;
    replayGameVersion: string;
    sessionAvailable: boolean;
}

const getDisabledInfo = (
    {
        isInjecting,
        currentGameVersion,
        replayGameVersion,
        sessionAvailable,
    }: GetDisabledInfoParams): DisabledInfo => {
    if (isInjecting) {
        return {
            isDisabled: true,
            tooltip: 'Injection in progress...',
        };
    }

    if (!sessionAvailable) {
        return {
            isDisabled: true,
            tooltip: 'No active game session found. Please start Valorant before injecting.',
        };
    }

    const versionCompatibility = checkCompatibility(currentGameVersion, replayGameVersion);
    switch (versionCompatibility) {
        case VersionComparisonResult.INCOMPATIBLE:
            return {
                isDisabled: true,
                tooltip: `Replay game version is not compatible with current Valorant version`,
            };
        case VersionComparisonResult.EXACT_MATCH:
            return {
                isDisabled: false,
                tooltip: 'Inject this replay into the game client',
            };
        case VersionComparisonResult.PROBABLY_COMPATIBLE:
            return {
                isDisabled: false,
                tooltip: 'Inject this replay into the game client.',
            };
        case VersionComparisonResult.UNKNOWN:
        default:
            return {
                isDisabled: true,
                tooltip: 'Unable to determine version compatibility. Injection is disabled as a precaution.',
            };
    }
};

export const InjectButton = (
    {
        replay,
    }: InjectButtonProps,
) => {
    const navigate = useNavigate();
    const { mutate: startInject, isPending: isInjecting } = useStartInject();
    const shippingVersion = useShippingVersion();
    const session = useProductSession('valorant');
    const isSessionAvailable = !!session;

    const disabledInfo = getDisabledInfo({
        isInjecting: isInjecting,
        currentGameVersion: shippingVersion,
        replayGameVersion: replay.matchInfo.gameVersion,
        sessionAvailable: isSessionAvailable,
    });

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        className={'cursor-pointer'}
                                        disabled={disabledInfo.isDisabled}
                                        onClick={() => startInject(replay.matchInfo.matchId, { onSuccess: () => navigate('/injector') })}
                                    >
                                    {isInjecting ? <Loader2 className="animate-spin" /> : <BugPlay />}
                                </Button>
                                </span>
            </TooltipTrigger>
            <TooltipContent>
                <p>{disabledInfo.tooltip}</p>
            </TooltipContent>
        </Tooltip>
    );
};