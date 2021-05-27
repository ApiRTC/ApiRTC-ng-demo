import { TestBed } from '@angular/core/testing';

import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AuthServerService } from './auth-server.service';

describe('AuthServerService', () => {
  let service: AuthServerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        HttpClientTestingModule
      ]
    });
    service = TestBed.inject(AuthServerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
