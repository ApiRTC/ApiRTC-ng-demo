declare var apiRTC: any;

import { VideoQuality, VideoQualities } from '../../consts';

// Decorator for apiRTC.Stream class
//
export class StreamDecorator {

    public readonly id: string;

    public stream: any;
    public capabilities: any;
    public constraints: any;
    public settings: any;

    public qosStat: any;

    public isSpeaking = false;

    public isAudioMuted: boolean = false;
    public isVideoMuted: boolean = false;
    public isRemote: boolean = false;
    public remoteCapabilitiesAccepted: boolean = false;

    public published = false;

    public videoQualityOptions: Array<VideoQuality> = new Array();

    private listeners: Object = {};

    constructor(streamId: string, stream?: any) {
        this.id = streamId;
        this.stream = stream;

        if(stream!== undefined){
            stream.on('streamCapabilities', capabilities => {
                console.log('streamCapabilities', capabilities);
                this.capabilities = capabilities;
            });
            stream.on('streamSettings', settings => {
                console.log('streamSettings', settings);
                this.settings = settings;
            });
            stream.on('streamConstraints', constraints => {
                console.log('streamConstraints', constraints);
                this.constraints = constraints;
            });
            stream.on('remoteCapabilityRequest', (data) => {
                console.log('remoteCapabilityRequest', data);
                if(window.confirm('Autoriser ' + data.requestor.getUsername() + ' à controller à distance ?')){
                    console.log('accepted :', data.requestor.getId(), data.roomName);
                    stream.acceptRemoteCapabilityRequest(data.requestor.getId(), data.roomName, data.streamId);
                }else{
                    console.log('refused :', data.requestor.getId(), data.roomName);
                    stream.refuseRemoteCapabilityRequest(data.requestor.getId(), data.roomName, data.streamId);
                }
            });
            
            stream.getCapabilities();
            stream.getConstraints();
            stream.getSettings();
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

        stream.on('streamCapabilities', capabilities => {
            console.log('streamCapabilities', capabilities);
            this.capabilities = capabilities;
            if (this.capabilities.width && this.capabilities.height) {
                for (const quality of VideoQualities) {
                    console.log("Quality", quality)
                    if (this.capabilities.width.max >= quality.width && this.capabilities.height.max >= quality.height) {
                        this.videoQualityOptions.push(quality);
                    }
                }
            }
        });
        stream.on('streamSettings', settings => {
            console.log('streamSettings', settings);
            this.settings = settings;
        });
        stream.on('streamConstraints', constraints => {
            console.log('streamConstraints', constraints);
            this.constraints = constraints;
        });
        stream.on('remoteCapabilityRequestAccepted', () => {
            console.log('remoteCapabilityRequestAccepted');
            this.remoteCapabilitiesAccepted = true;
        });
        stream.on('remoteCapabilityRequestRefused', () => {
            console.log('remoteCapabilityRequestRefused');
            this.remoteCapabilitiesAccepted = false;
        });
        
        stream.getCapabilities();
        stream.getConstraints();
        stream.getSettings();

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
    
    public setIsRemote(remote: boolean){
        this.isRemote = remote;
    }

}
