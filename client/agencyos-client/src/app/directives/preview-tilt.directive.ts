import { Directive, ElementRef, HostListener, NgZone, OnDestroy, inject } from '@angular/core';

@Directive({
  selector: '[appPreviewTilt]',
  standalone: true
})
export class PreviewTiltDirective implements OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly maxRotationDegrees = 7;
  private readonly touchStartResponse = 0.68;

  private animationFrame = 0;
  private reducedMotion = false;
  private supportsHover = true;
  private activeTouchPointerId: number | null = null;
  private state = {
    hover: 0,
    hoverVelocity: 0,
    targetHover: 0,
    targetX: 0,
    targetY: 0,
    velocityX: 0,
    velocityY: 0,
    x: 0,
    y: 0
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  @HostListener('pointerenter', ['$event'])
  onPointerEnter(event: PointerEvent): void {
    if (!this.canHoverAnimate(event)) {
      return;
    }

    this.state.targetHover = 1;
    this.elementRef.nativeElement.classList.add('preview-active');
    this.startAnimation();
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.canMoveAnimate(event)) {
      return;
    }

    if (this.isActiveTouchPointer(event)) {
      this.preventNativeTouchGesture(event);
    }

    this.updateTargetFromPointer(event);
    this.state.targetHover = 1;
    this.startAnimation();
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    if (!this.canTouchAnimate(event)) {
      return;
    }

    this.preventNativeTouchGesture(event);
    this.activeTouchPointerId = event.pointerId;
    this.capturePointer(event);
    this.updateTargetFromPointer(event);
    this.state.targetHover = 1;
    this.primeTouchTilt();
    this.elementRef.nativeElement.classList.add('preview-active');
    this.startAnimation();
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (!this.isActiveTouchPointer(event)) {
      return;
    }

    this.preventNativeTouchGesture(event);
    this.releasePointer(event.pointerId);
    this.activeTouchPointerId = null;
    this.state.targetHover = 1;
    this.elementRef.nativeElement.classList.add('preview-active');
    this.startAnimation();
  }

  @HostListener('pointerleave', ['$event'])
  onPointerLeave(event: PointerEvent): void {
    if (!this.canHoverAnimate(event)) {
      return;
    }

    this.resetPreview();
  }

  @HostListener('pointercancel', ['$event'])
  onPointerCancel(event: PointerEvent): void {
    if (this.activeTouchPointerId !== null && this.activeTouchPointerId !== event.pointerId) {
      return;
    }

    this.releasePointer(event.pointerId);
    this.activeTouchPointerId = null;
    this.resetPreview();
  }

  private resetPreview(): void {
    this.state.targetX = 0;
    this.state.targetY = 0;
    this.state.targetHover = 0;
    this.elementRef.nativeElement.classList.remove('preview-active');
    this.startAnimation();
  }

  private canHoverAnimate(event: PointerEvent): boolean {
    return !this.reducedMotion && this.supportsHover && event.pointerType === 'mouse';
  }

  private canTouchAnimate(event: PointerEvent): boolean {
    return !this.reducedMotion && (event.pointerType === 'touch' || event.pointerType === 'pen');
  }

  private canMoveAnimate(event: PointerEvent): boolean {
    if (this.reducedMotion) {
      return false;
    }

    if (this.canHoverAnimate(event)) {
      return true;
    }

    return this.activeTouchPointerId === event.pointerId;
  }

  private isActiveTouchPointer(event: PointerEvent): boolean {
    return this.activeTouchPointerId === event.pointerId && this.canTouchAnimate(event);
  }

  private updateTargetFromPointer(event: PointerEvent): void {
    const bounds = this.elementRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    this.state.targetX = this.clamp((x - 0.5) * 2, -1, 1);
    this.state.targetY = this.clamp((y - 0.5) * 2, -1, 1);
  }

  private primeTouchTilt(): void {
    this.state.velocityX = 0;
    this.state.velocityY = 0;
    this.state.hoverVelocity = 0;
    this.state.x += (this.state.targetX - this.state.x) * this.touchStartResponse;
    this.state.y += (this.state.targetY - this.state.y) * this.touchStartResponse;
    this.state.hover = Math.max(this.state.hover, this.touchStartResponse);
    this.applyStyles();
  }

  private capturePointer(event: PointerEvent): void {
    const element = this.elementRef.nativeElement;

    if (typeof element.setPointerCapture !== 'function') {
      return;
    }

    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // The browser may reject capture if the pointer has already ended.
    }
  }

  private releasePointer(pointerId: number): void {
    const element = this.elementRef.nativeElement;

    if (typeof element.releasePointerCapture !== 'function') {
      return;
    }

    try {
      if (typeof element.hasPointerCapture !== 'function' || element.hasPointerCapture(pointerId)) {
        element.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore stale pointer ids from canceled touch interactions.
    }
  }

  private preventNativeTouchGesture(event: PointerEvent): void {
    if (event.cancelable) {
      event.preventDefault();
    }
  }

  private startAnimation(): void {
    if (this.animationFrame || this.reducedMotion) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.animationFrame = requestAnimationFrame(this.animate);
    });
  }

  private readonly animate = (): void => {
    const spring = 0.13;
    const damping = 0.78;
    const hoverSpring = 0.12;
    const hoverDamping = 0.8;

    this.state.velocityX = (this.state.velocityX + (this.state.targetX - this.state.x) * spring) * damping;
    this.state.velocityY = (this.state.velocityY + (this.state.targetY - this.state.y) * spring) * damping;
    this.state.hoverVelocity =
      (this.state.hoverVelocity + (this.state.targetHover - this.state.hover) * hoverSpring) * hoverDamping;

    this.state.x += this.state.velocityX;
    this.state.y += this.state.velocityY;
    this.state.hover += this.state.hoverVelocity;

    this.applyStyles();

    if (this.isSettled()) {
      this.animationFrame = 0;
      return;
    }

    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private applyStyles(): void {
    const element = this.elementRef.nativeElement;
    const x = this.state.x;
    const y = this.state.y;
    const hover = this.clamp(this.state.hover, 0, 1);

    element.style.setProperty('--preview-rotate-x', `${(-y * this.maxRotationDegrees).toFixed(3)}deg`);
    element.style.setProperty('--preview-rotate-y', `${(x * this.maxRotationDegrees).toFixed(3)}deg`);
    element.style.setProperty('--preview-scale', (1 + hover * 0.015).toFixed(4));
    element.style.setProperty('--preview-image-x', `${(x * 4).toFixed(2)}px`);
    element.style.setProperty('--preview-image-y', `${(y * 3).toFixed(2)}px`);
    element.style.setProperty('--preview-glow-x', `${(x * 26).toFixed(2)}px`);
    element.style.setProperty('--preview-glow-y', `${(y * 20).toFixed(2)}px`);
    element.style.setProperty('--preview-glow-opacity', (0.52 + hover * 0.2).toFixed(3));
  }

  private isSettled(): boolean {
    return (
      Math.abs(this.state.targetX - this.state.x) < 0.001 &&
      Math.abs(this.state.targetY - this.state.y) < 0.001 &&
      Math.abs(this.state.targetHover - this.state.hover) < 0.001 &&
      Math.abs(this.state.velocityX) < 0.001 &&
      Math.abs(this.state.velocityY) < 0.001 &&
      Math.abs(this.state.hoverVelocity) < 0.001
    );
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
