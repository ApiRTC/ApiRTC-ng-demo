import { Component, OnInit, OnDestroy, Input, EventEmitter, Output } from '@angular/core';

import { UntypedFormControl } from '@angular/forms';

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

  @Input() isCameraStream: boolean = false;

  @Input() withMuteControl: boolean = false;
  @Input() withDevicesControl: boolean = false;

  @Input() withApplyAudioProcessorControl: boolean = false;

  @Input() withApplyVideoProcessorControl: boolean = false;

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
  _audioOutDevices: Array<any>;
  @Input() set audioOutDevices(audioOutDevices: Array<any>) {
    this._audioOutDevices = audioOutDevices;
  }
  _videoDevices: Array<any>;
  @Input() set videoDevices(videoDevices: Array<any>) {
    this._videoDevices = videoDevices;
  }

  // @Input() set background(background: string | BackgroundImageEvent) {
  //   if (background instanceof BackgroundImageEvent) {
  //     this.backgroundFc.setValue('image');
  //   } else {
  //     this.backgroundFc.setValue(background);
  //   }
  // }

  // backgrounds: any[] = [
  //   { value: 'none', viewValue: 'No background' },
  //   { value: 'blur', viewValue: 'blur' },
  //   { value: 'transparent', viewValue: 'transparent' },
  //   { value: 'image', viewValue: 'image' }
  // ];

  @Output() onSubscription = new EventEmitter<StreamSubscribeEvent>();
  @Output() onAudioMute = new EventEmitter<boolean>();
  @Output() onVideoMute = new EventEmitter<boolean>();
  @Output() onAudioInSelected = new EventEmitter<any>();
  @Output() onAudioOutSelected = new EventEmitter<any>();
  @Output() onVideoSelected = new EventEmitter<any>();
  @Output() onApplyVideoProcessor = new EventEmitter<string>();
  @Output() onApplyAudioProcessor = new EventEmitter<string>();
  //@Output() onBackgroundSelected = new EventEmitter<string | BackgroundImageEvent>();
  //@Output() onVideoQualitySelected = new EventEmitter<VideoQuality>();

  // Audio/Video Muting
  muteAudioFc = new UntypedFormControl(false);
  muteVideoFc = new UntypedFormControl(false);

  // Mirror
  mirrorVideoFc = new UntypedFormControl(false);

  // Devices handling
  audioInFc = new UntypedFormControl('');
  audioOutFc = new UntypedFormControl('');
  videoFc = new UntypedFormControl('');

  // Background selection
  //backgroundFc = new FormControl('none');

  // Video quality selection
  videoQualityFc = new UntypedFormControl(undefined);

  // torch
  torch: boolean = undefined;

  // zoom
  zoom: number = undefined;

  constraintsError: string = undefined;
  constraintsOnError: Object = undefined;

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
    this.audioOutFc.valueChanges.subscribe(value => {
      console.log("audioOutFc#valueChanges", value);
      this.onAudioOutSelected.emit(value);
    });
    this.videoFc.valueChanges.subscribe(value => {
      console.log("videoFc#valueChanges", value);
      this.onVideoSelected.emit(value);
    });

    // Background selection
    //
    // this.backgroundFc.valueChanges.subscribe(value => {
    //   console.log("backgroundFc#valueChanges", value);
    //   if (value !== 'image') {
    //     this.onBackgroundSelected.emit(value);
    //   }
    // });

    // Video quality selection
    //
    this.videoQualityFc.valueChanges.subscribe((videoQuality: VideoQuality) => {
      console.log("videoQualityFc#valueChanges", videoQuality);
      this.onConstraintsChanged()
      // this.constraintsError = undefined;
      // this.streamHolder.stream.applyConstraints({ video: { height: { exact: videoQuality.height }, width: { exact: videoQuality.width } } })
      //   .then(() => {
      //     console.log('videoQuality applyConstraints done');
      //     this.streamHolder.getCapabilitiesConstraintsSettings();
      //   })
      //   .catch((error: any) => {
      //     console.error('videoQuality applyConstraints', error);
      //     this.constraintsError = error;
      //     setTimeout(() => {
      //       this.constraintsError = undefined;
      //     }, 2000)
      //   });
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

  private doGetAdvancedConstraints(): Object {
    const constraints = {};
    if (this.zoom !== undefined) {
      constraints['zoom'] = this.zoom;
    }
    if (this.torch !== undefined) {
      constraints['torch'] = this.torch;
    }
    return constraints;
  }

  onConstraintsChanged() {

    const videoConstraints = {}

    if (this.videoQualityFc.value) {
      const videoQuality = this.videoQualityFc.value;
      videoConstraints['height'] = { exact: videoQuality.height };
      videoConstraints['width'] = { exact: videoQuality.width };
    }

    const advancedConstraints = this.doGetAdvancedConstraints();
    if (Object.keys(advancedConstraints).length > 0) {
      videoConstraints['advanced'] = [advancedConstraints];
    }

    console.log('onConstraintsChanged', videoConstraints)

    this.constraintsError = undefined;
    this.constraintsOnError = undefined;
    this.streamHolder.stream.applyConstraints({ video: videoConstraints })
      .then(() => {
        console.log('onConstraintsChanged done', videoConstraints);
        this.streamHolder.getCapabilitiesConstraintsSettings();
      })
      .catch((error: any) => {
        console.error('onConstraintsChanged trying to apply', videoConstraints, error);
        this.constraintsOnError = { video: videoConstraints };
        this.constraintsError = error;
        setTimeout(() => {
          this.constraintsError = undefined;
        }, 2000)
      });
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
      //this.onBackgroundSelected.emit(new BackgroundImageEvent(imageData));
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

  applyBlur() {
    console.log("StreamComponent::applyBlur");
    this.onApplyVideoProcessor.emit('blur');
  }
  applyBgdGranit() {
    console.log("StreamComponent::applyBgdGranit");
    this.onApplyVideoProcessor.emit('bgdGranit');
  }
  applyBgdBeach() {
    console.log("StreamComponent::applyBgdBeach");
    this.onApplyVideoProcessor.emit('bgdBeach');
  }
  applyNone() {
    console.log("StreamComponent::applyNone");
    this.onApplyVideoProcessor.emit('none');
  }
  applyNoiseReduction() {
    console.log("StreamComponent::applyNoiseReduction");
    this.onApplyAudioProcessor.emit('noiseReduction');
  }
  applyNoneAudio() {
    console.log("StreamComponent::applyNone");
    this.onApplyAudioProcessor.emit('none');
  }
}
