import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {GojsAngularModule} from 'gojs-angular';

import {MatButtonModule} from '@angular/material/button';

import {MatMenuModule} from '@angular/material/menu';

import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HttpClientModule} from '@angular/common/http';
import {MatTableModule} from '@angular/material/table';
import {HomeComponent} from "./home/home.component";
import {RouterModule} from "@angular/router";
import {AppRoutingModule} from "./app-routing.module";
import {PlotBComponent} from "./plot-b/plot-b.component";
import {AppComponent} from "./app.component";


@NgModule({
  declarations: [
    HomeComponent,
    PlotBComponent,
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    MatButtonModule,
    BrowserAnimationsModule,
    MatMenuModule,
    GojsAngularModule,
    HttpClientModule,
    MatTableModule,
    RouterModule,
    AppRoutingModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
