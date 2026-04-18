module.exports = {
  apps: [
    {
      name: 'calisia-api',
      script: './src/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        APP_ENV: 'production',
        PORT: 8080,
        HOST: '127.0.0.1'
      }
    }
  ]
};
