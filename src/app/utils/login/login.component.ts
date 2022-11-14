import { Component, Input, Output, EventEmitter } from '@angular/core';

import { UntypedFormBuilder, Validators, UntypedFormControl } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  formGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  @Input() btnText = "Login";

  @Input() set username(username: string) {
    this.usernameFc.setValue(username);
    this.usernameFc.disable();
  }

  @Input() set enable(enable: boolean) {
    if (enable) {
      this.formGroup.enable();
      if (this.usernameFc.value !== '') {
        this.usernameFc.disable();
      }
    } else {
      this.formGroup.disable();
    }
  }

  @Output() credentials = new EventEmitter<Object>();

  constructor(private fb: UntypedFormBuilder) { }

  get usernameFc() {
    return this.formGroup.get('username') as UntypedFormControl;
  }
  get passwordFc() {
    return this.formGroup.get('password') as UntypedFormControl;
  }

  submit() {
    this.credentials.emit({ username: this.usernameFc.value, password: this.passwordFc.value });
  }
}
