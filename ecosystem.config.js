module.exports = {
  apps: [
    {
      name: 'capnhatgia',
      script: 'src/index.js',
      cwd: '/var/www/capnhatgia/server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
  ],
};
