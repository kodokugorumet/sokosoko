import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext + Cloudflare adapter config.
 *
 * MVP: incremental cache 비활성. ISR 은 동작하지만 invalidation 은 next deploy 까지
 * 유지되지 않을 수 있음. 트래픽이 안정되면 R2 binding 을 wrangler.jsonc 에 추가하고
 * 아래에서 r2IncrementalCache 를 활성화하면 캐시가 R2 에 저장된다.
 *
 * 예시:
 *   import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
 *   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
 */
export default defineCloudflareConfig({});
