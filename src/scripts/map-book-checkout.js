// Shared by the state-page offer and the listing-page button. Both post to
// /api/maps/checkout; this only opens the Stripe URL the server returns.
const checkoutUrl = /^https:\/\/checkout\.stripe\.com\//;

export function bindMapCheckout() {
  for (const form of document.querySelectorAll('[data-map-form]')) {
    if (!(form instanceof HTMLFormElement) || form.dataset.bound === '1') continue;
    form.dataset.bound = '1';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button');
      const status = form.querySelector('[data-map-status]');
      if (button instanceof HTMLButtonElement && button.disabled) return;
      if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      if (status instanceof HTMLElement) {
        status.hidden = false;
        status.textContent = 'Opening checkout.';
      }
      try {
        const state = new FormData(form).get('state');
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ state }),
        });
        const data = await res.json().catch(() => null);
        const url = data && typeof data.url === 'string' ? data.url : '';
        if (!res.ok || !checkoutUrl.test(url)) throw new Error('unavailable');
        window.location.assign(url);
      } catch {
        if (status instanceof HTMLElement) status.textContent = 'Checkout is unavailable right now. Please try again in a moment.';
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      }
    });
  }
}
