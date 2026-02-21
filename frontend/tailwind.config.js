/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0a0a0a',
                surface: '#121212',
                primary: '#3b82f6',
                error: '#ef4444',
                warning: '#f59e0b',
                success: '#10b981',
            },
        },
    },
    plugins: [],
}
