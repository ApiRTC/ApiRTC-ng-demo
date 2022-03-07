import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactDecorator, StreamDecorator } from '../model/model.module';
import { ContactMock } from '../model/contact-decorator.spec';

import { PeerComponent } from './peer.component';
import { Contact } from '@apirtc/apirtc';

describe('PeerComponent', () => {
  let component: PeerComponent;
  let fixture: ComponentFixture<PeerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PeerComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PeerComponent);
    component = fixture.componentInstance;
    component.contactHolder = ContactDecorator.build(new Contact("foo", {}));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
