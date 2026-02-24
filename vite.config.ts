import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'
import https from 'https'

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'cors-proxy',
            configureServer(server) {
                server.middlewares.use('/proxy', (req, res) => {
                    const urlParam = new URL(req.url || '', 'http://localhost').searchParams.get('url');
                    if (!urlParam) {
                        res.statusCode = 400;
                        return res.end('Missing url parameter');
                    }
                    const target = new URL(urlParam);
                    const protocol = target.protocol === 'https:' ? https : http;
                    const proxyReq = protocol.request(target, {
                        method: req.method,
                        headers: {
                            'Accept': req.headers.accept || '*/*',
                            'User-Agent': 'DeltaApp/1.0', // Avoid Reddit blocking fetch
                        }
                    }, (proxyRes) => {
                        res.writeHead(proxyRes.statusCode || 200, {
                            'Access-Control-Allow-Origin': '*',
                            'Content-Type': proxyRes.headers['content-type'] || 'application/json'
                        });
                        proxyRes.pipe(res);
                    });
                    proxyReq.on('error', (err) => {
                        res.statusCode = 500;
                        res.end(err.message);
                    });
                    req.pipe(proxyReq);
                });
            }
        }
    ],
    server: {
        port: 5173,
        open: true
    }
})
