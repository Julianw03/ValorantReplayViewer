export const DownloadState = {
    DOWNLOADING: 'DOWNLOADING',
    DOWNLOADED: 'DOWNLOADED',
    FAILED: 'FAILED'
} as const;

export type DownloadState = typeof DownloadState[keyof typeof DownloadState];

export interface DownloadStateDTO {
    state: DownloadState;
}