import { StreamDecorator } from './stream-decorator'

import { PROPERTY_NICKNAME } from './../../consts';

export class ContactDecorator {

    public readonly id: string;

    // Do not use a function from templates : it can trigger performance issues
    // So we use a local attributes updated on event.
    public username: string;
    public nickname: string;

    private contact: any;

    private readonly streamHoldersById: Map<string, StreamDecorator> = new Map();

    constructor(contact: any) {
        //console.log("typeof contact.getId()", typeof contact.getId());
        this.id = String(contact.getId());
        this.update(contact);
    }

    public static build(contact: any): ContactDecorator {
        return new ContactDecorator(contact);
    }

    public getId(): string {
        return this.id;
    }

    public getContact(): any {
        return this.contact;
    }

    public getStreamHoldersById(): Map<string, StreamDecorator> {
        return this.streamHoldersById;
    }

    public update(contact: any) {
        this.contact = contact;
        this.username = contact.getUsername();
        this.nickname = contact.getUserData().get(PROPERTY_NICKNAME);
    }

    public addStream(stream: StreamDecorator) {
        this.streamHoldersById.set(stream.getId(), stream);
    }

    public removeStream(streamId: string) {
        this.streamHoldersById.delete(streamId);
    }

}