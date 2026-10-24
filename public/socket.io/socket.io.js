// COMSAN Meeting - Client socket.io fallback stub for static hosting (Vercel, InfinityFree, GitHub Pages)
// When running locally via 'node server.js', Express dynamically serves the real Socket.io client.
if (typeof window !== 'undefined' && typeof window.io === 'undefined') {
  // Graceful no-op stub: allows config.js to gracefully detect and use Supabase / HTTP Bridge
  console.info('Static hosting detected: Socket.io client omitted, using Supabase/HTTP sync bridge.');
}
