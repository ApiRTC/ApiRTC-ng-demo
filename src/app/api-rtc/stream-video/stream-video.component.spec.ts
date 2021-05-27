import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamVideoComponent } from './stream-video.component';

class StreamMock {
  public attachToElement(element: Element) {
    console.log("StreamMock::attachToElement");
  }
}

describe('StreamVideoComponent', () => {
  let component: StreamVideoComponent;
  let fixture: ComponentFixture<StreamVideoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StreamVideoComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StreamVideoComponent);
    component = fixture.componentInstance;
    component.stream = new StreamMock();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
