/**
 * Default Projects for COMSAN Club
 * Clean empty array - all projects are managed dynamically via Database & Admin UI
 */
const defaultProjects = [];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = defaultProjects;
}
if (typeof window !== 'undefined') {
  window.defaultProjects = defaultProjects;
}
