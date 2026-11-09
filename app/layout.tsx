import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: 'CREASE — Your team. Your game.',
 description: 'Build your dream team in the auction, roll into a rivalry, and own the crease. Play solo or invite your friends.',
 icons: {icon:'/favicon.svg'},
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
