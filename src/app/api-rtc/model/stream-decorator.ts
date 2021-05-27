declare var apiRTC: any;

import { VideoQuality, QVGA, VGA, HD, FHD, FourK, VideoQualities } from '../../consts';

// Decorator for apiRTC.Stream class
//
export class StreamDecorator {

    public readonly id: string;

    public readonly streamInfo: any;

    public stream: any;
    public capabilities: any;
    public constraints: any;
    public settings: any;

    public qosStat: any;

    public isSpeaking = false;

    public published = false;

    public videoQualityOptions: Array<VideoQuality> = new Array();

    private listeners: Object = {};

    constructor(streamInfo: any, qosStat?: any) {
        this.streamInfo = streamInfo;

        // console.log("StreamDecorator: typeof streamInfo.streamId :", typeof streamInfo.streamId) => number
        this.id = String(streamInfo.streamId);

        this.qosStat = qosStat && qosStat || undefined;
    }

    /**
     * 
     * @param streamInfo 
     * @returns 
     */
    public static build(streamInfo: any, qosStat?: any): StreamDecorator {
        return new StreamDecorator(streamInfo, qosStat);
    }

    // Events handling (Listener Design Pattern implementation)
    on(name: string, listener: Function) {
        if (!this.listeners[name]) {
            this.listeners[name] = [];
        }
        this.listeners[name].push(listener);
    }

    // Accessors

    public getId(): string {
        return this.id;
    }

    public setStream(stream: any) {
        this.stream = stream;

        //getCapabilities only supported by Chrome ?
        if ((apiRTC.browser !== 'Firefox') && (apiRTC.browser !== 'IE')) {
            this.capabilities = stream.getCapabilities();
            console.log('stream capabilities :', this.capabilities);
            // Exemple on Chrome :
            // { 
            //     "aspectRatio": { "max": 1280, "min": 0.001388888888888889 },
            //     "brightness": { "max": 64, "min": -64, "step": 1 },
            //     "colorTemperature": { "max": 6500, "min": 2800, "step": 1 },
            //     "contrast": { "max": 64, "min": 0, "step": 1 },
            //     "exposureMode": ["manual", "continuous"],
            //     "exposureTime": { "max": 10000, "min": 39, "step": 1 },
            //     "frameRate": { "max": 30, "min": 0 },
            //     "height": { "max": 720, "min": 1 },
            //     "resizeMode": ["none", "crop-and-scale"],
            //     "saturation": { "max": 128, "min": 0, "step": 1 },
            //     "sharpness": { "max": 5, "min": 0, "step": 1 },
            //     "whiteBalanceMode": ["manual", "continuous"],
            //     "width": { "max": 1280, "min": 1 }
            // }
            if (this.capabilities.width && this.capabilities.height) {
                for (const quality of VideoQualities) {
                    console.log("Quality", quality)
                    if (this.capabilities.width.max >= quality.width && this.capabilities.height.max >= quality.height) {
                        this.videoQualityOptions.push(quality);
                    }
                }
            }
            this.constraints = stream.getConstraints();

            this.settings = stream.getSettings();
        }

    }
    public getStream(): any {
        return this.stream;
    }

    // QoS

    public setQosStat(qosStat: any) {
        this.qosStat = qosStat;
    }
    public getQosStat(): any {
        return this.qosStat;
    }

    // Speaking

    public setSpeaking(isSpeaking: boolean) {
        this.isSpeaking = isSpeaking;
    }

    // Published

    public setPublished(published: boolean) {
        this.published = published;
    }
    public isPublished(): boolean {
        return this.published;
    }

}
