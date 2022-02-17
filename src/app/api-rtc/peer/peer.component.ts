import { Component, Input, EventEmitter, Output } from '@angular/core';

import { ContactDecorator, StreamDecorator } from '../model/model.module';

import { StreamSubscribeEvent } from '../stream/stream.component';


@Component({
  selector: 'app-peer',
  templateUrl: './peer.component.html',
  styleUrls: ['./peer.component.css']
})
export class PeerComponent {

  streamHoldersById: Map<string, StreamDecorator>;

  _contactHolder: ContactDecorator;
  @Input() set contactHolder(contactHolder: ContactDecorator) {
    this._contactHolder = contactHolder;
    this.streamHoldersById = contactHolder.getStreamHoldersById();
  }

  @Input() withModeration: boolean = false;

  @Output() onStreamSubscription = new EventEmitter<StreamSubscribeEvent>();

  @Output() onAudioMute = new EventEmitter<[StreamDecorator, boolean]>();
  @Output() onVideoMute = new EventEmitter<[StreamDecorator, boolean]>();

  @Output() onEject = new EventEmitter<boolean>();

  relayAudioMute(streamHolder: StreamDecorator, value: boolean) {
    this.onAudioMute.emit([streamHolder, value]);
  }

  relayVideoMute(streamHolder: StreamDecorator, value: boolean) {
    this.onVideoMute.emit([streamHolder, value]);
  }

  emitStreamSubscription(event: StreamSubscribeEvent) {
    this.onStreamSubscription.emit(event);
  }

  emitEject() {
    this.onEject.emit(true);
  }

}
