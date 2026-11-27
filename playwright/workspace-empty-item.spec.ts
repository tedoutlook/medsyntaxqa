// @ts-check
import {test, expect, type Page} from './base-test';
import {
    answerUnfinishedEdit, captureAlerts, itemBox, itemFrame, linkQueries, openWorkspace, queryBox, target,
    unfinishedEditDialog, waitForItems, workspaceItem,
} from './helpers';

// An empty WORKSPACE item has no query box, but the input of a scope edit (site/scripts/editor/item.js):
// typing does not render, Enter confirms, Escape, Tab or a click outside cancels. Unbalanced brackets or quotes
// show the scope edit's alert and keep the input open.

const query = '(heart OR cardiac) AND lung';

const emptyInput = (page: Page, n: number) => itemFrame(page, n).locator('#dynamic-input.empty-query-input');
const visual = (page: Page, n: number) => itemFrame(page, n).locator('#medsyntax-target1 #search-string');
const cardButton = (page: Page, n: number, name: string) => workspaceItem(page, n).locator(`[data-part=${name}]`);
const editMode = (page: Page) => page.evaluate(() => (window as any).eval('editMode'));

async function typeInEmptyItem(page: Page, n: number, text: string) {
    await emptyInput(page, n).click();
    await emptyInput(page, n).pressSequentially(text);
}

test.describe('WORKSPACE empty item', () => {
    test.beforeEach(async ({page}) => {
        await page.goto('/workspace/');
        await waitForItems(page, 1);
    });

    test('shows the scope edit input instead of the query box', async ({page}) => {
        await expect(emptyInput(page, 0)).toBeVisible();
        await expect(emptyInput(page, 0)).toHaveAttribute('placeholder', 'Enter a query');
        await expect(emptyInput(page, 0)).toHaveValue('');
        await expect(itemBox(page, 0)).toBeHidden();
        await expect(itemFrame(page, 0).getByRole('textbox', {name: 'Query', exact: true})).toBeVisible();
    });

    test('an added item has the input too', async ({page}) => {
        await cardButton(page, 0, 'add').click();
        await waitForItems(page, 2);
        await expect(emptyInput(page, 1)).toBeVisible();
        await expect(itemBox(page, 1)).toBeHidden();
    });

    test('typing does not render; Enter renders the query and stores it in the link', async ({page}) => {
        await typeInEmptyItem(page, 0, query);
        await expect(visual(page, 0)).toHaveCount(0);
        expect(await linkQueries(page)).toEqual(['']);

        await emptyInput(page, 0).press('Enter');
        await expect(itemFrame(page, 0).locator('#dynamic-input')).toHaveCount(0);
        await expect(visual(page, 0).locator('.brackets')).toHaveCount(1);
        await expect.poll(() => linkQueries(page)).toEqual([query]);
        await expect(itemBox(page, 0)).toBeHidden();
        await expect.poll(() => editMode(page)).toBe(false);
    });

    test('Enter with nothing typed keeps the input, focused', async ({page}) => {
        await emptyInput(page, 0).click();
        await emptyInput(page, 0).press('Enter');
        await expect(emptyInput(page, 0)).toBeFocused();
        await expect(emptyInput(page, 0)).toHaveValue('');
        expect(await linkQueries(page)).toEqual(['']);
    });

    for (const key of ['Escape', 'Tab']) {
        test(`${key} cancels: the input is emptied and stays`, async ({page}) => {
            await typeInEmptyItem(page, 0, query);
            await emptyInput(page, 0).press(key);
            await expect(emptyInput(page, 0)).toHaveValue('');
            await expect(emptyInput(page, 0)).not.toBeFocused();
            await expect(itemBox(page, 0)).toBeHidden();
            expect(await linkQueries(page)).toEqual(['']);
            await expect.poll(() => editMode(page)).toBe(false);
        });
    }

    test('a click outside the input, in the item, cancels', async ({page}) => {
        await typeInEmptyItem(page, 0, query);
        await itemFrame(page, 0).locator('body').click({position: {x: 2, y: 2}});
        await expect(emptyInput(page, 0)).toHaveValue('');
        expect(await linkQueries(page)).toEqual(['']);
    });

    for (const [name, text, alert] of [
        ['round brackets', '(heart OR lung', '( or ) bracket error'],
        ['square brackets', 'heart[tiab OR lung', '[ or ] bracket error'],
        ['double quotes', '"heart OR lung', 'number of " error'],
    ]) {
        test(`unbalanced ${name}: an alert, and the input stays open with its text`, async ({page}) => {
            const alerts = captureAlerts(page);
            await typeInEmptyItem(page, 0, text);
            await emptyInput(page, 0).press('Enter');
            await expect.poll(() => alerts.length).toBe(1);
            expect(alerts[0]).toContain(alert);
            await expect(emptyInput(page, 0)).toHaveValue(text);
            await expect(emptyInput(page, 0)).toBeFocused();
            await expect(visual(page, 0)).toHaveCount(0);
            expect(await linkQueries(page)).toEqual(['']);
        });
    }

    test('the Edit button focuses the input', async ({page}) => {
        await cardButton(page, 0, 'edit').click();
        await expect(emptyInput(page, 0)).toBeFocused();
        await expect(itemBox(page, 0)).toBeHidden();
        await expect.poll(() => editMode(page)).toBe(true);
    });

    test('Escape goes to the item, and Enter there goes back to the input', async ({page}) => {
        await emptyInput(page, 0).click();
        await emptyInput(page, 0).press('Escape');
        await expect(itemFrame(page, 0).locator('#item-tree [role=treeitem]').first()).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(emptyInput(page, 0)).toBeFocused();
    });

    test('clearing a query brings the input back', async ({page}) => {
        await typeInEmptyItem(page, 0, query);
        await emptyInput(page, 0).press('Enter');
        await expect(visual(page, 0)).toBeVisible();

        await cardButton(page, 0, 'clear').click();
        await expect(emptyInput(page, 0)).toBeVisible();
        await expect(itemBox(page, 0)).toBeHidden();
        await expect.poll(() => linkQueries(page)).toEqual(['']);
    });

    test('a blank input is not an unfinished edit', async ({page}) => {
        await emptyInput(page, 0).click();
        await cardButton(page, 0, 'add').click();
        await waitForItems(page, 2);
        await expect(unfinishedEditDialog(page)).toBeHidden();
    });

    test('typed text is an unfinished edit: Accept edit enters it, then the button runs', async ({page}) => {
        await typeInEmptyItem(page, 0, query);
        await cardButton(page, 0, 'add').click();
        await answerUnfinishedEdit(page, 'Accept edit', 'Query 1 has an unfinished edit.');
        await waitForItems(page, 2);
        await expect(visual(page, 0).locator('.brackets')).toHaveCount(1);
        await expect.poll(() => linkQueries(page)).toEqual([query, '']);
    });

    test('Discard edit empties the input, then the button runs', async ({page}) => {
        await typeInEmptyItem(page, 0, query);
        await cardButton(page, 0, 'add').click();
        await answerUnfinishedEdit(page, 'Discard edit');
        await waitForItems(page, 2);
        await expect(emptyInput(page, 0)).toHaveValue('');
        await expect.poll(() => linkQueries(page)).toEqual(['', '']);
    });

    test('Keep editing keeps the text, focused', async ({page}) => {
        await typeInEmptyItem(page, 0, query);
        await cardButton(page, 0, 'add').click();
        await answerUnfinishedEdit(page, 'Keep editing');
        await expect(emptyInput(page, 0)).toHaveValue(query);
        await expect(emptyInput(page, 0)).toBeFocused();
        await expect(workspaceItem(page, 1)).toHaveCount(0);
    });

    test('an item with a query has no input, and its Edit still opens the query box', async ({page}) => {
        await openWorkspace(page, [{query}]);
        await expect(emptyInput(page, 0)).toHaveCount(0);
        await cardButton(page, 0, 'edit').click();
        await expect(itemBox(page, 0)).toBeFocused();
    });

    test('emptying the query box keeps the box until it is left', async ({page}) => {
        await openWorkspace(page, [{query}]);
        await cardButton(page, 0, 'edit').click();
        await itemBox(page, 0).fill('');
        await expect(itemBox(page, 0)).toBeVisible();
        await expect(emptyInput(page, 0)).toHaveCount(0);

        await itemBox(page, 0).blur();
        await expect(emptyInput(page, 0)).toBeVisible();
        await expect(itemBox(page, 0)).toBeHidden();
        await expect.poll(() => linkQueries(page)).toEqual(['']);
    });
});

test('the EDITOR opened directly keeps its query box', async ({page}) => {
    await page.goto('/index.html');
    await expect(queryBox(page)).toBeVisible();
    await expect(page.locator('#dynamic-input')).toHaveCount(0);
    await expect(target(page)).toBeEmpty();
});
