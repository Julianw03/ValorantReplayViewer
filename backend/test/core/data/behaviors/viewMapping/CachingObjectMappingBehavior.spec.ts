import { OutputMappingCachingObjectBehavior } from '@/core/data/behaviors/viewMapping/OutputMappingCachingObjectBehavior';
import { runObjectMappingBehaviorSuite } from './shared/objectMappingBehaviorSuite';
import { describe } from 'vitest';

describe('CachingObjectMappingBehavior', () => {
    runObjectMappingBehaviorSuite(
        (inner, mappingFn) => new OutputMappingCachingObjectBehavior(inner, mappingFn),
    );
});
