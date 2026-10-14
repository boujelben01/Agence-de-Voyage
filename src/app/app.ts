import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './shared/footer/footer.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { ToastComponent } from './shared/toast/toast.component';

@Component({
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastComponent],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
