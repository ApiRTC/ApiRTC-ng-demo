import { Component, Inject, OnDestroy, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from "@angular/router";

import { WINDOW } from '../../windows-provider';

import { AuthServerService } from '../auth-server.service';

import { ContactDecorator, MessageDecorator, StreamDecorator, RecordingInfoDecorator } from '../model/model.module';

import { StreamSubscribeEvent } from '../stream/stream.component';

import { PROPERTY_NICKNAME } from './../../consts';
const DEFAULT_NICKNAME = '';

import { QVGA, HD, FHD } from '../../consts';

import { fnBrowserDetect, fnDetectMobile } from '../../misc';

import {
  CloudMediaInfo, Contact, Conversation, CreateStreamOptions,
  JoinResult,
  MediaDevice, MediaDeviceList,
  PublishOptions,
  RecordingInfo, RegisterInformation,
  Session, Stream, StreamInfo,
  UserAgent, UserData
} from '@apirtc/apirtc';

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

interface Credentials {
  username: string,
  password: string
}

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.css']
})
export class ConversationComponent implements OnInit, OnDestroy {

  @ViewChild('chatFileInput') chatFileInputRef: ElementRef;

  @ViewChild('fileVideo') fileVideoRef: ElementRef;
  @ViewChild('videoFileInput') videoFileInputRef: ElementRef;

  // FormControl/Group objects
  //
  apiKeyFc: FormControl = new FormControl('myDemoApiKey');

  cloudUrlFc: FormControl = new FormControl('https://cloud.apirtc.com');

  usernameFc: FormControl = new FormControl(null, [Validators.required]);

  userAgentCreationType: UserAgentCreationType;
  userAgentAuthType: UserAgentAuthType;

  // to be used from template
  userAgentCreationTypeEnum = UserAgentCreationType;
  userAgentAuthTypeEnum = UserAgentAuthType;

  nicknameFc: FormControl = new FormControl({ value: DEFAULT_NICKNAME, disabled: true });

  contactsByGroup: Map<string, Set<Contact>> = new Map();

  conversationAdvancedOptionsFormGroup = this.fb.group({
    meshMode: this.fb.control({ value: false, disabled: false }),
    meshOnly: this.fb.control({ value: false, disabled: false }),
    moderation: this.fb.control({ value: false, disabled: false }),
    moderator: this.fb.control({ value: false, disabled: false })
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
  userAgent: UserAgent = null;
  session: Session = null;
  conversation: Conversation = null;

  // Local Streams
  localCameraStreamsById: Map<string, StreamDecorator> = new Map();
  screenSharingStreamHolder: StreamDecorator = null;
  videoStreamHolder: StreamDecorator = null;

  // Template helper attributes
  recording = false;
  recordingError = null;

  registerInPrgs = false;
  registrationError: any = null;

  joinInPrgs = false;
  joinError: any = null;
  joined = false;

  publishInPrgs = false;

  currentFacingMode = undefined;

  browser: string = fnBrowserDetect();
  runningOnMobile: boolean = fnDetectMobile();

  // Peer Contacts
  // Keep here only contacts that joined the conversation
  conversationContactHoldersById: Map<string, ContactDecorator> = new Map();

  candidatesById: Map<string, ContactDecorator> = new Map();

  // Peer Streams
  streamHoldersById: Map<string, StreamDecorator> = new Map();

  // Recorded Media
  recordingsByMediaId: Map<string, RecordingInfoDecorator> = new Map();

  // Authentication Token (JSON or other)
  token: string;

  showToken: boolean = false;

  // Devices handling
  audioInDevices: Array<MediaDevice>;
  videoDevices: Array<MediaDevice>;
  // TODO : implement out devices selection
  audioOutDevices: Array<MediaDevice>;

  selectedAudioInDevice = null;
  selectedVideoDevice = null;

  uploadProgressPercentage = 0;

  // Convenient FormControl getters
  //
  get meshModeFc(): FormControl {
    return this.conversationAdvancedOptionsFormGroup.get('meshMode') as FormControl;
  }
  get meshOnlyFc(): FormControl {
    return this.conversationAdvancedOptionsFormGroup.get('meshOnly') as FormControl;
  }
  get moderationFc(): FormControl {
    return this.conversationAdvancedOptionsFormGroup.get('moderation') as FormControl;
  }
  get moderatorFc(): FormControl {
    return this.conversationAdvancedOptionsFormGroup.get('moderator') as FormControl;
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
  unloadHandler(event: Event) {
    console.log("unloadHandler", event);
    this.doDestroy();
  }

  // Use BEFORE unload to hangup (works for Firefox at least)
  // This is usefull if user closes the tab, or refreshes the page
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: Event) {
    console.log("beforeUnloadHandler", event);
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
      // does not work well, because href may contain url paramaters like ?moderation=true for example.
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
      if (params['moderation'] && params['moderation'] === 'true') {
        this.moderationFc.setValue(true);
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

    this.moderationFc.valueChanges.subscribe(value => {
      // if moderatio is false, moderator shall not be true
      if (value === false) {
        this.moderatorFc.setValue(false);
      }
    });
    this.moderatorFc.valueChanges.subscribe(value => {
      // if moderator is true, moderation shall be true too
      if (value === true) {
        this.moderationFc.setValue(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.doDestroy();
  }

  // --------------------------------------------------------------------------
  //

  private buildUrl() {
    this.fullUrl = `${this.baseUrl}/${this.conversationNameFc.value}?apiKey=${this.apiKeyFc.value}&moderation=${this.moderationFc.value}`;
  }

  private doDestroy(): void {
    this.localCameraStreamsById.forEach((streamHolder: StreamDecorator, key: string) => {
      if (streamHolder.isPublished()) {
        this.unpublishStream(streamHolder);
      }
      this.releaseLocalStream(streamHolder);
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

  private doUnpublishStreams(): void {
    this.localCameraStreamsById.forEach((streamHolder: StreamDecorator, key: string) => {
      if (streamHolder.isPublished()) {
        this.unpublishStream(streamHolder);
      }
    });
    if (this.screenSharingStreamHolder) {
      if (this.screenSharingStreamHolder.isPublished()) {
        this.unpublishScreenSharingStream();
      }
    }
    if (this.videoStreamHolder) {
      if (this.videoStreamHolder.isPublished()) {
        this.unpublishVideoStream();
      }
    }
  }

  // --------------------------------------------------------------------------
  // ApiRTC UserAgent
  // 
  // This is the main entry to ApiRTC
  //

  createUserAgent() {
    this.userAgent = new UserAgent({
      // format is like 'apiKey:<APIKEY>'
      uri: 'apiKey:' + this.apiKeyFc.value
    });

    console.log('this.userAgent', this.userAgent);

    this.userAgentCreationType = UserAgentCreationType.Key;

    this.doUserAgentBindings();
  }

  createUserAgentWithUsername() {
    this.userAgent = new UserAgent({
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
    const userData = new UserData({});
    userData.setProp(PROPERTY_NICKNAME, this.nicknameFc.value);
    this.userAgent.setUserData(userData);

    this.apiKeyFc.disable();
    this.usernameFc.disable();

    this.nicknameFc.enable();

    // Media device selection handling
    //
    this.userAgent.on("mediaDeviceChanged", () => {
      const mediaDevices: MediaDeviceList = this.userAgent.getUserMediaDevices();
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
    this.userAgent.register(options).then((session: Session) => {
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
  registerWithJWTAuth(credentials: Credentials): void {
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
   * @deprecated Prefer JWT authentication (registerWithJWTAuth)
   * 
   * This method is called when user decides to a 3rd party authentication server.
   * A server request is made to an authentication server that has to provide an authentication token.
   * 
   * ApiRTC cloud plateform has to be configured accordingly.
   * 
   * @param credentials 
   */
  registerWith3rdPartyAuth(credentials: Credentials): void {
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

  registerWithApizeeUserManagement(credentials: Credentials) {
    this.userAgentAuthType = UserAgentAuthType.CloudApiRTC;
    // the username must have already been set on the userAgent
    this.doRegisterWithRegisterInformation({
      password: credentials.password
    });
  }

  // Registration with registerInformation
  doRegisterWithRegisterInformation(registerInformation: RegisterInformation) {
    this.registrationError = null;
    this.registerInPrgs = true;

    if (this.cloudUrlFc.value) {
      registerInformation['cloudUrl'] = this.cloudUrlFc.value;
    }

    this.userAgent.register(registerInformation).then((session: Session) => {
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
  getOrCreateContactHolder(contact: Contact): ContactDecorator {
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
          this.contactsByGroup.set(group, new Set());
        }
        for (const contact of updatedContacts.joinedGroup[group]) {
          this.contactsByGroup.get(group).add(contact);
        }
      }
      for (const group of Object.keys(updatedContacts.leftGroup)) {
        if (!this.contactsByGroup.has(group)) {
          this.contactsByGroup.set(group, new Set());
        }
        for (const contact of updatedContacts.leftGroup[group]) {
          this.contactsByGroup.get(group).delete(contact);
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

  doUpdateMediaDevices(mediaDevices: MediaDeviceList): void {
    // Convert map values to array
    this.audioInDevices = Object.values(mediaDevices.audioinput);
    this.audioOutDevices = Object.values(mediaDevices.audiooutput);
    this.videoDevices = Object.values(mediaDevices.videoinput);
  }

  changeLocalStream(streamDecorator: StreamDecorator): void {

    const audioMuted = streamDecorator.getStream().isAudioMuted();

    // first, release current local stream
    const oldStream = streamDecorator.getStream();
    oldStream.release();

    // and even remove from the list (so the component will be destroyed)
    this.localCameraStreamsById.delete(streamDecorator.id);
    this.streamHoldersById.delete(streamDecorator.id);

    // get selected devices
    const options: CreateStreamOptions = {};
    if (this.selectedAudioInDevice) {
      options['audioInputId'] = this.selectedAudioInDevice.id;
    }
    if (this.selectedVideoDevice) {
      options['videoInputId'] = this.selectedVideoDevice.id;
    }

    // and recreate a new stream
    this.doCreateCameraStream(options)
      .then((streamDecorator: StreamDecorator) => {
        // TODO : request a change in apirtc to move replacePublishedStream to conversation directly
        // so that we can hide ConversationCall notion ?
        this.conversation.getConversationCall(oldStream).replacePublishedStream(streamDecorator.getStream())
          .then((stream: Stream) => {
            if (audioMuted) {
              stream.muteAudio()
            }
            streamDecorator.setStream(stream);
            console.info('changeLocalStream done', oldStream, stream);
          });
      })
      .catch((error: any) => { console.error('changeLocalStream->doCreateCameraStream error', error); });
  }

  // --------------------------------------------------------------------------
  // Conversation

  getOrcreateConversation(): void {

    // Create the conversation
    //
    const options = {
      meshModeEnabled: this.meshModeFc.value,
      meshOnlyEnabled: this.meshOnlyFc.value,
      moderationEnabled: this.moderationFc.value,
      moderator: this.moderatorFc.value
    }
    this.conversation = this.session.getOrCreateConversation(this.conversationNameFc.value, options);
    console.log('Conversation', this.conversation, options);

    // To test
    // this.session.subscribeToGroup(this.conversationNameFc.value);
    // this.session.subscribeToGroup("waiting-room-" + this.conversationNameFc.value);

    this.meshModeFc.disable();
    this.meshOnlyFc.disable();
    this.moderationFc.disable();
    this.moderatorFc.disable();

    // force Urls build
    this.buildUrl();

    this.doListenToConversationEvents();
  }

  destroyConversation(): void {
    console.info('Destroy conversation');
    if (this.conversation) {
      if (this.joined) {
        this.conversation.leave()
          .then(() => {
            this.doDestroyConversation();
          })
          .catch((error: any) => {
            console.error('Conversation leave error, force destroy anyways...', error);
            this.doDestroyConversation();
          });
      }
      else {
        this.doDestroyConversation();
      }
    }
  }

  doDestroyConversation(): void {
    this.conversation.destroy();
    this.conversation = null;
    this.joined = false;
    this.meshModeFc.enable();
    this.meshOnlyFc.enable();
    this.moderationFc.enable();
    this.moderatorFc.enable();
  }

  // --------------------------------------------------------------------------
  // Event listeners

  doListenToStreamListChanged() {

    // List of Streams published by peers in the Conversation shall be maintained in the application
    // by listening on streamListChanged event
    //
    this.conversation.on('streamListChanged', (streamInfo: StreamInfo) => {
      console.log("on:streamListChanged :", streamInfo);

      // The streamListChanged event is usefull to maintain a list of streams published on a conversation.
      // The event carries a streamInfo Object, which is not an actual apiRTC.Stream, that provides information
      // on what actually happened (streamInfo.listEventType : added or removed) to which stream (streamInfo.streamId),
      // and who the streams belongs to (streamInfo.contact).

      const streamId = String(streamInfo.streamId);
      console.log("typeof streamInfo.contact.getId()", typeof streamInfo.contact.getId());
      const contactId = String(streamInfo.contact.getId());

      if (streamInfo.isRemote === true) {
        if (streamInfo.listEventType === 'added') {
          console.log('new remote stream', streamId);
          const streamHolder: StreamDecorator = StreamDecorator.buildFromId(streamId);
          console.log(streamHolder.getId() + "->", streamHolder);
          streamHolder.setIsRemote(true);
          this.streamHoldersById.set(streamHolder.getId(), streamHolder);
          const contactHolder: ContactDecorator = this.getOrCreateContactHolder(streamInfo.contact);
          contactHolder.addStream(streamHolder);
        } else if (streamInfo.listEventType === 'removed') {
          console.log('remote stream removed', streamId);

          // this sounds a better reflection to 'added' case but may not be required
          console.log('unsubscribeToStream', streamId);
          this.conversation.unsubscribeToStream(streamId);

          this.streamHoldersById.delete(streamId);

          const contactHolder = this.conversationContactHoldersById.get(contactId);
          // can be not found if user was ejected...
          if (contactHolder) {
            contactHolder.removeStream(streamId);
          }
        }
      }
    });

  }

  doListenToStreamEvents() {
    this.conversation.on('streamAdded', (stream: Stream) => {
      console.log('on:streamAdded:', stream);
      // 'streamAdded' means that a stream published by a peer was subscribed to and media is ready to be displayed.
      // The event comes with a Stream object that can be attached to DOM
      //
      // Get our decorator object
      const streamHolder: StreamDecorator = this.streamHoldersById.get(String(stream.getId()));
      // And attach the actual Stream object to it. The corresponding angular component will handle the display.
      streamHolder.setStream(stream);
    }).on('streamRemoved', (stream: Stream) => {
      console.log('on:streamRemoved:', stream)
      // 'streamRemoved' actually means that a stream is no more readable : either because :
      // - peer left,
      // - or peer decided to unpublish this stream,
      // - or we decided to unsubscribe to this stream. (in which case we won't receive a 'streamListChanged' with listEventType==='removed' event)
      // - a thechnical issue happened and the media is not available
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
    })
  }

  doListenToContactsEvents() {
    this.conversation.on('contactJoined', (contact: Contact) => {
      console.log("on:contactJoined:", contact);
      this.getOrCreateContactHolder(contact);
    }).on('contactLeft', (contact: Contact) => {
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

    if ((this.browser === 'Chrome') || (this.browser === 'Firefox')) {
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
        this.streamHoldersById.get(streamId).setSpeaking(amplitudeInfo.isSpeaking);
      } else {
        // the event streamId is one of the remote streams
        const streamHolder: StreamDecorator = this.streamHoldersById.get(streamId);
        if (streamHolder) {
          streamHolder.setSpeaking(amplitudeInfo.isSpeaking);
        }
      }
    });
  }

  doListenToRecording() {
    this.conversation.on('recordingAvailable', (recordingInfo: RecordingInfo) => {
      console.log("on:recordingAvailable", recordingInfo);
      this.recordingsByMediaId.set(recordingInfo.mediaId, new RecordingInfoDecorator(recordingInfo, true));
    });
  }

  doListenToFileUpload() {
    this.conversation.on('transferBegun', () => {
      this.uploadProgressPercentage = 0;
    });
    this.conversation.on('transferProgress', (progress: any) => {
      this.uploadProgressPercentage = progress.percentage;
    });
    this.conversation.on('transferEnded', () => {
      this.uploadProgressPercentage = 100;
    });
  }

  doListenToModerationEvents() {
    this.conversation.on('contactJoinedWaitingRoom', (contact: Contact) => {
      console.log("on:contactJoinedWaitingRoom", contact);
      // A candidate joined the waiting room.
      const contactHolder: ContactDecorator = ContactDecorator.build(contact);
      this.candidatesById.set(contactHolder.getId(), contactHolder);

    }).on('contactLeftWaitingRoom', (contact: Contact) => {
      console.log("on:contactLeftWaitingRoom", contact);
      // A candidate left the waiting room.
      const contactHolder: ContactDecorator = ContactDecorator.build(contact);
      this.candidatesById.delete(contactHolder.getId());
    });

    this.conversation.on('participantEjected', (data: any) => {
      console.log('on:participantEjected', data);
      if (data.self) {
        console.log('Self participant was ejected');
        this.conversationContactHoldersById.clear();
        this.doUnpublishStreams();
        this.doDestroyConversation();
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

    if (this.moderationFc.value === true) {
      this.doListenToModerationEvents();
    }
  }

  // --------------------------------------------------------------------------
  // Conversation Join/Leave

  join(): void {
    this.joinError = null;
    this.joinInPrgs = true;
    this.conversation.join()
      .then((response: JoinResult) => {
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
    this.conversation.eject(contactHolder.getContact(), { reason: 'a reason' })
      .then(() => {
        console.error("ejected", contactHolder);
        this.conversationContactHoldersById.delete(contactHolder.getId());
      }).catch((error: any) => {
        console.error("eject error", error);
      });
  }

  allowCandidate(contactHolder: ContactDecorator): void {
    this.conversation.allowEntry(contactHolder.getContact());
  }

  denyCandidate(contactHolder: ContactDecorator): void {
    this.conversation.denyEntry(contactHolder.getContact());
  }

  // --------------------------------------------------------------------------
  // Conversation Recording

  toggleRecording() {
    this.recordingError = null;
    this.recording = !this.recording;
    console.log("toggleRecord", this.recording);
    if (this.recording) {
      this.conversation.startRecording()
        .then((recordingInfo: RecordingInfo) => {
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
        .then((recordingInfo: RecordingInfo) => {
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
    this.conversation.sendMessage(messageContent).then((uuid: number) => {
      console.log("sendMessage", uuid, messageContent);
      this.messages.push(MessageDecorator.buildLocalMessage(this.userAgent.getUserData().get(PROPERTY_NICKNAME), messageContent));
    })
      .catch((error: any) => { console.error('sendMessage error', error); });
  }

  // --------------------------------------------------------------------------
  // Send Files

  selectedFile: File;
  selectFile(event: Event): void {
    const file: File | null = (<HTMLInputElement>event.target).files.item(0);
    this.selectedFile = file;
    this.chatFileInputRef.nativeElement.value = "";
  }

  sendFile(): void {
    this.conversation.pushData({ 'file': this.selectedFile })
      .then((cloudMediaInfo: CloudMediaInfo) => {
        console.log('File uploaded :', cloudMediaInfo);
        // Send file link message to the chat
        this.doSendMessage('New file uploaded: <a href="' + cloudMediaInfo.url + '" target="_blank"><b>OPEN FILE</b></a>');
        this.selectedFile = undefined;
      })
      .catch((error: any) => {
        console.log('File uploading error :', error);
      });
  }

  // --------------------------------------------------------------------------
  // Streams

  createCameraStream() {
    this.doCreateCameraStream()
      .then((streamDecorator: StreamDecorator) => {
        // force next asynchronously to let display happen fine
        //setTimeout(() => { this.next(); }, 1000);
      })
      .catch((error: any) => { console.error('doCreateCameraStream error', error); });
  }

  // if options are specified, this is because a specific device was selected
  doCreateCameraStream(options?: CreateStreamOptions): Promise<StreamDecorator> {
    console.log("createStream() with options", options, this.currentFacingMode);
    return new Promise((resolve, reject) => {

      const default_createStreamOptions: CreateStreamOptions = {
        constraints: {
          audio: true,
          //video: true
          // or 
          video: {
            width: { min: QVGA.width, ideal: HD.width, max: FHD.width },
            height: { min: QVGA.height, ideal: HD.height, max: FHD.height },
            // do not force it by default, it would prevent device selection from working fine
            // advanced: [{ facingMode: this.currentFacingMode }] 
          }
        }
      };

      if (this.currentFacingMode) {
        default_createStreamOptions.constraints.video['advanced'] = [{ facingMode: this.currentFacingMode }]
      }

      if (options && !options.constraints) {
        options.constraints = default_createStreamOptions.constraints;
      }

      // options is of type MediaStreamConstraints (https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints) :
      // {
      //   audio : boolean | MediaTrackConstraints (https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)
      //   video : boolean | MediaTrackConstraints
      // }

      this.userAgent.createStream(options ? options : default_createStreamOptions)
        .then((stream: Stream) => {
          console.log('createStream :', stream);
          const streamDecorator = StreamDecorator.build(stream);
          this.localCameraStreamsById.set(streamDecorator.getId(), streamDecorator);
          this.streamHoldersById.set(streamDecorator.getId(), streamDecorator);
          resolve(streamDecorator);
        }).catch((error: any) => {
          console.error('createStream error', error);
          reject(error);
        });
    });
  }

  // methods to handle mute/unmute for remote streams
  //
  handleAudioMute(event: [StreamDecorator, boolean]) {
    console.log("handleAudioMute", event);
    this.doToggleAudioMute(event[0]);
  }
  handleVideoMute(event: [StreamDecorator, boolean]) {
    console.log("handleVideoMute", event);
    this.doToggleVideoMute(event[0]);
  }

  doToggleAudioMute(streamDecorator: StreamDecorator) {
    if (streamDecorator.getStream().isAudioMuted()) {
      streamDecorator.getStream().unmuteAudio();
    }
    else { streamDecorator.getStream().muteAudio(); }
  }

  doToggleVideoMute(streamDecorator: StreamDecorator) {
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
      this.conversation.subscribeToStream(event.streamHolder.getId(), subscribeOptions).then((stream: Stream) => {
        console.log('subscribeToStream success', stream);
      }).catch((error: any) => {
        console.error('subscribeToStream error', error);
      });
    } else {
      this.conversation.unsubscribeToStream(event.streamHolder.getId());
    }
  }

  releaseLocalStream(streamDecorator: StreamDecorator) {
    console.log("releaseLocalStream", streamDecorator);
    streamDecorator.getStream().release();
    this.localCameraStreamsById.delete(streamDecorator.getId());
  }

  publishStream(streamDecorator: StreamDecorator) {
    // https://dev.apirtc.com/reference/global.html#PublishOptions
    const options = {
      qos: {
        videoMinQuality: "medium",
        videoStartQuality: "good"
      },
      audioOnly: false,
      videoOnly: false
    };
    console.log("PublishOptions", options);
    this.doPublishStream(streamDecorator, options);
  }

  doPublishStream(streamDecorator: StreamDecorator, options?: PublishOptions): void {
    const localStream = streamDecorator.getStream();

    console.log("doPublishStream()", localStream);

    // Publish your own stream to the conversation
    this.publishInPrgs = true;
    this.conversation.publish(localStream, options).then((stream: Stream) => {
      console.log("conversation.publish published", stream);
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

  // Stream from video file
  //
  createVideoStream(event: Event) {
    // To create a MediaStream from a video file, go through a 'video' DOM element
    //

    // Get file the user selected
    const file: File | null = (<HTMLInputElement>event.target).files.item(0);

    // Prepare the 'loadeddata' event that will actually create Stream instance
    const videoElement = this.fileVideoRef.nativeElement;
    videoElement.onloadeddata = () => {
      // Note that video handling should be applied after data loaded
      const mediaStream = (this.browser === 'Firefox') ? videoElement.mozCaptureStream() : videoElement.captureStream();
      Stream.createStreamFromMediaStream(mediaStream)
        .then((stream: Stream) => {
          this.videoStreamHolder = StreamDecorator.build(stream);
          console.info('createVideoStream()::createStreamFromMediaStream', stream);
        })
        .catch((error: any) => {
          console.error('createVideoStream()::createStreamFromMediaStream', error);
        });
      // free memory
      URL.revokeObjectURL(videoElement.src);
      this.videoFileInputRef.nativeElement.value = "";
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
      this.conversation.publish(this.videoStreamHolder.getStream()).then((stream: Stream) => {
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

      Stream.createDisplayMediaStream(displayMediaStreamConstraints, false)
        .then((stream: Stream) => {
          stream.on('stopped', () => {
            // Used to detect when user stop the screenSharing with Chrome DesktopCapture UI
            console.log("screenSharingStream on:stopped");
            if (this.screenSharingStreamHolder.isPublished()) {
              this.unpublishScreenSharingStream();
            }
            this.releaseScreenSharingStream();
          });

          this.screenSharingStreamHolder = StreamDecorator.build(stream);

          // and publish it
          console.log("toggleScreenSharing()::publish", stream);
          this.conversation.publish(this.screenSharingStreamHolder.getStream()).then((l_stream: Stream) => {
            console.log("toggleScreenSharing() published", l_stream);
            this.screenSharingStreamHolder.setPublished(true);
          }).catch((error: any) => {
            console.error('toggleScreenSharing()::publish', error);
          });
        })
        .catch((error: any) => {
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