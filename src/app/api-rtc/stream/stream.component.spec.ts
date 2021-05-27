import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioStatsComponent } from '../audio-stats/audio-stats.component';
import { VideoStatsComponent } from '../video-stats/video-stats.component';

import { StreamComponent } from './stream.component';

import { StreamDecorator } from '../model/model.module';

describe('StreamComponent', () => {
  let component: StreamComponent;
  let fixture: ComponentFixture<StreamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StreamComponent, AudioStatsComponent, VideoStatsComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StreamComponent);
    component = fixture.componentInstance;
    const streamInfo = { streamId: 'a-stream-id', isRemote: false, type: 'regular' };
    component.streamHolder = StreamDecorator.build(streamInfo);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
