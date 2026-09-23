export const metadata = {
  title: 'Orbis',
  description: 'Build your World.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}