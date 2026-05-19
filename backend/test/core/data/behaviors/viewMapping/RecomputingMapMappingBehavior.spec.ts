import { RecomputingMapMappingBehavior } from '@/core/data/behaviors/viewMapping/RecomputingMapMappingBehavior';
import { runMapMappingBehaviorSuite } from './shared/mapMappingBehaviorSuite';
import { describe } from 'vitest';

describe('RecomputingMapMappingBehavior', () => {
    runMapMappingBehaviorSuite(
        (inner, mappingFn) => new RecomputingMapMappingBehavior(inner, mappingFn),
    );
});
