import { Component, OnInit, Input } from '@angular/core';


// "audioReceived": {
//   "bitsReceivedPerSecond": 21516,
//   "bytesReceived": 163020,

//   "delay": 0,

//   "jitter": 0.024,

//   "kind": "audio",
//   "mediaType": "audio",
//   "nackCount": 0,
//   "packetLossRatio": 0,

//   "packetsLost": 0,
//   "packetsLostPerSecond": 0,

//   "packetsReceived": 2964,
//   "packetsReceivedPerSecond": 48,
//   "remoteId": "eabf59a8",
//   "samplingInterval": 20,
//   "timestamp": 1617025918,
//   "type": "inbound-rtp"
// }

// "audioSent": {
//   "bitsSentPerSecond": 21956,
//   "bytesSent": 54281,

//   "delay": 0,
//   "kind": "audio",
//   "mediaType": "audio",
//   "nackCount": 0,
//   "packetLossRatio": 0,

//   "packetsSent": 987,
//   "packetsSentPerSecond": 49,

//   "remoteId": "dcf27266",
//   "samplingInterval": 10,
//   "timestamp": 1617025874,
//   "type": "outbound-rtp"
// }

@Component({
  selector: 'app-audio-stats',
  templateUrl: './audio-stats.component.html',
  styleUrls: ['./audio-stats.component.css']
})
export class AudioStatsComponent implements OnInit {

  bitRate: number;
  bitRateKbps: number;
  packetLossRatio: number;
  totalBytes: number;

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

    //console.log("AudioStatsComponent", stats)
  };

  constructor() { }

  ngOnInit(): void {
  }

}
