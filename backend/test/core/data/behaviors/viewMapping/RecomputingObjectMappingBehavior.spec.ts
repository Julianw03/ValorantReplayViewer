import { RecomputingObjectMappingBehavior } from '@/core/data/behaviors/viewMapping/RecomputingObjectMappingBehavior';
import { runObjectMappingBehaviorSuite } from './shared/objectMappingBehaviorSuite';
import { describe } from 'vitest';

describe('RecomputingObjectMappingBehavior', () => {
    runObjectMappingBehaviorSuite(
        (inner, mappingFn) => new RecomputingObjectMappingBehavior(inner, mappingFn),
    );
});
