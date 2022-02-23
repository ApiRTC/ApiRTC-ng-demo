import { RecordingInfo } from '@apirtc/apirtc'

export class RecordingInfoDecorator {
    public readonly recordingInfo: RecordingInfo;
    public readonly available: boolean;

    constructor(recordingInfo: RecordingInfo, available: boolean) {
        this.recordingInfo = recordingInfo;
        this.available = available;
    }

    public isAvailable(): boolean {
        return this.available;
    }
}
