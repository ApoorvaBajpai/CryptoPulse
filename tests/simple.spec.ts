import { test, expect } from '@playwright/test';

test('Simple check', async ({ page }) => {
    await page.goto('http://localhost:5174/auth');
    await expect(page.locator('h2')).toContainText(['Login', 'Sign Up']);
});
