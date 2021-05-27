import { _fixedSizeVirtualScrollStrategyFactory } from '@angular/cdk/scrolling';
import { ContactDecorator } from './contact-decorator';

class UserData {
  public get(prop: string): Object {
    return "a value";
  }
}

export class ContactMock {
  _id: string;
  _username: string;
  _userData: UserData = new UserData();

  constructor(id: string, username: string) {
    this._id = id;
    this._username = username;
  }

  public getId() {
    return this._id;
  }
  public getUsername(): string {
    return this._username;
  }
  public getUserData(): UserData {
    return this._userData;
  }

}

describe('ContactDecorator', () => {
  it('should create an instance', () => {
    expect(new ContactDecorator(new ContactMock("foo", "bar"))).toBeTruthy();
  });
});
