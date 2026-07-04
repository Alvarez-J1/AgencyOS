import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideInfo } from '@lucide/angular';
import { Router, RouterLink } from '@angular/router';

import { PreviewTiltDirective } from '../../directives/preview-tilt.directive';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink, PreviewTiltDirective, LucideInfo],
  templateUrl: './signup.html',
  styleUrls: ['../auth.scss', '../login/login.scss']
})
export class SignupComponent implements OnInit {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  form = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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

  get nameInvalid(): boolean {
    return this.submitted && this.form.name.trim().length < 2;
  }

  get emailInvalid(): boolean {
    return this.submitted && (!this.form.email || !this.form.email.includes('@'));
  }

  get passwordInvalid(): boolean {
    return this.submitted && this.form.password.length < 8;
  }

  get confirmPasswordInvalid(): boolean {
    return this.submitted && this.form.confirmPassword !== this.form.password;
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

    if (this.nameInvalid || this.emailInvalid || this.passwordInvalid || this.confirmPasswordInvalid) {
      this.errorMessage = 'Please fix the highlighted fields before continuing.';
      return;
    }

    this.isLoading = true;

    const { confirmPassword: _confirmPassword, ...signupData } = this.form;

    this.authService.signup(signupData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl('/dashboard');
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Signup failed. Please try again.';
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
        this.router.navigateByUrl('/dashboard');
      },
      error: (error) => {
        this.isDemoLoading = false;
        this.errorMessage = error.error?.message || 'Unable to start the demo right now. Please try again.';
      }
    });
  }
}
