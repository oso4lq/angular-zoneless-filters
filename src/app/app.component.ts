import { Component } from '@angular/core';
import { ZonelessComponent } from './components/zoneless/zoneless.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ZonelessComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'funnels';
}
