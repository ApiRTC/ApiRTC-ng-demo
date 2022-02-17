
import { VideoQuality, VideoQualities } from '../../consts';

import { Stream } from '@apirtc/apirtc';

// Decorator for apirtc Stream class
//
export class StreamDecorator {

    public readonly id: string;

    public stream: Stream;

    public capabilities: any;
    public constraints: MediaStreamConstraints;
    public settings: any;

    public qosStat: any;

    public isSpeaking = false;

    public isAudioMuted: boolean = false;
    public isVideoMuted: boolean = false;
    public isRemote: boolean = false;

    public published = false;

    public videoQualityOptions: Array<VideoQuality> = new Array();

    private listeners: Object = {};

    constructor(streamId: string, stream?: any) {
        this.id = streamId;
        this.stream = stream;

        if (stream !== undefined) {
            this.getCapabilitiesConstraintsSettings();
        }
    }

    /**
     * 
     * @param streamId 
     * @param qosStat 
     * @returns 
     */
    public static buildFromId(streamId: string): StreamDecorator {
        return new StreamDecorator(streamId);
    }

    /**
     * 
     * @param streamId 
     * @param qosStat 
     * @returns 
     */
    public static build(stream: any): StreamDecorator {
        return new StreamDecorator(String(stream.getId()), stream);
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
        if (stream === null) {
            return;
        }
        this.getCapabilitiesConstraintsSettings();
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

    // Audio muted

    public setAudioMuted(isAudioMuted: boolean) {
        this.isAudioMuted = isAudioMuted;
    }

    // Video muted

    public setVideoMuted(isVideoMuted: boolean) {
        this.isVideoMuted = isVideoMuted;
    }

    // Published

    public setPublished(published: boolean) {
        this.published = published;
    }
    public isPublished(): boolean {
        return this.published;
    }

    // Remote

    public setIsRemote(remote: boolean) {
        this.isRemote = remote;
    }

    // Events
    //
    public getCapabilitiesConstraintsSettings() {
        this.stream.getCapabilities().then((capabilities: any) => {
            console.log('stream getCapabilities', capabilities);
            this.capabilities = capabilities;
            const videoCapabilities = capabilities.video;
            if (videoCapabilities.width && videoCapabilities.height) {
                for (const quality of VideoQualities) {
                    console.log("Quality", quality)
                    if (videoCapabilities.width.max >= quality.width && videoCapabilities.height.max >= quality.height) {
                        this.videoQualityOptions.push(quality);
                    }
                }
            }
        }).catch((error: any) => {
            console.error('stream getCapabilities error', error);
        });
        this.stream.getConstraints().then((constraints: any) => {
            console.log('stream getConstraints', constraints);
            this.constraints = constraints;
        }).catch((error: any) => {
            console.error('stream getConstraints error', error);
        });
        this.stream.getSettings().then((settings: any) => {
            console.log('stream getSettings', settings);
            this.settings = settings;
        }).catch((error: any) => {
            console.error('stream getSettings error', error);
        });
    }

}
