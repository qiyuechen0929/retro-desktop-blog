// pm2 配置（等价于 `pm2 start comments-server.js --name blog-api --node-args="--experimental-sqlite"`）
// 用法：cd <项目根> && pm2 start deploy/ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: 'blog-api',
      script: 'server/comments-server.js',
      cwd: __dirname + '/..',
      node_args: '--experimental-sqlite',   // Node ≥ 23.4 可去掉
      instances: 1,
      autorestart: true,
      max_memory_restart: '180M',
      env: { NODE_ENV: 'production' }
    }
  ]
};
