import { RiotClientConnectionParameters } from './RiotClientConnectionParameters';

export interface RiotClientParametersAcquisitionStrategy {
    connect(): Promise<RiotClientConnectionParameters>;

    disconnect(): Promise<void>;
}
