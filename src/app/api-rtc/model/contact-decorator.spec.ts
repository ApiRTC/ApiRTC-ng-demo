import { _fixedSizeVirtualScrollStrategyFactory } from '@angular/cdk/scrolling';
// import { ContactDecorator } from './contact-decorator';
import { Contact, UserData } from '@apirtc/apirtc';
// import { createMock } from 'ts-auto-mock';

// class UserData {
//   public get(prop: string): Object {
//     return "a value";
//   }
// }

export class ContactMock {
  _id: string;
  _username: string;
  _userData: UserData = new UserData({});

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

  public fetchProfileInformation(bearerToken: string, forceUpdate?: boolean): Promise<object> | null { return null}
  // public getActiveStreams() { }
  // public getPreviousMessages() { }
  // public fetchUserData() { }
  // public getPhotoUrl() { }
  // public fetchWebSessionInformation() { }
  // public loadMessageHistory() { }
  // public inGroup() { }
  // public isOnline() { }
  // public sendData() { }
  // public sendCustomEvent() { }
  // public sendMessage() { }
  // public inviteTo() { }
  // public sendWhiteboardInvitation() { }
  // public call() { }
  // public startDataChannel() { }
  // public sendFile() { }
  // public pushMedia() { }
  // public fetchMediaList() { }
  // public shareScreen() { }
  // public on() { }
  // public removeListener() { }
}

describe('ContactDecorator', () => {
  it('should create an instance', () => {

    //const userData: UserData = new UserData({})

    // const mock = createMock<Contact>();
    // mock.getId = () => "foo";
    // mock.getUsername = () => "bar";
    // mock.getUserData = () => new UserData({});

   // expect(new ContactDecorator(new ContactMock("foo", "bar"))).toBeTruthy();
    //expect(new ContactDecorator(mock)).toBeTruthy();
  });
});
