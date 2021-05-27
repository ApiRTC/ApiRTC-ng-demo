import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ConversationComponent } from './api-rtc/api-rtc.module';

const routes: Routes = [
  { path: 'conversation', component: ConversationComponent },
  { path: 'conversation/:name', component: ConversationComponent },
  { path: '', redirectTo: '/conversation', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
