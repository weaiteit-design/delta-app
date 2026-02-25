import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'
import https from 'https'
import path from 'path'

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
    resolve: {
        alias: [
            // Specific aliases MUST come before the general react-native → react-native-web alias
            // otherwise Vite rewrites the path before matching the specific one.
            {
                find: 'react-native/Libraries/Utilities/codegenNativeComponent',
                replacement: path.resolve(__dirname, 'src/shims/codegenNativeComponent.ts'),
            },
            {
                find: 'lucide-react-native',
                replacement: path.resolve(__dirname, 'node_modules/lucide-react/dist/esm/lucide-react.js'),
            },
            {
                find: 'expo-clipboard',
                replacement: path.resolve(__dirname, 'src/shims/expo-clipboard.ts'),
            },
            {
                find: 'react-native',
                replacement: 'react-native-web',
            },
        ],
        extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
    },
    server: {
        port: 5173,
        open: true
    }
})
