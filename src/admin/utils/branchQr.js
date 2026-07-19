import QRCode from 'qrcode'

// Every branch (including the default one, whose code is "main") gets the
// same URL shape, so the QR/URL tools work identically for every branch.
export function getBranchMenuUrl(code) {
  return `${window.location.origin}/menu/${code}`
}

export async function generateBranchQrDataUrl(code) {
  return QRCode.toDataURL(getBranchMenuUrl(code), {
    width: 240,
    margin: 1,
    color: { dark: '#28102f', light: '#ffffff' },
  })
}
