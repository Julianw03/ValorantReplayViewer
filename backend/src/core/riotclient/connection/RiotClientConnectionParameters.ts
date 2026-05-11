export class RiotClientConnectionParameters {
    readonly port;
    readonly authSecret;
    readonly authHeader;

    constructor(port: number, authSecret: string) {
        this.port = port;
        this.authSecret = authSecret;
        this.authHeader = `Basic ${Buffer.from(`riot:${authSecret}`).toString('base64')}`;
    }
}
