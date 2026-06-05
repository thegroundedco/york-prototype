// modals.js — open/close native <dialog> modals via data-modal attribute

function initModals() {
  const triggers = document.querySelectorAll('[data-modal]');
  const modals = document.querySelectorAll('dialog.modal');

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const id = `modal-${trigger.dataset.modal}`;
      const modal = document.getElementById(id);
      if (!modal) return;
      window.YorkBodyLock?.lock();
      modal.showModal();
      // Move focus off the close button (which would otherwise auto-receive focus
      // and trigger a :focus-visible outline). Tab order is unaffected.
      if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
      modal.focus({ preventScroll: true });
    });
  });

  modals.forEach((modal) => {
    const closeBtn = modal.querySelector('.modal__close');
    closeBtn?.addEventListener('click', () => modal.close());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });

    modal.addEventListener('close', () => {
      window.YorkBodyLock?.unlock();
    });
  });
}

initModals();
