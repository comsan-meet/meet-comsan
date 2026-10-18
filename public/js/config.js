/**
 * COMSAN Meeting System - Client Configuration & Constants
 */

// Initialize Socket.io client connection
const socket = io();

// Audio Notification System (with synthesis fallback)
const audioAssets = {
  notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  alert: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
  vote: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
  spin: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
};

const audioCache = {};
Object.entries(audioAssets).forEach(([key, url]) => {
  try {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioCache[key] = audio;
  } catch (e) {
    console.warn(`Could not preload audio: ${key}`, e);
  }
});

window.socket = socket;
window.audioCache = audioCache;
