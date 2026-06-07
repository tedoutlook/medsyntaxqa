// 1. Get a reference to the window object (optional, but good practice)
const win = window;

// 2. Define the function that runs when the event happens
function handleKeyDown(event) {
    // 'event' is the event object passed by the browser
    console.log("Key Pressed!");
    console.log("The key code is:", event.keyCode); // Deprecated but still useful
    console.log("The actual key pressed (Modern approach):", event.key);

    // Optional: Stop the default action (e.g., prevent spacebar from scrolling)
    // event.preventDefault();
}

// 3. Attach the event listener to the window object
window.addEventListener('keydown', handleKeyDown);

console.log("Keydown listener attached to window.");

// 2. Define the function that runs when the event happens
function handleKeyDownFromIframe(event) {
    // 'event' is the event object passed by the browser
    console.log("Key Pressed in iFrame!");
    console.log("The key code is:", event.keyCode); // Deprecated but still useful
    console.log("The actual key pressed (Modern approach):", event.key);

    // Optional: Stop the default action (e.g., prevent spacebar from scrolling)
    // event.preventDefault();
}