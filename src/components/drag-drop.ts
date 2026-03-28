/**
 * Drag-and-Drop File Open — Full-window drop zone for Ch10 files.
 *
 * Design:
 *   - A translucent overlay appears when dragging files over the window
 *   - Only .ch10 and .c10 extensions are accepted
 *   - Overlay shows clear feedback for valid/invalid file types
 *   - Drop triggers the platform adapter's file open flow
 *
 * Requirements traced:
 *   L2-UI-DND-010  System SHALL accept Ch10 files via drag-and-drop
 *   L2-UI-DND-020  System SHALL display a visual overlay during drag
 *   L2-UI-DND-030  System SHALL reject non-Ch10 file extensions
 *   L2-UI-DND-040  Drop SHALL trigger the same load path as File > Open
 */

// ── Types ──

export interface DragDropCallbacks {
  /** Called with the dropped File when a valid Ch10 file is received */
  onFileDrop(file: File): void;
}

// ── Initialization ──

/**
 * Initialize drag-and-drop on the given container (typically #app).
 *
 * @param container  — the drop target element
 * @param callbacks  — handlers for drop events
 * @returns cleanup function to remove all listeners
 */
export function initDragDrop(
  container: HTMLElement,
  callbacks: DragDropCallbacks
): () => void {
  // Create overlay (hidden by default)
  const overlay = document.createElement("div");
  overlay.className = "drop-overlay";
  overlay.innerHTML = `
    <div class="drop-overlay__content">
      <div class="drop-overlay__icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="4" width="32" height="40" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M16 20h16M16 26h16M16 32h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="36" cy="36" r="10" fill="var(--c-accent)" stroke="var(--c-surface)" stroke-width="2"/>
          <path d="M33 36h6M36 33v6" stroke="var(--c-surface)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="drop-overlay__label" id="drop-label">Drop Ch10 file to open</div>
      <div class="drop-overlay__hint" id="drop-hint">Supports .ch10 and .c10 files</div>
    </div>
  `;
  container.appendChild(overlay);

  const labelEl = overlay.querySelector("#drop-label") as HTMLElement;
  const hintEl = overlay.querySelector("#drop-hint") as HTMLElement;

  let dragCounter = 0; // Track nested drag enter/leave events

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      showOverlay(e);
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    // Required to allow drop
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      hideOverlay();
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter = 0;
    hideOverlay();

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Take the first file
    const file = files[0];

    if (isValidCh10File(file)) {
      callbacks.onFileDrop(file);
    } else {
      // Flash the overlay briefly with an error state
      showError(file.name);
    }
  }

  function showOverlay(e: DragEvent) {
    // Check if dragged items look valid
    const items = e.dataTransfer?.items;
    let hasFile = false;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          hasFile = true;
          break;
        }
      }
    }

    overlay.classList.add("drop-overlay--visible");
    if (hasFile) {
      overlay.classList.remove("drop-overlay--invalid");
      labelEl.textContent = "Drop Ch10 file to open";
      hintEl.textContent = "Supports .ch10 and .c10 files";
    }
  }

  function hideOverlay() {
    overlay.classList.remove("drop-overlay--visible", "drop-overlay--invalid");
  }

  function showError(filename: string) {
    overlay.classList.add("drop-overlay--visible", "drop-overlay--invalid");
    labelEl.textContent = "Unsupported file type";
    hintEl.textContent = `"${filename}" is not a Ch10 file`;
    setTimeout(hideOverlay, 2000);
  }

  // Bind events
  container.addEventListener("dragenter", onDragEnter);
  container.addEventListener("dragover", onDragOver);
  container.addEventListener("dragleave", onDragLeave);
  container.addEventListener("drop", onDrop);

  // Cleanup
  return () => {
    container.removeEventListener("dragenter", onDragEnter);
    container.removeEventListener("dragover", onDragOver);
    container.removeEventListener("dragleave", onDragLeave);
    container.removeEventListener("drop", onDrop);
    overlay.remove();
  };
}

// ── Validation ──

const VALID_EXTENSIONS = [".ch10", ".c10"];

function isValidCh10File(file: File): boolean {
  const name = file.name.toLowerCase();
  return VALID_EXTENSIONS.some((ext) => name.endsWith(ext));
}
