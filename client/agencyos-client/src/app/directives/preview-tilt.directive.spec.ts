import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreviewTiltDirective } from './preview-tilt.directive';

@Component({
  imports: [PreviewTiltDirective],
  template: `
    <div class="product-preview" appPreviewTilt>
      <div class="product-preview-inner"></div>
    </div>
  `
})
class PreviewTiltHostComponent {}

describe('PreviewTiltDirective', () => {
  let fixture: ComponentFixture<PreviewTiltHostComponent>;
  let preview: HTMLElement;
  let frameCallbacks: Map<number, FrameRequestCallback>;
  let nextFrameId: number;

  beforeEach(async () => {
    frameCallbacks = new Map();
    nextFrameId = 0;

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const frameId = ++nextFrameId;
      frameCallbacks.set(frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (frameId: number) => {
      frameCallbacks.delete(frameId);
    });

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn()
      }))
    });

    await TestBed.configureTestingModule({
      imports: [PreviewTiltHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PreviewTiltHostComponent);
    fixture.detectChanges();

    preview = fixture.nativeElement.querySelector('.product-preview');
    Object.defineProperty(preview, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 100,
        height: 100,
        left: 0,
        right: 200,
        toJSON: () => ({}),
        top: 0,
        width: 200,
        x: 0,
        y: 0
      })
    });

    preview.setPointerCapture = vi.fn();
    preview.hasPointerCapture = vi.fn(() => true);
    preview.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('tilts toward each touched corner and holds the pose on release', () => {
    const cases = [
      { clientX: 0, clientY: 0, rotateXSign: 1, rotateYSign: -1 },
      { clientX: 200, clientY: 0, rotateXSign: 1, rotateYSign: 1 },
      { clientX: 0, clientY: 100, rotateXSign: -1, rotateYSign: -1 },
      { clientX: 200, clientY: 100, rotateXSign: -1, rotateYSign: 1 }
    ];

    for (const testCase of cases) {
      preview.dispatchEvent(createPointerEvent('pointerdown', testCase));
      flushAnimationFrames();

      expect(preview.classList.contains('preview-active')).toBe(true);
      expect(preview.setPointerCapture).toHaveBeenCalledWith(1);
      expect(readRotation('--preview-rotate-x') * testCase.rotateXSign).toBeGreaterThan(4);
      expect(readRotation('--preview-rotate-y') * testCase.rotateYSign).toBeGreaterThan(4);

      preview.dispatchEvent(createPointerEvent('pointerup', testCase));
      flushAnimationFrames();

      expect(preview.classList.contains('preview-active')).toBe(true);
      expect(preview.releasePointerCapture).toHaveBeenCalledWith(1);
      expect(readRotation('--preview-rotate-x') * testCase.rotateXSign).toBeGreaterThan(6.5);
      expect(readRotation('--preview-rotate-y') * testCase.rotateYSign).toBeGreaterThan(6.5);
    }
  });

  it('moves the held touch pose when another part of the preview is tapped', () => {
    preview.dispatchEvent(createPointerEvent('pointerdown', { clientX: 0, clientY: 0 }));
    preview.dispatchEvent(createPointerEvent('pointerup', { clientX: 0, clientY: 0 }));
    flushAnimationFrames();

    expect(readRotation('--preview-rotate-x')).toBeGreaterThan(6.5);
    expect(readRotation('--preview-rotate-y')).toBeLessThan(-6.5);

    preview.dispatchEvent(createPointerEvent('pointerdown', { clientX: 200, clientY: 100 }));
    preview.dispatchEvent(createPointerEvent('pointerup', { clientX: 200, clientY: 100 }));
    flushAnimationFrames();

    expect(preview.classList.contains('preview-active')).toBe(true);
    expect(readRotation('--preview-rotate-x')).toBeLessThan(-6.5);
    expect(readRotation('--preview-rotate-y')).toBeGreaterThan(6.5);
  });

  it('updates the tilt while an active touch pointer moves', () => {
    preview.dispatchEvent(createPointerEvent('pointerdown', { clientX: 100, clientY: 50 }));
    preview.dispatchEvent(createPointerEvent('pointermove', { clientX: 200, clientY: 100 }));
    flushAnimationFrames(24);

    expect(readRotation('--preview-rotate-x')).toBeLessThan(-1);
    expect(readRotation('--preview-rotate-y')).toBeGreaterThan(1);
  });

  it('resets when the active touch pointer is canceled', () => {
    preview.dispatchEvent(createPointerEvent('pointerdown', { clientX: 200, clientY: 100 }));
    preview.dispatchEvent(createPointerEvent('pointercancel', { clientX: 200, clientY: 100 }));
    flushAnimationFrames();

    expect(preview.classList.contains('preview-active')).toBe(false);
    expect(Math.abs(readRotation('--preview-rotate-x'))).toBeLessThan(0.05);
    expect(Math.abs(readRotation('--preview-rotate-y'))).toBeLessThan(0.05);
  });

  function readRotation(propertyName: string): number {
    return Number.parseFloat(preview.style.getPropertyValue(propertyName));
  }

  function flushAnimationFrames(limit = 160): void {
    let frameCount = 0;

    while (frameCallbacks.size > 0 && frameCount < limit) {
      const callbacks = Array.from(frameCallbacks.values());
      frameCallbacks.clear();
      callbacks.forEach((callback) => callback(frameCount * 16));
      frameCount += 1;
    }
  }
});

function createPointerEvent(
  type: string,
  init: { clientX: number; clientY: number; pointerId?: number; pointerType?: string }
): PointerEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;

  Object.defineProperties(event, {
    clientX: { value: init.clientX },
    clientY: { value: init.clientY },
    pointerId: { value: init.pointerId ?? 1 },
    pointerType: { value: init.pointerType ?? 'touch' }
  });

  return event;
}
