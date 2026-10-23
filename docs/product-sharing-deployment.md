# Product sharing deployment setup

The confirmed production website hostname is
`quick-cart-indol-rho-13.vercel.app`. The mobile project does not contain the
Vercel frontend, a release Android signing key, or an iOS Team ID and production
bundle ID. Android production association and iOS association still need those
signing identifiers before deployment.

## Mobile configuration

`PRODUCT_LINK_HOST` in `src/services/productLinks.ts` and the Android App Link
intent filter are set to this hostname. The canonical share URL is:

```text
https://quick-cart-indol-rho-13.vercel.app/products/<24-character-product-id>
```

The Android application ID currently configured in Gradle is
`com.quickcartmobile`. Get the SHA-256 fingerprint from the actual **release**
signing key used by Play App Signing or the release build. The checked-in Gradle
configuration currently signs both debug and release variants with the debug
keystore, so it does not establish the production signing fingerprint.

## Android asset links template

Host this at `https://quick-cart-indol-rho-13.vercel.app/.well-known/assetlinks.json`, served as
JSON without a redirect. Replace the fingerprint with the production
certificate SHA-256 (uppercase hex pairs separated by colons):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.quickcartmobile",
      "sha256_cert_fingerprints": ["REPLACE_WITH_RELEASE_SHA256_FINGERPRINT"]
    }
  }
]
```

Debug builds need a separate debug fingerprint association to test verified
links locally. Do not use that fingerprint for the production association.
The checked-in debug keystore currently reports SHA-256
`FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`.
It is suitable only for debug testing. Obtain the Play App Signing fingerprint
for production.

## iOS Universal Links template

The Xcode project currently sets the generic bundle identifier
`org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)` and does not set
an Apple development team. After the production Team ID and bundle identifier
are established, add the `applinks:<verified-host>` Associated Domains
entitlement and set `CODE_SIGN_ENTITLEMENTS` for the app target.

Host this at `https://quick-cart-indol-rho-13.vercel.app/.well-known/apple-app-site-association`
with no extension and no redirect. A valid starting template is:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "REPLACE_WITH_TEAM_ID.PRODUCTION_BUNDLE_ID",
        "paths": ["/products/*"]
      }
    ]
  }
}
```

Use `application/json` or `application/pkcs7-mime` and confirm the file is
publicly reachable over HTTPS.

## Separate web frontend

There is no `client/` or Vercel configuration in this mobile repository, so the
web implementation could not be inspected or changed here. In the separate web
repository, review and update the existing `client/api/product-meta.js` to
return product-specific Open Graph title, description, image, and canonical
URL; review `client/vercel.json` so the metadata handler and `.well-known/*`
files are not swallowed by SPA rewrites; set `SITE_URL` in
`client/.env.example` to `https://quick-cart-indol-rho-13.vercel.app`; and add
the two association files under the frontend's public `.well-known` directory.
Keep the existing `/products/:id` page intact.

The supplied production host was reachable for a read-only check. Its product
URL currently returns the generic Vite `index.html` metadata (`QuickCart`,
“Shop products on QuickCart.”), not product-specific Open Graph data. The two
`.well-known` URLs also return that same HTML document rather than association
JSON. The mobile manifest can route product links to the app, but crawler
previews and verified Android/iOS associations need the separate web changes.
See `quickcart-web-product-sharing-task.md` for a handoff task.

The iOS associated domain must be `applinks:quick-cart-indol-rho-13.vercel.app`.

After deployment, verify both association URLs directly, then test cold-start
and warm-start links on signed Android and iOS devices. Android `autoVerify`
alone does not verify a domain association.
