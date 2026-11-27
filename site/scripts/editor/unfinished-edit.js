// An EDITOR opened directly: no button runs while a scope edit is open. The click waits, and a dialog asks
// what to do with the edit: accept it (as Enter), discard it (as a click outside), or keep editing. After
// accept or discard the button runs. In the WORKSPACE (ws) the WORKSPACE asks, for all its items.

(function () {
    if (ws) {
        return;
    }
    const dialog = document.getElementById('unfinished-edit');
    let waitingButton = null;
    let replayedButton = null;

    function focusScopeEdit() {
        const input = document.getElementById('dynamic-input');
        if (input) {
            input.focus();
        }
    }

    function runButton(button) {
        replayedButton = button;
        button.click();
        replayedButton = null;
    }

    // Before every other click handler, also the inline onclick of the button.
    document.addEventListener('click', (event) => {
        const button = event.target.closest && event.target.closest('button');
        if (!button || button === replayedButton || dialog.contains(button)
            || !document.getElementById('dynamic-input')) {
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        waitingButton = button;
        dialog.returnValue = '';
        dialog.showModal();
    }, true);

    // The choice is the value of the button that closed it; Escape leaves it empty: keep editing.
    dialog.addEventListener('close', () => {
        const button = waitingButton;
        waitingButton = null;
        if (dialog.returnValue === 'accept') {
            onEnterDynamicInput();
        } else if (dialog.returnValue === 'discard') {
            syntaxCheck('query-input1', 'medsyntax-target1', true);
        }
        if (document.getElementById('dynamic-input')) { // keep editing, or an edit that can't be accepted
            focusScopeEdit();
        } else if (button) {
            runButton(button);
        }
    });
})();
