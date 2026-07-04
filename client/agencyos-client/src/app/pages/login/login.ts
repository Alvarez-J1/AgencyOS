import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideInfo } from '@lucide/angular';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PreviewTiltDirective } from '../../directives/preview-tilt.directive';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, PreviewTiltDirective, LucideInfo],
  templateUrl: './login.html',
  styleUrls: ['../auth.scss', './login.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  private static readonly DEMO_NOTICE_DELAY_MS = 7000;
  private demoNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  form = {
    email: '',
    password: ''
  };

  submitted = false;
  isLoading = false;
  isDemoLoading = false;
  showDemoNotice = false;
  showPassword = false;
  errorMessage = '';
  passwordPlaceholder = 'Enter your password';

  ngOnInit(): void {
    this.updatePasswordPlaceholder();
  }

  ngOnDestroy(): void {
    this.clearDemoNoticeTimer();
  }

  get emailInvalid(): boolean {
    return this.submitted && (!this.form.email || !this.form.email.includes('@'));
  }

  get passwordInvalid(): boolean {
    return this.submitted && this.form.password.length < 8;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  @HostListener('window:resize')
  updatePasswordPlaceholder(): void {
    const isCompactWidth =
      typeof window !== 'undefined' &&
      (window.matchMedia('(max-width: 332px)').matches ||
        Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth) < 333);

    this.passwordPlaceholder = isCompactWidth ? 'Enter your pass...' : 'Enter your password';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.emailInvalid || this.passwordInvalid) {
      this.errorMessage = 'Please enter a valid email and an 8 character password.';
      return;
    }

    this.isLoading = true;

    this.authService.login(this.form).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  continueWithDemo(): void {
    if (this.isLoading || this.isDemoLoading) {
      return;
    }

    this.errorMessage = '';
    this.isDemoLoading = true;
    this.showDemoNotice = false;

    // Only surface the free-tier "waking up" notice if the request is unusually slow.
    this.demoNoticeTimer = setTimeout(() => {
      if (this.isDemoLoading) {
        this.showDemoNotice = true;
      }
    }, LoginComponent.DEMO_NOTICE_DELAY_MS);

    this.authService.demoLogin().subscribe({
      next: () => {
        this.clearDemoNoticeTimer();
        this.isDemoLoading = false;
        this.showDemoNotice = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        this.clearDemoNoticeTimer();
        this.isDemoLoading = false;
        this.showDemoNotice = false;
        this.errorMessage = error.error?.message || 'Unable to start the demo right now. Please try again.';
      }
    });
  }

  private clearDemoNoticeTimer(): void {
    if (this.demoNoticeTimer !== null) {
      clearTimeout(this.demoNoticeTimer);
      this.demoNoticeTimer = null;
    }
  }
}
