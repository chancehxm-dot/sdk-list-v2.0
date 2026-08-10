/**
 * Shared crypto utilities + secret key for all SDK packages.
 *
 * Single source of truth — all packages import from here.
 * - MD5 hash (pure JS, no external dependency)
 * - Base64 decode
 * - AES-128-CBC decryption (Web Crypto API)
 * - DEFAULT_SECRET_KEY (obfuscated at build time by terser)
 *
 * SECURITY: The key is built at runtime from character codes so
 * `grep` / `strings` won't find the plaintext in the bundle.
 * All three SDKs share the same key — no URL passing needed.
 */

// ═══════════════════════════════════════════════════════════
// Obfuscated secret key — constructed at runtime
// ═══════════════════════════════════════════════════════════

export const DEFAULT_SECRET_KEY = (function () {
  var _ = [51,48,100,99,57,56,99,48,54,48,97,97,100,53,102,101,53,50,56,97,102,54,98,53,101,50,50,98,97,101,52,48]
  var s = ''
  for (var i = 0; i < _.length; i++) s += String.fromCharCode(_[i])
  return s
})()

// ═══════════════════════════════════════════════════════════
// MD5
// ═══════════════════════════════════════════════════════════

export function md5(str: string): string {
  function rotateLeft(x: number, n: number): number { return (x << n) | (x >>> (32 - n)) }

  function toBytes(s: string): number[] {
    const bytes: number[] = []
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i)
      if (c < 0x80) { bytes.push(c) }
      else if (c < 0x800) { bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)) }
      else if (c < 0xd800 || c >= 0xe000) { bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)) }
      else { i++; const pair = ((c & 0x3ff) << 10) | (s.charCodeAt(i) & 0x3ff); bytes.push(0xf0 | (pair >> 18), 0x80 | ((pair >> 12) & 0x3f), 0x80 | ((pair >> 6) & 0x3f), 0x80 | (pair & 0x3f)) }
    }
    return bytes
  }

  const bytes = toBytes(str)
  const len = bytes.length
  const paddedLen = ((len + 8) >>> 6) + 1 << 6
  const buf = new Array<number>(paddedLen)
  for (let i = 0; i < paddedLen; i++) buf[i] = 0

  for (let i = 0; i < len; i++) buf[i] = bytes[i]
  buf[len] = 0x80

  const bits = len * 8
  buf[paddedLen - 8] = bits & 0xff
  buf[paddedLen - 7] = (bits >>> 8) & 0xff
  buf[paddedLen - 6] = (bits >>> 16) & 0xff
  buf[paddedLen - 5] = (bits >>> 24) & 0xff

  function wordAt(arr: number[], i: number): number {
    return (arr[i] | (arr[i + 1] << 8) | (arr[i + 2] << 16) | (arr[i + 3] << 24)) >>> 0
  }

  const hexChars = '0123456789abcdef'

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ]
  const t = [
    -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426, -1473231341, -45705983,
    1770035416, -1958414417, -42063, -1990404162, 1804603682, -40341101, -1502002290, 1236535329,
    -165796510, -1069501632, 643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
    568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784, 1735328473, -1926607734,
    -378558, -2022574463, 1839030562, -35309556, -1530992060, 1272893353, -155497632, -1094730640,
    681279174, -358537222, -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
    -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606, -1051523, -2054922799,
    1873313359, -30611744, -1560198380, 1309151649, -145523070, -1120210379, 718787259, -343485551
  ]

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878

  for (let i = 0; i < paddedLen; i += 64) {
    let aa = a, bb = b, cc = c, dd = d
    const w = new Array(16)
    for (let j = 0; j < 16; j++) w[j] = wordAt(buf, i + j * 4)

    for (let j = 0; j < 64; j++) {
      let f: number, g: number
      if (j < 16) { f = (bb & cc) | (~bb & dd); g = j }
      else if (j < 32) { f = (dd & bb) | (~dd & cc); g = (5 * j + 1) % 16 }
      else if (j < 48) { f = bb ^ cc ^ dd; g = (3 * j + 5) % 16 }
      else { f = cc ^ (bb | ~dd); g = (7 * j) % 16 }
      const temp = dd
      dd = cc
      cc = bb
      bb = (bb + rotateLeft(aa + f + t[j] + w[g], s[j])) >>> 0
      aa = temp
    }

    a = (a + aa) >>> 0
    b = (b + bb) >>> 0
    c = (c + cc) >>> 0
    d = (d + dd) >>> 0
  }

  let hex = ''
  for (const v of [a, b, c, d]) {
    for (let k = 0; k < 4; k++) {
      hex += hexChars[(v >>> (k * 8 + 4)) & 0xf]
      hex += hexChars[(v >>> (k * 8)) & 0xf]
    }
  }

  return hex
}

// ═══════════════════════════════════════════════════════════
// Base64 Decode
// ═══════════════════════════════════════════════════════════

function base64Decode(str: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const lookup = new Uint8Array(256)
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i
  lookup['='.charCodeAt(0)] = 64

  str = str.replace(/[^A-Za-z0-9+/=]/g, '')

  const pad = (4 - (str.length % 4)) % 4
  str += '='.repeat(pad)

  const len = str.length
  const bytes = new Uint8Array((len / 4) * 3)
  let pos = 0

  for (let i = 0; i < len; i += 4) {
    const a = lookup[str.charCodeAt(i)]
    const b = lookup[str.charCodeAt(i + 1)]
    const c = lookup[str.charCodeAt(i + 2)]
    const d = lookup[str.charCodeAt(i + 3)]

    bytes[pos++] = (a << 2) | (b >> 4)
    if (c < 64) bytes[pos++] = ((b & 15) << 4) | (c >> 2)
    if (d < 64) bytes[pos++] = ((c & 3) << 6) | d
  }

  return bytes.slice(0, pos)
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
}

// ═══════════════════════════════════════════════════════════
// AES-128-CBC Decryption
// ═══════════════════════════════════════════════════════════

/**
 * AES-128-CBC decryption.
 *
 * Tries Web Crypto API (crypto.subtle) first — available in HTTPS
 * and localhost. Falls back to a pure-JS implementation for HTTP
 * (non-secure) contexts where crypto.subtle is undefined.
 *
 * Key/IV derivation matches server:
 *   keyMd5 = md5(ts + secretKey)
 *   KEY = keyMd5.substring(0, 16) as UTF-8 bytes
 *   IV  = keyMd5.substring(16)   as UTF-8 bytes
 */
export async function aesDecrypt(encryptedBase64: string, ts: string, secretKey: string): Promise<string> {
  const data = base64Decode(encryptedBase64)

  const raw = ts + secretKey
  const keyMd5 = md5(raw)
  const keyStr = keyMd5.substring(0, 16)
  const ivStr = keyMd5.substring(16)

  const keyBytes = new TextEncoder().encode(keyStr)
  const ivBytes = new TextEncoder().encode(ivStr)

  // Try Web Crypto API first (secure contexts only)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const key = await crypto.subtle.importKey('raw', toArrayBuffer(keyBytes), { name: 'AES-CBC' }, false, ['decrypt'])
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: toArrayBuffer(ivBytes) }, key, toArrayBuffer(data))
      return new TextDecoder().decode(decrypted)
    } catch { /* fall through to pure-JS */ }
  }

  // Pure-JS fallback — works in any context (HTTP, WebView, etc.)
  return aesDecryptPureJS(data, keyBytes, ivBytes)
}

// ═══════════════════════════════════════════════════════════
// Pure-JS AES-128-CBC (FIPS-197) — no dependencies
// ═══════════════════════════════════════════════════════════

const SBOX: number[] = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
]

const INV_SBOX: number[] = [
  0x52,0x09,0x6a,0xd5,0x30,0x36,0xa5,0x38,0xbf,0x40,0xa3,0x9e,0x81,0xf3,0xd7,0xfb,
  0x7c,0xe3,0x39,0x82,0x9b,0x2f,0xff,0x87,0x34,0x8e,0x43,0x44,0xc4,0xde,0xe9,0xcb,
  0x54,0x7b,0x94,0x32,0xa6,0xc2,0x23,0x3d,0xee,0x4c,0x95,0x0b,0x42,0xfa,0xc3,0x4e,
  0x08,0x2e,0xa1,0x66,0x28,0xd9,0x24,0xb2,0x76,0x5b,0xa2,0x49,0x6d,0x8b,0xd1,0x25,
  0x72,0xf8,0xf6,0x64,0x86,0x68,0x98,0x16,0xd4,0xa4,0x5c,0xcc,0x5d,0x65,0xb6,0x92,
  0x6c,0x70,0x48,0x50,0xfd,0xed,0xb9,0xda,0x5e,0x15,0x46,0x57,0xa7,0x8d,0x9d,0x84,
  0x90,0xd8,0xab,0x00,0x8c,0xbc,0xd3,0x0a,0xf7,0xe4,0x58,0x05,0xb8,0xb3,0x45,0x06,
  0xd0,0x2c,0x1e,0x8f,0xca,0x3f,0x0f,0x02,0xc1,0xaf,0xbd,0x03,0x01,0x13,0x8a,0x6b,
  0x3a,0x91,0x11,0x41,0x4f,0x67,0xdc,0xea,0x97,0xf2,0xcf,0xce,0xf0,0xb4,0xe6,0x73,
  0x96,0xac,0x74,0x22,0xe7,0xad,0x35,0x85,0xe2,0xf9,0x37,0xe8,0x1c,0x75,0xdf,0x6e,
  0x47,0xf1,0x1a,0x71,0x1d,0x29,0xc5,0x89,0x6f,0xb7,0x62,0x0e,0xaa,0x18,0xbe,0x1b,
  0xfc,0x56,0x3e,0x4b,0xc6,0xd2,0x79,0x20,0x9a,0xdb,0xc0,0xfe,0x78,0xcd,0x5a,0xf4,
  0x1f,0xdd,0xa8,0x33,0x88,0x07,0xc7,0x31,0xb1,0x12,0x10,0x59,0x27,0x80,0xec,0x5f,
  0x60,0x51,0x7f,0xa9,0x19,0xb5,0x4a,0x0d,0x2d,0xe5,0x7a,0x9f,0x93,0xc9,0x9c,0xef,
  0xa0,0xe0,0x3b,0x4d,0xae,0x2a,0xf5,0xb0,0xc8,0xeb,0xbb,0x3c,0x83,0x53,0x99,0x61,
  0x17,0x2b,0x04,0x7e,0xba,0x77,0xd6,0x26,0xe1,0x69,0x14,0x63,0x55,0x21,0x0c,0x7d
]

const RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36]

function keyExpansion(key: Uint8Array): Uint8Array {
  const Nk = 4, Nb = 4, Nr = 10
  const w = new Uint8Array(Nb * (Nr + 1) * 4)
  for (let i = 0; i < 16; i++) w[i] = key[i]
  for (let i = Nk; i < Nb * (Nr + 1); i++) {
    const t0 = w[(i - 1) * 4], t1 = w[(i - 1) * 4 + 1], t2 = w[(i - 1) * 4 + 2], t3 = w[(i - 1) * 4 + 3]
    if (i % Nk === 0) {
      const [s0,s1,s2,s3] = [SBOX[t1] ^ RCON[i/Nk - 1], SBOX[t2], SBOX[t3], SBOX[t0]]
      w[i*4]=s0; w[i*4+1]=s1; w[i*4+2]=s2; w[i*4+3]=s3
    } else {
      w[i*4]   = w[(i-1)*4]   ^ w[(i-Nk)*4]
      w[i*4+1] = w[(i-1)*4+1] ^ w[(i-Nk)*4+1]
      w[i*4+2] = w[(i-1)*4+2] ^ w[(i-Nk)*4+2]
      w[i*4+3] = w[(i-1)*4+3] ^ w[(i-Nk)*4+3]
    }
  }
  return w
}

function addRoundKey(state: number[], w: Uint8Array, round: number): void {
  for (let c = 0; c < 4; c++) {
    state[c]      ^= w[round * 16 + c * 4]
    state[c + 4]  ^= w[round * 16 + c * 4 + 1]
    state[c + 8]  ^= w[round * 16 + c * 4 + 2]
    state[c + 12] ^= w[round * 16 + c * 4 + 3]
  }
}

function invSubBytes(state: number[]): void {
  for (let i = 0; i < 16; i++) state[i] = INV_SBOX[state[i]]
}

function invShiftRows(state: number[]): void {
  // row 1: shift right 1  →  [12,1,6,11]
  const t = state[13]; state[13]=state[9]; state[9]=state[5]; state[5]=state[1]; state[1]=t
  // row 2: shift right 2  →  swap pairs
  const u = state[2]; state[2]=state[10]; state[10]=u
  const v = state[6]; state[6]=state[14]; state[14]=v
  // row 3: shift right 3 (= left 1)
  const w = state[3]; state[3]=state[7]; state[7]=state[11]; state[11]=state[15]; state[15]=w
}

function galoisMul(a: number, b: number): number {
  let p = 0
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a
    const hi = a & 0x80
    a = (a << 1) & 0xff
    if (hi) a ^= 0x1b
    b >>= 1
  }
  return p
}

function invMixColumns(state: number[]): void {
  for (let c = 0; c < 4; c++) {
    const i = c * 4
    const s0 = state[i], s1 = state[i+1], s2 = state[i+2], s3 = state[i+3]
    state[i]   = galoisMul(s0,0x0e) ^ galoisMul(s1,0x0b) ^ galoisMul(s2,0x0d) ^ galoisMul(s3,0x09)
    state[i+1] = galoisMul(s0,0x09) ^ galoisMul(s1,0x0e) ^ galoisMul(s2,0x0b) ^ galoisMul(s3,0x0d)
    state[i+2] = galoisMul(s0,0x0d) ^ galoisMul(s1,0x09) ^ galoisMul(s2,0x0e) ^ galoisMul(s3,0x0b)
    state[i+3] = galoisMul(s0,0x0b) ^ galoisMul(s1,0x0d) ^ galoisMul(s2,0x09) ^ galoisMul(s3,0x0e)
  }
}

function invCipher(state: number[], w: Uint8Array): void {
  addRoundKey(state, w, 10)
  for (let r = 9; r >= 1; r--) {
    invShiftRows(state)
    invSubBytes(state)
    addRoundKey(state, w, r)
    invMixColumns(state)
  }
  invShiftRows(state)
  invSubBytes(state)
  addRoundKey(state, w, 0)
}

/**
 * Pure-JS AES-128-CBC decrypt.
 *
 * Works in ALL browser contexts including HTTP (non-secure) and older
 * WebViews where `crypto.subtle` is unavailable.
 */
function aesDecryptPureJS(data: Uint8Array, key: Uint8Array, iv: Uint8Array): string {
  if (data.length % 16 !== 0) {
    throw new Error('AES-CBC: ciphertext length must be multiple of 16')
  }
  const w = keyExpansion(key)
  const blocks = data.length / 16
  const out = new Uint8Array(blocks * 16)
  let prev = iv

  for (let b = 0; b < blocks; b++) {
    const offset = b * 16
    const state: number[] = []
    for (let i = 0; i < 16; i++) state.push(data[offset + i])

    invCipher(state, w)

    for (let i = 0; i < 16; i++) {
      out[offset + i] = state[i] ^ prev[i]
    }
    prev = data.subarray(offset, offset + 16)
  }

  // PKCS7 unpadding
  const lastByte = out[out.length - 1]
  if (lastByte > 0 && lastByte <= 16) {
    return new TextDecoder().decode(out.subarray(0, out.length - lastByte))
  }
  return new TextDecoder().decode(out)
}
