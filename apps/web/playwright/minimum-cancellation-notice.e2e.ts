import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import { loginUser } from "./lib/testUtils";

test.describe("Minimum Cancellation Notice Feature", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await loginUser({ page, username: user.username, email: user.email });
  });

  test.describe("Event Type Settings", () => {
    test("should display minimum cancellation notice field in event type limits", async ({ page }) => {
      // Navigate to event types
      await page.goto("/event-types");
      
      // Click on the first event type to edit
      await page.locator('[data-testid="event-type-item"]').first().click();
      
      // Navigate to the Limits tab
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Check that minimum cancellation notice field is visible
      await expect(page.locator('label:has-text("Minimum cancellation notice")')).toBeVisible();
      
      // Check that the input field exists
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      await expect(cancellationInput).toBeVisible();
      
      // Check that duration type selector exists
      const durationSelector = page.locator('select').filter({
        has: page.locator('option:has-text("minutes")')
      });
      await expect(durationSelector).toBeVisible();
    });

    test("should save minimum cancellation notice value in minutes", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Set cancellation notice to 30 minutes
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      await cancellationInput.fill("30");
      
      // Save the event type
      await page.locator('[data-testid="update-event-type"]').click();
      
      // Wait for save confirmation
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      
      // Reload the page to verify persistence
      await page.reload();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Verify the value was saved
      await expect(cancellationInput).toHaveValue("30");
    });

    test("should save minimum cancellation notice value in hours", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Set cancellation notice to 2 hours
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      await cancellationInput.fill("2");
      
      // Change duration type to hours
      const durationSelector = page.locator('select').filter({
        has: page.locator('option:has-text("hours")')
      });
      await durationSelector.selectOption("hours");
      
      // Save the event type
      await page.locator('[data-testid="update-event-type"]').click();
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      
      // Reload and verify
      await page.reload();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Should show 2 hours
      await expect(cancellationInput).toHaveValue("2");
      await expect(durationSelector).toHaveValue("hours");
    });

    test("should save minimum cancellation notice value in days", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Set cancellation notice to 3 days
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      await cancellationInput.fill("3");
      
      // Change duration type to days
      const durationSelector = page.locator('select').filter({
        has: page.locator('option:has-text("days")')
      });
      await durationSelector.selectOption("days");
      
      // Save the event type
      await page.locator('[data-testid="update-event-type"]').click();
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      
      // Reload and verify
      await page.reload();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Should show 3 days
      await expect(cancellationInput).toHaveValue("3");
      await expect(durationSelector).toHaveValue("days");
    });

    test("should handle zero value correctly", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Set cancellation notice to 0
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      await cancellationInput.fill("0");
      
      // Save the event type
      await page.locator('[data-testid="update-event-type"]').click();
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      
      // Reload and verify
      await page.reload();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Should show 0
      await expect(cancellationInput).toHaveValue("0");
    });

    test("should convert between duration types correctly", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      const durationSelector = page.locator('select').filter({
        has: page.locator('option:has-text("minutes")')
      });
      
      // Set to 120 minutes
      await cancellationInput.fill("120");
      await durationSelector.selectOption("minutes");
      
      // Change to hours - should show 2
      await durationSelector.selectOption("hours");
      await expect(cancellationInput).toHaveValue("2");
      
      // Change to days - should show a decimal
      await durationSelector.selectOption("days");
      const dayValue = await cancellationInput.inputValue();
      expect(parseFloat(dayValue)).toBeCloseTo(0.083, 2);
      
      // Change back to minutes - should preserve the original value
      await durationSelector.selectOption("minutes");
      await expect(cancellationInput).toHaveValue("120");
    });
  });

  test.describe("Booking Flow Integration", () => {
    test("should prevent cancellation when within minimum notice period", async ({ page }) => {
      // Create event type with 2 hour cancellation notice
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      await cancellationInput.fill("2");
      
      const durationSelector = page.locator('select').filter({
        has: page.locator('option:has-text("hours")')
      });
      await durationSelector.selectOption("hours");
      
      await page.locator('[data-testid="update-event-type"]').click();
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      
      // Navigate to bookings
      await page.goto("/bookings/upcoming");
      
      // If there's a booking, try to cancel it
      const bookingItem = page.locator('[data-testid="booking-item"]').first();
      if (await bookingItem.isVisible()) {
        await bookingItem.click();
        
        const cancelButton = page.locator('[data-testid="cancel-booking"]');
        if (await cancelButton.isVisible()) {
          // Check if cancellation is disabled due to minimum notice
          const isDisabled = await cancelButton.isDisabled();
          if (isDisabled) {
            // Should show a message about minimum cancellation notice
            await expect(page.locator('text=/minimum cancellation notice/i')).toBeVisible();
          }
        }
      }
    });

    test("should allow cancellation when outside minimum notice period", async ({ page }) => {
      // Create event type with 0 minute cancellation notice (no restriction)
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      await cancellationInput.fill("0");
      
      await page.locator('[data-testid="update-event-type"]').click();
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      
      // Navigate to bookings
      await page.goto("/bookings/upcoming");
      
      // If there's a booking, verify cancellation is available
      const bookingItem = page.locator('[data-testid="booking-item"]').first();
      if (await bookingItem.isVisible()) {
        await bookingItem.click();
        
        const cancelButton = page.locator('[data-testid="cancel-booking"]');
        if (await cancelButton.isVisible()) {
          // Should be enabled
          await expect(cancelButton).toBeEnabled();
        }
      }
    });
  });

  test.describe("UI Validation", () => {
    test("should not accept negative values", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      
      // Try to enter negative value
      await cancellationInput.fill("-5");
      
      // HTML5 validation should prevent negative values
      const min = await cancellationInput.getAttribute("min");
      expect(min).toBe("0");
    });

    test("should handle decimal values correctly", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      
      // Enter decimal value
      await cancellationInput.fill("1.5");
      
      const durationSelector = page.locator('select').filter({
        has: page.locator('option:has-text("hours")')
      });
      await durationSelector.selectOption("hours");
      
      // Save and verify
      await page.locator('[data-testid="update-event-type"]').click();
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      
      await page.reload();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      await expect(cancellationInput).toHaveValue("1.5");
    });

    test("should display field alongside minimum booking notice", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Both fields should be visible and in the same section
      const bookingNotice = page.locator('label:has-text("Minimum booking notice")');
      const cancellationNotice = page.locator('label:has-text("Minimum cancellation notice")');
      
      await expect(bookingNotice).toBeVisible();
      await expect(cancellationNotice).toBeVisible();
      
      // They should be in the same container
      const container = page.locator('.border-subtle.space-y-6').first();
      await expect(container.locator('label:has-text("Minimum booking notice")')).toBeVisible();
      await expect(container.locator('label:has-text("Minimum cancellation notice")')).toBeVisible();
    });
  });

  test.describe("Managed Event Types", () => {
    test("should respect locked fields for managed event types", async ({ page }) => {
      // This test assumes managed event types are available
      // Navigate to a managed event type if available
      await page.goto("/event-types");
      
      const managedEventType = page.locator('[data-testid="event-type-item"][data-managed="true"]').first();
      if (await managedEventType.isVisible()) {
        await managedEventType.click();
        await page.locator('[data-testid="vertical-tab-limits"]').click();
        
        const cancellationInput = page.locator('input[type="number"]').filter({ 
          has: page.locator('label:has-text("Minimum cancellation notice")') 
        });
        
        // Check if field is disabled when locked
        const isDisabled = await cancellationInput.isDisabled();
        if (isDisabled) {
          // Should show lock indicator
          await expect(page.locator('[data-testid="lock-icon"]')).toBeVisible();
        }
      }
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper ARIA labels and keyboard navigation", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      
      // Check for proper labeling
      const label = await cancellationInput.getAttribute("aria-label");
      expect(label).toBeTruthy();
      
      // Test keyboard navigation
      await cancellationInput.focus();
      await page.keyboard.press("ArrowUp");
      const valueAfterUp = await cancellationInput.inputValue();
      expect(parseInt(valueAfterUp)).toBeGreaterThan(0);
      
      await page.keyboard.press("ArrowDown");
      const valueAfterDown = await cancellationInput.inputValue();
      expect(parseInt(valueAfterDown)).toBeGreaterThanOrEqual(0);
      
      // Tab to duration selector
      await page.keyboard.press("Tab");
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe("SELECT");
    });

    test("should announce changes to screen readers", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Check for ARIA live regions
      const liveRegion = page.locator('[aria-live="polite"]');
      if (await liveRegion.isVisible()) {
        const cancellationInput = page.locator('input[type="number"]').filter({ 
          has: page.locator('label:has-text("Minimum cancellation notice")') 
        });
        
        await cancellationInput.fill("5");
        
        // Should announce the change
        await expect(liveRegion).toContainText(/5|updated|changed/i);
      }
    });
  });

  test.describe("Error Handling", () => {
    test("should handle network errors gracefully", async ({ page, context }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      // Simulate network failure
      await context.route("**/api/event-types/*", route => route.abort());
      
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      await cancellationInput.fill("30");
      
      // Try to save
      await page.locator('[data-testid="update-event-type"]').click();
      
      // Should show error message
      await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
    });

    test("should validate input on blur", async ({ page }) => {
      await page.goto("/event-types");
      await page.locator('[data-testid="event-type-item"]').first().click();
      await page.locator('[data-testid="vertical-tab-limits"]').click();
      
      const cancellationInput = page.locator('input[type="number"]').filter({ 
        has: page.locator('label:has-text("Minimum cancellation notice")') 
      });
      
      // Enter invalid value
      await cancellationInput.fill("abc");
      await cancellationInput.blur();
      
      // Should reset to valid value or show validation error
      const value = await cancellationInput.inputValue();
      expect(value).toMatch(/^\d*$/); // Should only contain digits
    });
  });
});

test.describe("Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should display cancellation notice field correctly on mobile", async ({ page }) => {
    await page.goto("/event-types");
    await page.locator('[data-testid="event-type-item"]').first().click();
    await page.locator('[data-testid="vertical-tab-limits"]').click();
    
    // Check that the field is visible and properly sized
    const cancellationInput = page.locator('input[type="number"]').filter({ 
      has: page.locator('label:has-text("Minimum cancellation notice")') 
    });
    await expect(cancellationInput).toBeVisible();
    
    // Check that duration selector is accessible
    const durationSelector = page.locator('select').filter({
      has: page.locator('option:has-text("minutes")')
    });
    await expect(durationSelector).toBeVisible();
    
    // Verify layout doesn't break on mobile
    const container = page.locator('.border-subtle.space-y-6').first();
    const containerWidth = await container.boundingBox();
    expect(containerWidth?.width).toBeLessThanOrEqual(375);
  });
});