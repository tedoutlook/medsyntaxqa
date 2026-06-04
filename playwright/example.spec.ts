// @ts-check
import {test, expect} from '@playwright/test';

let url = 'file://' + __dirname + '/../index.html';

test('Medsyntax has title', async ({page}) => {
    await page.goto(url);

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Medsyntax/);

    // await page.pause();
});

test('test', async ({page}) => {
    await page.goto(url);
    await page.getByRole('button', {name: 'demo button (click to demo)'}).click();
    await page.getByText('junior', {exact: true}).click();
    await page.locator('#dynamic-input').click();
    await page.locator('#dynamic-input').fill('(medical OR academic OR research OR special OR college OR test value )');
    await page.locator('#dynamic-input').press('Enter');
    await expect(page.locator('#medsyntax')).toContainText('medsyntax: demo button (click to demo) (( librarian* OR "information specialist" OR informationist* OR "information professional" OR "knowledge worker" OR "information scientist*" OR "information services" ) AND ( librar* AND (medical OR academic OR research OR special OR college OR junior )) AND (DE "library orientation" OR DE "learning" OR DE "information services" OR "User education" OR instruct* OR educat* OR orient* OR teach* OR curricul* OR train* OR pedagog* OR tutor* OR lesson* OR lectur* OR learn * OR webinar* ) ) (( librarian* OR "information specialist" OR informationist* OR "information professional" OR "knowledge worker" OR "information scientist*" OR "information services" ) AND ( librar* AND (medical OR academic OR research OR special OR college OR test value ) ) AND (DE "library orientation" OR DE "learning" OR DE "information services" OR "User education" OR instruct* OR educat* OR orient* OR teach* OR curricul* OR train* OR pedagog* OR tutor* OR lesson* OR lectur* OR learn * OR webinar* ) )');

    // await page.pause();
});