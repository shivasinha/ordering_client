import { TestBed } from '@angular/core/testing';
import { OrderItemHandlingService } from './order-item-handling.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';

describe('OrderItemHandlingService', () => {
  let service: OrderItemHandlingService;
  let orderActionsServiceMock: any;
  let notificationServiceMock: any;
  let translationsServiceMock: any;

  beforeEach(() => {
    orderActionsServiceMock = {
      currentlySelectedOrderSig: jest.fn(),
    };
    notificationServiceMock = {
      pushNotification: jest.fn(),
    };
    translationsServiceMock = {
      translate: jest.fn().mockReturnValue('translated message'),
    };

    TestBed.configureTestingModule({
      providers: [
        OrderItemHandlingService,
        { provide: OrderActionsService, useValue: orderActionsServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
      ],
    });

    service = TestBed.inject(OrderItemHandlingService);
  });

  describe('triggerRowHighlight', () => {
    it('should highlight rows with missing fields and push notifications', () => {
      const orderItems = [
        {
          content: {
            item: { trainNumber: '123', operatingCompany: '', operatingDays: [], stops: null },
          },
        },
        {
          content: {
            item: {
              trainNumber: '456',
              operatingCompany: 'XYZ',
              operatingDays: { beginDate: '', daysBitmap: '' },
              stops: ['stop1', 'stop2'],
            },
          },
        },
      ];
      orderActionsServiceMock.currentlySelectedOrderSig.mockReturnValue({ orderItems });

      service.triggerRowHighlight();

      expect(service.missingFieldsCache.get('123')).toEqual(['operatingCompany', 'operatingDays', 'stops']);
      expect(service.missingFieldsCache.get('456')).toEqual([]);
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith(
        '123: translated message - operatingCompany, operatingDays, stops',
        expect.anything(),
      );
      expect(service.highlightIncompleteRowsSig()).toBe(true);
    });

    it('should not highlight rows if no fields are missing', () => {
      const orderItems = [
        {
          content: {
            item: {
              trainNumber: '123',
              operatingCompany: 'XYZ',
              operatingDays: { beginDate: '', daysBitmap: '' },
              stops: ['stop1', 'stop2'],
            },
          },
        },
      ];
      orderActionsServiceMock.currentlySelectedOrderSig.mockReturnValue({ orderItems });

      service.triggerRowHighlight();

      expect(service.missingFieldsCache.get('123')).toEqual([]);
      expect(notificationServiceMock.pushNotification).not.toHaveBeenCalled();
      expect(service.highlightIncompleteRowsSig()).toBe(false);
    });

    it('should handle case when no order items are present', () => {
      orderActionsServiceMock.currentlySelectedOrderSig.mockReturnValue({ orderItems: [] });

      service.triggerRowHighlight();

      expect(service.missingFieldsCache.size).toBe(0);
      expect(notificationServiceMock.pushNotification).not.toHaveBeenCalled();
      expect(service.highlightIncompleteRowsSig()).toBe(false);
    });
  });

  describe('getMissingFields', () => {
    it('should return an array of missing fields', () => {
      const orderItem = {
        trainNumber: '',
        operatingCompany: 'XYZ',
        operatingDays: [],
        stops: null,
      };
      const missingFields = service.getMissingFields(orderItem);
      expect(missingFields).toEqual(['trainNumber', 'operatingDays', 'stops']);
    });

    it('should return an empty array if no fields are missing', () => {
      const orderItem = {
        trainNumber: '12345',
        operatingCompany: 'XYZ',
        operatingDays: { beginDate: '', daysBitmap: '' },
        stops: ['stop1', 'stop2'],
      };
      const missingFields = service.getMissingFields(orderItem);
      expect(missingFields).toEqual([]);
    });

    it('should handle partial order items', () => {
      const orderItem = {
        trainNumber: '12345',
      };
      const missingFields = service.getMissingFields(orderItem);
      expect(missingFields).toEqual(['operatingCompany', 'operatingDays', 'stops']);
    });
  });
});
