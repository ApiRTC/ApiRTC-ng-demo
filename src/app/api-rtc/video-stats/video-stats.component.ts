import { Component, OnInit, Input } from '@angular/core';

// "videoReceived": {
//   "packetsReceived": 5469,
//   "bytesReceived": 5545977,
//   "framesDecoded": 1760,
//   "timestamp": 1617025918,
//   "type": "inbound-rtp",
//   "kind": "video",
//   "mediaType": "video",
//   "discardedPackets": 0,
//   "jitter": 0.011,
//   "packetsLost": 0,
//   "bitrateMean": 738224.2203389831,
//   "bitrateStdDev": 209547.2920779679,
//   "firCount": 0,
//   "framerateMean": 29.881355932203387,
//   "framerateStdDev": 0.6182496360753521,
//   "nackCount": 15,
//   "pliCount": 1,
//   "remoteId": "2affbd17",
//   "packetsReceivedPerSecond": 118,
//   "bitsReceivedPerSecond": 988688,
//   "packetsLostPerSecond": 0,
//   "framesDecodedPerSecond": 29,
//   "packetLossRatio": 0,
//   "samplingInterval": 20,
//   "width": 640,
//   "height": 480,
//   "delay": 0
// }

// "videoSent": {
//   "packetsSent": 1296,
//   "bytesSent": 1253324,
//   "framesEncoded": 555,
//   "timestamp": 1617025874,
//   "type": "outbound-rtp",
//   "kind": "video",
//   "mediaType": "video",
//   "bitrateMean": 491197.5789473684,
//   "bitrateStdDev": 67940.40635268838,
//   "droppedFrames": 1,
//   "firCount": 0,
//   "framerateMean": 29.421052631578952,
//   "framerateStdDev": 1.8353258709644937,
//   "nackCount": 0,
//   "pliCount": 6,
//   "qpSum": 9682,
//   "remoteId": "caf27979",
//   "packetsSentPerSecond": 65,
//   "bitsSentPerSecond": 517997,
//   "framesEncodedPerSecond": 30,
//   "samplingInterval": 10,
//   "width": 640,
//   "height": 480,
//   "delay": 0,
//   "moyDelay": null,
//   "packetLossRatio": 0
// }



@Component({
  selector: 'app-video-stats',
  templateUrl: './video-stats.component.html',
  styleUrls: ['./video-stats.component.css']
})
export class VideoStatsComponent implements OnInit {

  bitRate: number;
  bitRateKbps: number;
  frameRate: number;
  packetLossRatio: number;
  totalBytes: number;

  height: number;
  width: number;

  _stats: any;
  @Input()
  set stats(stats: any) {
    if (!stats) {
      return;
    }
    this._stats = stats;
    if (stats.bytesReceived) {
      this.totalBytes = stats.bytesReceived;
      this.bitRate = stats.bitsReceivedPerSecond;
    } else if (stats.bytesSent) {
      this.totalBytes = stats.bytesSent;
      this.bitRate = stats.bitsSentPerSecond;
    }
    this.bitRateKbps = Math.round(this.bitRate / 1000);
    this.packetLossRatio = stats.packetLossRatio;
    this.height = stats.height;
    this.width = stats.width;
  };

  constructor() { }

  ngOnInit(): void {
  }

}
