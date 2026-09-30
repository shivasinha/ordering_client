import { generateTranslationKey } from './translation-key-genrator';

describe('generateTranslationKey', () => {
  describe('Basic functionality', () => {
    it('should convert uppercase snake case to camel case with default empty prefix', () => {
      const result = generateTranslationKey('ORDER_STATUS_PENDING');
      expect(result).toBe('OrderStatusPending');
    });

    it('should convert uppercase snake case to camel case with custom prefix', () => {
      const result = generateTranslationKey('ORDER_STATUS_PENDING', 'lbl');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle single word enum values', () => {
      const result = generateTranslationKey('ACTIVE', 'lbl');
      expect(result).toBe('lblActive');
    });

    it('should handle single word enum values without prefix', () => {
      const result = generateTranslationKey('ACTIVE');
      expect(result).toBe('Active');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = generateTranslationKey('', 'lbl');
      expect(result).toBe('lbl');
    });

    it('should handle empty string without prefix', () => {
      const result = generateTranslationKey('');
      expect(result).toBe('');
    });

    it('should handle enum value without underscores', () => {
      const result = generateTranslationKey('PUBLISHED', 'lbl');
      expect(result).toBe('lblPublished');
    });

    it('should handle enum value with multiple underscores', () => {
      const result = generateTranslationKey('TRAIN_RUN_CREATION_PENDING', 'lbl');
      expect(result).toBe('lblTrainRunCreationPending');
    });

    it('should handle lowercase input', () => {
      const result = generateTranslationKey('order_status', 'lbl');
      expect(result).toBe('lblOrderStatus');
    });

    it('should handle mixed case input', () => {
      const result = generateTranslationKey('Order_Status_PENDING', 'lbl');
      expect(result).toBe('lblOrderStatusPending');
    });
  });

  describe('Different prefixes', () => {
    it('should work with different prefixes', () => {
      const result = generateTranslationKey('STATUS_ACTIVE', 'btn');
      expect(result).toBe('btnStatusActive');
    });

    it('should work with numeric prefixes', () => {
      const result = generateTranslationKey('STATUS_ACTIVE', '123');
      expect(result).toBe('123StatusActive');
    });

    it('should work with special character prefixes', () => {
      const result = generateTranslationKey('STATUS_ACTIVE', '_prefix_');
      expect(result).toBe('_prefix_StatusActive');
    });

    it('should handle undefined prefix (should default to empty string)', () => {
      const result = generateTranslationKey('STATUS_ACTIVE', undefined as any);
      expect(result).toBe('StatusActive');
    });

    it('should handle null prefix (should default to empty string)', () => {
      const result = generateTranslationKey('STATUS_ACTIVE', null as any);
      expect(result).toBe('StatusActive');
    });
  });

  describe('Backward compatibility', () => {
    it('should work with old function signature (single parameter)', () => {
      const result = generateTranslationKey('ORDER_STATUS');
      expect(result).toBe('OrderStatus');
    });

    it('should produce the same result as before when prefix is empty', () => {
      const result = generateTranslationKey('ORDER_STATUS_PENDING', '');
      expect(result).toBe('OrderStatusPending');
    });
  });

  describe('Custom separator functionality', () => {
    it('should use default underscore separator when not specified', () => {
      const result = generateTranslationKey('ORDER_STATUS_PENDING', 'lbl');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle custom hyphen separator', () => {
      const result = generateTranslationKey('order-status-pending', 'lbl', '-');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle custom dot separator', () => {
      const result = generateTranslationKey('order.status.pending', 'lbl', '.');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle custom space separator', () => {
      const result = generateTranslationKey('order status pending', 'lbl', ' ');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle custom pipe separator', () => {
      const result = generateTranslationKey('order|status|pending', 'lbl', '|');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle custom colon separator', () => {
      const result = generateTranslationKey('order:status:pending', 'lbl', ':');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle single character with custom separator', () => {
      const result = generateTranslationKey('active', 'lbl', '-');
      expect(result).toBe('lblActive');
    });

    it('should handle empty string with custom separator', () => {
      const result = generateTranslationKey('', 'lbl', '-');
      expect(result).toBe('lbl');
    });

    it('should handle input without custom separator present', () => {
      const result = generateTranslationKey('ORDERSTATUS', 'lbl', '-');
      expect(result).toBe('lblOrderstatus');
    });

    it('should handle multiple consecutive separators', () => {
      const result = generateTranslationKey('order--status--pending', 'lbl', '-');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle separator at the beginning', () => {
      const result = generateTranslationKey('-order-status', 'lbl', '-');
      expect(result).toBe('lblOrderStatus');
    });

    it('should handle separator at the end', () => {
      const result = generateTranslationKey('order-status-', 'lbl', '-');
      expect(result).toBe('lblOrderStatus');
    });

    it('should work without prefix with custom separator', () => {
      const result = generateTranslationKey('order-status-pending', '', '-');
      expect(result).toBe('OrderStatusPending');
    });

    it('should handle mixed case with custom separator', () => {
      const result = generateTranslationKey('Order-Status-PENDING', 'lbl', '-');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle special characters as separators', () => {
      const result = generateTranslationKey('order@status@pending', 'lbl', '@');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle multi-character separator', () => {
      const result = generateTranslationKey('order::status::pending', 'lbl', '::');
      expect(result).toBe('lblOrderStatusPending');
    });

    it('should handle regex special characters as separator', () => {
      const result = generateTranslationKey('order*status*pending', 'lbl', '*');
      expect(result).toBe('lblOrderStatusPending');
    });
  });

  describe('Real world examples with custom separators', () => {
    it('should handle CSS class names with hyphens', () => {
      expect(generateTranslationKey('train-list-item', 'cls', '-')).toBe('clsTrainListItem');
      expect(generateTranslationKey('order-form-field', 'cls', '-')).toBe('clsOrderFormField');
    });

    it('should handle file paths with dots', () => {
      expect(generateTranslationKey('component.service.method', 'fn', '.')).toBe('fnComponentServiceMethod');
      expect(generateTranslationKey('utils.translation.generator', 'fn', '.')).toBe('fnUtilsTranslationGenerator');
    });

    it('should handle API endpoints with slashes', () => {
      expect(generateTranslationKey('api/train/status', 'url', '/')).toBe('urlApiTrainStatus');
      expect(generateTranslationKey('api/order/cancel', 'url', '/')).toBe('urlApiOrderCancel');
    });
  });
});
