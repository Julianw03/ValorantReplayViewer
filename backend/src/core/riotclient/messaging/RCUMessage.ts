export class RCUMessage {
    readonly type: RCUMessageType;
    readonly uri: string;
    readonly data: JsonNode;

    constructor(type: RCUMessageType, uri: string, data: JsonNode) {
        this.type = type;
        this.uri = uri;
        this.data = data;
    }
}

export enum RCUMessageType {
    CREATE = 'Create',
    UPDATE = 'Update',
    DELETE = 'Delete',
}

export const RCU_MESSAGE_TYPE_MAP: { [key: string]: RCUMessageType } = {
    Create: RCUMessageType.CREATE,
    Update: RCUMessageType.UPDATE,
    Delete: RCUMessageType.DELETE,
};
