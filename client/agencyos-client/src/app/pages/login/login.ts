import { Component, HostListener, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
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
  showPassword = false;
  errorMessage = '';
  passwordPlaceholder = 'Enter your password';

  ngOnInit(): void {
    this.updatePasswordPlaceholder();
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

    this.authService.demoLogin().subscribe({
      next: () => {
        this.isDemoLoading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        this.isDemoLoading = false;
        this.errorMessage = error.error?.message || 'Unable to start the demo right now. Please try again.';
      }
    });
  }
}
