import { CachingObjectMappingBehavior } from '@/core/data/behaviors/viewMapping/CachingObjectMappingBehavior';
import { runObjectMappingBehaviorSuite } from './shared/objectMappingBehaviorSuite';
import { describe } from 'vitest';

describe('CachingObjectMappingBehavior', () => {
    runObjectMappingBehaviorSuite(
        (inner, mappingFn) => new CachingObjectMappingBehavior(inner, mappingFn),
    );
});
