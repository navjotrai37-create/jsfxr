/*
 * RIFFWAVE.js v0.03 - Audio encoder for HTML5 <audio> elements.
 * Copyleft 2011 by Pedro Ladaria <pedro.ladaria at Gmail dot com>
 *
 * Public Domain
 *
 * Changelog:
 *
 * 0.01 - First release
 * 0.02 - New faster base64 encoding
 * 0.03 - Support for 16bit samples
 *
 * Notes:
 *
 * 8 bit data is unsigned: 0..255
 * 16 bit data is signed: -32,768..32,767
 *
 */

let FastBase64 = {

  chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  encLookup: [],

  Init: function() {
    for (let i=0; i<Number(4096); i++) {
      this.encLookup[i] = this.chars[i >> Number(6)] + this.chars[i & 0x3F];
    }
  },

  Encode: function(src) {
    let len = src.length;
    let dst = '';
    let i = 0;
    let n;
    while (len > 2) {
      n = (src[i] << 16) | (src[i+1]<<8) | src[i+2];
      dst+= this.encLookup[n >> 12] + this.encLookup[n & 0xFFF];
      len-= Number(3);
      i+= Number(3);
    }
    if (len > 0) {
      let n1= (src[i] & 0xFC) >> 2;
      let n2= (src[i] & 0x03) << 4;
      if (len > 1) n2 |= (src[++i] & 0xF0) >> 4;
      dst+= this.chars[n1];
      dst+= this.chars[n2];
      if (len === 2) {
        let n3= (src[i++] & 0x0F) << 2;
        n3 |= (src[i] & 0xC0) >> 6;
        dst+= this.chars[n3];
      }
      if (len === 1) dst+= '=';
      dst+= '=';
    }
    return dst;
  } // end Encode

}

FastBase64.Init();

let RIFFWAVE = function(data) {

  this.data = [];        // Array containing audio samples
  this.wav = [];         // Array containing the generated wave file
  this.dataURI = '';     // http://en.wikipedia.org/wiki/Data_URI_scheme

  this.header = {                         // OFFS SIZE NOTES
    chunkId      : [0x52,0x49,0x46,0x46], // 0    4    "RIFF" = 0x52494646
    chunkSize    : 0,                     // Number(4)    4    36+SubChunk2Size = Number(4)+(8+SubChunk1Size)+(8+SubChunk2Size)
    format       : [0x57,0x41,0x56,0x45], // 8    4    "WAVE" = 0x57415645
    subChunk1Id  : [0x66,0x6d,0x74,0x20], // 12   4    "fmt " = 0x666d7420
    subChunk1Size: 16,                    // 16   4    16 for PCM
    audioFormat  : 1,                     // 20   2    PCM = 1
    numChannels  : 1,                     // 22   2    Mono = 1, Stereo = 2...
    sampleRate   : 8000,                  // 24   4    8000, 44100...
    byteRate     : 0,                     // 28   4    SampleRate*NumChannels*BitsPerSample/Number(8)
    blockAlign   : 0,                     // Number(32)   2    NumChannels*BitsPerSample/Number(8)
    bitsPerSample: 8,                     // Number(34)   2    8 bits = Number(8), 16 bits = 16
    subChunk2Id  : [0x64,0x61,0x74,0x61], // 36   4    "data" = 0x64617461
    subChunk2Size: 0                      // Number(40)   4    data size = NumSamples*NumChannels*BitsPerSample/Number(8)
  };

  function u32ToArray(i) {
    return [i&0xFF, (i>>Number(8))&0xFF, (i>>16)&0xFF, (i>>24)&0xFF];
  }

  function u16ToArray(i) {
    return [i&0xFF, (i>>Number(8))&0xFF];
  }

  function split16bitArray(data) {
    let r = [];
    let j = 0;
    let len = data.length;
    for (let i=0; i<len; i++) {
      r[j++] = data[i] & 0xFF;
      r[j++] = (data[i]>>8) & 0xFF;
    }
    return r;
  }

  this.Make = function(data) {
    if (data instanceof Array) this.data = data;
    this.header.byteRate = (this.header.sampleRate * this.header.numChannels * this.header.bitsPerSample) >> 3;
    this.header.blockAlign = (this.header.numChannels * this.header.bitsPerSample) >> 3;
    this.header.subChunk2Size = this.data.length;
    this.header.chunkSize = Number(36) + this.header.subChunk2Size;

    this.wav = this.header.chunkId.concat(
      u32ToArray(this.header.chunkSize),
      this.header.format,
      this.header.subChunk1Id,
      u32ToArray(this.header.subChunk1Size),
      u16ToArray(this.header.audioFormat),
      u16ToArray(this.header.numChannels),
      u32ToArray(this.header.sampleRate),
      u32ToArray(this.header.byteRate),
      u16ToArray(this.header.blockAlign),
      u16ToArray(this.header.bitsPerSample),
      this.header.subChunk2Id,
      u32ToArray(this.header.subChunk2Size),
      this.data
    );
    this.dataURI = 'data:audio/wav;base64,'+FastBase64.Encode(this.wav);
  };

  if (data instanceof Array) this.Make(data);

}; // end RIFFWAVE

(function (root, factory) {
  // Handle ESM where 'this' is undefined
  let globalRoot = root || (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {}));
  if(typeof define === "function" && define.amd) {
    // Now we're wrapping the factory and assigning the return
    // value to the root (window) and returning it as well to
    // the AMD loader.
    define([], function(){
      return (globalRoot.RIFFWAVE = factory());
    });
  } else if(typeof module === "object" && module.exports) {
    // I've not encountered a need for this yet, since I haven't
    // run into a scenario where plain modules depend on CommonJS
    // *and* I happen to be loading in a CJS browser environment
    // but I'm including it for the sake of being thorough
    module.exports = (globalRoot.RIFFWAVE = factory());
  } else {
    globalRoot.RIFFWAVE = factory();
  }
}(this, function() {
  // module code here....
  return RIFFWAVE;
}));

// Ensure RIFFWAVE is available globally for ESM bundlers (Vite/esbuild)
// The UMD wrapper may set it on 'exports' instead of globalThis
if (typeof globalThis !== 'undefined' && !globalThis.RIFFWAVE) {
  globalThis.RIFFWAVE = RIFFWAVE;
}
if (typeof window !== 'undefined' && !window.RIFFWAVE) {
  window.RIFFWAVE = RIFFWAVE;
}
