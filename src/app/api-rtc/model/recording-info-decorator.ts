export class RecordingInfoDecorator {
    public readonly recordingInfo: Object;
    public readonly available: boolean;

    constructor(recordingInfo: Object, available: boolean) {
        this.recordingInfo = recordingInfo;
        this.available = available;
    }

    public isAvailable(): boolean {
        return this.available;
    }
}
