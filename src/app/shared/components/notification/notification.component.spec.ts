import { TestBed } from '@angular/core/testing';
import { NotificationComponent } from './notification.component';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { SnackbarContent } from '@Ordering/utils/snackbar';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let snackBarRefMock: Partial<MatSnackBarRef<NotificationComponent>>;
  let snackBarDataMock: SnackbarContent;

  beforeEach(() => {
    snackBarRefMock = {
      dismiss: jest.fn(),
    };

    snackBarDataMock = {
      snackBarMessageData: [{ message: 'Test Message 1' }, { message: 'Test Message 2' }],
    };

    TestBed.configureTestingModule({
      declarations: [],
      imports: [NotificationComponent],
      providers: [
        { provide: MatSnackBarRef, useValue: snackBarRefMock },
        { provide: MAT_SNACK_BAR_DATA, useValue: snackBarDataMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize snackBarData with data from MAT_SNACK_BAR_DATA', () => {
    expect(component.snackBarData).toEqual(snackBarDataMock.snackBarMessageData);
  });

  it('should remove a message and dismiss the snackbar if no messages are left', () => {
    component.removeMessage('Test Message 1');
    expect(component.snackBarData.length).toBe(1);
    expect(component.snackBarData[0].message).toBe('Test Message 2');
    expect(snackBarRefMock.dismiss).not.toHaveBeenCalled();

    component.removeMessage('Test Message 2');
    expect(component.snackBarData.length).toBe(0);
    expect(snackBarRefMock.dismiss).toHaveBeenCalled();
  });

  it('should not remove a message if it does not exist', () => {
    component.removeMessage('Non-existent Message');
    expect(component.snackBarData.length).toBe(2);
    expect(snackBarRefMock.dismiss).not.toHaveBeenCalled();
  });
});
