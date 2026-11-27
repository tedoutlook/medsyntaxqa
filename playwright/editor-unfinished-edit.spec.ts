// @ts-check
import {test, expect, type Page} from './base-test';
import {answerUnfinishedEdit, captureAlerts, enterQuery, normalise, queryBox, target, unfinishedEditDialog} from './helpers';

// EDITOR opened directly (site/index.html, scripts/editor/unfinished-edit.js): no button runs while a scope edit
// is open. A dialog asks first: Accept edit (as Enter), Discard edit (as a click outside), or Keep editing
// (also Escape). After accept or discard the button runs.

const query = '(heart OR cardiac) AND lung';
const dynamicInput = (page: Page) => page.locator('#dynamic-input');
const copied = async (page: Page) => (await page.evaluate(() => (window as any).copied as string[])).map(normalise);
const query_ = async (page: Page) => normalise(await queryBox(page).inputValue());

async function startEdit(page: Page, text: string) {
    const part = target(page).locator('.term', {hasText: 'cardiac'});
    await part.hover();
    await part.click();
    await expect(dynamicInput(page)).toBeFocused();
    await dynamicInput(page).fill(text);
}

test.describe('EDITOR: a button during a scope edit', () => {
    let alerts: string[] = [];

    test.beforeEach(async ({page}) => {
        // Record clipboard writes instead of using the real clipboard.
        await page.addInitScript(() => {
            (window as any).copied = [];
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {writeText: (text: string) => { (window as any).copied.push(text); return Promise.resolve(); }},
            });
        });
        alerts = captureAlerts(page);
        await page.goto('/index.html');
        await enterQuery(page, query);
    });

    test('without an open edit, a button runs at once', async ({page}) => {
        await page.locator('#copy-query-button').click();
        await expect.poll(() => copied(page)).toEqual([query]);
        await expect(unfinishedEditDialog(page)).toBeHidden();
    });

    test('Accept edit applies the edit, renders it, then runs the button', async ({page}) => {
        await startEdit(page, '(kidney OR renal)');
        await page.locator('#copy-query-button').click();
        expect(await copied(page)).toEqual([]);
        await answerUnfinishedEdit(page, 'Accept edit', 'This query has an unfinished edit.');
        await expect(dynamicInput(page)).toHaveCount(0);
        await expect.poll(() => copied(page)).toEqual(['(kidney OR renal) AND lung']);
        expect(await query_(page)).toBe('(kidney OR renal) AND lung');
        await expect(target(page).locator('.term', {hasText: 'kidney'})).toBeVisible();
        expect(alerts).toEqual([]);
    });

    test('Discard edit renders the query as it was, then runs the button', async ({page}) => {
        await startEdit(page, '(kidney OR renal)');
        await page.locator('#copy-query-button').click();
        await answerUnfinishedEdit(page, 'Discard edit');
        await expect(dynamicInput(page)).toHaveCount(0);
        await expect.poll(() => copied(page)).toEqual([query]);
        await expect(queryBox(page)).toHaveValue(query);
        await expect(target(page).locator('.term', {hasText: 'cardiac'})).toBeVisible();
    });

    for (const how of ['Keep editing', 'Escape'] as const) {
        test(`${how} keeps the edit, focused, and the button does not run`, async ({page}) => {
            await startEdit(page, '(kidney OR renal)');
            await page.locator('#copy-query-button').click();
            if (how === 'Escape') {
                await expect(unfinishedEditDialog(page)).toBeVisible();
                await page.keyboard.press('Escape');
            } else {
                await answerUnfinishedEdit(page, how);
            }
            await expect(unfinishedEditDialog(page)).toBeHidden();
            await expect(dynamicInput(page)).toBeFocused();
            await expect(dynamicInput(page)).toHaveValue('(kidney OR renal)');
            expect(await copied(page)).toEqual([]);
            await page.keyboard.press('Enter');
            await expect.poll(() => query_(page)).toBe('(kidney OR renal) AND lung');
        });
    }

    test('an edit that cannot be accepted alerts, stays open and focused, and the button does not run', async ({page}) => {
        await startEdit(page, '(kidney OR renal');
        await page.locator('#copy-query-button').click();
        await answerUnfinishedEdit(page, 'Accept edit');
        await expect.poll(() => alerts).toEqual(['( or ) bracket error: please fix before pressing Enter']);
        await expect(unfinishedEditDialog(page)).toBeHidden();
        await expect(dynamicInput(page)).toBeFocused();
        expect(await copied(page)).toEqual([]);
        await expect(queryBox(page)).toHaveValue(query);
    });

    test('a button pressed with the keyboard asks too', async ({page}) => {
        await startEdit(page, '(kidney OR renal)');
        await page.locator('#copy-query-button').focus();
        await page.keyboard.press('Enter');
        await answerUnfinishedEdit(page, 'Accept edit');
        await expect.poll(() => copied(page)).toEqual(['(kidney OR renal) AND lung']);
    });

    test('Clear query, after Discard, clears the query', async ({page}) => {
        await startEdit(page, '(kidney OR renal)');
        await page.locator('#clear-button').click();
        await answerUnfinishedEdit(page, 'Discard edit');
        await expect(queryBox(page)).toHaveValue('');
        await expect(target(page)).toHaveText('');
        await expect(dynamicInput(page)).toHaveCount(0);
    });

    test('the menu button, after Accept, opens the menu', async ({page}) => {
        await startEdit(page, '(kidney OR renal)');
        await page.getByRole('button', {name: 'menu'}).click();
        await answerUnfinishedEdit(page, 'Accept edit');
        await expect(page.locator('#myDropdown')).toHaveClass(/show/);
        await expect.poll(() => query_(page)).toBe('(kidney OR renal) AND lung');
    });
});
