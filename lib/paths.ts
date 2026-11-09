// Relative asset paths keep the same game working at / and /repository-name/.
export const API_BASE=import.meta.env?.VITE_PARTY_SERVER||(
 typeof window!=='undefined'&&window.location.hostname.endsWith('.github.io')
 ? 'https://crease-cricket-club.relaxedtang1.chatgpt.site' : '');
