import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

export { ContactDecorator } from './contact-decorator';
export { MessageDecorator } from './message-decorator';
export { StreamDecorator } from './stream-decorator';
export { RecordingInfoDecorator } from './recording-info-decorator';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ]
})
export class ModelModule { }
