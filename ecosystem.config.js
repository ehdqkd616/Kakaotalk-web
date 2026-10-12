// pm2 운영 설정: pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: 'kakao-web-server',
      cwd: __dirname + '/server',
      script: 'dist/index.js',
      env: { NODE_ENV: 'production', PORT: 4100 },
    },
    {
      name: 'kakao-web-client',
      cwd: __dirname + '/client',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3100 -H 127.0.0.1',
      env: { NODE_ENV: 'production' },
    },
  ],
};
