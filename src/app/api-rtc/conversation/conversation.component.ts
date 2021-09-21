import { Component, Inject, OnDestroy, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from "@angular/router";

import { WINDOW } from '../../windows-provider';

import { AuthServerService } from '../auth-server.service';

import { ContactDecorator, MessageDecorator, StreamDecorator, RecordingInfoDecorator } from '../model/model.module';

import { StreamSubscribeEvent, BackgroundImageEvent } from '../stream/stream.component';

import { PROPERTY_NICKNAME } from './../../consts';
const DEFAULT_NICKNAME = '';

import { VideoQuality, QVGA, HD, FHD } from '../../consts';

declare var apiRTC: any;

// TODO FIXTHIS: generates build error :
// import { UserAgent } from '@apizee/apirtc';
// Error: node_modules/@apizee/apirtc/apirtc.d.ts:842:22 - error TS2709: Cannot use namespace 'apiRTC' as a type.
// 842 declare var apiRTC2: apiRTC; // Added for retro compatibility

// TODO test (from dev.apirtc.com FAQ)
//import * as apiRTC2 from './apiRTC2-vX.Y.Z.js';

enum UserAgentCreationType {
  Key,
  Username
}

enum UserAgentAuthType {
  Guest,
  JWT,
  ThirdParty,
  CloudApiRTC
}

enum Role {
  Default,
  Moderator
}

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.css']
})
export class ConversationComponent implements OnInit, OnDestroy {

  @ViewChild('fileVideo') fileVideoRef: ElementRef;

  // FormControl/Group objects
  //
  //apiKeyFc: FormControl = new FormControl('myDemoApiKey');
  // TODO : REMOVETHIS remove my apiKey
  apiKeyFc: FormControl = new FormControl('9669e2ae3eb32307853499850770b0c3');

  //apiKeyFc: FormControl = new FormControl('aab29a8fb8423d7ccd3a3fcb7fd2b3db');

  // TODO : REMOVETHIS remove the valid2.apirtc.com kevin_moyse@yahoo.fr	aab29a8fb8423d7ccd3a3fcb7fd2b3db
  //cloudUrl: string | undefined = undefined;//"https://valid2.apirtc.com";
  cloudUrlFc: FormControl = new FormControl('https://cloud.apirtc.com');

  // TODO : REMOVETHIS Remove default
  //usernameFc: FormControl = new FormControl('kevin_moyse@yahoo.fr', [Validators.required]);
  usernameFc: FormControl = new FormControl('kevin.moyse@apizee.com', [Validators.required]);

  userAgentCreationType: UserAgentCreationType;
  userAgentAuthType: UserAgentAuthType;
  role: Role = Role.Default;

  // to be used from template
  userAgentCreationTypeEnum = UserAgentCreationType;
  userAgentAuthTypeEnum = UserAgentAuthType;
  roleEnum = Role;

  nicknameFc: FormControl = new FormControl({ value: DEFAULT_NICKNAME, disabled: true });

  contactsByGroup: Map<string, Array<any>> = new Map();

  conversationAdvancedOptionsFormGroup = this.fb.group({
    meshMode: this.fb.control({ value: false, disabled: false }),
    meshOnly: this.fb.control({ value: false, disabled: false })
  });
  conversationFormGroup = this.fb.group({
    name: this.fb.control('', [Validators.required])
  });
  messageFormGroup = this.fb.group({
    message: this.fb.control('', [Validators.required])
  });
  fileFormGroup = this.fb.group({
    file: this.fb.control('', [Validators.required])
  });
  videoFileFormGroup = this.fb.group({
    file: this.fb.control('', [Validators.required])
  });

  // Simple Array of messages received on the conversation
  messages: Array<MessageDecorator> = [];

  // Conversation urls
  //
  baseUrl: string;
  fullUrl: string;

  // apiRTC objects
  userAgent: any = null;
  session: any = null;
  conversation: any = null;

  // apiRTC data objects
  joinRequestsById: Map<string, any> = new Map();
  moderator: any = null;
  waitingForModeratorAcceptance = false;

  // Local Streams
  localCameraStreamsById: Map<string, StreamDecorator> = new Map();
  screenSharingStreamHolder: StreamDecorator = null;
  videoStreamHolder: StreamDecorator = null;

  activeIndex = 0;

  // Template helper attributes
  recording = false;
  recordingError = null;

  registerInPrgs = false;
  registrationError: any = null;

  joinInPrgs = false;
  joinError: any = null;
  joined = false;

  publishInPrgs = false;
  createConferenceInPrgs = false;

  // Peer Contacts
  // Keep here only contacts that joined the conversation
  conversationContactHoldersById: Map<string, ContactDecorator> = new Map();

  // Peer Streams
  streamHoldersById: Map<string, StreamDecorator> = new Map();

  // Recorded Media
  recordingsByMediaId: Map<string, any> = new Map();

  // Authentication Token (JSON or other)
  token: string;

  showToken: boolean = false;

  // Devices handling
  audioInDevices: Array<any>;
  videoDevices: Array<any>;
  // TODO : implement out devices selection
  audioOutDevices: Array<any>;

  selectedAudioInDevice = null;
  selectedVideoDevice = null;

  currentBackground: string | BackgroundImageEvent = 'none';

  selectedVideoQuality: VideoQuality = null;

  uploadProgressPercentage = 0;

  // Convenient FormControl getters
  //
  get meshModeFc(): FormControl {
    return this.conversationAdvancedOptionsFormGroup.get('meshMode') as FormControl;
  }
  get meshOnlyFc(): FormControl {
    return this.conversationAdvancedOptionsFormGroup.get('meshOnly') as FormControl;
  }
  get conversationNameFc(): FormControl {
    return this.conversationFormGroup.get('name') as FormControl;
  }
  get messageFc(): FormControl {
    return this.messageFormGroup.get('message') as FormControl;
  }

  constructor(@Inject(WINDOW) public window: Window,
    private activatedRoute: ActivatedRoute,
    private authServerService: AuthServerService,
    private fb: FormBuilder) {

    console.log("window.location", window.location);
  }

  // Note : beforeUnloadHandler alone does not work on android Chrome
  // seems it requires unloadHandler to do the same to work evrywhere...
  // https://stackoverflow.com/questions/35779372/window-onbeforeunload-doesnt-trigger-on-android-chrome-alt-solution
  //
  @HostListener('window:unload', ['$event'])
  unloadHandler(event) {
    console.log("unloadHandler");
    this.doDestroy();
  }

  // Use BEFORE unload to hangup (works for Firefox at least)
  // This is usefull if user closes the tab, or refreshes the page
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: any) {
    console.log("beforeUnloadHandler");
    this.doDestroy();
  }

  ngOnInit(): void {
    // Get conversation name and base url from current path (pattern : "/path/to/<conversationName>")
    //
    const conversationName = this.activatedRoute.snapshot.paramMap.get("name");
    if (conversationName) {
      this.conversationNameFc.setValue(conversationName);
      const path = `${this.window.location.pathname}`.split('/');
      // remove last element which is the conversationName
      path.pop();
      // and recreate base url
      this.baseUrl = `${this.window.location.origin}` + path.join('/');
    } else {
      // When no conversationName is provided then location.href is the expected url
      // Note : This is important to NOT try using this.baseUrl = `${this.window.location.protocol}//${this.window.location.host}/conversation`;
      // because 1. route can change and 2. this does not work if application is hosted under a path.
      // Note2:  using this.baseUrl = `${this.window.location.href}`;
      // does not work well, because href may contain url paramaters like ?private=true for example.
      //
      this.baseUrl = `${this.window.location.origin}${this.window.location.pathname}`;
    }

    // Build conversation links
    //
    this.buildUrl();

    // Rebuild conversation links when inputs change
    //
    this.conversationNameFc.valueChanges.subscribe(value => {
      this.buildUrl();
    });
    this.apiKeyFc.valueChanges.subscribe(value => {
      this.buildUrl();
    });

    // Handle query parameters
    //
    this.activatedRoute.queryParams.subscribe(params => {
      // Get apiKey (if provided)
      if (params['apiKey']) {
        this.apiKeyFc.setValue(params['apiKey']);
      }
      if (params['private'] && params['private'] === 'true') {
        this.isPrivate = true;
      }
    });

    this.meshModeFc.valueChanges.subscribe(value => {
      // if meshMode is false, meshOnly cannot be true
      if (value === false) {
        this.meshOnlyFc.setValue(false);
      }
    });
    this.meshOnlyFc.valueChanges.subscribe(value => {
      // if meshOnly is true, meshMode must be true too
      if (value === true) {
        this.meshModeFc.setValue(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.doDestroy();
  }

  // --------------------------------------------------------------------------
  // 

  _isPrivate: boolean = false;
  get isPrivate(): boolean {
    return this._isPrivate;
  }
  set isPrivate(value: boolean) {
    this._isPrivate = value;
    this.buildUrl();
  }

  private buildUrl() {
    this.fullUrl = `${this.baseUrl}/${this.conversationNameFc.value}?apiKey=${this.apiKeyFc.value}&private=${this.isPrivate}`;
  }

  private doDestroy(): void {
    this.localCameraStreamsById.forEach((streamHolder: StreamDecorator, key: string) => {
      if (streamHolder.isPublished()) {
        this.unpublishStream(streamHolder);
      }
      this.releaseStream(streamHolder);
    });
    if (this.screenSharingStreamHolder) {
      if (this.screenSharingStreamHolder.isPublished()) {
        this.unpublishScreenSharingStream();
      }
      this.releaseScreenSharingStream();
    }
    if (this.videoStreamHolder) {
      if (this.videoStreamHolder.isPublished()) {
        this.unpublishVideoStream();
      }
      this.releaseVideoStream()
    }
    this.destroyConversation();
  }

  // --------------------------------------------------------------------------
  // ApiRTC UserAgent
  // 
  // This is the main entry to ApiRTC
  //

  createUserAgent() {
    this.userAgent = new apiRTC.UserAgent({
      // format is like 'apzKey:<APIKEY>'
      uri: 'apzkey:' + this.apiKeyFc.value
    });

    console.log('this.userAgent', this.userAgent);

    this.userAgentCreationType = UserAgentCreationType.Key;

    this.doUserAgentBindings();
  }

  createUserAgentWithUsername() {
    this.userAgent = new apiRTC.UserAgent({
      // format is like 'apizee:<USERNAME>'
      uri: 'apizee:' + this.usernameFc.value
    });

    console.log('this.userAgent', this.userAgent);

    this.userAgentCreationType = UserAgentCreationType.Username;

    this.doUserAgentBindings();
  }

  doUserAgentBindings() {
    // Initialize UserData
    // set nickname with default value set for the formControl
    const userData = new apiRTC.UserData();
    userData.setProp(PROPERTY_NICKNAME, this.nicknameFc.value);
    this.userAgent.setUserData(userData);

    this.apiKeyFc.disable();
    this.usernameFc.disable();

    this.nicknameFc.enable();

    // Media device selection handling
    //
    this.userAgent.on("mediaDeviceChanged", () => {
      const mediaDevices = this.userAgent.getUserMediaDevices();
      console.log("mediaDeviceChanged", JSON.stringify(mediaDevices));
      this.doUpdateMediaDevices(mediaDevices);
    });

    this.nicknameFc.valueChanges.subscribe((selectedValue) => {
      console.log("nicknameFc valueChanges:", selectedValue);
      // go through UserData to pass username to peers (do not use username for that purpose)
      this.userAgent.getUserData().setProp(PROPERTY_NICKNAME, selectedValue);
      // TODO : request to fixthis ?
      // setProp does not propagate to peers, have to force it by calling setToSession();
      if (this.session) {
        this.userAgent.getUserData().setToSession();
      }
    });

    // this.meshModeFc.valueChanges.subscribe(value => {
    //   console.log("enableMeshRoomMode", value);
    //   this.userAgent.enableMeshRoomMode(value);
    //   // TODO :
    //   // Thomas L. : pour passer de mesh à SFU 
    //   // (note : que les ressources API sont nommées *MCU*)
    //   // console :
    //   // apiCC.session.apiCCWebRTCClient.webRTCClient.MCUClient.sessionMCUs
    //   // apiCC.session.apiCCWebRTCClient.webRTCClient.MCUClient.enforceMCU()
    //   // TO BE TESTED
    //   // from firefox/chrome, url about:webrtc pour voir les activités webrtc, ICE stats Remote Candidate check IP 94.23.45.109 is one of our SFU
    // });
    // => Commented out to use session.getOrCreateConversation with options.meshModeEnabled
  }

  nullifyUserAgent() {
    this.nicknameFc.disable();

    this.apiKeyFc.enable();
    this.usernameFc.enable();

    this.userAgent = null;
    this.userAgentCreationType = null;
  }

  // --------------------------------------------------------------------------
  // Authentication and registration
  //
  // In order to access 'connected' features of ApiRTC, a session to ApiRTC's servers has to be obtained through register
  //

  registerWithoutAuth() {
    this.registrationError = null;
    this.registerInPrgs = true;

    const options = this.cloudUrlFc.value ? { cloudUrl: this.cloudUrlFc.value } : {};
    console.log('registerWithoutAuth options', options);
    this.userAgent.register(options).then((session: any) => {
      //this.userAgent.register().then((session: any) => {
      this.session = session;
      console.log("Session:", session);

      this.userAgentAuthType = UserAgentAuthType.Guest;

      // Set nickname with username
      this.nicknameFc.setValue(this.userAgent.getUsername());

      this.doListenSessionEvents();
      this.registerInPrgs = false;
      this.registrationError = null;
    }).catch((error: any) => {
      console.log("ConversationComponent::register", error);
      this.registerInPrgs = false;
      this.registrationError = error;
    });
  }

  /**
   * This method is called when user decides to use JSON Web Token authentication.
   * A server request is made to an authentication server that has to provide a JSON Web Token.
   * 
   * ApiRTC cloud plateform has to be configured accordingly.
   * 
   * @param credentials 
   */
  registerWithJWTAuth(credentials: any): void {
    this.registrationError = null;
    this.registerInPrgs = true;

    // store username for further use as a nickname
    this.userAgent.setUsername(credentials.username);

    // Authenticate to get a JWT
    this.authServerService.loginJWToken(credentials.username, credentials.password).subscribe(
      json => {
        console.log("loginJWToken:", json);

        const userId = json.userId;
        const token = json.token;

        // store for display purpose only
        this.token = token;

        this.userAgentAuthType = UserAgentAuthType.JWT;

        this.doRegisterWithRegisterInformation({
          // The id here MUST be the same value as the one provided in JSONWebToken's payload to identify the user
          id: userId,
          token: token
        });
        // registerInPrgs will be set back to false in doRegisterWithRegisterInformation
      },
      error => {
        console.error('ConversationComponent::registerWithJWTAuth', error);
        this.registerInPrgs = false;
        this.registrationError = error;
      });
  }

  /**
   * This method is called when user decides to a 3rd party authentication server.
   * A server request is made to an authentication server that has to provide an authentication token.
   * 
   * ApiRTC cloud plateform has to be configured accordingly.
   * 
   * @param credentials 
   */
  registerWith3rdPartyAuth(credentials: any): void {
    this.registrationError = null;
    this.registerInPrgs = true;

    // store username for further use as a nickname
    this.userAgent.setUsername(credentials.username);

    // Authenticate to get a token
    this.authServerService.loginToken(credentials.username, credentials.password).subscribe(
      json => {
        console.log("do3rdPartyAuth", json);

        const userId = json.userId;
        const token = json.token;

        // store for display purpose only
        this.token = token;

        this.userAgentAuthType = UserAgentAuthType.ThirdParty;

        this.doRegisterWithRegisterInformation({
          // The id here will be used as 'userId' uri parameter in the request made to the auth server
          id: userId,
          token: token
        });
        // registerInPrgs will be set back to false in doRegisterWithRegisterInformation
      },
      error => {
        console.error('ConversationComponent::registerWith3rdPartyAuth', error);
        this.registerInPrgs = false;
        this.registrationError = error;
      });
  }

  registerWithApizeeUserManagement(credentials: any) {

    this.userAgentAuthType = UserAgentAuthType.CloudApiRTC;

    // the username must have already been set on the userAgent
    this.doRegisterWithRegisterInformation({
      password: credentials.password
    });
  }

  // Registration with registerInformation
  doRegisterWithRegisterInformation(registerInformation: Object) {
    this.registrationError = null;
    this.registerInPrgs = true;

    if (this.cloudUrlFc.value) {
      registerInformation['cloudUrl'] = this.cloudUrlFc.value;
    }

    this.userAgent.register(registerInformation).then((session: any) => {
      console.log("userAgent.register", session, this.userAgent);
      this.session = session;

      if (session.getUserData().get(PROPERTY_NICKNAME) !== null) {
        console.log("A nickname is already set", session.getUserData().get(PROPERTY_NICKNAME));
        // If user is managed by cloud.apirtc, a nickname may be present already in UserData.
        this.nicknameFc.setValue(session.getUserData().get(PROPERTY_NICKNAME));
      }
      else {
        // otherwise use the provided username set during authentication phase
        this.nicknameFc.setValue(this.userAgent.getUsername());
      }

      this.doListenSessionEvents();

      this.registerInPrgs = false;
      this.registrationError = null;
    }).catch((error: any) => {
      console.log("Registration error", error);
      this.registerInPrgs = false;
      this.registrationError = error;
    });
  }

  unregister() {
    this.userAgent.unregister();
    this.nicknameFc.setValue(DEFAULT_NICKNAME);
    this.session = null;
    this.token = null;
    this.userAgentAuthType = null;
  }

  // Helper methods
  /*
   * Because apiRTC events of contactJoin may appear AFTER a StreamListChanged with a stream from such contact
  * I need to make sure 
  * Note : how can we make this thread safe ?
  * => a response from stackoverflow seem to indicate there is nothing to worry about
  * Other than HTML5 web workers (which are very tightly controlled and not apparently what you are asking about),
  *  Javascript in the browser is single threaded so regular Javascript programming does not have thread safety issues.
  *  One thread of execution will finish before the next one is started. No two pieces of Javascript are running at exactly the same time.
   */
  getOrCreateContactHolder(contact: any): ContactDecorator {
    const contactId = String(contact.getId());
    if (this.conversationContactHoldersById.has(contactId)) {
      return this.conversationContactHoldersById.get(contactId);
    } else {
      const contactHolder: ContactDecorator = ContactDecorator.build(contact);
      this.conversationContactHoldersById.set(contactHolder.getId(), contactHolder);
      return contactHolder;
    }
  }

  doListenSessionEvents(): void {
    this.session.on('contactListUpdate', (updatedContacts: any) => { //display a list of connected users
      console.log("Session.contactListUpdate", updatedContacts);
      // TODO: should we also prefer this list update rather than contactJoined/Left to handle list of contacts 
      // like we do for streams with streamListChanged ?
      // if (this.conversation !== null) {
      //   let contactList = this.conversation.getContacts();
      //   console.info("contactList  conversation.getContacts() :", contactList);

      // Maintain Map of Contacts per Group
      //
      for (const group of Object.keys(updatedContacts.joinedGroup)) {
        if (!this.contactsByGroup.has(group)) {
          this.contactsByGroup.set(group, new Array());
        }
        for (const contact of updatedContacts.joinedGroup[group]) {
          this.contactsByGroup.get(group).push(contact);
        }
      }
      for (const group of Object.keys(updatedContacts.leftGroup)) {
        if (!this.contactsByGroup.has(group)) {
          this.contactsByGroup.set(group, new Array());
        }
        for (const contact of updatedContacts.leftGroup[group]) {
          this.contactsByGroup.get(group).push(contact);
        }
      }

      for (const contact of updatedContacts.userDataChanged) {
        const contactId = String(contact.getId());

        //const contactHolder: ContactDecorator = this.contactHoldersById.get(contactId); // Fails because 'contactListUpdate' is also fired first when a new contact comes in the Session
        // so we need to actually create the contact and this very moment...
        //const contactHolder: ContactDecorator = this.getOrCreateContactHolder(contact); // not a good idea finaly : my application only wants to see contacts that joined the conversation
        // if this is a creation then it would not be usefull to update, but we do it in case of it was just a get...
        // TODO: but events should be reworked to avoid that kind of trick
        // Finally, just check if we have created this contact already (because it has joined the conversation) and update it. Otherwise just ignore it
        // TODO : Note that we may consider this as a security hole : all client application get notified of users connected with same apiKey
        // but not necessarily having joined the same conversation...
        const contactHolder: ContactDecorator = this.conversationContactHoldersById.get(contactId);
        if (contactHolder) {
          contactHolder.update(contact);
        }
      }
    })
  }

  // --------------------------------------------------------------------------
  // Handle Media device change

  doUpdateMediaDevices(mediaDevices: any): void {
    // Convert map values to array
    this.audioInDevices = Object.values(mediaDevices.audioinput);
    this.audioOutDevices = Object.values(mediaDevices.audiooutput);
    this.videoDevices = Object.values(mediaDevices.videoinput);
  }

  changeLocalStream(streamDecorator: StreamDecorator): void {

    const published = streamDecorator.isPublished();
    const audioMuted = streamDecorator.getStream().isAudioMuted();

    // first, unpublish and release current local stream
    if (published) {
      this.conversation.unpublish(streamDecorator.getStream());
    }
    streamDecorator.getStream().release();

    // Set stream to null in order to destroy the associated component
    streamDecorator.setStream(null);

    // get selected devices
    const options = {};
    if (this.selectedAudioInDevice) {
      options['audioInputId'] = this.selectedAudioInDevice.id;
    }
    if (this.selectedVideoDevice) {
      options['videoInputId'] = this.selectedVideoDevice.id;
    }
    if (this.selectedVideoQuality) {
      options['constraints'] = {
        audio: !audioMuted,
        video: {
          width: { min: QVGA.width, ideal: this.selectedVideoQuality.width },
          height: { min: QVGA.height, ideal: this.selectedVideoQuality.height }
        }
      }
    }

    if (this.currentBackground instanceof BackgroundImageEvent) {
      options['filters'] = [{ type: 'backgroundSubtraction', options: { backgroundMode: 'image', image: this.currentBackground.imageData } }];
    }
    else {
      switch (this.currentBackground) {
        case 'none':
          break;
        case 'blur':
          console.log('blur selected');
          options['filters'] = [{ type: 'backgroundSubtraction', options: { backgroundMode: 'blur' } }];
          break;
        case 'transparent':
          options['filters'] = [{ type: 'backgroundSubtraction', options: { backgroundMode: 'transparent' } }];
          break;
        //case 'image':
        // TODO request for an image  
        //options['filters'][{ type: 'backgroundSubtraction', options: { backgroundMode: 'image', image: imageData } }];
        //console.log("backgroundMode 'image' not implemented");
        //  break;
        default:
          console.log(`Sorry, not a good filter value`);
      }
    }

    // and recreate a new stream
    this.doCreateStream(options)
      .then((stream) => {
        streamDecorator.setStream(stream);
        // if local stream was published consider we should publish changed one
        if (published) {
          this.publishStream(streamDecorator);
        }
      })
      .catch((error: any) => { console.error('doCreateStream error', error); });
  }

  setCapabilitiesOfLocalStream(streamDecorator: StreamDecorator) {
    streamDecorator.getStream().setCapabilities().then(() => {
      // if local stream was published consider we should publish changed one
    }).catch((error: any) => { console.error('createStream error', error); });
  }

  // --------------------------------------------------------------------------
  // Conversation & Conference

  getOrcreateConversation(): void {

    // Create the conversation
    //

    // TODO: Raise a Bug here : we should not have to make a different call to getOrCreateConversation depending
    // on the fact it is private or not, because in case we are a 'get' we shall not know wether the conversation
    // is private (a conference).
    // TODO: handle differently the isPrivate from request parameters and the one set by choice locally. Because in the end
    // we should not need to know this information from the url, we should not know this information at all...
    // I was forced to implement this trick (passing the private=true in url) because ApiRTC api forces to call getOrcreateConversation differently
    //if (this.isPrivate) {
    // WARN getConference is deprecated ! shall I finally be able to have same function for both getOrcreateConversation and createConference ?
    // just making the name different ?
    // Not really because :
    // this.conversation = this.session.getOrCreateConversation(this.conversationNameFc.value);
    // does not work, it actually creates another conversation.
    // the following works (but deprecated, and does not support options - not implemented):
    //this.conversation = this.session.getConference(this.conversationNameFc.value, options);
    // so use the following :
    //  this.conversation = this.session.getOrCreateConversation('Private:' + this.conversationNameFc.value, options);
    //  console.log('Conference', this.conversation, options);
    //} else {
    //  this.conversation = this.session.getOrCreateConversation(this.conversationNameFc.value, options);
    //  console.log('Conversation', this.conversation, options);
    //}

    const options = {
      meshModeEnabled: this.meshModeFc.value,
      meshOnlyEnabled: this.meshOnlyFc.value
    }
    this.conversation = this.session.getOrCreateConversation(this.isPrivate ? 'Private:' + this.conversationNameFc.value : this.conversationNameFc.value, options);
    console.log('Conversation', this.conversation, options);

    this.meshModeFc.disable();
    this.meshOnlyFc.disable();

    // force Urls build
    this.buildUrl();

    this.doListenToConversationEvents();
  }

  /*
  * A Conference is a Conversation with moderation capabilities
  */
  createConference() {
    const enterprise = this.userAgent.getEnterprise();

    console.log("Enterprise", enterprise);
    console.log("Enterprise apiKey", enterprise.getApiKey());

    // use the apiKeyFc to store the apiKey (will be used to create the conversation url)
    this.apiKeyFc.setValue(enterprise.getApiKey());

    this.createConferenceInPrgs = true;

    // PrivateConferenceCreationOptions
    const options = {
      // TODO : check what it does because this does not seem to set the Conversation.name
      // doc says : friendlyName 	string optional: friendly name for this conference to display in Apizee cloud
      friendlyName: this.conversationNameFc.value + '_friendlyName',

      // TODO : I don't think theses are taken into account as of apirtc@4.5.3 (the version in which theses were added for a getOrCreateConversation)
      meshModeEnabled: this.meshModeFc.value,
      meshOnlyEnabled: this.meshOnlyFc.value
    }
    //
    enterprise.createPrivateConference(options).then((conference: any) => {

      console.log("Conference", conference);
      console.log("Conference name", conference.getName());

      this.conversationNameFc.setValue(conference.getName());

      // A Conference is actually a Conversation but with moderation capabilities
      //
      this.conversation = conference;
      this.isPrivate = true;

      this.meshModeFc.disable();
      this.meshOnlyFc.disable();

      // When creating a Conference, the UserAgent is automatically joint
      this.joined = true;
      // When creating a Conference, the UserAgent is a moderator
      this.role = Role.Moderator;

      this.createConferenceInPrgs = false;

      this.doListenToConversationEvents();
    }).catch((error: any) => {
      console.error('createPrivateConference', error);
      this.createConferenceInPrgs = false;
    });

  }

  //TODO : REMOVETHIS : DOES NOT WORK, subsequent join fails
  // 2021-05-17T12:29:57.318Z][ERROR]apiRTC(Conversation) checkAccess() - cannot check access
  // https://cloud.apizee.com/api/v2/conferences/7a3dc7993234907508525829e02f2388:glop/checkAccess
  // {"code":10,"message":"The selected room_name field is invalid.","details":"Parameter room_name"}
  createConference_test_DOESNOTWORK() {
    const enterprise = this.userAgent.getEnterprise();
    console.log("Enterprise apiKey", enterprise.getApiKey());

    // use the apiKeyFc to store the apiKey (will be used to create the conversation url)
    this.apiKeyFc.setValue(enterprise.getApiKey());

    console.log("createConference2", 'Private:' + this.conversationNameFc.value);
    this.conversation = this.session.getOrCreateConversation('Private:' + this.conversationNameFc.value);

    this.role = Role.Moderator;

    this.isPrivate = true;

    this.doListenToConversationEvents();

    this.session.on('conversationJoinRequest', (request: any) => {
      console.log('on:conversationJoinRequest', request);
      this.joinRequestsById.set(request.getId(), request);
    });
  }

  destroyConversation(): void {
    console.info('Destroy conversation');
    if (this.conversation) {
      if (this.joined) {
        this.conversation.leave()
          .then(() => {
            this.joined = false;
            this.conversation.destroy();
            this.conversation = null;
            this.meshModeFc.enable();
            this.meshOnlyFc.enable();
            this.joinRequestsById.clear();
          })
          .catch((error: any) => { console.error('Conversation leave error', error); });
      }
      else {
        this.conversation.destroy();
        this.conversation = null;
        this.meshModeFc.enable();
        this.meshOnlyFc.enable();
        this.joinRequestsById.clear();
      }
    }
  }

  // --------------------------------------------------------------------------
  // Event listeners

  doListenToStreamListChanged() {

    // List of Streams published by peers in the Conversation shall be maintained in the application
    // by listening on streamListChanged event
    //
    this.conversation.on('streamListChanged', (streamInfo: any) => {
      console.log("on:streamListChanged :", streamInfo);

      // The streamListChanged event is usefull to maintain a list of streams published on a conversation.
      // The event carries a streamInfo Object, which is not an actual apiRTC.Stream, that provides information
      // on what actually happened (streamInfo.listEventType : added or removed) to which stream (streamInfo.streamId),
      // and who the streams belongs to (streamInfo.contact).

      const streamId = String(streamInfo.streamId);
      const contactId = String(streamInfo.contact.getId());

      if (streamInfo.isRemote === true) {
        if (streamInfo.listEventType === 'added') {
          console.log('new remote stream', streamId);

          const streamHolder: StreamDecorator = StreamDecorator.build(streamInfo);
          console.log(streamHolder.getId() + "->", streamHolder);
          this.streamHoldersById.set(streamHolder.getId(), streamHolder);
          const contactHolder: ContactDecorator = this.getOrCreateContactHolder(streamInfo.contact);
          console.log("typeof streamInfo.contact.getId()", typeof streamInfo.contact.getId());
          contactHolder.addStream(streamHolder);

        } else if (streamInfo.listEventType === 'removed') {
          console.log('remote stream removed', streamId);

          // TODO : is that mandatory ?
          // this sounds a better reflection to 'added' case but may not be required
          console.log('unsubscribeToStream', streamId);
          this.conversation.unsubscribeToStream(streamId);

          this.streamHoldersById.delete(streamId);
          const contactHolder = this.conversationContactHoldersById.get(contactId);
          contactHolder.removeStream(streamId);
        }
      }
    });

  }

  doListenToStreamEvents() {
    this.conversation.on('streamAdded', (stream: any) => {
      console.log('on:streamAdded:', stream);
      // 'streamAdded' actually means that a stream is published by a peer and thus is ready to be displayed.
      // The event comes with a Stream object that can be attached to DOM
      // TODO : rename this event ?
      //
      // Get our decorator object
      const streamHolder: StreamDecorator = this.streamHoldersById.get(String(stream.getId()));
      // And attach the actual Stream object to it. The corresponding angular component will handle the display.
      streamHolder.setStream(stream);
    }).on('streamRemoved', (stream: any) => {
      console.log('on:streamRemoved:', stream)
      // 'streamRemoved' actually means that a stream is no more readable : either because :
      // - peer left,
      // - or peer decided to unpublish this stream,
      // - or we decided to unsubscribe to this stream. (in which case we won't receive a 'streamListChanged' with listEventType==='removed' event)
      // TODO : rename this event ?
      //
      // Get our object representing to notion of a peer stream and just set its apiRTC stream to null : the
      // component will remove the video tag from the DOM.
      // But we don't remove our object because the associated component may stay there, associated to a contact,
      // with button allowing us to re-subscribe.
      // Our object may only be removed if 'streamListChanged' says it should.
      const streamHolder: StreamDecorator = this.streamHoldersById.get(String(stream.getId()));
      // Warn : our object may already have been removed by 'streamListChanged' handler
      if (streamHolder) {
        streamHolder.setStream(null);
      }

      // REMOVETHIS :
      // for debug only (this function getAvailableStreamList shall be hidden in apiRTC public api)
      console.log("getAvailableStreamList:", this.conversation.getAvailableStreamList());
    })
  }

  doListenToContactsEvents() {
    this.conversation.on('contactJoined', (contact: any) => {
      console.log("on:contactJoined:", contact);
      this.getOrCreateContactHolder(contact);
    }).on('contactLeft', (contact: any) => {
      console.log("on:contactLeft:", contact);
      this.conversationContactHoldersById.delete(contact.getId());
    });
  }

  doListenToMessages() {
    this.conversation.on('message', (message: any) => {
      console.log("on:message:", message);
      this.messages.push(MessageDecorator.build(message));
    });
  }

  doListenToQosStatistics() {

    if ((apiRTC.browser === 'Chrome') || (apiRTC.browser === 'Firefox')) {
      // TODO : safari ??
      this.userAgent.enableCallStatsMonitoring(true, { interval: 10000 });
      this.userAgent.enableActiveSpeakerDetecting(true, { threshold: 50 });
    }

    this.conversation.on('callStatsUpdate', (callStats: any) => {
      console.log("on:callStatsUpdate:", callStats);

      // DONE: waiting for a fix in apiRTC (to include streamId in callStats), workround here by using internal map Conversation#callIdToStreamId:
      // once apiRTC bug https://apizee.atlassian.net/browse/APIRTC-873 is fixed, we can use callStats.streamId instead of erroneous callStats.callId
      //const streamId = String(this.conversation.callIdToStreamId.get(callStats.callId));
      // APIRTC-873 fixed :
      const streamId = String(callStats.streamId);

      if (callStats.stats.videoReceived || callStats.stats.audioReceived) {
        // "received" media is from peer streams
        const streamHolder: StreamDecorator = this.streamHoldersById.get(streamId);
        streamHolder.setQosStat({
          video: callStats.stats.videoReceived,
          audio: callStats.stats.audioReceived
        });
      }
      else if (callStats.stats.videoSent || callStats.stats.audioSent) {

        // "sent" media is from local stream(s) (to peers)
        if (this.streamHoldersById.get(streamId)) {
          console.log("setQosStat on local stream", streamId);
          this.streamHoldersById.get(streamId).setQosStat({
            video: callStats.stats.videoSent,
            audio: callStats.stats.audioSent
          });
        } else if (this.screenSharingStreamHolder && streamId === this.screenSharingStreamHolder.getId()) {
          console.log("setQosStat on screenSharingStreamHolder", streamId);
          this.screenSharingStreamHolder.setQosStat({
            video: callStats.stats.videoSent,
            audio: callStats.stats.audioSent
          });
        } else if (this.videoStreamHolder && streamId === this.videoStreamHolder.getId()) {
          console.log("setQosStat on videoStreamHolder", streamId);
          this.videoStreamHolder.setQosStat({
            video: callStats.stats.videoSent,
            audio: callStats.stats.audioSent
          });
        } else {
          console.error("No local Stream found for", streamId);
        }
      }
    });
  }

  doListenToAudioAmplitude() {
    // For speaker detection
    //
    this.conversation.on('audioAmplitude', (amplitudeInfo: any) => {
      console.log("on:audioAmplitude", amplitudeInfo);

      const streamId: string = String(amplitudeInfo.streamId);
      if (this.streamHoldersById.get(streamId)) {
        // the event streamId is one of the local published streams
        this.streamHoldersById.get(streamId).setSpeaking(amplitudeInfo.descriptor.isSpeaking);
      } else {
        // the event streamId is one of the remote streams
        const streamHolder: StreamDecorator = this.streamHoldersById.get(streamId);
        if (streamHolder) {
          streamHolder.setSpeaking(amplitudeInfo.descriptor.isSpeaking);
        }
      }
    });
  }

  doListenToRecording() {
    this.conversation.on('recordingAvailable', (recordingInfo: any) => {
      console.log("on:recordingAvailable", recordingInfo);
      this.recordingsByMediaId.set(recordingInfo.mediaId, new RecordingInfoDecorator(recordingInfo, true));
    });
  }

  doListenToFileUpload() {
    this.conversation.on('transferBegun', () => {
      this.uploadProgressPercentage = 0;
    });
    this.conversation.on('transferProgress', (progress) => {
      this.uploadProgressPercentage = progress.percentage;
    });
    this.conversation.on('transferEnded', () => {
      this.uploadProgressPercentage = 100;
    });
  }

  doListenToModerationEvents() {
    this.session.on('conversationJoinRequest', (request: any) => {
      console.log('on:conversationJoinRequest', request);
      // TODO : there is a problem here, all Conferences created by users connected with same entreprise will receive this event from all users trying to jon any Conference, 
      // meaning that we shoul filter here, but how ? id ? name ?
      this.joinRequestsById.set(request.getId(), request);
    });
    this.conversation.on('waitingForModeratorAcceptance', (moderator: any) => {
      console.log("on:waitingForModeratorAcceptance", moderator);
      this.moderator = moderator;
      this.waitingForModeratorAcceptance = true;
    }).on('participantEjected', (data: any) => {
      console.log('on:participantEjected', data);
      if (this.role === Role.Default) {
        if (data.self) {
          console.log('User was ejected');
          this.destroyConversation();
        }
      } else if (this.role === Role.Moderator) {
        // Nothing to do here ?, the application on Default Role side shall leave and destroy conversation
        if (data.contact) {
          // TODO
          // Remove Eject button for the user
          //
          //this.contactHoldersById.delete(data.contact.getId());
        }
      }
    });
  }

  doListenToConversationEvents() {

    this.doListenToStreamListChanged();

    this.doListenToStreamEvents();

    this.doListenToContactsEvents();

    this.doListenToMessages();

    this.doListenToQosStatistics();

    this.doListenToAudioAmplitude();

    this.doListenToRecording();

    this.doListenToFileUpload();

    if (this.isPrivate) {
      this.doListenToModerationEvents();
    }
  }

  // --------------------------------------------------------------------------
  // Conversation Join/Leave

  join(): void {
    this.joinError = null;
    this.joinInPrgs = true;
    this.conversation.join()
      .then((response: any) => {
        console.info('Conversation joined', response);
        this.joined = true;
        this.joinInPrgs = false;
      }).catch((error: any) => {
        console.error('Conversation join error', error);
        this.joinInPrgs = false;
        this.joinError = error;
      });
  }

  leave(): void {
    this.joinError = null;
    this.joinInPrgs = true;
    this.conversation.leave()
      .then(() => {
        console.info('Conversation left');
        this.joined = false;
        this.joinInPrgs = false;
        // do not call conversation.destroy() here otherwise you cannot join back !
      })
      .catch((error: any) => {
        console.error('Conversation leave error', error);
        this.joinInPrgs = false;
        this.joinError = error;
      });
  }

  eject(contactHolder: ContactDecorator): void {
    console.info('eject', contactHolder);
    this.conversation.eject(contactHolder.getContact());
  }

  acceptJoinRequest(request: any) {
    request.accept()
      .then(() => {
        console.log('Join request accepted');
        this.doRemoveJoinRequest(request);
      })
      .catch((error: any) => {
        console.error('Request accept error', error);
      });
  }

  declineJoinRequest(request: any) {
    request.decline()
      .then(() => {
        console.log('Join request declined');
        this.doRemoveJoinRequest(request);
      })
      .catch((error: any) => {
        console.error('Request decline error', error);
      });
  }

  doRemoveJoinRequest(request: any) {
    this.joinRequestsById.delete(request.getId());
  }

  // --------------------------------------------------------------------------
  // Conversation Recording

  toggleRecording() {
    this.recordingError = null;
    this.recording = !this.recording;
    console.log("toggleRecord", this.recording);
    if (this.recording) {
      this.conversation.startRecording()
        .then((recordingInfo: any) => {
          console.info('startRecording', recordingInfo);

        })
        .catch((error: any) => {
          console.error('startRecording', error);
          console.error('startRecording', JSON.stringify({ message: error.error.message }));
          this.recordingError = error;
          this.recording = false;
        });
    }
    else {
      this.conversation.stopRecording()
        .then((recordingInfo: any) => {
          console.info('stopRecording', recordingInfo);
          this.recordingsByMediaId.set(recordingInfo.mediaId, new RecordingInfoDecorator(recordingInfo, false));
        })
        .catch((error: any) => {
          console.error('stopRecording', error);
          this.recordingError = error;
        });
    }
  }

  // --------------------------------------------------------------------------
  // Chat messages

  sendMessage() {
    const message = this.messageFc.value;
    this.messageFc.setValue('');
    this.doSendMessage(message);
  }

  doSendMessage(messageContent: string) {
    this.conversation.sendMessage(messageContent).then((uuid: string) => {
      console.log("sendMessage", uuid, messageContent);
      this.messages.push(MessageDecorator.buildLocalMessage(this.userAgent.getUserData().get(PROPERTY_NICKNAME), messageContent));
    })
      .catch((error: any) => { console.error('sendMessage error', error); });
  }

  // --------------------------------------------------------------------------
  // Send Files

  selectedFile: File;
  selectFile(event: any): void {
    const file: File | null = event.target.files.item(0);
    this.selectedFile = file;
  }

  sendFile(): void {
    this.conversation.pushData({ 'file': this.selectedFile })
      .then((cloudMediaInfo: any) => {
        console.log('File uploaded :', cloudMediaInfo);
        // Send file link message to the chat
        this.doSendMessage('New file uploaded: <a href="' + cloudMediaInfo.url + '" target="_blank"><b>OPEN FILE</b></a>');
      })
      .catch((error: any) => {
        console.log('File uploading error :', error);
      });
  }

  // --------------------------------------------------------------------------
  // Streams

  createCameraStream() {
    this.doCreateStream()
      .then((stream) => {
        const streamId = String(stream.getId());
        const streamInfo = { streamId: streamId, isRemote: false, type: 'regular' };
        // build fake streamInfo object to build a local stream.
        // TODO : enhance this in apiRTC
        const streamDecorator = StreamDecorator.build(streamInfo);
        streamDecorator.setStream(stream);
        this.localCameraStreamsById.set(streamId, streamDecorator);
        this.streamHoldersById.set(streamId, streamDecorator);

        // force next asynchronously to let display happen fine
        setTimeout(() => { this.next(); }, 1000);
      })
      .catch((error: any) => { console.error('doCreateStream error', error); });
  }

  // if options are specified, this is because a specific device was selected
  doCreateStream(options?: any): Promise<any> {
    console.log("createStream() with options", options);
    return new Promise((resolve, reject) => {

      //var default_createStreamOptions: any = { enhancedAudioActivated: true }; // => FAILS on chrome
      const default_createStreamOptions: any = {
        constraints: {
          audio: true,
          //video: true
          // or 
          video: {
            width: { min: QVGA.width, ideal: HD.width, max: FHD.width },
            height: { min: QVGA.height, ideal: HD.height, max: FHD.height }
          }
        }
      };

      if (options && !options.constraints) {
        options.constraints = default_createStreamOptions.constraints;
      }

      this.userAgent.createStream(options ? options : default_createStreamOptions)
        .then((stream: any) => {
          console.log('createStream :', stream);
          resolve(stream);
        }).catch((error: any) => {
          console.error('createStream error', error);
          reject(error);
        });
    });
  }

  toggleAudioMute(streamDecorator: StreamDecorator) {
    if (streamDecorator.getStream().isAudioMuted()) {
      streamDecorator.getStream().unmuteAudio();
    }
    else { streamDecorator.getStream().muteAudio(); }
  }

  toggleVideoMute(streamDecorator: StreamDecorator) {
    if (streamDecorator.getStream().isVideoMuted()) {
      streamDecorator.getStream().unmuteVideo();
    }
    else { streamDecorator.getStream().muteVideo(); }
  }

  subscribeOrUnsubscribeToStream(event: StreamSubscribeEvent) {
    console.log("subscribeOrUnsubscribeToStream", event);
    if (event.doSubscribe === true) {
      // SubscribeOptions
      // audioOnly 	Boolean : true if publish is to be done in audio only. Video is used by default
      // videoOnly 	Boolean : true if publish is to be done in video only. Video is used by default, audioOnly parameter is used in priority.
      // turnServerAddress 	String 	 This enables to change the turn server used for the call
      // qos Object QoS preferences.
      // qos.videoForbidInactive 	Boolean Forbids video disabling.
      const subscribeOptions = {
        audioOnly: false // true
      };
      this.conversation.subscribeToStream(event.streamHolder.getId(), subscribeOptions).then((stream: any) => {
        console.log('subscribeToStream success', stream);
      }).catch((error: any) => {
        console.error('subscribeToStream error', error);
      });
    } else {
      this.conversation.unsubscribeToStream(event.streamHolder.getId());
    }
  }

  releaseStream(streamDecorator: StreamDecorator) {
    streamDecorator.getStream().release();
    //streamDecorator = null;
    this.streamHoldersById.delete(streamDecorator.getId());
  }

  publishStream(streamDecorator: StreamDecorator): void {
    const localStream = streamDecorator.getStream();

    console.log("publishStream()", localStream);

    // Publish your own stream to the conversation
    this.publishInPrgs = true;
    this.conversation.publish(localStream).then((stream: any) => {
      console.log("publishStream() published", stream);
      streamDecorator.setPublished(true);
      this.publishInPrgs = false;
    }).catch((error: any) => {
      console.error('publish error', error);
      this.publishInPrgs = false;
    });
  }

  unpublishStream(streamDecorator: StreamDecorator): void {
    const stream = streamDecorator.getStream();
    console.log("unpublishStream()", stream);
    this.conversation.unpublish(streamDecorator.getStream());
    streamDecorator.setPublished(false);
  }

  // Local Camera Streams Carousel handling
  //
  prev() {
    this.activeIndex = ((this.activeIndex === 0 ? this.localCameraStreamsById.size : this.activeIndex) - 1) % this.localCameraStreamsById.size;
  }
  next() {
    if (this.localCameraStreamsById.size) {
      this.activeIndex = 0;
    } else {
      this.activeIndex = (this.activeIndex + 1) % this.localCameraStreamsById.size;
    }
  }
  navTo(index: number) {
    this.activeIndex = index;
  }

  // Stream from video file
  //
  createVideoStream(event: any) {
    // To create a MediaStream from a video file, go through a 'video' DOM element
    //

    // Get file the user selected
    const file: File | null = event.target.files.item(0);

    // Prepare the 'loadeddata' event that will actually create Stream instance
    const videoElement = this.fileVideoRef.nativeElement;
    videoElement.onloadeddata = () => {
      // Note that video handling should be applied after data loaded
      const mediaStream = (apiRTC.browser === 'Firefox') ? videoElement.mozCaptureStream() : videoElement.captureStream();
      apiRTC.Stream.createStreamFromMediaStream(mediaStream)
        .then((stream: any) => {
          const streamInfo = { streamId: String(stream.getId()), isRemote: false, type: 'regular' };
          this.videoStreamHolder = StreamDecorator.build(streamInfo);
          this.videoStreamHolder.setStream(stream);
          console.info('createVideoStream()::createStreamFromMediaStream', stream);
        })
        .catch((error: any) => {
          console.error('createVideoStream()::createStreamFromMediaStream', error);
        });
      // free memory
      URL.revokeObjectURL(videoElement.src);
    };

    // Read from file to 'video' DOM element
    const reader = new FileReader();
    reader.onloadend = (e) => {
      const buffer: ArrayBuffer = e.target.result as ArrayBuffer;
      const videoBlob = new Blob([new Uint8Array(buffer)], { type: 'video/mp4' });
      const url = window.URL.createObjectURL(videoBlob);
      videoElement.src = url;
    };
    reader.readAsArrayBuffer(file);
  }

  togglePublishVideoStream() {
    console.info('togglePublishVideoStream()', this.videoStreamHolder);
    if (this.videoStreamHolder.isPublished()) {
      this.unpublishVideoStream();
    } else {
      this.conversation.publish(this.videoStreamHolder.getStream()).then((stream: any) => {
        this.videoStreamHolder.setPublished(true);
      }).catch((error: any) => {
        console.error('togglePublishVideoStream()::publish', error);
      });
    }
  }

  unpublishVideoStream() {
    this.conversation.unpublish(this.videoStreamHolder.getStream());
    this.videoStreamHolder.setPublished(false);
  }

  releaseVideoStream() {
    this.videoStreamHolder.getStream().release();
    this.videoStreamHolder = null;
  }

  // Screen sharing Stream
  //
  toggleScreenSharing(): void {

    if (this.screenSharingStreamHolder === null) {

      const displayMediaStreamConstraints = {
        video: {
          cursor: "always"
        },
        audio: //false
        { // https://w3c.github.io/mediacapture-screen-share/#displaymediastreamconstraints
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      };

      apiRTC.Stream.createDisplayMediaStream(displayMediaStreamConstraints, false)
        .then((stream: any) => {
          stream.on('stopped', () => {
            // Used to detect when user stop the screenSharing with Chrome DesktopCapture UI
            console.log("screenSharingStream on:stopped");
            if (this.screenSharingStreamHolder.isPublished()) {
              this.unpublishScreenSharingStream();
            }
            this.releaseScreenSharingStream();
          });

          // build fake streamInfo object to build a local stream.
          // TODO : enhance this in apiRTC
          const streamInfo = { streamId: String(stream.getId()), isRemote: false, type: 'regular' };
          this.screenSharingStreamHolder = StreamDecorator.build(streamInfo);
          this.screenSharingStreamHolder.setStream(stream);
          // and publish it
          console.log("toggleScreenSharing()::publish", stream);
          this.conversation.publish(this.screenSharingStreamHolder.getStream()).then((l_stream: any) => {
            console.log("toggleScreenSharing() published", l_stream);
            this.screenSharingStreamHolder.setPublished(true);
          }).catch((error: any) => {
            console.error('toggleScreenSharing()::publish', error);
          });
        })
        .catch(function (error: any) {
          console.error('Could not create screensharing stream :', error);
        });
    } else {
      this.unpublishScreenSharingStream();
      this.releaseScreenSharingStream();
    }
  }

  unpublishScreenSharingStream() {
    this.conversation.unpublish(this.screenSharingStreamHolder.getStream());
    this.screenSharingStreamHolder.setPublished(false);
  }

  releaseScreenSharingStream() {
    this.screenSharingStreamHolder.getStream().release();
    this.screenSharingStreamHolder = null;
  }

  // --------------------------------------------------------------------------
  // Bluetooth

  bluetooth: any = null;
  bluetoothDevice: any = null;
  bluetoothError = null;

  searchBluetooth() {
    const navigatorObject: any = window.navigator;
    if (navigatorObject && navigatorObject.bluetooth) {
      console.log("navigatorObject.bluetooth found");
      const bluetooth = navigatorObject.bluetooth;
      this.bluetooth = bluetooth;
      bluetooth.requestDevice({ acceptAllDevices: true }).then(bluetoothDevice => {
        console.log('searchBlueTooth', bluetoothDevice);
        this.bluetoothDevice = bluetoothDevice;
      });
    } else {
      console.log("navigatorObject.bluetooth NOT found");
      this.bluetoothError = "navigator.bluetooth NOT found, maybe your browser does not support bluetooth : please verify compatibility at https://developer.mozilla.org/en-US/docs/Web/API/Bluetooth"
    }
  }

}