## Test Cleanup Guidelines for Ordering Portal

### Common Resource Leak Patterns and Fixes

#### 1. **Subscription Leaks**

**❌ BAD - Causes Memory Leaks:**
```typescript
it('should handle data', () => {
  service.getData().subscribe(data => {
    expect(data).toBeDefined();
  });
});
```

**✅ GOOD - Proper Cleanup:**
```typescript
describe('MyService', () => {
  let subscriptions: Subscription[] = [];

  afterEach(() => {
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];
    jest.clearAllTimers();
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should handle data', () => {
    const subscription = service.getData().subscribe(data => {
      expect(data).toBeDefined();
    });
    subscriptions.push(subscription);
  });
});
```

#### 2. **Component Tests with Observables**

**✅ PATTERN for Component Tests:**
```typescript
describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let subscriptions: Subscription[] = [];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // ... configuration
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Clean up subscriptions
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    // Clean up component-specific resources
    if (component && component.ngOnDestroy) {
      component.ngOnDestroy();
    }

    // Standard cleanup
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();

    if (fixture) {
      fixture.destroy();
    }
  });

  it('should handle async operations', (done) => {
    const subscription = component.someObservable$.subscribe(result => {
      expect(result).toBeDefined();
      done();
    });
    subscriptions.push(subscription);
  });
});
```

#### 3. **BehaviorSubject and Subject Cleanup**

**✅ PATTERN for Components with Subjects:**
```typescript
afterEach(() => {
  // Complete any BehaviorSubjects or Subjects
  if (component && component['mySubject$']) {
    component['mySubject$'].complete();
  }
  if (component && component['dataStream$']) {
    component['dataStream$'].complete();
  }

  // ... rest of cleanup
});
```

#### 4. **Timer and Async Operation Cleanup**

**✅ PATTERN for Tests with Timers:**
```typescript
describe('MyService', () => {
  let activeTimers: number[] = [];

  beforeEach(() => {
    // Mock timers if needed
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clear all active timers
    activeTimers.forEach(timerId => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
    activeTimers = [];

    jest.clearAllTimers();
    jest.useRealTimers();
    // ... rest of cleanup
  });

  it('should handle timer operations', () => {
    const timerId = setTimeout(() => {
      // timer logic
    }, 1000);
    activeTimers.push(timerId);

    jest.advanceTimersByTime(1000);
    // ... assertions
  });
});
```

#### 5. **Using TestCleanup Utility**

**✅ PREFERRED - Using the Utility:**
```typescript
import { TestCleanup } from '../../../test-utils/test-cleanup';

describe('MyService', () => {
  afterEach(() => {
    TestCleanup.cleanup();
  });

  beforeEach(() => {
    TestCleanup.reset();
  });

  it('should handle data', (done) => {
    TestCleanup.subscribe(
      service.getData(),
      data => {
        expect(data).toBeDefined();
        done();
      }
    );
  });
});
```

### Quick Checklist for Test Files

- [ ] Import `Subscription` from 'rxjs'
- [ ] Declare `subscriptions: Subscription[] = []`
- [ ] Track all subscriptions: `subscriptions.push(subscription)`
- [ ] Unsubscribe in `afterEach`
- [ ] Call `jest.clearAllTimers()`
- [ ] Call `jest.clearAllMocks()`
- [ ] Call `TestBed.resetTestingModule()`
- [ ] Complete all BehaviorSubjects/Subjects
- [ ] Destroy fixture: `fixture.destroy()`
- [ ] Clear any manual timers

### Common Anti-Patterns to Avoid

❌ **Don't forget done() in async tests**
❌ **Don't leave subscriptions hanging**
❌ **Don't forget to complete Subjects**
❌ **Don't leave timers running**
❌ **Don't skip TestBed.resetTestingModule()**
❌ **Don't ignore fixture.destroy()**

### Running Tests with Leak Detection

```bash
# CI/CD Pipeline  
yarn test:ci

# Check for leaks
yarn test:leak-check
```
