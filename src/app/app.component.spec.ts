import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { appConfig } from './app.config';
import { AUTH_ACCESS_TOKEN_STORAGE_KEY } from './core/auth/auth.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, 'fixture-token');

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [...appConfig.providers]
    }).compileComponents();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should render a router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
