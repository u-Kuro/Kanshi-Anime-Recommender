// const arrayBufferToBase64 = (buffer) => {
//     let binary = '';
//     const bytes = new Uint8Array(buffer);
//     for (let i = 0; i < bytes.byteLength; i++) {
//         binary += String.fromCharCode(bytes[i]);
//     }
//     return window.btoa(binary);
// }
// const base64ToArrayBuffer = (base64) => {
//     const binaryString = window.atob(base64);
//     const bytes = new Uint8Array(binaryString.length);
//     for (let i = 0; i < binaryString.length; i++) {
//         bytes[i] = binaryString.charCodeAt(i);
//     }
//     return bytes.buffer;
// }

// export {
//     arrayBufferToBase64,
//     base64ToArrayBuffer
// }