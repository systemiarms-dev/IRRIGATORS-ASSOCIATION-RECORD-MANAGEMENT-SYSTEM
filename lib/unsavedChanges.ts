let unsaved = false;

const SAVE_REQUEST_EVT = 'iarms:save-request';
const SAVE_DONE_EVT = 'iarms:save-done';

export function markUnsaved(value: boolean): void {
  unsaved = value;
}

export function isUnsaved(): boolean {
  return unsaved;
}

export function requestSave(): Promise<boolean> {
  if (!unsaved) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const onDone = (ev: Event) => {
      window.removeEventListener(SAVE_DONE_EVT, onDone);
      resolve((ev as CustomEvent).detail?.ok === true);
    };
    window.addEventListener(SAVE_DONE_EVT, onDone);
    window.dispatchEvent(new CustomEvent(SAVE_REQUEST_EVT));
  });
}

export function announceSaveDone(ok: boolean): void {
  window.dispatchEvent(new CustomEvent(SAVE_DONE_EVT, { detail: { ok } }));
}