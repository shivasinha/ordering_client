/* eslint-disable */


import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';

/**
 * Utility class for managing test cleanup to prevent resource leaks
 */
export class TestCleanup {
  private static subscriptions: Subscription[] = [];
  private static timers: number[] = [];

  /**
   * Track a subscription to be automatically cleaned up
   */
  static trackSubscription(subscription: Subscription): void {
    this.subscriptions.push(subscription);
  }

  /**
   * Track a timer to be automatically cleaned up
   */
  static trackTimer(timerId: number): void {
    this.timers.push(timerId);
  }

  /**
   * Perform comprehensive cleanup after each test
   * Call this in your afterEach blocks
   */
  static cleanup(): void {
    // Unsubscribe from all tracked subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        try {
          sub.unsubscribe();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    });
    this.subscriptions = [];

    // Clear all tracked timers
    this.timers.forEach(timerId => {
      try {
        clearTimeout(timerId);
        clearInterval(timerId);
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
    this.timers = [];

    // Clear Jest timers
    jest.clearAllTimers();
    jest.clearAllMocks();

    // Use real timers
    jest.useRealTimers();

    // Reset TestBed
    TestBed.resetTestingModule();

    // Clear storage
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
  }

  /**
   * Helper method to create a subscription and automatically track it
   */
  static subscribe(observable: any, observerOrNext?: any, error?: any, complete?: any): Subscription {
    const subscription = observable.subscribe(observerOrNext, error, complete);
    this.trackSubscription(subscription);
    return subscription;
  }

  /**
   * Reset all tracking arrays (useful for beforeEach)
   */
  static reset(): void {
    this.subscriptions = [];
    this.timers = [];
  }
}

/**
 * Decorator for automatically cleaning up subscriptions in test methods
 */
export function autoCleanup<T extends { new (...args: any[]): {} }>(constructor: T): T {
  return class extends constructor {
    private _testSubscriptions: Subscription[] = [];

    protected trackSubscription(subscription: Subscription): void {
      this._testSubscriptions.push(subscription);
    }

    protected cleanupSubscriptions(): void {
      this._testSubscriptions.forEach(sub => {
        if (sub && !sub.closed) {
          try {
            sub.unsubscribe();
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
      });
      this._testSubscriptions = [];
    }
  };
}

/**
 * Generic afterEach cleanup function that can be used in any test file
 */
export function setupTestCleanup(): void {
  afterEach(() => {
    TestCleanup.cleanup();
  });

  beforeEach(() => {
    TestCleanup.reset();
  });
}
