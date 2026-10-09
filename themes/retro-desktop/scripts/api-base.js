'use strict';

/* 统一算出「评论服务的站点根地址」，返回不带结尾 / 也不带 /api 的形式。
   这样主题 _config.yml 里 comments.api 填
     https://060929.xyz        或
     https://060929.xyz/api
   都能正常工作（前端 JS 自己在后面拼 /api/comments、/api/view…），
   避免出现 /api/api/xxx 这种 404。 */
hexo.extend.helper.register('api_base', function () {
  var themeCfg = (hexo.theme && hexo.theme.config) || this.theme || {};
  var comments = themeCfg.comments || {};
  return String(comments.api || '')
    .trim()
    .replace(/\/api\/?$/, '')
    .replace(/\/+$/, '');
});
