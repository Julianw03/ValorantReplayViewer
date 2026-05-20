import { CachingMapMappingBehavior } from '@/core/data/behaviors/viewMapping/CachingMapMappingBehavior';
import { runMapMappingBehaviorSuite } from './shared/mapMappingBehaviorSuite';
import { describe } from 'vitest';

describe('CachingMapMappingBehavior', () => {
    runMapMappingBehaviorSuite(
        (inner, mappingFn) => new CachingMapMappingBehavior(inner, mappingFn),
    );

});
