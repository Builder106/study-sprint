import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';

export default function App() {
  useEffect(() => {
    // Load Vercel Analytics after app mounts
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://cdn.vercel-analytics.com/v1/script.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return <RouterProvider router={router} />;
}