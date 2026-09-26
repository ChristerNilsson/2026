(() => {
  'use strict';
  const logoUrl = 'https://christernilsson.github.io/2026/141-Score-Bookmarklet/seniorschackstockholm.svg';
  const images = Array.from(document.images).filter(img =>
    /\/ssfloggamedtext\.png$/i.test(new URL(img.src, document.baseURI).pathname));
  if (!images.length) {
    if (!document.querySelector('img[data-seniorschack-logo]')) {
      alert('Kunde inte hitta loggan för Sveriges Schackförbund på sidan.');
    }
    return;
  }
  // Load before replacing so a failed download leaves the original logos intact.
  const preview = new Image();
  preview.onload = () => {
    for (const img of images) {
      img.removeAttribute('srcset');
      img.src = logoUrl;
      img.alt = 'Seniorschack Stockholm';
      img.setAttribute('data-seniorschack-logo', '');
    }
  };
  preview.onerror = () => alert('Kunde inte hämta Seniorschack Stockholms logga. Försök igen.');
  preview.src = logoUrl;
})();
