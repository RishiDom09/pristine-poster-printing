// Site configuration. The backend is a Google Apps Script web app (see apps-script/Code.gs).
// After redeploying the script with a NEW deployment (not a new version), update this URL.
window.PPP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbz1kaEnY2AEVs76lJv7f5siBSrmfjgPNEcWgKpayJ92B066mPlLnXoOfs_BNoOAF0m_/exec',
  MAX_FILE_MB: 25,
  // Keep in sync with PRICES in apps-script/Code.gs
  PRICES: {
    sizes: {
      '11x17': { label: '11" x 17" (Small)', price: 12 },
      '18x24': { label: '18" x 24" (Medium)', price: 20 },
      '24x36': { label: '24" x 36" (Large)', price: 32 },
    },
    finishes: {
      matte: { label: 'Matte', price: 0 },
      glossy: { label: 'Glossy', price: 3 },
    },
    lamination: 5,
  },
};
