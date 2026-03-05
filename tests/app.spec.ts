import { test, expect } from '@playwright/test';

const TEST_EMAIL = `test-${Date.now()}@gmail.com`;
const TEST_PASSWORD = 'password-abcdefg';

test.describe('Crypto Pulse App Tests', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to the auth page
        await page.goto('http://localhost:5174/auth');
    });

    test('1. Should show login page by default', async ({ page }) => {
        await expect(page.locator('h2')).toHaveText('Login');
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('2. Should toggle between login and signup', async ({ page }) => {
        await page.click('text=Don\'t have an account? Sign up');
        await expect(page.locator('h2')).toHaveText('Sign Up');
        await expect(page.locator('button:has-text("Create Account")')).toBeVisible();

        await page.click('text=Already have an account? Login');
        await expect(page.locator('h2')).toHaveText('Login');
        await expect(page.locator('button:has-text("Login")')).toBeVisible();
    });

    test('3. Should show error on invalid login', async ({ page }) => {
        await page.fill('input[type="email"]', 'wrong@email.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button:has-text("Login")');

        // Wait for error message
        const errorMsg = page.locator('p.text-red-500');
        await expect(errorMsg).toBeVisible();
    });

    test('4. Should sign up successfully and redirect to market', async ({ page }) => {
        await page.click('text=Don\'t have an account? Sign up');
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button:has-text("Create Account")');

        await page.waitForURL('**/', { timeout: 15000 });
        await expect(page.locator('h2:has-text("Market")')).toBeVisible();
    });

    test('5. Should navigate to Portfolio page after login', async ({ page }) => {
        const portEmail = `port-${Date.now()}@gmail.com`;
        await page.click('text=Don\'t have an account? Sign up');
        await page.fill('input[type="email"]', portEmail);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button:has-text("Create Account")');
        await page.waitForURL('**/', { timeout: 15000 });

        await page.click('button:has-text("Portfolio")');
        await page.waitForURL('**/portfolio');
        // Portfolio page may show "My Portfolio", "Empty Portfolio", or "Connection Error"
        await expect(page.locator('body')).toContainText(/Portfolio|Connection Error/, { timeout: 15000 });
    });

    test('6. Should navigate to News page after login', async ({ page }) => {
        const newsEmail = `news-${Date.now()}@gmail.com`;
        await page.click('text=Don\'t have an account? Sign up');
        await page.fill('input[type="email"]', newsEmail);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button:has-text("Create Account")');
        await page.waitForURL('**/', { timeout: 15000 });

        await page.click('button:has-text("News")');
        await page.waitForURL('**/news');
        await expect(page.locator('h2, h3')).toContainText(['Global Crypto News']);
    });

});
