// @ts-check
import {test, expect} from '@playwright/test';

test('Medsyntax has title', async ({page}) => {
    await page.goto("file://" + __dirname + '/../index.html');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Medsyntax/);
});