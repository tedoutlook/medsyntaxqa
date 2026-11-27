// The WORKSPACE: no button runs while an item has a scope edit open. The click waits, and a dialog asks, for
// each open edit from the top down, what to do with it: accept it (as Enter), discard it, or keep editing. Once
// every edit is accepted or discarded the button runs. Keep editing, or an edit that can't be accepted, stops
// there, with the focus in that edit. Loaded before workspace.js, which uses unfinishedEditIsOpen; this file
// uses its items and itemName when a button is clicked.

const unfinishedEditDialog = document.getElementById('unfinished-edit');
let unfinishedEditReplay = null;

function unfinishedEditIsOpen() {
    return unfinishedEditDialog.open;
}

// An empty item always has an input (item.js); only once something is typed in it is it an unfinished edit.
function openScopeEdit(item) {
    const input = item.loaded && item.frame.contentDocument
        && item.frame.contentDocument.getElementById('dynamic-input');
    return Boolean(input) && !(input.classList.contains('empty-query-input') && input.value.trim() === '');
}

// Resolves to the choice: 'accept', 'discard', or '' (Keep editing, or Escape).
function askAboutScopeEdit(item) {
    item.element.scrollIntoView({block: 'nearest'});
    document.getElementById('unfinished-edit-text').textContent =
        'Query ' + itemName(item) + ' has an unfinished edit.';
    unfinishedEditDialog.returnValue = '';
    unfinishedEditDialog.showModal();
    return new Promise((resolve) => unfinishedEditDialog.addEventListener('close', () => {
        resolve(unfinishedEditDialog.returnValue === 'keep' ? '' : unfinishedEditDialog.returnValue);
    }, {once: true}));
}

async function settleScopeEdits(button) {
    for (const item of items.filter(openScopeEdit)) {
        const choice = await askAboutScopeEdit(item);
        // settleScopeEdit (item-keyboard.js) puts the focus back in the edit when it stays open. The edit may
        // have gone in the meantime (the item reloaded).
        if (openScopeEdit(item) && !item.frame.contentWindow.settleScopeEdit(choice)) {
            return;
        }
    }
    if (document.contains(button) && !button.disabled) {
        unfinishedEditReplay = button;
        button.click();
        unfinishedEditReplay = null;
    }
}

// Before every other click handler.
document.addEventListener('click', (event) => {
    const button = event.target.closest && event.target.closest('button');
    if (!button || button === unfinishedEditReplay || button.closest('dialog')
        || typeof items === 'undefined' || !items.some(openScopeEdit)) {
        return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    settleScopeEdits(button);
}, true);
