import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioStatsComponent } from './audio-stats.component';

describe('AudioStatsComponent', () => {
  let component: AudioStatsComponent;
  let fixture: ComponentFixture<AudioStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AudioStatsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AudioStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
