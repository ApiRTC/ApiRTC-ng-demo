import { Injectable } from '@angular/core';

import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { handleError, Error } from '../misc';

@Injectable({
  providedIn: 'root'
})
export class AuthServerService {

  constructor(private http: HttpClient) {

  }

  public loginJWToken(username: string, password: string): Observable<any | Error> {

    const headers = new HttpHeaders({
      'Content-Type': 'application/json;charset=UTF-8',
    });

    const url = `http://localhost:3000/loginJWToken`;

    return this.http.post(url,
      { username: username, password: password }, { headers: headers })
      .pipe(catchError(error => {
        // rethrow to let client handle it
        return throwError(handleError(error));
      }));
  }

  public loginToken(username: string, password: string): Observable<any | Error> {

    const headers = new HttpHeaders({
      'Content-Type': 'application/json;charset=UTF-8',
    });

    const url = `http://localhost:3000/loginToken`;

    return this.http.post(url,
      { username: username, password: password }, { headers: headers })
      .pipe(catchError(error => {
        // rethrow to let client handle it
        return throwError(handleError(error));
      }));
  }
}
