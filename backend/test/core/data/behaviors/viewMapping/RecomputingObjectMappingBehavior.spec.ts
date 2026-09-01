import { OuputMappingRecomputingObjectBehavior } from '@/core/data/behaviors/viewMapping/OuputMappingRecomputingObjectBehavior';
import { runObjectMappingBehaviorSuite } from './shared/objectMappingBehaviorSuite';
import { describe } from 'vitest';

describe('RecomputingObjectMappingBehavior', () => {
    runObjectMappingBehaviorSuite(
        (inner, mappingFn) => new OuputMappingRecomputingObjectBehavior(inner, mappingFn),
    );
});
