export enum DownloadState {
    DOWNLOADING = 'DOWNLOADING',
    DOWNLOADED = 'DOWNLOADED',
    FAILED = 'FAILED'
}

export interface DownloadStateDTO {
    state: DownloadState;
}