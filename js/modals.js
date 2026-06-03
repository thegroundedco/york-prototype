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
