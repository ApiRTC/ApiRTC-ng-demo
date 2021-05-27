import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConversationComponent } from './conversation.component';

import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ReactiveFormsModule } from "@angular/forms";

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { RouterTestingModule } from '@angular/router/testing';

import { WINDOW } from '../../windows-provider';

import { LoginComponent } from '../../utils/login/login.component';


describe('ConversationComponent', () => {
  let component: ConversationComponent;
  let fixture: ComponentFixture<ConversationComponent>;

  beforeEach(async () => {

    const mockWindow = { location: { origin: 'https://foo.bar/', pathname: '/path/to/CONVNAME', hash: 'testhash' } };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(
        [{ path: 'conversation/:name', component: ConversationComponent }
        ]),
        BrowserAnimationsModule,
        MatFormFieldModule, MatInputModule, MatChipsModule, MatProgressBarModule, MatProgressSpinnerModule,
        ReactiveFormsModule, HttpClientModule, HttpClientTestingModule],
      declarations: [ConversationComponent, LoginComponent],
      providers: [{ provide: WINDOW, useValue: mockWindow }]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConversationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
