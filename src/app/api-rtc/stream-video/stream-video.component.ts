import { Component, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-stream-video',
  templateUrl: './stream-video.component.html',
  styleUrls: ['./stream-video.component.css']
})
export class StreamVideoComponent implements AfterViewInit {

  @ViewChild("video") videoRef: ElementRef;

  @Input() stream: any;

  _mirror = false;
  @Input() set mirror(mirror: boolean) {
    this._mirror = mirror;
  }

  _fullscreen = false;
  @Input() set fullscreen(fullscreen: boolean) {
    this._fullscreen = fullscreen;
  }

  ngAfterViewInit() {
    // remote stream is attached to DOM during ngAfterViewInit because @ViewChild is not bound before this stage
    //this.videoRef.nativeElement.srcObject = this.stream;
    //this.videoRef.nativeElement.muted = false;
    this.stream.attachToElement(this.videoRef.nativeElement);
  }

}
