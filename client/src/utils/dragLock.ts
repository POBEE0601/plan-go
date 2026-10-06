// 일정을 끄는 동안 글자 선택을 막고, 그 사이에는 일정 동기화도 쉰다

let selectionLocks = 0;
let blockSelect: ((event: Event) => void) | null = null;
let syncPauses = 0;

const clearSelection = () => {
  window.getSelection()?.removeAllRanges();
};

export const holdTextSelectionLock = (): (() => void) => {
  selectionLocks += 1;
  if (selectionLocks === 1) {
    document.documentElement.classList.add('plan-dragging');
    blockSelect = (event: Event) => event.preventDefault();
    document.addEventListener('selectstart', blockSelect);
    clearSelection();
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    selectionLocks = Math.max(0, selectionLocks - 1);
    if (selectionLocks > 0) return;
    document.documentElement.classList.remove('plan-dragging');
    if (blockSelect) {
      document.removeEventListener('selectstart', blockSelect);
      blockSelect = null;
    }
    clearSelection();
  };
};

export const pausePlanSync = (): (() => void) => {
  syncPauses += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    syncPauses = Math.max(0, syncPauses - 1);
  };
};

export const isPlanSyncPaused = (): boolean => syncPauses > 0;

// 손잡이를 누르는 순간부터 뗄 때까지. 드래그가 확정되기 전 선택도 막는다
export const armDragGesture = (): void => {
  const releaseSelect = holdTextSelectionLock();
  const releaseSync = pausePlanSync();
  const release = () => {
    releaseSelect();
    releaseSync();
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
};
