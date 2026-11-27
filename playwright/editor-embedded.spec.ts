// @ts-check
import {test, expect, type Page} from './base-test';
import {enterQuery, queryBox} from './helpers';

// EDITOR (site/index.html) in embedded mode: the WORKSPACE loads it as
// index.html?ws=<n> in an iframe. Opened directly, the page is its own parent,
// so the messages it posts to its parent arrive in the same page and can be
// recorded.

type Message = {status: string, type: string, payload: unknown};

// The input of an empty item: the input of a scope edit, instead of the query box (item.js).
const emptyInput = (page: Page) => page.locator('#dynamic-input.empty-query-input');

const messages = (page: Page): Promise<Message[]> =>
    page.evaluate(() => (window as any).messages.filter((m: unknown) => typeof m === 'object'));

test.describe('EDITOR embedded mode (?ws=1)', () => {
    test.beforeEach(async ({page}) => {
        await page.addInitScript(() => {
            (window as any).messages = [];
            window.addEventListener('message', (event) => (window as any).messages.push(event.data));
        });
        await page.goto('/index.html?ws=1');
    });

    test('uses the embedded styling', async ({page}) => {
        await expect(page.locator('body')).toHaveClass(/ws-iframe-body/);
        await expect(page.locator('link#iframeCss')).toHaveAttribute('href', './iframe.css');
        // iframe.css hides the menu, the spacing and the manual.
        await expect(page.getByRole('button', {name: 'menu'})).toBeHidden();
        await expect(page.locator('.top-links')).toBeHidden();
        await expect(page.locator('.manual')).toBeHidden();
        await expect(page.locator('.iframe-hide:visible')).toHaveCount(0);
    });

    test('tells the workspace it is not editing when it loads', async ({page}) => {
        await expect.poll(() => messages(page)).toContainEqual(
            {status: 'success', type: 'setEditMode', payload: false});
    });

    test('tells the workspace when the input of the empty item gains and loses focus', async ({page}) => {
        await expect(queryBox(page)).toBeHidden();
        await emptyInput(page).focus();
        await expect.poll(async () => (await messages(page)).at(-1)).toEqual(
            {status: 'success', type: 'setEditMode', payload: true});

        await emptyInput(page).blur();
        await expect.poll(async () => (await messages(page)).at(-1)).toEqual(
            {status: 'success', type: 'setEditMode', payload: false});
    });

    test('sends its link (without ws) to the workspace when the query changes', async ({page}) => {
        await emptyInput(page).fill('heart AND lung');
        await emptyInput(page).press('Enter');

        await expect.poll(async () => (await messages(page)).filter((m) => m.type === 'updateUrl').length)
            .toBeGreaterThan(0);
        const update = (await messages(page)).filter((m) => m.type === 'updateUrl').at(-1)!;
        const [index, queryString] = String(update.payload).split('%index%');
        expect(index).toBe('1');
        const params = new URLSearchParams(queryString);
        expect(params.has('ws')).toBe(false);
        expect(params.get('query')).toBeTruthy();

        // The payload's query restores the same query when opened.
        const restored = await page.context().newPage();
        await restored.goto(`/index.html?${queryString}`);
        await expect(queryBox(restored)).toHaveValue('heart AND lung');
    });

    test('opened without ws it sends no messages', async ({page}) => {
        await page.goto('/index.html');
        await enterQuery(page, 'heart AND lung');
        await page.waitForTimeout(200);
        expect(await messages(page)).toEqual([]);
    });
});
