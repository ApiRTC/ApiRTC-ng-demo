import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { FormBuilder, Validators, FormControl } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  fgroup = this.fb.group({
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
      this.fgroup.enable();
      if (this.usernameFc.value !== '') {
        this.usernameFc.disable();
      }
    } else {
      this.fgroup.disable();
    }
  }

  @Output() credentials = new EventEmitter<Object>();

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {

  }

  get usernameFc() {
    return this.fgroup.get('username') as FormControl;
  }
  get passwordFc() {
    return this.fgroup.get('password') as FormControl;
  }

  submit() {
    this.credentials.emit({ username: this.usernameFc.value, password: this.passwordFc.value });
  }
}
