import { Component, OnInit, OnDestroy, Input, EventEmitter, Output } from '@angular/core';

import { FormControl } from '@angular/forms';

import { StreamDecorator } from '../model/model.module';

import { VideoQuality } from '../../consts';

export class StreamSubscribeEvent {
  readonly streamHolder: StreamDecorator;
  readonly doSubscribe: boolean;
  constructor(streamHolder: StreamDecorator, doSubscribe: boolean) {
    this.streamHolder = streamHolder;
    this.doSubscribe = doSubscribe;
  }
}

export class BackgroundImageEvent {
  readonly imageData: ImageData;
  constructor(imageData: ImageData) {
    this.imageData = imageData;
  }
}

@Component({
  selector: 'app-stream',
  templateUrl: './stream.component.html',
  styleUrls: ['./stream.component.css']
})
export class StreamComponent implements OnInit, OnDestroy {

  @Input() streamHolder: StreamDecorator;

  @Input() withMuteControl: boolean = false;
  @Input() withDevicesControl: boolean = false;

  @Input() withSubscription: boolean = false;

  @Input() set audioMuted(audioMuted: boolean) {
    this.muteAudioFc.setValue(audioMuted);
  }
  @Input() set videoMuted(videoMuted: boolean) {
    this.muteVideoFc.setValue(videoMuted);
  }

  _audioInDevices: Array<any>;
  @Input() set audioInDevices(audioInDevices: Array<any>) {
    this._audioInDevices = audioInDevices;
  }
  _videoDevices: Array<any>;
  @Input() set videoDevices(videoDevices: Array<any>) {
    this._videoDevices = videoDevices;
  }

  @Input() set background(background: string | BackgroundImageEvent) {
    if (background instanceof BackgroundImageEvent) {
      this.backgroundFc.setValue('image');
    } else {
      this.backgroundFc.setValue(background);
    }
  }

  backgrounds: any[] = [
    { value: 'none', viewValue: 'No background' },
    { value: 'blur', viewValue: 'blur' },
    { value: 'transparent', viewValue: 'transparent' },
    { value: 'image', viewValue: 'image' }
  ];

  @Output() onSubscription = new EventEmitter<StreamSubscribeEvent>();
  @Output() onAudioMute = new EventEmitter<boolean>();
  @Output() onVideoMute = new EventEmitter<boolean>();
  @Output() onAudioInSelected = new EventEmitter<any>();
  @Output() onVideoSelected = new EventEmitter<any>();
  @Output() onBackgroundSelected = new EventEmitter<string | BackgroundImageEvent>();
  @Output() onVideoQualitySelected = new EventEmitter<VideoQuality>();

  // Audio/Video Muting
  muteAudioFc = new FormControl(false);
  muteVideoFc = new FormControl(false);

  // Mirror
  mirrorVideoFc = new FormControl(false);

  // Devices handling
  audioInFc = new FormControl('');
  videoFc = new FormControl('');

  // Backgroung selection
  backgroundFc = new FormControl('none');

  // Video quality selection
  videoQualityFc = new FormControl();

  objectKeys = Object.keys;
  jsonStringify = JSON.stringify;

  ngOnInit(): void {
    // Audio/Video muting
    //
    this.muteAudioFc.valueChanges.subscribe(value => {
      console.log("muteAudioFc#valueChanges", value);
      this.streamHolder.setAudioMuted(value);
      this.onAudioMute.emit(value);
    });
    this.muteVideoFc.valueChanges.subscribe(value => {
      console.log("muteVideoFc#valueChanges", value);
      this.streamHolder.setVideoMuted(value);
      this.onVideoMute.emit(value);
    });

    // Media device selection handling
    //
    this.audioInFc.valueChanges.subscribe(value => {
      console.log("audioInFc#valueChanges", value);
      this.onAudioInSelected.emit(value);
    });
    this.videoFc.valueChanges.subscribe(value => {
      console.log("videoFc#valueChanges", value);
      this.onVideoSelected.emit(value);
    });

    // Background selection
    //
    this.backgroundFc.valueChanges.subscribe(value => {
      console.log("backgroundFc#valueChanges", value);
      if (value !== 'image') {
        this.onBackgroundSelected.emit(value);
      }
    });

    // Video quality selection
    //
    this.videoQualityFc.valueChanges.subscribe(value => {
      console.log("videoQualityFc#valueChanges", value);
      this.onVideoQualitySelected.emit(value);
    });

    if (this.streamHolder.isAudioMuted) {
      this.muteAudioFc.setValue(true);
      this.streamHolder.stream.muteAudio();
    }
    if (this.streamHolder.isVideoMuted) {
      this.muteVideoFc.setValue(true);
      this.streamHolder.stream.muteVideo();
    }
  }

  chooseImage(event: any): void {
    const file: File | null = event.target.files.item(0);
    console.log("chooseImage", file);

    // if (apiRTC.browser === 'Firefox') {
    //   var fr = new FileReader;
    //   fr.onload = () => { // file is loaded
    //     var img = new Image;
    //     img.onload = () => {
    //       var canvas = document.createElement('canvas');
    //       var context = canvas.getContext('2d');
    //       context.drawImage(img, 0, 0);  // draw image onto canvas (lazy method™)
    //       console.log("onload Firefox", img);
    //       const imageData = context.getImageData(0, 0, img.width, img.height);
    //       this.onBackgroundSelected.emit(new BackgroundImageEvent(imageData));
    //     };
    //     img.src = fr.result as string; // is the data URL because called with readAsDataURL
    //   };
    //   fr.readAsDataURL(file);
    // }
    // else {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {                    // handle async image loading
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      context.drawImage(img, 0, 0);  // draw image onto canvas (lazy method™)
      console.log("onload", img);
      const imageData = context.getImageData(0, 0, img.width, img.height);
      this.onBackgroundSelected.emit(new BackgroundImageEvent(imageData));
      // free memory
      URL.revokeObjectURL(img.src);
    };
    img.src = url;
  }

  ngOnDestroy(): void {
    console.log('StreamComponent::ngOnDestroy', this.streamHolder);
  }

  toggleSubscribe() {
    console.log("StreamComponent::toggleSubscribe");
    this.onSubscription.emit(new StreamSubscribeEvent(this.streamHolder, this.streamHolder.stream ? false : true));
  }

  refreshCapabilitiesConstraintsSettings() {
    console.log("StreamComponent::refreshCapabilitiesConstraintsSettings");
    this.streamHolder.getCapabilitiesConstraintsSettings();
  }

  // Reworked
  // applyConstraints(capabilities) {
  //   console.log("StreamComponent::applyConstraints", capabilities);
  //   try {
  //     capabilities = JSON.parse(capabilities);
  //   } catch (e) {
  //     console.error(e);
  //     return;
  //   }
  //   this.streamHolder.stream.applyConstraints(capabilities).then(() => {
  //     this.refreshCapabilities();
  //   });
  // }

  applyConstraintsHD() {
    this.streamHolder.stream.applyConstraints({ video: { height: { exact: 720 }, width: { exact: 1280 } } })
      .then(() => {
        console.log('applyConstraintsHD done');
        this.refreshCapabilitiesConstraintsSettings()
      })
      .catch((error: any) => { console.error('applyConstraintsHD', error) });
  }
  applyConstraintsHDTorchOn() {
    this.streamHolder.stream.applyConstraints({ video: { height: { exact: 720 }, width: { exact: 1280 }, advanced: [{ torch: true }] } })
      .then(() => {
        console.log('applyConstraintsHDTorchOn done');
        this.refreshCapabilitiesConstraintsSettings()
      })
      .catch((error: any) => { console.error('applyConstraintsHDTorchOn', error) });
  }
  applyConstraintsTorchOn() {
    this.streamHolder.stream.applyConstraints({ video: { torch: true } })
      .then(() => {
        console.log('applyConstraintsHDTorchOn done');
        this.refreshCapabilitiesConstraintsSettings()
      })
      .catch((error: any) => { console.error('applyConstraintsHDTorchOn', error) });
  }
  applyConstraintsVGA() {
    this.streamHolder.stream.applyConstraints({ video: { height: { exact: 480 }, width: { exact: 640 } } })
      .then(() => {
        console.log('applyConstraintsVGA done');
        this.refreshCapabilitiesConstraintsSettings()
      })
      .catch((error: any) => { console.error('applyConstraintsVGA', error) });
  }
  applyConstraintsVGATorchOff() {
    this.streamHolder.stream.applyConstraints({ video: { height: { exact: 480 }, width: { exact: 640 }, advanced: [{ torch: false }] } })
      .then(() => {
        console.log('applyConstraintsVGATorchOff done');
        this.refreshCapabilitiesConstraintsSettings()
      })
      .catch((error: any) => { console.error('applyConstraintsVGATorchOff', error) });
  }

}
